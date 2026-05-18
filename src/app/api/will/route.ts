import { NextRequest, NextResponse } from 'next/server';
import { willService } from '@/lib/services/willService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const status = await willService.getForUser(authContext.userId);
    return successResponse(status || { existsFlag: false });
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    const status = await willService.upsertForUser(authContext.userId, {
      existsFlag: Boolean(data.existsFlag),
      location: data.location || null,
      executorName: data.executorName || null,
      executorContact: data.executorContact || null,
      instructions: data.instructions || null,
      lastReviewDate: data.lastReviewDate ? new Date(data.lastReviewDate) : undefined,
    });
    return successResponse(status, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
