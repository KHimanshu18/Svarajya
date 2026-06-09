import { ExpenseEntry } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateExpenseEntryInput {
  date: Date;
  amount: number;
  category: string;
  mode?: string;
  accountId?: string;
  familyMemberId?: string | null;
  description?: string;
  isRecurring?: boolean;
}

export interface UpdateExpenseEntryInput {
  date?: Date;
  amount?: number;
  category?: string;
  mode?: string;
  accountId?: string;
  familyMemberId?: string | null;
  description?: string;
  isRecurring?: boolean;
}

/**
 * Expense Entry Service
 */
class ExpenseService extends BaseService<ExpenseEntry, CreateExpenseEntryInput, UpdateExpenseEntryInput> {
  constructor() {
    super(prisma.expenseEntry);
  }

  /**
   * Get all expenses for a user
   */
  async getForUser(userId: string, options?: { startDate?: Date; endDate?: Date }): Promise<ExpenseEntry[]> {
    try {
      const where: any = { userId };

      if (options?.startDate || options?.endDate) {
        where.date = {};
        if (options.startDate) where.date.gte = options.startDate;
        if (options.endDate) where.date.lte = options.endDate;
      }

      return await prisma.expenseEntry.findMany({
        where,
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      console.error('[ExpenseService] Error getting expenses for user:', error);
      throw error;
    }
  }

  /**
   * Create expense for user
   */
  async createForUser(userId: string, data: CreateExpenseEntryInput): Promise<ExpenseEntry> {
    try {
      return await prisma.expenseEntry.create({
        data: {
          ...data,
          userId,
        },
      });
    } catch (error) {
      console.error('[ExpenseService] Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Get expenses by category
   */
  async getByCategory(userId: string, category: string): Promise<ExpenseEntry[]> {
    try {
      return await prisma.expenseEntry.findMany({
        where: {
          userId,
          category,
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      console.error('[ExpenseService] Error getting by category:', error);
      throw error;
    }
  }

  /**
   * Get recurring expenses
   */
  async getRecurring(userId: string): Promise<ExpenseEntry[]> {
    try {
      return await prisma.expenseEntry.findMany({
        where: {
          userId,
          isRecurring: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[ExpenseService] Error getting recurring:', error);
      throw error;
    }
  }

  /**
   * Calculate total expenses for period
   */
  async getTotalForPeriod(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await prisma.expenseEntry.aggregate({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
      });

      return result._sum.amount || 0;
    } catch (error) {
      console.error('[ExpenseService] Error calculating total:', error);
      throw error;
    }
  }

  /**
   * Get expenses for current month
   */
  async getMonthlyExpenses(userId: string, year: number, month: number): Promise<ExpenseEntry[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      return await prisma.expenseEntry.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      console.error('[ExpenseService] Error getting monthly expenses:', error);
      throw error;
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getCategoryBreakdown(userId: string, startDate: Date, endDate: Date): Promise<Array<{ category: string; total: number; count: number }>> {
    try {
      const expenses = await prisma.expenseEntry.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Group by category
      const breakdown: Record<string, { total: number; count: number }> = {};

      expenses.forEach((exp) => {
        if (!breakdown[exp.category]) {
          breakdown[exp.category] = { total: 0, count: 0 };
        }
        breakdown[exp.category].total += exp.amount;
        breakdown[exp.category].count += 1;
      });

      return Object.entries(breakdown).map(([category, stats]) => ({
        category,
        ...stats,
      }));
    } catch (error) {
      console.error('[ExpenseService] Error getting category breakdown:', error);
      throw error;
    }
  }
}

export const expenseService = new ExpenseService();
