import { NextRequest, NextResponse } from 'next/server';
import { insuranceService } from '@/lib/services/insuranceService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';
import { InsurancePolicyResponse, CreateInsuranceRequest } from '@/lib/types/api.types';

/**
 * GET /api/insurance
 * Get all insurance policies for user
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const policies = await insuranceService.getForUser(authContext.userId);
    const stats = await insuranceService.getStats(authContext.userId);

    const responses: InsurancePolicyResponse[] = policies.map((policy) => ({
      id: policy.id,
      userId: policy.userId,
      type: policy.type,
      policyNumber: policy.policyNumber,
      insurerName: policy.insurerName,
      sumAssured: policy.sumAssured,
      premium: policy.premium,
      premiumFrequency: policy.premiumFrequency,
      dueDate: policy.dueDate.toISOString(),
      maturityDate: policy.maturityDate?.toISOString() || null,
      nomineeId: policy.nomineeId,
      agentContact: policy.agentContact,
      status: policy.status,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      coverage: policy.coverage.map(c => ({
        id: c.id,
        memberId: c.memberId,
        member: c.member
      }))
    }));

    return successResponse({
      policies: responses,
      stats
    });
  } catch (error) {
    console.error('[Insurance GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/insurance
 * Create new insurance policy
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data: CreateInsuranceRequest = await request.json();

    // Validation
    if (!data.type || !data.policyNumber || !data.sumAssured || !data.premium || !data.dueDate) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields (type, policyNumber, sumAssured, premium, dueDate)',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    if (data.premium <= 0) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Premium must be a positive amount',
          StatusCodes.UNPROCESSABLE_ENTITY
        );
    }

    const policy = await insuranceService.create(authContext.userId, {
      ...data,
      dueDate: new Date(data.dueDate),
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
    });

    const response: InsurancePolicyResponse = {
      id: policy.id,
      userId: policy.userId,
      type: policy.type,
      policyNumber: policy.policyNumber,
      insurerName: policy.insurerName,
      sumAssured: policy.sumAssured,
      premium: policy.premium,
      premiumFrequency: policy.premiumFrequency,
      dueDate: policy.dueDate.toISOString(),
      maturityDate: policy.maturityDate?.toISOString() || null,
      nomineeId: policy.nomineeId,
      agentContact: policy.agentContact,
      status: policy.status,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      coverage: policy.coverage.map(c => ({
        id: c.id,
        memberId: c.memberId,
        member: c.member
      }))
    };

    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Insurance POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
