import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const existing = await prisma.successionNominee.findUnique({ where: { id } });
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, 'Nominee mapping not found', StatusCodes.NOT_FOUND);
    if (existing.userId !== auth.userId) return errorResponse(ErrorCodes.FORBIDDEN, 'Not allowed', StatusCodes.FORBIDDEN);

    const body = await request.json();
    const updateData: Partial<{
      nomineeId: string;
      nomineeName: string;
      relationship: string;
      sharePercentage: number;
    }> = {
      nomineeId: body.nomineeId,
      nomineeName: body.nomineeName,
      relationship: body.relationship,
      sharePercentage: body.sharePercentage,
    };

    const updated = await prisma.successionNominee.update({ where: { id }, data: updateData });
    return successResponse(updated);
  } catch (error) {
    console.error('[Succession Nominees PUT]', error);
    return handlePrismaError(error);
  }
}

async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const existing = await prisma.successionNominee.findUnique({ where: { id } });
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, 'Nominee mapping not found', StatusCodes.NOT_FOUND);
    if (existing.userId !== auth.userId) return errorResponse(ErrorCodes.FORBIDDEN, 'Not allowed', StatusCodes.FORBIDDEN);

    await prisma.successionNominee.delete({ where: { id } });
    return successResponse({ success: true });
  } catch (error) {
    console.error('[Succession Nominees DELETE]', error);
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
