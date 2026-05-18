import { BudgetPlan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateBudgetPlanInput {
  totalMonthly: number;
  categories: any; // Json
  overspendRules?: any; // Json
  isActive?: boolean;
}

export interface UpdateBudgetPlanInput {
  totalMonthly?: number;
  categories?: any;
  overspendRules?: any;
  isActive?: boolean;
}

class BudgetService extends BaseService<BudgetPlan, CreateBudgetPlanInput, UpdateBudgetPlanInput> {
  constructor() {
    super(prisma.budgetPlan);
  }

  async getForUser(userId: string): Promise<BudgetPlan | null> {
    try {
      return await prisma.budgetPlan.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[BudgetService] Error getting budget for user:', error);
      throw error;
    }
  }

  async createOrUpdate(userId: string, data: CreateBudgetPlanInput): Promise<BudgetPlan> {
    try {
      const existing = await this.getForUser(userId);
      if (existing) {
        return await this.update(existing.id, data);
      } else {
        return await prisma.budgetPlan.create({
          data: {
            ...data,
            userId,
          },
        });
      }
    } catch (error) {
      console.error('[BudgetService] Error saving budget:', error);
      throw error;
    }
  }
}

export const budgetService = new BudgetService();
