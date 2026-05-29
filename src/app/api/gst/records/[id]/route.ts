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

function mapYesNoToBoolean(value: unknown) {
  if (value === 'Yes') return true;
  if (value === 'No') return false;
  return null;
}

async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const record = await prisma.gstRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!record) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'GST record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse(record);
  } catch (error) {
    console.error('[GST Record GET]', error);
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

    const existing = await prisma.gstRecord.findFirst({
      where: { id, userId: authContext.userId },
    });

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'GST record not found', StatusCodes.NOT_FOUND);
    }

    const updated = await prisma.gstRecord.update({
      where: { id },
      data: {
        gstin: data.gstin !== undefined ? String(data.gstin) : existing.gstin,
        businessName: data.businessName !== undefined ? (data.businessName ? String(data.businessName) : null) : existing.businessName,
        filingFrequency: data.filingFrequency !== undefined ? (data.filingFrequency ? String(data.filingFrequency) : null) : existing.filingFrequency,
        lastFilingDate: data.lastFilingDate !== undefined ? parseDateOrNull(data.lastFilingDate) : existing.lastFilingDate,
        nextDueDate: data.nextDueDate !== undefined ? parseDateOrNull(data.nextDueDate) : existing.nextDueDate,
        gstr1Filed: data.gstr1Filed !== undefined ? mapYesNoToBoolean(data.gstr1Filed) : existing.gstr1Filed,
        gstr3bFiled: data.gstr3bFiled !== undefined ? mapYesNoToBoolean(data.gstr3bFiled) : existing.gstr3bFiled,
        annualReturnFiled: data.annualReturnFiled !== undefined ? mapYesNoToBoolean(data.annualReturnFiled) : existing.annualReturnFiled,
        status: data.status !== undefined ? String(data.status) : existing.status,
        documentUrl: data.documentUrl !== undefined ? (data.documentUrl ? String(data.documentUrl) : null) : existing.documentUrl,
        notes: data.notes !== undefined ? (data.notes ? String(data.notes) : null) : existing.notes,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[GST Record PUT]', error);
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
    const deleted = await prisma.gstRecord.deleteMany({
      where: { id, userId: authContext.userId },
    });

    if (!deleted.count) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'GST record not found', StatusCodes.NOT_FOUND);
    }

    return successResponse({ id });
  } catch (error) {
    console.error('[GST Record DELETE]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
