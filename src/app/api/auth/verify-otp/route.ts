import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes } from '@/lib/middleware/standardResponse';

function hashOtp(code: string, userId: string, purpose: string) {
  return createHash('sha256').update(`${code}:${userId}:${purpose}`).digest('hex');
}

async function handlePOST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  const { code } = await request.json();
  if (!code || typeof code !== 'string') {
    return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, 'OTP code is required', StatusCodes.BAD_REQUEST);
  }

  try {
    const record = await prisma.emailVerificationCode.findFirst({
      where: {
        userId: auth.userId,
        purpose: 'emergency_protocol',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return errorResponse(ErrorCodes.INVALID_TOKEN, 'No OTP request found', StatusCodes.BAD_REQUEST);
    }

    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationCode.deleteMany({
        where: {
          userId: auth.userId,
          purpose: 'emergency_protocol',
        },
      });
      return errorResponse(ErrorCodes.INVALID_TOKEN, 'OTP has expired', StatusCodes.BAD_REQUEST);
    }

    const hashedCode = hashOtp(code.trim(), auth.userId, 'emergency_protocol');
    if (hashedCode !== record.code) {
      return errorResponse(ErrorCodes.INVALID_TOKEN, 'Invalid OTP code', StatusCodes.BAD_REQUEST);
    }

    await prisma.emailVerificationCode.deleteMany({
      where: {
        userId: auth.userId,
        purpose: 'emergency_protocol',
      },
    });

    return successResponse({ verified: true });
  } catch (error: any) {
    console.error('[Verify OTP]', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error?.message || 'Failed to verify OTP',
      StatusCodes.INTERNAL_ERROR
    );
  }
}

export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
