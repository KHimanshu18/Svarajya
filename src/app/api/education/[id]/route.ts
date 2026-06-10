import { NextRequest, NextResponse } from 'next/server';
import { educationService } from '@/lib/services/educationService';
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
 * DELETE /api/education/[id]
 * Delete an education record
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  const { id } = await params;

  try {
    // 1. Verify ownership
    const record = await educationService.findById(id);
    if (!record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Education record not found',
        StatusCodes.NOT_FOUND
      );
    }

    if (record.userId !== authContext.userId) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Not authorized to delete this record',
        StatusCodes.FORBIDDEN
      );
    }

    // 2. Delete
    await educationService.delete(id);

    return successResponse({ message: 'Education record deleted successfully' });
  } catch (error) {
    console.error('[Education DELETE]', error);
    return handlePrismaError(error);
  }
}

/**
 * GET /api/education/[id]
 * Get an education record
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  const { id } = await params;

  try {
    const record = await educationService.findById(id);
    if (!record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Education record not found',
        StatusCodes.NOT_FOUND
      );
    }

    if (record.userId !== authContext.userId) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Not authorized to view this record',
        StatusCodes.FORBIDDEN
      );
    }

    return successResponse(record);
  } catch (error) {
    console.error('[Education GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/education/[id]
 * Update an education record
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  const { id } = await params;

  try {
    const record = await educationService.findById(id);
    if (!record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Education record not found',
        StatusCodes.NOT_FOUND
      );
    }

    if (record.userId !== authContext.userId) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Not authorized to update this record',
        StatusCodes.FORBIDDEN
      );
    }

    const data = await request.json();

    // Determine if family member changed
    const newFamilyMemberId: string | null = data.familyMemberId || null;
    const familyMemberChanged = (record as any).familyMemberId !== newFamilyMemberId;

    const updatedRecord = await educationService.update(id, {
      degree: data.degree,
      institute: data.institution,
      yearCompleted: data.year ? parseInt(data.year) : undefined,
      specialization: data.specialization,
      certificateUrl: data.certificateId,

      linkedLoanId: data.hasLoan
        ? "EDUCATION_LOAN_ACTIVE"
        : null,

      ...(familyMemberChanged ? { familyMemberId: newFamilyMemberId } : {}),
    });

    // Sync document_meta and Google Drive folder if family member changed
    if (familyMemberChanged) {
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
        'Education'
      );
    }

    return successResponse(updatedRecord);
  } catch (error) {
    console.error('[Education PUT]', error);
    return handlePrismaError(error);
  }
}

export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);
