import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/lib/services/userService';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';
import { UserResponse } from '@/lib/types/api.types';

// Per-user in-memory cache for profile data
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/profile
 * Get current user's profile with per-user caching
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  const cacheKey = authContext.userId;
  const cached = profileCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const cachedResponse = successResponse(cached.data);
    cachedResponse.headers.set('Cache-Control', 'private, max-age=30');
    return cachedResponse;
  }

  try {
    // Simple find by ID - no relations
    let user = await userService.findById(authContext.userId);

    if (!user) {
      await userService.syncUserWithSupabase(authContext.userId, authContext.email || '', '');
      user = await userService.findById(authContext.userId);

      if (!user) {
        return successResponse({ isFirstLogin: true } as any);
      }
    }

    const userAny: any = user;
    const phoneValue = userAny.phone ?? userAny.primary_mobile ?? userAny.primaryMobile ?? null;
    const isMobileVerified = userAny.is_mobile_verified ?? userAny.isMobileVerified ?? !!phoneValue;

    const response: UserResponse = {
      id: user.id,
      email: user.email,
      phone: phoneValue,
      mobile: phoneValue,
      name: userAny.name,
      dob: userAny.dob?.toISOString() || null,
      gender: userAny.gender,
      maritalStatus: userAny.maritalStatus,
      occupationType: userAny.occupationType,
      employerCompany: userAny.employerCompany,
      profileType: userAny.profileType,
      status: userAny.status,
      language: userAny.language,
      createdAt: userAny.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: userAny.updatedAt?.toISOString() || new Date().toISOString(),
      isFirstLogin: userAny.is_first_login ?? true,
      isMobileVerified,
      familyMembers: [],
      education: [],
    };

    // Store in cache
    profileCache.set(cacheKey, { data: response, timestamp: Date.now() });

    const finalResponse = successResponse(response);
    finalResponse.headers.set('Cache-Control', 'private, max-age=30');
    return finalResponse;
  } catch (error) {
    console.error('[Profile GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/profile
 * Create or update user profile - invalidates cache for this user
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  let authContext = getAuthContext(request);
  let data: any;

  try {
    data = await request.json();
  } catch (e) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON', StatusCodes.BAD_REQUEST);
  }

  const INTERNAL_SECRET = process.env.NEXT_PUBLIC_INTERNAL_SECRET || 'SVARAJYA_INTERNAL_SYNC_2025';
  const isInternalSync = data._internal_secret === INTERNAL_SECRET;

  if (!authContext && !isInternalSync) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  if (!authContext && isInternalSync) {
    if (!data.id) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'User ID required for internal sync', StatusCodes.BAD_REQUEST);
    }
    authContext = {
      userId: data.id,
      email: data.email || null,
      authId: data.id,
    };
  }

  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication failed', StatusCodes.UNAUTHORIZED);
  }

  // Invalidate cache for this user on write
  profileCache.delete(authContext.userId);

  try {
    const hasValidFields = data.name !== undefined ||
      typeof data.isFirstLogin === 'boolean' ||
      data.dob !== undefined ||
      data.gender !== undefined ||
      data.maritalStatus !== undefined ||
      data.occupationType !== undefined ||
      data.employerCompany !== undefined ||
      data.language !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined;

    if (!hasValidFields) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'At least one valid field must be provided for update',
        StatusCodes.UNPROCESSABLE_ENTITY,
        { field: 'general' }
      );
    }

    const patch: any = {
      dob: data.dob ? new Date(data.dob) : undefined,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      occupationType: data.occupationType,
      employerCompany: data.employerCompany,
      language: data.language,
    };

    if (data.name !== undefined) patch.name = data.name;
    if (typeof data.isFirstLogin === 'boolean') patch.is_first_login = data.isFirstLogin;

    let user = await userService.findById(authContext.userId);

    if (!user) {
      const createData: any = {
        id: authContext.userId,
        email: authContext.email,
        name: data.name,
        status: 'PENDING_VERIFICATION',
        profileType: 'INDIVIDUAL_SALARIED',
      };

      if (data.phone) createData.phone = data.phone;
      if (data.dob) createData.dob = new Date(data.dob);
      if (data.gender) createData.gender = data.gender;
      if (data.maritalStatus) createData.maritalStatus = data.maritalStatus;
      if (data.occupationType) createData.occupationType = data.occupationType;
      if (data.language) createData.language = data.language;
      if (typeof data.isFirstLogin === 'boolean') createData.is_first_login = data.isFirstLogin;

      user = await userService.create(createData);
    } else {
      const existingAny: any = user;
      const isEmailVerified = existingAny.is_email_verified ?? existingAny.isEmailVerified ?? false;
      const isMobileVerified = existingAny.is_mobile_verified ?? existingAny.isMobileVerified ?? false;

      if (data.email && !isEmailVerified) patch.email = data.email;
      if (data.phone && !isMobileVerified) patch.phone = data.phone;

      user = await userService.update(authContext.userId, patch);
    }

    // Sync to Supabase Auth metadata (non-blocking)
    if (data.name !== undefined || data.phone !== undefined) {
      const supabase = await createClient();
      const updateData: any = {};
      if (data.name !== undefined) updateData.full_name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;

      supabase.auth.updateUser({ data: updateData }).catch((err) => {
        console.error("[Profile POST] Failed to sync to Supabase Auth:", err);
      });
    }

    const userAny: any = user;
    const response: UserResponse = {
      id: user.id,
      email: user.email,
      phone: userAny.phone ?? null,
      name: userAny.name,
      dob: userAny.dob?.toISOString() || null,
      gender: userAny.gender,
      maritalStatus: userAny.maritalStatus,
      occupationType: userAny.occupationType,
      employerCompany: userAny.employerCompany,
      profileType: userAny.profileType,
      status: userAny.status,
      language: userAny.language,
      createdAt: userAny.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: userAny.updatedAt?.toISOString() || new Date().toISOString(),
      isFirstLogin: userAny.is_first_login ?? true,
    };

    // Update cache with new data
    profileCache.set(authContext.userId, { data: response, timestamp: Date.now() });

    return successResponse(response, StatusCodes.CREATED, 'Profile updated');
  } catch (error: any) {
    if (error?.code !== 'ECONNRESET' && error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
      console.error('[Profile POST]', error);
    }
    return handlePrismaError(error);
  }
}

// Export with middleware
export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(
  withErrorHandler(postHandler),
  AuthLevel.PUBLIC
);