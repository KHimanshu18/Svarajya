import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/subscriptionService';
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
    const subs = await subscriptionService.getForUser(authContext.userId);
    return successResponse(subs);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    if (!data.name || !data.amount || !data.renewalDate) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Name, amount, and renewal date are required', StatusCodes.BAD_REQUEST);
    }

    const sub = await subscriptionService.createForUser(authContext.userId, {
      ...data,
      renewalDate: new Date(data.renewalDate),
      lastUsedDate: data.lastUsedDate ? new Date(data.lastUsedDate) : undefined,
    });
    return successResponse(sub, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
