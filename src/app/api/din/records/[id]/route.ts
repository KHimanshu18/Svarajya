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
    const record = await prisma.dinRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'DIN record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse(record);
  } catch (error) {
    console.error('[DIN Record GET]', error);
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

    const existing = await prisma.dinRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'DIN record not found', StatusCodes.NOT_FOUND);
    }

    const updated = await prisma.dinRecord.update({
      where: { id },
      data: {
        dinNumber: data.dinNumber !== undefined ? String(data.dinNumber) : existing.dinNumber,
        companyName: data.companyName !== undefined ? (data.companyName ? String(data.companyName) : null) : existing.companyName,
        issueDate: data.issueDate !== undefined ? parseDateOrNull(data.issueDate) : existing.issueDate,
        expiryDate: data.expiryDate !== undefined ? parseDateOrNull(data.expiryDate) : existing.expiryDate,
        dinKycStatus: data.dinKycStatus !== undefined ? (data.dinKycStatus || null) : existing.dinKycStatus,
        dscExpiryDate: data.dscExpiryDate !== undefined ? parseDateOrNull(data.dscExpiryDate) : existing.dscExpiryDate,
        mcaFilingStatus: data.mcaFilingStatus !== undefined ? (data.mcaFilingStatus || null) : existing.mcaFilingStatus,
        directorSince: data.directorSince !== undefined ? parseDateOrNull(data.directorSince) : existing.directorSince,
        status: data.status !== undefined ? String(data.status) : existing.status,
        documentUrl: data.documentUrl !== undefined ? (data.documentUrl ? String(data.documentUrl) : null) : existing.documentUrl,
        notes: data.notes !== undefined ? (data.notes ? String(data.notes) : null) : existing.notes,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[DIN Record PUT]', error);
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
    const deleted = await prisma.dinRecord.deleteMany({
      where: { id, userId: authContext.userId },
    });

    if (!deleted.count) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'DIN record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse({ id });
  } catch (error) {
    console.error('[DIN Record DELETE]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
