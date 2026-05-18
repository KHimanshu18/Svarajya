import { Subscription } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateSubscriptionInput {
  name: string;
  category?: string;
  amount: number;
  renewalDate: Date;
  lastUsedDate?: Date;
  isActive?: boolean;
}

export interface UpdateSubscriptionInput {
  name?: string;
  category?: string;
  amount?: number;
  renewalDate?: Date;
  lastUsedDate?: Date;
  isActive?: boolean;
}

class SubscriptionService extends BaseService<Subscription, CreateSubscriptionInput, UpdateSubscriptionInput> {
  constructor() {
    super(prisma.subscription);
  }

  async getForUser(userId: string): Promise<Subscription[]> {
    try {
      return await prisma.subscription.findMany({
        where: { userId },
        orderBy: { renewalDate: 'asc' },
      });
    } catch (error) {
      console.error('[SubscriptionService] Error getting subscriptions:', error);
      throw error;
    }
  }

  async createForUser(userId: string, data: CreateSubscriptionInput): Promise<Subscription> {
    try {
      return await prisma.subscription.create({
        data: {
          ...data,
          userId,
        },
      });
    } catch (error) {
      console.error('[SubscriptionService] Error creating subscription:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
