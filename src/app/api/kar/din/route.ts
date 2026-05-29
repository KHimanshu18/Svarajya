import { NextRequest, NextResponse } from 'next/server';
import { dinService } from '@/lib/services/dinService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const records = await dinService.getForUser(authContext.userId);
    return successResponse({ records });
  } catch (error) {
    console.error('[Kar DIN GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();

    if (!data.dinNumber) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'DIN number is required', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await dinService.create({
      userId: authContext.userId,
      dinNumber: data.dinNumber,
      companyName: data.companyName || null,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      dinKycStatus: data.dinKycStatus || null,
      dscExpiryDate: data.dscExpiryDate ? new Date(data.dscExpiryDate) : undefined,
      mcaFilingStatus: data.mcaFilingStatus || null,
      directorSince: data.directorSince ? new Date(data.directorSince) : undefined,
      status: data.status || 'VALID',
      documentUrl: data.documentUrl || null,
      notes: data.notes || null,
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Kar DIN POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
