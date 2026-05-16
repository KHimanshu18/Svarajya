import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bankService } from '@/lib/services/bankService';
import { incomeService } from '@/lib/services/incomeService';
import { expenseService } from '@/lib/services/expenseService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';
import { BankAccountResponse, CreateBankAccountRequest, UpdateBankAccountRequest } from '@/lib/types/api.types';

/**
 * GET /api/bank
 * Get all bank accounts for user
 */
async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const accounts = await bankService.getForUser(authContext.userId);

    const responses: any[] = accounts.map((account) => ({
      id: account.id,
      userId: account.userId,
      bankName: account.bankName,
      accountType: account.accountType,
      nickname: account.nickname,
      accountNumber: account.accountNumber,
      accountLast4: account.accountLast4,
      openingBalance: account.openingBalance,
      latestBalance: account.currentBalance,
      latestBalanceAsOf: account.latestBalanceAsOf?.toISOString(),
      isPrimary: account.isPrimary,
      notes: account.notes,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const activeCount = accounts.filter((acc) => acc.status === 'ACTIVE').length;

    // Calculate Cashflow (Approximation for now)
    const incomes = await incomeService.getForUser(authContext.userId).catch(() => []);
    // Kosh stores amountNet for frequency. We approximate monthly.
    const monthlyInflow = incomes.reduce((sum, inc) => {
      let multiplier = 1;
      if (inc.frequency === 'ANNUAL') multiplier = 1/12;
      else if (inc.frequency === 'QUARTERLY') multiplier = 1/3;
      return sum + (inc.amountNet * multiplier);
    }, 0);

    const expenses = await expenseService.getForUser(authContext.userId).catch(() => []);
    const monthlyOutflow = expenses.reduce((sum, exp) => {
       // approximation logic based on frequency or just sum of recent
       // We will just sum amount for now if there's no frequency field
       return sum + (exp.amount || 0);
    }, 0);
    
    const surplus = monthlyInflow - monthlyOutflow;

    const emergencyFundMonths = monthlyOutflow > 0 ? totalBalance / monthlyOutflow : 0;
    let efStatus = "unknown";
    if (monthlyOutflow > 0) {
      if (emergencyFundMonths < 1) efStatus = "critical";
      else if (emergencyFundMonths < 3) efStatus = "low";
      else if (emergencyFundMonths < 6) efStatus = "ok";
      else efStatus = "strong";
    } else {
      efStatus = "ok";
    }

    const cashWalletDb = await prisma.cashWallet.findUnique({ where: { userId: authContext.userId } });
    const cashWallet = cashWalletDb || { cashInHand: 0, emergencyCash: 0, pettyCash: 0 };
    const totalCash = cashWallet.cashInHand;

    return successResponse({
      accounts: responses,
      cashWallet,
      settings: { idleThresholdMonths: 6, idleThresholdAmount: cashWalletDb?.idleThresholdAmount ?? 0 },
      metrics: {
        totalBalance,
        activeCount,
        totalLiquid: totalBalance + totalCash, // Update with cash if available
        flow: {
          inflow: monthlyInflow,
          outflow: monthlyOutflow,
          surplus,
        },
        health: {
          emergencyFundMonths,
          liquidityRatio: emergencyFundMonths,
          efStatus,
          score: Math.min(100, emergencyFundMonths * 10),
          idleAccounts: [],
          outflowIsZero: monthlyOutflow === 0,
        }
      },
    });
  } catch (error) {
    console.error('[Bank GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/bank
 * Create or update bank account
 */
async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const data: any = await request.json();

    if (data.entity === 'cashWallet') {
        const wallet = await prisma.cashWallet.upsert({
            where: { userId: authContext.userId },
            update: {
                cashInHand: data.cashInHand || 0,
                emergencyCash: data.emergencyCash || 0,
                pettyCash: data.pettyCash || 0,
            },
            create: {
                userId: authContext.userId,
                cashInHand: data.cashInHand || 0,
                emergencyCash: data.emergencyCash || 0,
                pettyCash: data.pettyCash || 0,
            }
        });
        return successResponse(wallet, StatusCodes.OK);
    }

    if (data.entity === 'settings') {
        // Upsert liquidity settings — stored as a special cash wallet extension or a dedicated table
        // For now we store idleThresholdAmount on the cashWallet record as a workaround
        await prisma.cashWallet.upsert({
            where: { userId: authContext.userId },
            update: {
                idleThresholdAmount: data.idleThresholdAmount ?? 0,
            },
            create: {
                userId: authContext.userId,
                cashInHand: 0,
                emergencyCash: 0,
                pettyCash: 0,
                idleThresholdAmount: data.idleThresholdAmount ?? 0,
            }
        });
        return successResponse({ idleThresholdAmount: data.idleThresholdAmount ?? 0 }, StatusCodes.OK);
    }

    // Validate required fields
    if (!data.bankName || !data.accountType || !data.accountLast4) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Bank name, account type, and last 4 digits are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let account;

    if ('id' in data && data.id) {
      // Update existing
      account = await bankService.update(data.id, {
        bankName: data.bankName,
        accountType: data.accountType,
        nickname: data.nickname,
        currentBalance: data.currentBalance,
        latestBalanceAsOf: data.latestBalanceAsOf ? new Date(data.latestBalanceAsOf) : undefined,
        status: data.status,
        isPrimary: data.isPrimary,
        notes: data.notes,
      });
    } else {
      // Check for duplicates
      const duplicate = await bankService.checkDuplicate(
        authContext.userId,
        data.bankName,
        data.accountType,
        data.accountNumber
      );

      if (duplicate) {
        return errorResponse(
          ErrorCodes.DUPLICATE_ENTRY,
          'Account with these details already exists',
          StatusCodes.CONFLICT
        );
      }

      // Create new
      account = await bankService.createForUser(authContext.userId, {
        bankName: data.bankName,
        accountType: data.accountType,
        nickname: data.nickname,
        accountNumber: data.accountNumber || undefined,
        accountLast4: data.accountLast4,
        openingBalance: data.openingBalance || 0,
        currentBalance: data.currentBalance || 0,
        latestBalanceAsOf: data.latestBalanceAsOf ? new Date(data.latestBalanceAsOf) : new Date(),
        status: data.status || 'ACTIVE',
        isPrimary: data.isPrimary,
        notes: data.notes,
      });
    }

    const response: any = {
      id: account.id,
      userId: account.userId,
      bankName: account.bankName,
      accountType: account.accountType,
      nickname: account.nickname,
      accountNumber: account.accountNumber,
      accountLast4: account.accountLast4,
      openingBalance: account.openingBalance,
      latestBalance: account.currentBalance,
      latestBalanceAsOf: account.latestBalanceAsOf?.toISOString(),
      isPrimary: account.isPrimary,
      notes: account.notes,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };

    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Bank POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
