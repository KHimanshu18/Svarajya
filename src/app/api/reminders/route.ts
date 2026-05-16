import { NextRequest, NextResponse } from 'next/server';
import { reminderService } from '@/lib/services/reminderService';
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
 * GET /api/reminders
 * Get all reminders for the authenticated user
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const reminders = await reminderService.getForUser(authContext.userId);
    return successResponse(reminders);
  } catch (error) {
    console.error('[Reminders GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/reminders
 * Create a new reminder
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data = await request.json();
    
    // Ensure targetDate is a Date object
    if (data.targetDate) {
      data.targetDate = new Date(data.targetDate);
    }

    const reminder = await reminderService.create(authContext.userId, data);
    return successResponse(reminder, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Reminders POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
