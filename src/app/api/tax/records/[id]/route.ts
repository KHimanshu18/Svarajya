import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

function parseDateOrNull(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const record = await prisma.taxRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Tax record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse(record);
  } catch (error) {
    console.error('[Tax Record GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data = await request.json();

    const existing = await prisma.taxRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Tax record not found', StatusCodes.NOT_FOUND);
    }

    const updated = await prisma.taxRecord.update({
      where: { id },
      data: {
        assessmentYear: data.assessmentYear !== undefined ? String(data.assessmentYear) : existing.assessmentYear,
        financialYear: data.financialYear !== undefined ? String(data.financialYear) : existing.financialYear,
        status: data.filingStatus !== undefined ? String(data.filingStatus) : existing.status,
        filingType: data.itrType !== undefined ? String(data.itrType) : existing.filingType,
        filingDate: data.filingDate !== undefined ? (data.filingDate ? new Date(data.filingDate) : null) : existing.filingDate,
        taxDue: data.taxPayable !== undefined ? Number(data.taxPayable) : existing.taxDue,
        taxPaid: data.taxPaid !== undefined ? Number(data.taxPaid) : existing.taxPaid,
        acknowledgementNumber: data.acknowledgementNumber !== undefined ? (data.acknowledgementNumber || null) : existing.acknowledgementNumber,
        documentUrl: data.documentUrl !== undefined ? (data.documentUrl ? String(data.documentUrl) : null) : existing.documentUrl,
        notes: data.notes !== undefined ? (data.notes ? String(data.notes) : null) : existing.notes,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[Tax Record PUT]', error);
    return handlePrismaError(error);
  }
}

async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const deleted = await prisma.taxRecord.deleteMany({
      where: { id, userId: authContext.userId },
    });

    if (!deleted.count) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Tax record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse({ id });
  } catch (error) {
    console.error('[Tax Record DELETE]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
