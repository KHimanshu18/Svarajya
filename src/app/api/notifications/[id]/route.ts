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

async function putHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    if (id === 'read-all') {
      const result = await notificationService.markAllAsRead(authContext.userId);
      return successResponse(result);
    } else {
      const notification = await notificationService.markAsRead(id, authContext.userId);
      return successResponse(notification);
    }
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const notification = await notificationService.delete(id);
    return successResponse(notification);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
