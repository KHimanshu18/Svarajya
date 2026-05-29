import { GstRecord } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateGstRecordInput {
  userId: string;
  gstin: string;
  businessName?: string;
  registrationType?: string;
  filingFrequency?: string;
  lastFilingDate?: Date;
  nextDueDate?: Date;
  gstr1Filed?: boolean;
  gstr3bFiled?: boolean;
  annualReturnFiled?: boolean;
  status?: string;
  documentUrl?: string;
  notes?: string;
}

export interface UpdateGstRecordInput {
  gstin?: string;
  businessName?: string;
  registrationType?: string;
  filingFrequency?: string;
  lastFilingDate?: Date;
  nextDueDate?: Date;
  gstr1Filed?: boolean;
  gstr3bFiled?: boolean;
  annualReturnFiled?: boolean;
  status?: string;
  documentUrl?: string;
  notes?: string;
}

class GstService extends BaseService<GstRecord, CreateGstRecordInput, UpdateGstRecordInput> {
  constructor() {
    super(prisma.gstRecord);
  }

  getForUser(userId: string) {
    return this.findMany({ userId }, { orderBy: { updatedAt: 'desc' } });
  }

  countForUser(userId: string) {
    return this.count({ userId });
  }
}

export const gstService = new GstService();
