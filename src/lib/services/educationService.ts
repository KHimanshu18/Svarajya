import { Education } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateEducationInput {
  degree: string;
  institute: string;
  yearCompleted?: number;
  specialization?: string;
  linkedLoanId?: string;
  certificateUrl?: string;
}

export interface UpdateEducationInput {
  degree?: string;
  institute?: string;
  yearCompleted?: number;
  specialization?: string;
  linkedLoanId?: string;
  certificateUrl?: string;
  familyMemberId?: string | null;
}

/**
 * Education Record Service
 */
class EducationService extends BaseService<Education, CreateEducationInput, UpdateEducationInput> {
  constructor() {
    super(prisma.education);
  }

  /**
   * Get all education records for a user
   */
  async getForUser(userId: string): Promise<Education[]> {
    try {
      return await prisma.education.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[EducationService] Error getting records for user:', error);
      throw error;
    }
  }

  /**
   * Create education record for user
   */
  async createForUser(userId: string, data: CreateEducationInput): Promise<Education> {
    try {
      return await prisma.education.create({
        data: {
          ...data,
          userId,
        },
      });
    } catch (error) {
      console.error('[EducationService] Error creating record:', error);
      throw error;
    }
  }

  /**
   * Find education record by ID
   */
  async findById(id: string): Promise<Education | null> {
    try {
      return await prisma.education.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('[EducationService] Error finding by id:', error);
      throw error;
    }
  }

  /**
   * Update education record
   */
  async update(id: string, data: UpdateEducationInput): Promise<Education> {
    try {
      return await prisma.education.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error('[EducationService] Error updating record:', error);
      throw error;
    }
  }

  /**
   * Delete education record
   */
  async delete(id: string): Promise<Education> {
    try {
      return await prisma.education.delete({
        where: { id },
      });
    } catch (error) {
      console.error('[EducationService] Error deleting record:', error);
      throw error;
    }
  }
}

export const educationService = new EducationService();
