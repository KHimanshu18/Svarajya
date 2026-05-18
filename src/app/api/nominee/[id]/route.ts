import { NextRequest, NextResponse } from 'next/server';
import { nomineeService } from '@/lib/services/nomineeService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    await nomineeService.delete(id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
