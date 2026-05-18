import { LoanAccount } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateLoanAccountInput {
  type: string;
  lenderName?: string;
  principal: number;
  outstandingAmount: number;
  emi: number;
  interestRate: number;
  tenure: number;
  startDate: Date | string;
  endDate?: Date | string | null;
  linkedPropertyId?: string | null;
  status?: string;
}

export interface UpdateLoanAccountInput {
  type?: string;
  lenderName?: string;
  principal?: number;
  outstandingAmount?: number;
  emi?: number;
  interestRate?: number;
  tenure?: number;
  startDate?: Date | string;
  endDate?: Date | string | null;
  linkedPropertyId?: string | null;
  status?: string;
}

/**
 * Loan Account Service
 */
class LoanService extends BaseService<LoanAccount, CreateLoanAccountInput, UpdateLoanAccountInput> {
  constructor() {
    super(prisma.loanAccount);
  }

  /**
   * Get all loans for a user
   */
  async getForUser(userId: string): Promise<LoanAccount[]> {
    try {
      return await prisma.loanAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[LoanService] Error getting loans for user:', error);
      throw error;
    }
  }

  /**
   * Get single loan by ID
   */
  async getById(id: string): Promise<LoanAccount | null> {
    try {
      return await prisma.loanAccount.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('[LoanService] Error getting loan by id:', error);
      throw error;
    }
  }

  /**
   * Create loan for user
   */
  async createForUser(userId: string, data: CreateLoanAccountInput): Promise<LoanAccount> {
    try {
      return await prisma.loanAccount.create({
        data: {
          ...data,
          userId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      });
    } catch (error) {
      console.error('[LoanService] Error creating loan:', error);
      throw error;
    }
  }

  /**
   * Calculate total outstanding debt
   */
  async getTotalOutstanding(userId: string): Promise<number> {
    try {
      const result = await prisma.loanAccount.aggregate({
        where: { userId, status: 'ACTIVE' },
        _sum: { outstandingAmount: true },
      });

      return result._sum.outstandingAmount || 0;
    } catch (error) {
      console.error('[LoanService] Error calculating total outstanding:', error);
      throw error;
    }
  }

  /**
   * Calculate total monthly EMI
   */
  async getTotalEMI(userId: string): Promise<number> {
    try {
      const result = await prisma.loanAccount.aggregate({
        where: { userId, status: 'ACTIVE' },
        _sum: { emi: true },
      });

      return result._sum.emi || 0;
    } catch (error) {
      console.error('[LoanService] Error calculating total EMI:', error);
      throw error;
    }
  }
}

export const loanService = new LoanService();
