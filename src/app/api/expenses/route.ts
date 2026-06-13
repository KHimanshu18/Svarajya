import { NextRequest, NextResponse } from 'next/server';
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
import { ExpenseEntryResponse, CreateExpenseRequest, UpdateExpenseRequest } from '@/lib/types/api.types';

/**
 * GET /api/expenses
 * Get all expenses for user
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const expenses = await expenseService.getForUser(authContext.userId, {
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined,
    });

    const responses: ExpenseEntryResponse[] = expenses.map((exp) => ({
      id: exp.id,
      userId: exp.userId,
      date: exp.date.toISOString(),
      amount: exp.amount,
      category: exp.category,
      mode: exp.mode,
      accountId: exp.accountId,
      description: exp.description,
      isRecurring: exp.isRecurring,
      frequency: exp.frequency,
      createdAt: exp.createdAt.toISOString(),
    }));

    return successResponse(responses);
  } catch (error) {
    console.error('[Expense GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/expenses
 * Create or update expense
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const data: CreateExpenseRequest | (UpdateExpenseRequest & { id?: string }) = await request.json();

    // Validate required fields
    if (!data.date || !data.amount || !data.category) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Date, amount, and category are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let expense;

    if ('id' in data && data.id) {
      // Update existing
      expense = await expenseService.update(data.id, {
        date: new Date(data.date),
        amount: data.amount,
        category: data.category,
        mode: data.mode,
        accountId: data.accountId,
        description: data.description,
        isRecurring: data.isRecurring,
        frequency: data.frequency,
      });
    } else {
      // Create new
      expense = await expenseService.createForUser(authContext.userId, {
        date: new Date(data.date),
        amount: data.amount,
        category: data.category,
        mode: data.mode,
        accountId: data.accountId,
        description: data.description,
        isRecurring: data.isRecurring,
        frequency: data.frequency,
      });
    }

    const response: ExpenseEntryResponse = {
      id: expense.id,
      userId: expense.userId,
      date: expense.date.toISOString(),
      amount: expense.amount,
      category: expense.category,
      mode: expense.mode,
      accountId: expense.accountId,
      description: expense.description,
      isRecurring: expense.isRecurring,
      frequency: expense.frequency,
      createdAt: expense.createdAt.toISOString(),
    };

    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Expense POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
