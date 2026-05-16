import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

/**
 * GET /api/documents
 * Get documents for a user or linked entity
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const linkedEntityId = searchParams.get('linkedEntityId');

  try {
    const documents = await prisma.documentMeta.findMany({
      where: { 
        userId: authContext.userId,
        linkedEntityId: linkedEntityId || undefined
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(documents);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * POST /api/documents
 * Create document metadata
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const data = await request.json();
    const document = await prisma.documentMeta.create({
      data: {
        ...data,
        userId: authContext.userId,
      },
    });

    // If it's linked to an insurance policy, update the policy's documentId
    if (data.docType === 'INSURANCE' && data.linkedEntityId) {
        await prisma.insurancePolicy.update({
            where: { id: data.linkedEntityId },
            data: { documentId: document.id }
        });
    }

    return successResponse(document, StatusCodes.CREATED);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
