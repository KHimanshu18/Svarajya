import { NextRequest, NextResponse } from 'next/server';
import { taxService } from '@/lib/services/taxService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const records = await taxService.getForUser(authContext.userId);
    return successResponse({ records });
  } catch (error) {
    console.error('[Kar Tax GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();

    if (!data.assessmentYear || !data.financialYear) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Assessment year and financial year are required', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await taxService.create({
      userId: authContext.userId,
      assessmentYear: data.assessmentYear,
      financialYear: data.financialYear,
      filingType: data.filingType || 'ITR',
      status: data.status || 'DRAFT',
      grossIncome: data.grossIncome !== undefined ? Number(data.grossIncome) : undefined,
      taxableIncome: data.taxableIncome !== undefined ? Number(data.taxableIncome) : undefined,
      taxPaid: data.taxPaid !== undefined ? Number(data.taxPaid) : undefined,
      taxDue: data.taxDue !== undefined ? Number(data.taxDue) : undefined,
      documentUrl: data.documentUrl || null,
      notes: data.notes || null,
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Kar Tax POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
