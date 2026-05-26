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
import { syncDocumentMemberAssociation } from '@/lib/googleDriveUtils';
import { prisma } from '@/lib/prisma';

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
    const { documentFamilyMemberId, ...loanData } = data;

    const updated = await loanService.update(id, {
      ...loanData,
      principal: loanData.principal ? Number(loanData.principal) : undefined,
      outstandingAmount: loanData.outstandingAmount ? Number(loanData.outstandingAmount) : undefined,
      emi: loanData.emi ? Number(loanData.emi) : undefined,
      interestRate: loanData.interestRate ? Number(loanData.interestRate) : undefined,
      tenure: loanData.tenure ? Number(loanData.tenure) : undefined,
      startDate: loanData.startDate ? new Date(loanData.startDate) : undefined,
      endDate: loanData.endDate ? new Date(loanData.endDate) : undefined,
    });

    // Sync document family member association if provided
    if (documentFamilyMemberId !== undefined) {
      const newFamilyMemberId: string | null = documentFamilyMemberId || null;
      let newMemberName: string | null = null;
      if (newFamilyMemberId) {
        const member = await prisma.familyMember.findUnique({
          where: { id: newFamilyMemberId },
          select: { name: true },
        });
        newMemberName = member?.name ?? null;
      }
      await syncDocumentMemberAssociation(
        authContext.userId,
        id,
        newFamilyMemberId,
        newMemberName,
        'Loans'
      );
    }

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
