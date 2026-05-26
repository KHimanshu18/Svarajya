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
import { InsurancePolicyResponse, UpdateInsuranceRequest } from '@/lib/types/api.types';
import { syncDocumentMemberAssociation } from '@/lib/googleDriveUtils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/insurance/[id]
 * Get single insurance policy
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
    const policy = await insuranceService.getById(id, authContext.userId);

    if (!policy) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Policy not found', StatusCodes.NOT_FOUND);
    }

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
      documentId: (policy as any).documentId,
      reminderId: (policy as any).reminderId,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      coverage: policy.coverage.map(c => ({
        id: c.id,
        memberId: c.memberId,
        member: c.member
      }))
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Insurance GET ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/insurance/[id]
 * Update insurance policy
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
    const data: UpdateInsuranceRequest & { documentFamilyMemberId?: string | null } = await request.json();
    const { documentFamilyMemberId, ...policyData } = data;

    const policy = await insuranceService.update(id, authContext.userId, {
      ...policyData,
      dueDate: policyData.dueDate ? new Date(policyData.dueDate) : undefined,
      maturityDate: policyData.maturityDate ? new Date(policyData.maturityDate) : undefined,
    });

    if (!policy) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Policy not found', StatusCodes.NOT_FOUND);
    }

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
        'Insurance'
      );
    }

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
      documentId: (policy as any).documentId,
      reminderId: (policy as any).reminderId,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      coverage: policy.coverage.map(c => ({
        id: c.id,
        memberId: c.memberId,
        member: c.member
      }))
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Insurance PUT ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/insurance/[id]
 * Delete insurance policy
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
    const success = await insuranceService.delete(id, authContext.userId);

    if (!success) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Policy not found or could not be deleted', StatusCodes.NOT_FOUND);
    }

    return successResponse({ success: true }, StatusCodes.OK, 'Policy deleted successfully');
  } catch (error) {
    console.error('[Insurance DELETE ID]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
