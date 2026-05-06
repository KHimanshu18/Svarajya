import { FamilyMember } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateFamilyMemberInput {
  name: string;
  relation: string;
  dob?: Date;
  isDependent?: boolean;
  nomineeEligible?: boolean;
  accessLevel?: string;
}

export interface UpdateFamilyMemberInput {
  name?: string;
  relation?: string;
  dob?: Date;
  isDependent?: boolean;
  nomineeEligible?: boolean;
  accessLevel?: string;
}

/**
 * Family Member Service
 */
class FamilyService extends BaseService<FamilyMember, CreateFamilyMemberInput, UpdateFamilyMemberInput> {
  constructor() {
    super(prisma.familyMember);
  }

  /**
   * Get all family members for a user with pagination
   */
  async getFamilyMembers(userid: string, limit: number = 10, offset: number = 0): Promise<Partial<FamilyMember>[]> {
    try {
      return await prisma.familyMember.findMany({
        where: { userId: userid },
        select: {
          id: true,
          userId: true,
          name: true,
          relation: true,
          dob: true,
          isDependent: true,
          nomineeEligible: true,
          accessLevel: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('[FamilyService] Error getting family members:', error);
      throw error;
    }
  }

  /**
   * Create family member for user
   */
  async createForUser(userid: string, data: CreateFamilyMemberInput): Promise<FamilyMember> {
    try {
      return await prisma.familyMember.create({
        data: {
          ...data,
          userId: userid,
        },
      });
    } catch (error) {
      console.error('[FamilyService] Error creating family member:', error);
      throw error;
    }
  }

  /**
   * Delete family member (ensure belongs to user)
   */
  async deleteForUser(id: string, userid: string): Promise<{ success: boolean; reason?: string }> {
    try {
      console.log(`[FamilyService] Attempting to delete member ${id} for user ${userid}`);
      
      const member = await prisma.familyMember.findUnique({
        where: { id },
      });
      
      if (!member) {
        console.warn(`[FamilyService] No family member found with ID ${id}`);
        return { success: false, reason: 'NOT_FOUND' };
      }
      
      if (member.userId !== userid) {
        console.warn(`[FamilyService] Ownership mismatch. Member ${id} belongs to user ${member.userId}, but user ${userid} tried to delete it.`);
        return { success: false, reason: 'FORBIDDEN' };
      }
      
      await prisma.familyMember.delete({
        where: { id },
      });
      
      console.log(`[FamilyService] Successfully deleted member ${id}`);
      return { success: true };
    } catch (error) {
      console.error('[FamilyService] Error deleting family member:', error);
      throw error;
    }
  }

  /**
   * Get nominees (family members eligible as nominees)
   */
  async getNominees(userid: string): Promise<FamilyMember[]> {
    try {
      return await prisma.familyMember.findMany({
        where: {
          userId: userid,
          nomineeEligible: true,
        },
      });
    } catch (error) {
      console.error('[FamilyService] Error getting nominees:', error);
      throw error;
    }
  }

  /**
   * Get dependents
   */
  async getDependents(userid: string): Promise<FamilyMember[]> {
    try {
      return await prisma.familyMember.findMany({
        where: {
          userId: userid,
          isDependent: true,
        },
      });
    } catch (error) {
      console.error('[FamilyService] Error getting dependents:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();
