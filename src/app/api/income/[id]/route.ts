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
import { IncomeStreamResponse, UpdateIncomeRequest } from '@/lib/types/api.types';

/**
 * GET /api/income/[id]
 * Get single income stream
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const stream = await incomeService.findById(id);

    if (!stream || stream.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Income stream not found', StatusCodes.NOT_FOUND);
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

    return successResponse(response);
  } catch (error) {
    console.error('[Income GET ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/income/[id]
 * Update income stream
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data: UpdateIncomeRequest = await request.json();

    const stream = await incomeService.update(id, {
      ...data,
      frequency: data.frequency?.toUpperCase(),
      lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined,
    });

    if (!stream) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Income stream not found', StatusCodes.NOT_FOUND);
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

    return successResponse(response);
  } catch (error) {
    console.error('[Income PUT ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/income/[id]
 * Delete income stream
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const stream = await incomeService.findById(id);
    if (!stream || stream.userId !== authContext.userId) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Income stream not found', StatusCodes.NOT_FOUND);
    }

    await incomeService.delete(id);

    return successResponse({ success: true }, StatusCodes.OK, 'Income stream deleted successfully');
  } catch (error) {
    console.error('[Income DELETE ID]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
