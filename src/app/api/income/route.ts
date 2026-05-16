import { NextRequest, NextResponse } from 'next/server';
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
import { IncomeStreamResponse, CreateIncomeRequest, UpdateIncomeRequest } from '@/lib/types/api.types';

/**
 * GET /api/income
 * Get all income streams for user
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const streams = await incomeService.getForUser(authContext.userId);

    const responses: IncomeStreamResponse[] = streams.map((stream) => ({
      id: stream.id,
      userId: stream.userId,
      type: stream.type,
      source: stream.source,
      frequency: stream.frequency,
      amountGross: stream.amountGross,
      deductions: stream.deductions,
      amountNet: stream.amountNet,
      creditedAccountId: stream.creditedAccountId,
      riskLevel: stream.riskLevel || undefined,
      expectedGrowthPct: stream.expectedGrowthPct || undefined,
      historicalIncome: stream.historicalIncome || undefined,
      notes: stream.notes || undefined,
      allocationMonths: stream.allocationMonths || undefined,
      tdsAmount: stream.tdsAmount || undefined,
      description: stream.description || undefined,
      isPrimary: stream.isPrimary,
      familyMemberId: stream.familyMemberId || undefined,
      lastReviewedAt: stream.lastReviewedAt?.toISOString() || null,
      createdAt: stream.createdAt.toISOString(),
      updatedAt: stream.updatedAt.toISOString(),
    }));

    return successResponse(responses);
  } catch (error) {
    console.error('[Income GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/income
 * Create or update income stream
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const data: CreateIncomeRequest | (UpdateIncomeRequest & { id?: string }) = await request.json();

    // Validate required fields
    if (!data.type || !data.amountGross || data.amountNet === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Type, amountGross, and amountNet are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let stream;

    if ('id' in data && data.id) {
      // Update existing
      stream = await incomeService.update(data.id, {
        type: data.type,
        source: data.source,
        frequency: data.frequency?.toUpperCase(),
        amountGross: data.amountGross,
        deductions: data.deductions,
        amountNet: data.amountNet,
        creditedAccountId: data.creditedAccountId,
        riskLevel: data.riskLevel,
        expectedGrowthPct: data.expectedGrowthPct,
        historicalIncome: data.historicalIncome,
        notes: data.notes,
        allocationMonths: data.allocationMonths,
        tdsAmount: data.tdsAmount,
        description: data.description,
        isPrimary: data.isPrimary,
        familyMemberId: data.familyMemberId,
        lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined,
      });
    } else {
      // Create new
      stream = await incomeService.createForUser(authContext.userId, {
        type: data.type,
        source: data.source,
        frequency: (data.frequency || 'MONTHLY').toUpperCase(),
        amountGross: data.amountGross,
        deductions: data.deductions,
        amountNet: data.amountNet,
        creditedAccountId: data.creditedAccountId,
        riskLevel: data.riskLevel,
        expectedGrowthPct: data.expectedGrowthPct,
        historicalIncome: data.historicalIncome,
        notes: data.notes,
        allocationMonths: data.allocationMonths,
        tdsAmount: data.tdsAmount,
        description: data.description,
        isPrimary: data.isPrimary,
        familyMemberId: data.familyMemberId,
        lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined,
      });
    }

    const response: IncomeStreamResponse = {
      id: stream.id,
      userId: stream.userId,
      type: stream.type,
      source: stream.source,
      frequency: stream.frequency,
      amountGross: stream.amountGross,
      deductions: stream.deductions,
      amountNet: stream.amountNet,
      creditedAccountId: stream.creditedAccountId,
      riskLevel: stream.riskLevel,
      expectedGrowthPct: stream.expectedGrowthPct,
      historicalIncome: stream.historicalIncome,
      notes: stream.notes,
      allocationMonths: stream.allocationMonths,
      tdsAmount: stream.tdsAmount,
      description: stream.description,
      isPrimary: stream.isPrimary,
      familyMemberId: stream.familyMemberId,
      lastReviewedAt: stream.lastReviewedAt?.toISOString() || null,
      createdAt: stream.createdAt.toISOString(),
      updatedAt: stream.updatedAt.toISOString(),
    };

    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Income POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
