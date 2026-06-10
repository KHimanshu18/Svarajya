import { NextRequest, NextResponse } from 'next/server';
import { educationService } from '@/lib/services/educationService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

// Per-user in-memory cache for education data
const educationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/education
 * Get all education records for the user with caching
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
  const cached = educationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const cachedResponse = successResponse(cached.data);
    cachedResponse.headers.set('Cache-Control', 'private, max-age=30');
    return cachedResponse;
  }

  try {
    const records = await educationService.getForUser(authContext.userId);

    // Store in cache
    educationCache.set(cacheKey, { data: records, timestamp: Date.now() });

    return successResponse(records);
  } catch (error) {
    console.error('[Education GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/education
 * Create an education record - invalidates cache
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
  educationCache.delete(authContext.userId);

  try {
    const body = await request.json();

    const createData = {
      degree: body.degree,
      institute: body.institution || body.institute,
      yearCompleted: body.year ? parseInt(body.year) : undefined,
      specialization: body.specialization,
      certificateUrl: body.certificateId,
      familyMemberId: body.familyMemberId || undefined,

      // Education Loan Toggle
      linkedLoanId: body.hasLoan ? "EDUCATION_LOAN_ACTIVE" : null,
    };

    if (!createData.degree || !createData.institute) {
      return errorResponse(
        ErrorCodes.INVALID_REQUEST,
        'Degree and institution are required',
        StatusCodes.BAD_REQUEST
      );
    }

    const record = await educationService.createForUser(authContext.userId, createData);

    return successResponse(record, StatusCodes.CREATED, 'Education record created successfully');
  } catch (error) {
    console.error('[Education POST]', error);
    return handlePrismaError(error);
  }
}

// Also add DELETE handler to invalidate cache
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
  educationCache.delete(authContext.userId);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Education record ID is required',
        StatusCodes.BAD_REQUEST
      );
    }

    await educationService.delete(id);
    return successResponse({ message: 'Education record deleted successfully' });
  } catch (error) {
    console.error('[Education DELETE]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);