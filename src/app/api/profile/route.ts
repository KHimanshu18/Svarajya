import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/lib/services/userService';
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

/**
 * GET /api/profile
 * Get current user's profile
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

  try {
    let user = await userService.getUserWithProfile(authContext.userId);

    if (!user) {
      // Self-heal: Create Prisma user if missing
      await userService.syncUserWithSupabase(authContext.userId, authContext.email || '', '');
      user = await userService.getUserWithProfile(authContext.userId);
      
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
      createdAt: userAny.createdAt.toISOString(),
      updatedAt: userAny.updatedAt.toISOString(),
      isFirstLogin: userAny.is_first_login ?? true,
      isMobileVerified,
      familyMembers: userAny.familyMembers || [],
      education: userAny.education || [],
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Profile GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/profile
 * Create or update user profile
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  let authContext = getAuthContext(request);
  let data: any;
  
  try {
    data = await request.json();
  } catch (e) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON', StatusCodes.BAD_REQUEST);
  }

  // Check for internal secret to allow unauthenticated user creation (signup sync)
  const INTERNAL_SECRET = process.env.NEXT_PUBLIC_INTERNAL_SECRET || 'SVARAJYA_INTERNAL_SYNC_2025';
  const isInternalSync = data._internal_secret === INTERNAL_SECRET;

  if (!authContext && !isInternalSync) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  // If internal sync bypass, mock the authContext
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

  // Ensure authContext is definitely defined now
  if (!authContext) {
     return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication failed', StatusCodes.UNAUTHORIZED);
  }

  try {
    // Log incoming request body for debugging
    console.log('[Profile POST] Received data:', JSON.stringify(data, null, 2));

    // Validate required fields - allow updates when any valid field is present
    const hasValidFields = data.name !== undefined ||
                          typeof data.isFirstLogin === 'boolean' ||
                          data.dob !== undefined ||
                          data.gender !== undefined ||
                          data.maritalStatus !== undefined ||
                          data.occupationType !== undefined ||
                          data.employerCompany !== undefined ||
                          data.language !== undefined ||
                          data.phone !== undefined ||
                          data.email !== undefined ||
                          (data.familyMembers !== undefined && Array.isArray(data.familyMembers)) ||
                          (data.education !== undefined && Array.isArray(data.education));

    if (!hasValidFields) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'At least one valid field must be provided for update',
        StatusCodes.UNPROCESSABLE_ENTITY,
        { field: 'general' }
      );
    }

    // Update user profile
    // Prevent updating mobile/email after verification in backend
    const patch: any = {
      dob: data.dob ? new Date(data.dob) : undefined,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      occupationType: data.occupationType,
      employerCompany: data.employerCompany,
      language: data.language,
      familyMembers: data.familyMembers,
      education: data.education,
    };
    if (data.name !== undefined) patch.name = data.name;
    if (typeof data.isFirstLogin === 'boolean') patch.is_first_login = data.isFirstLogin;

    // Only allow email/mobile change if not verified
    let user = await userService.findById(authContext.userId);
    if (!user) {
      const createData: any = {
        id: authContext.userId,
        email: authContext.email,
        name: data.name,
        status: 'PENDING_VERIFICATION',
        profileType: 'INDIVIDUAL_SALARIED',
      };

      if (data.phone) {
        createData.phone = data.phone;
      }
      if (data.dob) {
        createData.dob = new Date(data.dob);
      }
      if (data.gender) {
        createData.gender = data.gender;
      }
      if (data.maritalStatus) {
        createData.maritalStatus = data.maritalStatus;
      }
      if (data.occupationType) {
        createData.occupationType = data.occupationType;
      }
      if (data.language) {
        createData.language = data.language;
      }
      if (data.familyMembers && Array.isArray(data.familyMembers)) {
        // Handle family members as nested create for new users
        createData.familyMembers = {
          create: data.familyMembers.map((member: any) => ({
            name: member.name,
            relation: member.relationship || member.relation,
            dob: member.dob ? new Date(member.dob) : null,
            isDependent: member.dependent ?? member.isDependent ?? false,
            nomineeEligible: member.nomineeEligible ?? false,
            accessLevel: member.accessRole || member.accessLevel || 'read',
          })),
        };
      }
      if (data.education && Array.isArray(data.education)) {
        createData.education = {
          create: data.education.map((edu: any) => ({
            degree: edu.degree,
            institute: edu.institution || edu.institute,
            yearCompleted: edu.year ? parseInt(edu.year) : null,
            specialization: edu.specialization || null,
            linkedLoanId: edu.hasLoan ? "has_loan" : null,
            certificateUrl: edu.certificateUrl || null,
          })),
        };
      }
      if (typeof data.isFirstLogin === 'boolean') {
        createData.is_first_login = data.isFirstLogin;
      }

      user = await userService.create(createData);
    } else {
      const existingAny: any = user;
      const isEmailVerified = existingAny.is_email_verified ?? existingAny.isEmailVerified ?? false;
      const isMobileVerified = existingAny.is_mobile_verified ?? existingAny.isMobileVerified ?? false;

      if (data.email && !isEmailVerified) {
        patch.email = data.email;
      }

      if (data.phone && !isMobileVerified) {
        patch.phone = data.phone;
      }

      // Handle family members update - replace all existing family members
      if (data.familyMembers && Array.isArray(data.familyMembers)) {
        patch.familyMembers = {
          deleteMany: {}, // Delete all existing family members
          create: data.familyMembers.map((member: any) => ({
            name: member.name,
            relation: member.relationship || member.relation,
            dob: member.dob ? new Date(member.dob) : null,
            isDependent: member.dependent ?? member.isDependent ?? false,
            nomineeEligible: member.nomineeEligible ?? false,
            accessLevel: member.accessRole || member.accessLevel || 'read',
          })),
        };
      }

      // Handle education update - replace all existing education records
      if (data.education && Array.isArray(data.education)) {
        patch.education = {
          deleteMany: {},
          create: data.education.map((edu: any) => ({
            degree: edu.degree,
            institute: edu.institution || edu.institute,
            yearCompleted: edu.year ? parseInt(edu.year) : null,
            specialization: edu.specialization || null,
            linkedLoanId: edu.hasLoan ? "has_loan" : null,
            certificateUrl: edu.certificateUrl || null,
          })),
        };
      }

      user = await userService.update(authContext.userId, patch);
    }

    // Sync to Supabase Auth metadata
    if (data.name !== undefined || data.phone !== undefined) {
      try {
        const supabase = await createClient();
        const updateData: any = {};
        if (data.name !== undefined) updateData.full_name = data.name;
        if (data.phone !== undefined) updateData.phone = data.phone;
        
        // This relies on the authenticated session cookie which is automatically
        // sent with the request when making a POST to /api/profile
        const { error: syncError } = await supabase.auth.updateUser({
          data: updateData
        });
        
        if (syncError) {
          console.error("[Profile POST] Failed to sync to Supabase Auth:", syncError);
        }
      } catch (err) {
        console.error("[Profile POST] Error syncing to Supabase Auth:", err);
      }
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
      createdAt: userAny.createdAt.toISOString(),
      updatedAt: userAny.updatedAt.toISOString(),
      isFirstLogin: userAny.is_first_login ?? true,
    };

    return successResponse(response, StatusCodes.CREATED, 'Profile updated');
  } catch (error: any) {
    if (error?.code !== 'ECONNRESET' && error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
      console.error('[Profile POST]', error);
    }
    return handlePrismaError(error);
  }
}

// Apply middleware
export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(
  withErrorHandler(postHandler),
  AuthLevel.PUBLIC
);
