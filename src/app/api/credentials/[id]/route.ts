import { NextRequest, NextResponse } from 'next/server';
import { credentialService } from '@/lib/services/credentialService';
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
 * DELETE /api/credentials/[id]
 */
async function deleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID required', StatusCodes.BAD_REQUEST);

    await credentialService.delete(id);
    return successResponse({ success: true });
  } catch (error) {
    console.error('[Credentials DELETE]', error);
    return handlePrismaError(error);
  }
}

export const DELETE = withAuth(withErrorHandler(deleteHandler), AuthLevel.AUTHENTICATED);
