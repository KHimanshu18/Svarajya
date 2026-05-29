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

async function handleGET(request: NextRequest) {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const records = await prisma.dinRecord.findMany({
      where: { userId: authContext.userId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ records });
  } catch (error) {
    console.error('[DIN Records GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest) {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data = await request.json();

    if (!data?.dinNumber) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, 'DIN number is required', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await prisma.dinRecord.create({
      data: {
        userId: authContext.userId,
        dinNumber: String(data.dinNumber),
        companyName: data.companyName ? String(data.companyName) : null,
        issueDate: parseDateOrNull(data.issueDate),
        expiryDate: parseDateOrNull(data.expiryDate),
        dinKycStatus: data.dinKycStatus || null,
        dscExpiryDate: parseDateOrNull(data.dscExpiryDate),
        mcaFilingStatus: data.mcaFilingStatus || null,
        directorSince: parseDateOrNull(data.directorSince),
        status: data.status ? String(data.status) : 'VALID',
        documentUrl: data.documentUrl ? String(data.documentUrl) : null,
        notes: data.notes ? String(data.notes) : null,
      },
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[DIN Records POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
