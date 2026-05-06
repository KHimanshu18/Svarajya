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

/**
 * GET /api/family
 * Get all family members for user
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const members = await familyService.getFamilyMembers(authContext.userId, limit, offset);

    const responses: FamilyMemberResponse[] = members.map((member) => ({
      id: member.id!,
      userId: member.userId!,
      name: member.name!,
      relation: member.relation!,
      dob: member.dob?.toISOString() || null,
      isDependent: member.isDependent!,
      nomineeEligible: member.nomineeEligible!,
      accessLevel: member.accessLevel!,
      createdAt: member.createdAt!.toISOString(),
      updatedAt: member.updatedAt!.toISOString(),
    }));

    return successResponse(responses);
  } catch (error) {
    console.error('[Family GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/family
 * Create or update family member
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
      // Update existing
      member = await familyService.update(data.id, {
        name: data.name,
        relation: data.relation,
        dob: data.dob ? new Date(data.dob) : undefined,
        isDependent: data.isDependent,
        nomineeEligible: data.nomineeEligible,
        accessLevel: data.accessLevel,
      });
    } else {
      // Create new
      member = await familyService.createForUser(authContext.userId, {
        name: data.name,
        relation: data.relation,
        dob: data.dob ? new Date(data.dob) : undefined,
        isDependent: data.isDependent,
        nomineeEligible: data.nomineeEligible,
        accessLevel: data.accessLevel,
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
 * Delete a family member by ID from query parameter
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

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);