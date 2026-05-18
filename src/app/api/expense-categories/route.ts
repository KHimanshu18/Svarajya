import { NextRequest, NextResponse } from 'next/server';
import { expenseCategoryService } from '@/lib/services/expenseCategoryService';
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
    const cats = await expenseCategoryService.getForUser(authContext.userId);
    return successResponse(cats);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    if (!data.name) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Name is required', StatusCodes.BAD_REQUEST);

    const cat = await expenseCategoryService.createForUser(authContext.userId, data);
    return successResponse(cat, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
