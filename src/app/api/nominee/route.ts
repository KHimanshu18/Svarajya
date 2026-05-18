import { NextRequest, NextResponse } from 'next/server';
import { nomineeService } from '@/lib/services/nomineeService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const mappings = await nomineeService.getForUser(authContext.userId);
    return successResponse(mappings);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();
    if (!data.assetRef || !data.assetType || !data.nomineeId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'assetRef, assetType, and nomineeId are required', StatusCodes.BAD_REQUEST);
    }

    const mapping = await nomineeService.upsertMapping(authContext.userId, {
      assetRef: data.assetRef,
      assetType: data.assetType,
      nomineeId: data.nomineeId,
      sharePercent: data.sharePercent !== undefined ? parseFloat(data.sharePercent) : 100,
      proofDocLinked: data.proofDocLinked !== undefined ? Boolean(data.proofDocLinked) : false,
      confirmed: data.confirmed !== undefined ? Boolean(data.confirmed) : false,
    });
    return successResponse(mapping, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
