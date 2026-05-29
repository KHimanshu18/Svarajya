import { DinRecord } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateDinRecordInput {
  userId: string;
  dinNumber: string;
  companyName?: string;
  issueDate?: Date;
  expiryDate?: Date;
  dinKycStatus?: string;
  dscExpiryDate?: Date;
  mcaFilingStatus?: string;
  directorSince?: Date;
  status?: string;
  documentUrl?: string;
  notes?: string;
}

export interface UpdateDinRecordInput {
  dinNumber?: string;
  companyName?: string;
  issueDate?: Date;
  expiryDate?: Date;
  dinKycStatus?: string;
  dscExpiryDate?: Date;
  mcaFilingStatus?: string;
  directorSince?: Date;
  status?: string;
  documentUrl?: string;
  notes?: string;
}

class DinService extends BaseService<DinRecord, CreateDinRecordInput, UpdateDinRecordInput> {
  constructor() {
    super(prisma.dinRecord);
  }

  getForUser(userId: string) {
    return this.findMany({ userId }, { orderBy: { updatedAt: 'desc' } });
  }

  countForUser(userId: string) {
    return this.count({ userId });
  }
}

export const dinService = new DinService();
