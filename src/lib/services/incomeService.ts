import { IncomeStream } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateIncomeStreamInput {
  type: string;
  source?: string;
  frequency?: string;
  amountGross: number;
  deductions?: number;
  amountNet: number;
  creditedAccountId?: string;
  riskLevel?: string;
  expectedGrowthPct?: number;
  historicalIncome?: any;
  notes?: string;
  allocationMonths?: number;
  tdsAmount?: number;
  description?: string;
  isPrimary?: boolean;
  familyMemberId?: string;
  lastReviewedAt?: Date | string | null;
}

export interface UpdateIncomeStreamInput {
  type?: string;
  source?: string;
  frequency?: string;
  amountGross?: number;
  deductions?: number;
  amountNet?: number;
  creditedAccountId?: string;
  riskLevel?: string;
  expectedGrowthPct?: number;
  historicalIncome?: any;
  notes?: string;
  allocationMonths?: number;
  tdsAmount?: number;
  description?: string;
  isPrimary?: boolean;
  familyMemberId?: string;
  lastReviewedAt?: Date | string | null;
}

/**
 * Income Stream Service
 */
class IncomeService extends BaseService<IncomeStream, CreateIncomeStreamInput, UpdateIncomeStreamInput> {
  constructor() {
    super(prisma.incomeStream);
  }

  /**
   * Get all income streams for a user
   */
  async getForUser(userId: string): Promise<IncomeStream[]> {
    try {
      return await prisma.incomeStream.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[IncomeService] Error getting streams for user:', error);
      throw error;
    }
  }

  /**
   * Create income stream for user
   */
  async createForUser(userId: string, data: CreateIncomeStreamInput): Promise<IncomeStream> {
    try {
      // If marked as primary, unmark other primaries
      if (data.isPrimary) {
        await prisma.incomeStream.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return await prisma.incomeStream.create({
        data: {
          ...data,
          userId,
          frequency: data.frequency?.toUpperCase() || 'MONTHLY',
          deductions: data.deductions || 0,
        },
      });
    } catch (error) {
      console.error('[IncomeService] Error creating stream:', error);
      throw error;
    }
  }

  /**
   * Get primary income stream
   */
  async getPrimary(userId: string): Promise<IncomeStream | null> {
    try {
      return await prisma.incomeStream.findFirst({
        where: {
          userId,
          isPrimary: true,
        },
      });
    } catch (error) {
      console.error('[IncomeService] Error getting primary:', error);
      throw error;
    }
  }

  /**
   * Calculate total gross income
   */
  async getTotalGrossIncome(userId: string): Promise<number> {
    try {
      const result = await prisma.incomeStream.aggregate({
        where: { userId },
        _sum: { amountGross: true },
      });

      return result._sum.amountGross || 0;
    } catch (error) {
      console.error('[IncomeService] Error calculating total:', error);
      throw error;
    }
  }

  /**
   * Calculate total deductions
   */
  async getTotalDeductions(userId: string): Promise<number> {
    try {
      const result = await prisma.incomeStream.aggregate({
        where: { userId },
        _sum: { deductions: true },
      });

      return result._sum.deductions || 0;
    } catch (error) {
      console.error('[IncomeService] Error calculating deductions:', error);
      throw error;
    }
  }

  /**
   * Get income by type
   */
  async getByType(userId: string, type: string): Promise<IncomeStream[]> {
    try {
      return await prisma.incomeStream.findMany({
        where: {
          userId,
          type,
        },
      });
    } catch (error) {
      console.error('[IncomeService] Error getting by type:', error);
      throw error;
    }
  }
}

export const incomeService = new IncomeService();
