import { prisma } from '@/lib/prisma';
import { Reminder, NotifChannel } from '@prisma/client';

export interface CreateReminderInput {
  type: string;
  targetDate: Date;
  leadTime?: number;
  channel?: string;
  priority?: string;
  linkedEntityId?: string;
  message?: string;
}

export interface UpdateReminderInput extends Partial<CreateReminderInput> {
  status?: string;
}

export class ReminderService {
  /**
   * Create a new reminder
   */
  async create(userId: string, data: CreateReminderInput): Promise<Reminder> {
    return prisma.reminder.create({
      data: {
        ...data,
        userId,
        channel: data.channel || 'IN_APP',
        status: 'PENDING',
      },
    });
  }

  /**
   * Get all reminders for a user
   */
  async getForUser(userId: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' },
    });
  }

  /**
   * Update a reminder
   */
  async update(id: string, userId: string, data: UpdateReminderInput): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id, userId },
      data,
    });
  }

  /**
   * Delete a reminder
   */
  async delete(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.reminder.delete({
        where: { id, userId },
      });
      return true;
    } catch (error) {
      console.error('[ReminderService.delete]', error);
      return false;
    }
  }

  /**
   * Get a reminder by linked entity ID and type
   */
  async getByEntity(userId: string, linkedEntityId: string, type: string): Promise<Reminder | null> {
    return prisma.reminder.findFirst({
      where: { userId, linkedEntityId, type },
    });
  }
}

export const reminderService = new ReminderService();
