import { NextRequest, NextResponse } from 'next/server';
import { loanService } from '@/lib/services/loanService';
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
 * GET /api/loans/[id]
 */
async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    const loan = await loanService.getById(id);

    if (!loan || loan.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Loan not found', StatusCodes.NOT_FOUND);
    }

    return successResponse(loan);
  } catch (error) {
    console.error('[Loans GET ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/loans/[id]
 */
async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    const existing = await loanService.getById(id);

    if (!existing || existing.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Loan not found', StatusCodes.NOT_FOUND);
    }

    const data = await request.json();
    const updated = await loanService.update(id, {
      ...data,
      principal: data.principal ? Number(data.principal) : undefined,
      outstandingAmount: data.outstandingAmount ? Number(data.outstandingAmount) : undefined,
      emi: data.emi ? Number(data.emi) : undefined,
      interestRate: data.interestRate ? Number(data.interestRate) : undefined,
      tenure: data.tenure ? Number(data.tenure) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[Loans PUT ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/loans/[id]
 */
async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    const existing = await loanService.getById(id);

    if (!existing || existing.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Loan not found', StatusCodes.NOT_FOUND);
    }

    await loanService.delete(id);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('[Loans DELETE ID]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
