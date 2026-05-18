import { ExpenseCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateExpenseCategoryInput {
  name: string;
  emoji?: string;
  isActive?: boolean;
}

class ExpenseCategoryService extends BaseService<ExpenseCategory, CreateExpenseCategoryInput, Partial<CreateExpenseCategoryInput>> {
  constructor() {
    super(prisma.expenseCategory);
  }

  async getForUser(userId: string): Promise<ExpenseCategory[]> {
    try {
      return await prisma.expenseCategory.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      console.error('[ExpenseCategoryService] Error getting categories:', error);
      throw error;
    }
  }

  async createForUser(userId: string, data: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
    try {
      return await prisma.expenseCategory.create({
        data: {
          ...data,
          userId,
        },
      });
    } catch (error) {
      console.error('[ExpenseCategoryService] Error creating category:', error);
      throw error;
    }
  }
}

export const expenseCategoryService = new ExpenseCategoryService();
