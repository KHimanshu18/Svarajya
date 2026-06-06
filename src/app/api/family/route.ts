import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { familyService } from '@/lib/services/familyService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';
import { FamilyMemberResponse, CreateFamilyMemberRequest, UpdateFamilyMemberRequest } from '@/lib/types/api.types';

// Per-user in-memory cache for family data
const familyCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/family
 * Get all family members for user with caching
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
  const cached = familyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const cachedResponse = successResponse(cached.data);
    cachedResponse.headers.set('Cache-Control', 'private, max-age=30');
    return cachedResponse;
  }

  try {
    const members = await familyService.getFamilyMembers(authContext.userId);

    const responses: FamilyMemberResponse[] = members.map((member) => ({
      id: member.id!,
      userId: member.userId!,
      name: member.name!,
      relation: member.relation!,
      dob: member.dob?.toISOString() || null,
      isDependent: member.isDependent ?? false,
      nomineeEligible: member.nomineeEligible ?? false,
      accessLevel: member.accessLevel || '',
      createdAt: member.createdAt!.toISOString(),
      updatedAt: member.updatedAt!.toISOString(),
    }));

    // Store in cache
    familyCache.set(cacheKey, { data: responses, timestamp: Date.now() });

    return successResponse(responses);
  } catch (error) {
    console.error('[Family GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/family
 * Create or update family member - invalidates cache
 * NOTE: nomineeEligible is calculated automatically based on relation, DOB, and isDependent
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  // Invalidate cache for this user
  familyCache.delete(authContext.userId);

  try {
    const data: CreateFamilyMemberRequest | (UpdateFamilyMemberRequest & { id?: string }) = await request.json();

    // Validate required fields
    if (!data.name || !data.relation) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Name and relation are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let member;

    if ('id' in data && data.id) {
      // Update existing (service will calculate nomineeEligible)
      member = await familyService.update(data.id, {
        name: data.name,
        relation: data.relation,
        dob: data.dob ? new Date(data.dob) : undefined,
        isDependent: data.isDependent,
        accessLevel: data.accessLevel,
        // nomineeEligible is calculated by the service
      });
    } else {
      // Create new (service will calculate nomineeEligible)
      member = await familyService.createForUser(authContext.userId, {
        name: data.name,
        relation: data.relation,
        dob: data.dob ? new Date(data.dob) : undefined,
        isDependent: data.isDependent,
        accessLevel: data.accessLevel,
        // nomineeEligible is calculated by the service
      });
    }

    const response: FamilyMemberResponse = {
      id: member.id,
      userId: member.userId,
      name: member.name,
      relation: member.relation,
      dob: member.dob?.toISOString() || null,
      isDependent: member.isDependent,
      nomineeEligible: member.nomineeEligible,
      accessLevel: member.accessLevel,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Family POST]', error);
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/family
 * Delete a family member by ID from query parameter - invalidates cache
 */
async function deleteHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  // Invalidate cache for this user
  familyCache.delete(authContext.userId);

  // Get id from query parameter
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Family member ID is required',
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  try {
    const result = await familyService.deleteForUser(id, authContext.userId);

    if (!result.success) {
      const status = result.reason === 'NOT_FOUND' ? StatusCodes.NOT_FOUND : StatusCodes.FORBIDDEN;
      const message = result.reason === 'NOT_FOUND'
        ? `Family member with ID ${id} not found in database.`
        : `Permission denied. You do not own the record with ID ${id}.`;

      return errorResponse(
        result.reason === 'NOT_FOUND' ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
        message,
        status
      );
    }

    return successResponse({ message: 'Family member deleted successfully' });
  } catch (error: any) {
    console.error('[Family DELETE] Error:', error);
    return errorResponse(
      ErrorCodes.DATABASE_ERROR,
      `Database error: ${error.message || 'Unknown error'}`,
      StatusCodes.INTERNAL_ERROR
    );
  }
}

/**
 * PATCH /api/family
 * Update a family member - invalidates cache
 */
async function patchHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  // Invalidate cache for this user
  familyCache.delete(authContext.userId);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const data: UpdateFamilyMemberRequest = await request.json();

    if (!id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Family member ID is required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const member = await familyService.update(id, {
      name: data.name,
      relation: data.relation,
      dob: data.dob ? new Date(data.dob) : undefined,
      isDependent: data.isDependent,
      nomineeEligible: data.nomineeEligible,
      accessLevel: data.accessLevel,
    });

    const response: FamilyMemberResponse = {
      id: member.id,
      userId: member.userId,
      name: member.name,
      relation: member.relation,
      dob: member.dob?.toISOString() || null,
      isDependent: member.isDependent,
      nomineeEligible: member.nomineeEligible,
      accessLevel: member.accessLevel,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Family PATCH]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
export const PATCH = withAuth(withErrorHandler(patchHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);