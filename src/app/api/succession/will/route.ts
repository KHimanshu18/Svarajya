import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  try {
    const record = await prisma.successionWill.findUnique({ where: { userId: auth.userId } });
    return successResponse(record || null);
  } catch (error) {
    console.error('[Succession Will GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const body = await request.json();
    // Upsert by userId
    const upsert = await prisma.successionWill.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...body },
      update: { ...body },
    });
    return successResponse(upsert);
  } catch (error) {
    console.error('[Succession Will POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
