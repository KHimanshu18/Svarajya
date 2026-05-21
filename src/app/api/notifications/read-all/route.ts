import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

async function putHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const result = await notificationService.markAllAsRead(authContext.userId);
    return successResponse(result);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
