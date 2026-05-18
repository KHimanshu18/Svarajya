import { NextRequest, NextResponse } from 'next/server';
import { loanService } from '@/lib/services/loanService';
import { incomeService } from '@/lib/services/incomeService';
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
 * GET /api/loans
 * Get all loans and metrics for user
 */
async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const loans = await loanService.getForUser(authContext.userId);
    const totalOutstanding = await loanService.getTotalOutstanding(authContext.userId);
    const totalEMI = await loanService.getTotalEMI(authContext.userId);

    // Calculate EMI Burden
    const incomes = await incomeService.getForUser(authContext.userId).catch(() => []);
    const monthlyNetIncome = incomes.reduce((sum, inc) => {
      let multiplier = 1;
      if (inc.frequency === 'ANNUAL') multiplier = 1/12;
      else if (inc.frequency === 'QUARTERLY') multiplier = 1/3;
      return sum + (inc.amountNet * multiplier);
    }, 0);

    const emiBurdenRatio = monthlyNetIncome > 0 ? (totalEMI / monthlyNetIncome) * 100 : 0;

    return successResponse({
      loans,
      metrics: {
        totalOutstanding,
        totalEMI,
        monthlyNetIncome,
        emiBurdenRatio,
        activeCount: loans.filter(l => l.status === 'ACTIVE').length
      }
    });
  } catch (error) {
    console.error('[Loans GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/loans
 * Create a new loan account
 */
async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data = await request.json();

    // Basic validation
    if (!data.type || !data.principal || !data.emi || !data.startDate) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Loan type, principal, EMI, and start date are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const loan = await loanService.createForUser(authContext.userId, {
      type: data.type,
      lenderName: data.lenderName,
      principal: Number(data.principal),
      outstandingAmount: Number(data.outstandingAmount || data.principal),
      emi: Number(data.emi),
      interestRate: Number(data.interestRate || 0),
      tenure: Number(data.tenure || 0),
      startDate: data.startDate,
      endDate: data.endDate,
      linkedPropertyId: data.linkedPropertyId,
      status: data.status || 'ACTIVE'
    });

    return successResponse(loan, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Loans POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
