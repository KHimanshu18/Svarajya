import { NextRequest, NextResponse } from 'next/server';
import { taxService } from '@/lib/services/taxService';
import { gstService } from '@/lib/services/gstService';
import { dinService } from '@/lib/services/dinService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const [taxCount, gstCount, dinCount, gstRecords, dinRecords] = await Promise.all([
      taxService.countForUser(authContext.userId),
      gstService.countForUser(authContext.userId),
      dinService.countForUser(authContext.userId),
      gstService.findMany({ userId: authContext.userId, nextDueDate: { not: null } }, { orderBy: { nextDueDate: 'asc' }, take: 1 }),
      dinService.findMany({ userId: authContext.userId, expiryDate: { not: null } }, { orderBy: { expiryDate: 'asc' }, take: 1 }),
    ]);

    const nextGstDue = gstRecords.length > 0 ? gstRecords[0].nextDueDate?.toISOString() ?? null : null;
    const nextDinExpiry = dinRecords.length > 0 ? dinRecords[0].expiryDate?.toISOString() ?? null : null;

    return successResponse({
      taxCount,
      gstCount,
      dinCount,
      nextGstDue,
      nextDinExpiry,
    });
  } catch (error) {
    console.error('[Kar Summary GET]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
