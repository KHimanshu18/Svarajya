import { createHash, randomInt } from 'crypto';
import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes } from '@/lib/middleware/standardResponse';
import { getEmergencyOtpEmailHtml } from '@/lib/email-templates/html-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

function hashOtp(code: string, userId: string, purpose: string) {
  return createHash('sha256').update(`${code}:${userId}:${purpose}`).digest('hex');
}

async function handlePOST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  if (!auth.email) {
    return errorResponse(ErrorCodes.INVALID_REQUEST, 'Authenticated user has no email', StatusCodes.BAD_REQUEST);
  }

  const otpCode = String(randomInt(0, 1000000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const hashedCode = hashOtp(otpCode, auth.userId, 'emergency_protocol');

  try {
    await prisma.emailVerificationCode.deleteMany({
      where: {
        userId: auth.userId,
        purpose: 'emergency_protocol',
      },
    });

    await prisma.emailVerificationCode.create({
      data: {
        userId: auth.userId,
        code: hashedCode,
        purpose: 'emergency_protocol',
        expiresAt,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    const name = user?.name || 'Sva-Rajya member';
    const emailHtml = getEmergencyOtpEmailHtml(name, otpCode);

    await resend.emails.send({
      from: 'Sva-Rajya <noreply@update.svarajya.com>',
      to: auth.email,
      subject: 'Sva-Rajya — Emergency Access OTP',
      html: emailHtml,
    });

    return successResponse({ email: auth.email });
  } catch (error: any) {
    console.error('[Send OTP]', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error?.message || 'Failed to send OTP email',
      StatusCodes.INTERNAL_ERROR
    );
  }
}

export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
