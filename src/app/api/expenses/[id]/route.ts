import { NextRequest, NextResponse } from 'next/server';
import { expenseService } from '@/lib/services/expenseService';
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
    const familyMemberId = data.familyMemberId ?? data.linkedFamilyMemberId;
    const updated = await expenseService.update(id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      familyMemberId: familyMemberId ?? undefined,
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
    await expenseService.delete(id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
