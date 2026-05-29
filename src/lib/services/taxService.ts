import { TaxRecord } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateTaxRecordInput {
  userId: string;
  assessmentYear: string;
  financialYear: string;
  filingType?: string;
  status?: string;
  grossIncome?: number;
  taxableIncome?: number;
  taxPaid?: number;
  taxDue?: number;
  documentUrl?: string;
  notes?: string;
}

export interface UpdateTaxRecordInput {
  assessmentYear?: string;
  financialYear?: string;
  filingType?: string;
  status?: string;
  grossIncome?: number;
  taxableIncome?: number;
  taxPaid?: number;
  taxDue?: number;
  documentUrl?: string;
  notes?: string;
}

class TaxService extends BaseService<TaxRecord, CreateTaxRecordInput, UpdateTaxRecordInput> {
  constructor() {
    super(prisma.TaxRecord);
  }

  getForUser(userId: string) {
    return this.findMany({ userId }, { orderBy: { updatedAt: 'desc' } });
  }

  countForUser(userId: string) {
    return this.count({ userId });
  }
}

export const taxService = new TaxService();
