import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const records = await prisma.successionNominee.findMany({ where: { userId: auth.userId } });
    return successResponse(records);
  } catch (error) {
    console.error('[Succession Nominees GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const body = await request.json();
    const { assetType, assetId, nomineeId, nomineeName, relationship, sharePercentage } = body;
    if (!assetType || !assetId || !nomineeId) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, 'assetType, assetId and nomineeId are required', StatusCodes.BAD_REQUEST);
    }

    const created = await prisma.successionNominee.create({
      data: {
        userId: auth.userId,
        assetType: String(assetType),
        assetId: String(assetId),
        nomineeId: String(nomineeId),
        nomineeName: nomineeName || '',
        relationship: relationship || '',
        sharePercentage: typeof sharePercentage === 'number' ? sharePercentage : 100,
      }
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Succession Nominees POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
