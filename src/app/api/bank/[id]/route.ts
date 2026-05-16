import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

/**
 * PUT /api/bank/[id]
 * Update a bank account balance (and record history)
 */
async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    const data = await request.json();

    // Verify ownership
    const existing = await prisma.bankAccount.findFirst({ where: { id, userId: authContext.userId } });
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Account not found', StatusCodes.NOT_FOUND);
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (data.currentBalance !== undefined) updateData.currentBalance = data.currentBalance;
    if (data.latestBalanceAsOf) updateData.latestBalanceAsOf = new Date(data.latestBalanceAsOf);
    if (data.bankName) updateData.bankName = data.bankName;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status) updateData.status = data.status.toUpperCase();

    const updated = await prisma.bankAccount.update({ where: { id }, data: updateData });

    // Auto-record balance history when balance is updated
    if (data.currentBalance !== undefined) {
      await prisma.balanceHistory.create({
        data: {
          bankAccountId: id,
          balance: data.currentBalance,
          recordedAt: data.latestBalanceAsOf ? new Date(data.latestBalanceAsOf) : new Date(),
          note: data.note || null,
        },
      });
    }

    return successResponse({
      id: updated.id,
      bankName: updated.bankName,
      accountType: updated.accountType,
      nickname: updated.nickname,
      accountLast4: updated.accountLast4,
      latestBalance: updated.currentBalance,
      latestBalanceAsOf: updated.latestBalanceAsOf?.toISOString(),
      isPrimary: updated.isPrimary,
      status: updated.status,
    }, StatusCodes.OK);
  } catch (error) {
    console.error('[Bank PUT]', error);
    return handlePrismaError(error);
  }
}

/**
 * GET /api/bank/[id]
 * Get account details + balance history
 */
async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;

    const account = await prisma.bankAccount.findFirst({
      where: { id, userId: authContext.userId },
      include: {
        balanceHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 24, // last 24 entries
        },
      },
    });

    if (!account) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Account not found', StatusCodes.NOT_FOUND);
    }

    return successResponse({
      id: account.id,
      bankName: account.bankName,
      accountType: account.accountType,
      nickname: account.nickname,
      accountLast4: account.accountLast4,
      latestBalance: account.currentBalance,
      latestBalanceAsOf: account.latestBalanceAsOf?.toISOString(),
      isPrimary: account.isPrimary,
      status: account.status,
      notes: account.notes,
      history: account.balanceHistory.map(h => ({
        id: h.id,
        balance: h.balance,
        recordedAt: h.recordedAt.toISOString(),
        note: h.note,
      })),
    });
  } catch (error) {
    console.error('[Bank GET id]', error);
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/bank/[id]
 */
async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const { id } = await params;
    const existing = await prisma.bankAccount.findFirst({ where: { id, userId: authContext.userId } });
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Account not found', StatusCodes.NOT_FOUND);
    }
    await prisma.bankAccount.delete({ where: { id } });
    return successResponse({ deleted: true }, StatusCodes.OK);
  } catch (error) {
    console.error('[Bank DELETE]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
