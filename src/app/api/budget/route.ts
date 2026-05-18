import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/services/budgetService';
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
 * GET /api/budget
 * Get current budget plan
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const budget = await budgetService.getForUser(authContext.userId);
    return successResponse(budget);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * POST /api/budget
 * Create or update budget plan
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    if (!data.totalMonthly || !data.categories) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Total amount and categories are required', StatusCodes.BAD_REQUEST);
    }

    const budget = await budgetService.createOrUpdate(authContext.userId, data);
    return successResponse(budget, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
