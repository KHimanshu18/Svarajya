import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

function parseWaitingPeriod(value: string): number {
  switch (value) {
    case 'Immediately': return 0;
    case 'After 24 hours': return 24;
    case 'After 72 hours': return 72;
    case 'After 7 days': return 168;
    default: return 0;
  }
}

async function handleGET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  try {
    const record = await prisma.successionEmergency.findUnique({ where: { userId: auth.userId } });
    return successResponse(record || null);
  } catch (error) {
    console.error('[Succession Emergency GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const body = await request.json();
    
    const data = {
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      secondaryContactName: body.secondaryContactName,
      secondaryContactPhone: body.secondaryContactPhone,
      verificationMethod: body.verificationMethod,
      activationWaitingPeriod: parseWaitingPeriod(body.activationWaitingPeriod),
      assetAccessScope: body.assetAccessScope || [],
    };
    
    const upsert = await prisma.successionEmergency.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...data },
      update: { ...data, lastUpdated: new Date() },
    });
    return successResponse(upsert);
  } catch (error) {
    console.error('[Succession Emergency POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);