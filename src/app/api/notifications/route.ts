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

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const notifications = await notificationService.getForUser(authContext.userId);
    return successResponse(notifications);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    if (!data.body || !data.channel) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'body and channel are required', StatusCodes.BAD_REQUEST);
    }

    const notification = await notificationService.createNotification(authContext.userId, {
      templateId: data.templateId || null,
      channel: data.channel,
      subject: data.subject || null,
      body: data.body,
      status: data.status || 'PENDING',
    });
    return successResponse(notification, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
