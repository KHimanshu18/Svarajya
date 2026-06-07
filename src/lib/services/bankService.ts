import { BankAccount } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';
import crypto from 'node:crypto';

// Encryption setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const ALGORITHM = 'aes-256-cbc';

function encryptNumber(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptNumber(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}


export interface CreateBankAccountInput {
  bankName: string;
  accountType: string;
  accountNumber?: string;  // Optional - encrypted if provided
  accountLast4: string;
  // Adding joint account holder details
  holders?: { id: string }[];
  nickname?: string;
  status?: string;
  openingBalance: number;
  currentBalance: number;
  latestBalanceAsOf: Date;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountType?: string;
  status?: string;
  nickname?: string;
  currentBalance?: number;
  latestBalanceAsOf?: Date;
  isPrimary?: boolean;
  notes?: string;
}

/**
 * Bank Account Service
 */
class BankAccountService extends BaseService<BankAccount, CreateBankAccountInput, UpdateBankAccountInput> {
  constructor() {
    super(prisma.bankAccount);
  }

  /**
   * Get all bank accounts for a user
   */
  async getForUser(userId: string): Promise<BankAccount[]> {
    try {
      return await prisma.bankAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[BankService] Error getting accounts for user:', error);
      throw error;
    }
  }

  /**
   * Get bank account by id
   */
  async getById(id: string, userId: string): Promise<BankAccount | null> {
    try {
      const acc = await prisma.bankAccount.findFirst({
        where: { id, userId },
      });
      if (acc && acc.accountNumber) acc.accountNumber = decryptNumber(acc.accountNumber);
      return acc;
    } catch (error) {
      console.error('[BankService] Error getting account by id:', error);
      throw error;
    }
  }

  /**
   * Create bank account for user
   */
  async createForUser(userId: string, data: CreateBankAccountInput): Promise<BankAccount> {
    try {
      return await prisma.bankAccount.create({
        data: {
          ...data,
          accountNumber: data.accountNumber ? encryptNumber(data.accountNumber) : null,
          userId,
          status: (data.status || 'ACTIVE').toUpperCase(),
        },
      });
    } catch (error) {
      console.error('[BankService] Error creating account:', error);
      throw error;
    }
  }

  /**
   * Get active accounts only
   */
  async getActive(userId: string): Promise<BankAccount[]> {
    try {
      return await prisma.bankAccount.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[BankService] Error getting active accounts:', error);
      throw error;
    }
  }

  /**
   * Get total balance across all accounts
   */
  async getTotalBalance(userId: string): Promise<number> {
    try {
      const result = await prisma.bankAccount.aggregate({
        where: { userId, status: { not: 'CLOSED' } },
        _sum: { currentBalance: true },
      });

      return result._sum.currentBalance || 0;
    } catch (error) {
      console.error('[BankService] Error calculating total balance:', error);
      throw error;
    }
  }

  /**
   * Get total balance for active accounts only
   */
  async getActiveTotalBalance(userId: string): Promise<number> {
    try {
      const result = await prisma.bankAccount.aggregate({
        where: {
          userId,
          status: 'ACTIVE',
        },
        _sum: { currentBalance: true },
      });

      return result._sum.currentBalance || 0;
    } catch (error) {
      console.error('[BankService] Error calculating active balance:', error);
      throw error;
    }
  }

  /**
   * Update account balance
   */
  async updateBalance(
    id: string,
    userId: string,
    newBalance: number,
    asOfDate: Date
  ): Promise<BankAccount> {
    try {
      return await prisma.bankAccount.update({
        where: { id },
        data: {
          currentBalance: newBalance,
          latestBalanceAsOf: asOfDate,
        },
      });
    } catch (error) {
      console.error('[BankService] Error updating balance:', error);
      throw error;
    }
  }

  /**
   * Get accounts by type
   */
  async getByType(userId: string, type: string): Promise<BankAccount[]> {
    try {
      return await prisma.bankAccount.findMany({
        where: {
          userId,
          accountType: type,
        },
      });
    } catch (error) {
      console.error('[BankService] Error getting by type:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate accounts
   */
  async checkDuplicate(
    userId: string,
    bankName: string,
    accountType: string,
    accountNumber: string
  ): Promise<BankAccount | null> {
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: {
          userId,
          bankName: {
            mode: 'insensitive',
          },
          accountType,
          status: { not: 'CLOSED' },
        },
      });
      // Filter by decrypted account number
        return accounts.find( (a) => a.accountNumber && decryptNumber(a.accountNumber) === accountNumber) || null;
    } catch (error) {
      console.error('[BankService] Error checking duplicate:', error);
      throw error;
    }
  }

  /**
   * Soft delete bank account
   */
  async delete(id: string): Promise<BankAccount> {
    try {
      return await prisma.bankAccount.update({
        where: { id },
        data: {
          status: 'CLOSED',
          currentBalance: 0,
          },
        });
      } catch (error) {
        console.error('[BankService] Error deleting account:', error);
        throw error;
    }
  }
}

export const bankService = new BankAccountService();