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

async function putHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    const updated = await subscriptionService.update(id, {
      ...data,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      lastUsedDate: data.lastUsedDate ? new Date(data.lastUsedDate) : undefined,
    });
    return successResponse(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    await subscriptionService.delete(id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
