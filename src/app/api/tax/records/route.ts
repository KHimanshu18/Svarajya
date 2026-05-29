import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest) {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const records = await prisma.taxRecord.findMany({
      where: { userId: authContext.userId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ records });
  } catch (error) {
    console.error('[Tax Records GET]', error);
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

    if (
      !data?.assessmentYear ||
      !data?.financialYear ||
      !data?.filingStatus ||
      !data?.itrType ||
      data?.taxPayable === undefined ||
      data?.taxPayable === null ||
      data?.taxPaid === undefined ||
      data?.taxPaid === null
    ) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, 'Missing required fields', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await prisma.taxRecord.create({
      data: {
        userId: authContext.userId,
        assessmentYear: String(data.assessmentYear),
        financialYear: String(data.financialYear),
        status: String(data.filingStatus),
        filingType: String(data.itrType),
        filingDate: data.filingDate ? new Date(data.filingDate) : null,
        taxDue: Number(data.taxPayable),
        taxPaid: Number(data.taxPaid),
        acknowledgementNumber: data.acknowledgementNumber || null,
        documentUrl: data.documentUrl ? String(data.documentUrl) : null,
        notes: data.notes ? String(data.notes) : null,
      },
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Tax Records POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
