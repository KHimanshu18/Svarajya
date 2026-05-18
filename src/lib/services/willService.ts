import { WillStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateWillStatusInput {
  existsFlag: boolean;
  location?: string;
  executorName?: string;
  executorContact?: string;
  instructions?: string;
  lastReviewDate?: Date;
}

export interface UpdateWillStatusInput {
  existsFlag?: boolean;
  location?: string;
  executorName?: string;
  executorContact?: string;
  instructions?: string;
  lastReviewDate?: Date;
}

class WillService extends BaseService<WillStatus, CreateWillStatusInput, UpdateWillStatusInput> {
  constructor() {
    super(prisma.willStatus);
  }

  async getForUser(userId: string): Promise<WillStatus | null> {
    try {
      return await prisma.willStatus.findUnique({
        where: { userId },
      });
    } catch (error) {
      console.error('[WillService] Error getting WillStatus:', error);
      throw error;
    }
  }

  async upsertForUser(userId: string, data: CreateWillStatusInput): Promise<WillStatus> {
    try {
      return await prisma.willStatus.upsert({
        where: { userId },
        create: {
          ...data,
          userId,
        },
        update: data,
      });
    } catch (error) {
      console.error('[WillService] Error upserting WillStatus:', error);
      throw error;
    }
  }
}

export const willService = new WillService();
