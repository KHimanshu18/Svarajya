import { CredentialRecord } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateCredentialRecordInput {
  portalType: string;
  portalName: string;
  portalUrl?: string;
  loginId?: string;
  registeredEmail?: string;
  registeredMobile?: string;
  storageMode?: string;
  encryptedPassword?: string;
  linkedMemberId?: string;
  registrationDate?: Date;
  twoFAStatus?: string;
  twoFAType?: string;
  nomineeAwareness?: boolean;
}

export interface UpdateCredentialRecordInput {
  portalName?: string;
  portalUrl?: string;
  loginId?: string;
  registeredEmail?: string;
  registeredMobile?: string;
  encryptedPassword?: string;
  linkedMemberId?: string;
  twoFAStatus?: string;
  twoFAType?: string;
  registrationDate?: Date;
  nomineeAwareness?: boolean;
}

/**
 * Credential Record Service
 */
class CredentialService extends BaseService<CredentialRecord, CreateCredentialRecordInput, UpdateCredentialRecordInput> {
  constructor() {
    super(prisma.credentialRecord);
  }

  /**
   * Get all credentials for a user
   */
  async getForUser(userId: string): Promise<CredentialRecord[]> {
    try {
      return await prisma.credentialRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[CredentialService] Error getting credentials for user:', error);
      throw error;
    }
  }

  /**
   * Create credential for user
   */
  async createForUser(userId: string, data: CreateCredentialRecordInput): Promise<CredentialRecord> {
    try {
      return await prisma.credentialRecord.create({
        data: {
          ...data,
          userId,
        },
      });
    } catch (error) {
      console.error('[CredentialService] Error creating credential:', error);
      throw error;
    }
  }

  /**
   * Get credentials by portal type
   */
  async getByPortalType(userId: string, portalType: string): Promise<CredentialRecord[]> {
    try {
      return await prisma.credentialRecord.findMany({
        where: {
          userId,
          portalType,
        },
      });
    } catch (error) {
      console.error('[CredentialService] Error getting by portal type:', error);
      throw error;
    }
  }

  /**
   * Get credentials for a specific family member
   */
  async getForFamilyMember(userId: string, memberId: string): Promise<CredentialRecord[]> {
    try {
      return await prisma.credentialRecord.findMany({
        where: {
          userId,
          linkedMemberId: memberId,
        },
      });
    } catch (error) {
      console.error('[CredentialService] Error getting for family member:', error);
      throw error;
    }
  }

  /**
   * Count credentials
   */
  async countForUser(userId: string): Promise<number> {
    try {
      return await prisma.credentialRecord.count({
        where: { userId },
      });
    } catch (error) {
      console.error('[CredentialService] Error counting:', error);
      throw error;
    }
  }
}

export const credentialService = new CredentialService();
