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

async function handleGET(request: NextRequest) {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const records = await prisma.gstRecord.findMany({
      where: { userId: authContext.userId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ records });
  } catch (error) {
    console.error('[GST Records GET]', error);
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

    if (!data?.gstin) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, 'GSTIN is required', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await prisma.gstRecord.create({
      data: {
        userId: authContext.userId,
        gstin: String(data.gstin),
        businessName: data.businessName ? String(data.businessName) : null,
        filingFrequency: data.filingFrequency ? String(data.filingFrequency) : null,
        lastFilingDate: parseDateOrNull(data.lastFilingDate),
        nextDueDate: parseDateOrNull(data.nextDueDate),
        gstr1Filed: mapYesNoToBoolean(data.gstr1Filed),
        gstr3bFiled: mapYesNoToBoolean(data.gstr3bFiled),
        annualReturnFiled: mapYesNoToBoolean(data.annualReturnFiled),
        status: data.status ? String(data.status) : 'ACTIVE',
        documentUrl: data.documentUrl ? String(data.documentUrl) : null,
        notes: data.notes ? String(data.notes) : null,
      },
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[GST Records POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
