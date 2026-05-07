import { IdentityRecord } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateIdentityRecordInput {
  idType: string;
  numberMasked: string;
  numberFull?: string;
  expiryDate?: Date;
  issuedDate?: Date;
  placeOfIssue?: string;
  dobOnDoc?: Date;
  nameOnDoc?: string;
  vaultFileId?: string;
}

export interface UpdateIdentityRecordInput {
  idType?: string;
  numberMasked?: string;
  expiryDate?: Date;
  issuedDate?: Date;
  placeOfIssue?: string;
  dobOnDoc?: Date;
  nameOnDoc?: string;
  vaultFileId?: string;
}

/**
 * Identity Record Service
 */
class IdentityService extends BaseService<IdentityRecord, CreateIdentityRecordInput, UpdateIdentityRecordInput> {
  constructor() {
    super(prisma.identityRecord);
  }

  /**
   * Get all identity records for a user
   */
  async getForUser(userId: string): Promise<IdentityRecord[]> {
    try {
      return await prisma.identityRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[IdentityService] Error getting records for user:', error);
      throw error;
    }
  }

  /**
   * Create identity record for user (ensure unique by userId and idType)
   */
  async createForUser(userId: string, data: CreateIdentityRecordInput): Promise<IdentityRecord> {
    try {
      return await prisma.identityRecord.create({
        data: {
          idType: data.idType,
          numberMasked: data.numberMasked,
          numberFull: data.numberFull,
          expiryDate: data.expiryDate,
          issuedDate: data.issuedDate,
          placeOfIssue: data.placeOfIssue,
          dobOnDoc: data.dobOnDoc,
          nameOnDoc: data.nameOnDoc,
          vaultFileId: data.vaultFileId,
          userId,
        },
      });
    } catch (error) {
      console.error('[IdentityService] Error creating record:', error);
      throw error;
    }
  }

  /**
   * Get specific identity type for user
   */
  async getByType(userId: string, idType: string): Promise<IdentityRecord | null> {
    try {
      return await prisma.identityRecord.findUnique({
        where: {
          userId_idType: { userId, idType },
        },
      });
    } catch (error) {
      console.error('[IdentityService] Error getting by type:', error);
      throw error;
    }
  }

  /**
   * Find identity record by ID
   */
  async findById(id: string): Promise<IdentityRecord | null> {
    try {
      return await prisma.identityRecord.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('[IdentityService] Error finding by id:', error);
      throw error;
    }
  }

  /**
   * Update identity record
   */
  async update(id: string, data: UpdateIdentityRecordInput): Promise<IdentityRecord> {
    try {
      return await prisma.identityRecord.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error('[IdentityService] Error updating record:', error);
      throw error;
    }
  }

  /**
   * Delete identity record
   */
  async delete(id: string): Promise<IdentityRecord> {
    try {
      return await prisma.identityRecord.delete({
        where: { id },
      });
    } catch (error) {
      console.error('[IdentityService] Error deleting record:', error);
      throw error;
    }
  }

  /**
   * Get expired identity documents
   */
  async getExpired(userId: string): Promise<IdentityRecord[]> {
    try {
      const now = new Date();
      return await prisma.identityRecord.findMany({
        where: {
          userId,
          expiryDate: {
            lt: now,
          },
        },
      });
    } catch (error) {
      console.error('[IdentityService] Error getting expired:', error);
      throw error;
    }
  }

  /**
   * Get expiring soon (within 30 days)
   */
  async getExpiringSoon(userId: string, daysAhead: number = 30): Promise<IdentityRecord[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      return await prisma.identityRecord.findMany({
        where: {
          userId,
          expiryDate: {
            gte: now,
            lte: futureDate,
          },
        },
      });
    } catch (error) {
      console.error('[IdentityService] Error getting expiring soon:', error);
      throw error;
    }
  }
}

export const identityService = new IdentityService();