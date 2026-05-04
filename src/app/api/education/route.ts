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

/**
 * POST /api/education
 * Create an education record
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
    const body = await request.json();

    const createData = {
      degree: body.degree,
      institute: body.institution || body.institute,
      yearCompleted: body.year ? parseInt(body.year) : undefined,
      specialization: body.specialization,
      certificateUrl: body.certificateId,
      // Note: for hasLoan we don't have linkedLoanId created yet directly here,
      // keeping the structure aligned with how profile handled it.
    };

    if (!createData.degree || !createData.institute) {
      return errorResponse(
        ErrorCodes.INVALID_REQUEST,
        'Degree and institution are required',
        StatusCodes.BAD_REQUEST
      );
    }

    const record = await educationService.createForUser(authContext.userId, createData);

    return successResponse({ data: record, message: 'Education record created successfully' });
  } catch (error) {
    console.error('[Education POST]', error);
    return handlePrismaError(error);
  }
}

export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
