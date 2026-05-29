import { NextRequest, NextResponse } from 'next/server';
import { gstService } from '@/lib/services/gstService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const records = await gstService.getForUser(authContext.userId);
    return successResponse({ records });
  } catch (error) {
    console.error('[Kar GST GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();

    if (!data.gstin) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'GSTIN is required', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await gstService.create({
      userId: authContext.userId,
      gstin: data.gstin,
      businessName: data.businessName || null,
      registrationType: data.registrationType || null,
      filingFrequency: data.filingFrequency || null,
      lastFilingDate: data.lastFilingDate ? new Date(data.lastFilingDate) : undefined,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
      gstr1Filed: data.gstr1Filed === 'Yes' ? true : data.gstr1Filed === 'No' ? false : undefined,
      gstr3bFiled: data.gstr3bFiled === 'Yes' ? true : data.gstr3bFiled === 'No' ? false : undefined,
      annualReturnFiled: data.annualReturnFiled === 'Yes' ? true : data.annualReturnFiled === 'No' ? false : undefined,
      status: data.status || 'ACTIVE',
      documentUrl: data.documentUrl || null,
      notes: data.notes || null,
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Kar GST POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
