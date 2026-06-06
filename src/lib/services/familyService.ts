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

// Simple in-memory cache
const familyCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Family Member Service
 */
class FamilyService extends BaseService<FamilyMember, CreateFamilyMemberInput, UpdateFamilyMemberInput> {
  constructor() {
    super(prisma.familyMember);
  }

  /**
   * Calculate nomineeEligible based on relation, age, and dependent status
   * Rules:
   * - nomineeEligible = true if: spouse, parent, sibling, or child aged >= 18
   * - nomineeEligible = false if: child aged < 18, dependent flag is true, or no DOB for children
   */
  private calculateNomineeEligibility(relation: string, dob?: Date | null, isDependent?: boolean): boolean {
    // If dependent flag is true, not eligible
    if (isDependent === true) {
      return false;
    }

        const lowerRelation = relation.toLowerCase();

        // Eligible relations: spouse, parent, sibling
        const eligibleRelations = ['spouse', 'dampati', 'parent', 'pitri', 'matri', 'sibling', 'bhratri'];
        if (eligibleRelations.some(keyword => lowerRelation.includes(keyword))) {
            return true;
        }

        // For children, check age >= 18
        const childKeywords = ['child', 'santat', 'putri', 'putra'];
        if (childKeywords.some(keyword => lowerRelation.includes(keyword))) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 18;
    }

    // Default: not eligible
    return false;
  }

  /**
   * Get all family members for a user with caching and selective fields
   */
  async getFamilyMembers(userid: string): Promise<Partial<FamilyMember>[]> {
    const start = Date.now();
    console.log(`[FamilyService] Query started at ${start}`);

    try {
      const members = await prisma.familyMember.findMany({
        where: { userId: userid },
        select: {
          id: true,
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
        take: 10,
      });

      const duration = Date.now() - start;
      console.log(`[FamilyService] Query completed in ${duration}ms`);
      return members;
    } catch (error) {
      console.error('[FamilyService] Error:', error);
      throw error;
    }
  }

  /**
   * Create family member for user - invalidates cache
   */
  async createForUser(userid: string, data: CreateFamilyMemberInput): Promise<FamilyMember> {
    try {
      // Invalidate cache for this user
      familyCache.delete(`family:${userid}`);

      // Calculate nomineeEligible based on relation and age
      const nomineeEligible = this.calculateNomineeEligibility(
        data.relation,
        data.dob,
        data.isDependent
      );

      return await prisma.familyMember.create({
        data: {
          ...data,
          userId: userid,
          nomineeEligible, // Override with calculated value
        },
      });
    } catch (error) {
      console.error('[FamilyService] Error creating family member:', error);
      throw error;
    }
  }

  /**
   * Update family member - invalidates cache
   */
  async update(id: string, data: UpdateFamilyMemberInput): Promise<FamilyMember> {
    try {
      const member = await prisma.familyMember.findUnique({ where: { id } });
      if (member) {
        familyCache.delete(`family:${member.userId}`);
      }

      // Determine current relation and dob (use updated values or existing ones)
      const relation = data.relation || member?.relation || '';
      const dob = data.dob !== undefined ? data.dob : member?.dob;
      const isDependent = data.isDependent !== undefined ? data.isDependent : member?.isDependent;

      // Calculate nomineeEligible based on updated relation and age
      const nomineeEligible = this.calculateNomineeEligibility(relation, dob, isDependent);

      return await prisma.familyMember.update({
        where: { id },
        data: {
          ...data,
          nomineeEligible, // Override with calculated value
        },
      });
    } catch (error) {
      console.error('[FamilyService] Error updating family member:', error);
      throw error;
    }
  }

  /**
   * Delete family member (ensure belongs to user)
   */
  async deleteForUser(id: string, userid: string): Promise<{ success: boolean; reason?: string }> {
    try {
      console.log(`[FamilyService] Attempting to delete member ${id} for user ${userid}`);

      // Invalidate cache
      familyCache.delete(`family:${userid}`);

      const member = await prisma.familyMember.findUnique({
        where: { id },
        select: { userId: true, id: true },
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
  async getNominees(userid: string): Promise<Partial<FamilyMember>[]> {
    try {
      return await prisma.familyMember.findMany({
        where: {
          userId: userid,
          nomineeEligible: true,
        },
        select: {
          id: true,
          name: true,
          relation: true,
        },
        take: 10,
      });
    } catch (error) {
      console.error('[FamilyService] Error getting nominees:', error);
      throw error;
    }
  }

  /**
   * Get dependents
   */
  async getDependents(userid: string): Promise<Partial<FamilyMember>[]> {
    try {
      return await prisma.familyMember.findMany({
        where: {
          userId: userid,
          isDependent: true,
        },
        select: {
          id: true,
          name: true,
          relation: true,
          isDependent: true,
        },
        take: 10,
      });
    } catch (error) {
      console.error('[FamilyService] Error getting dependents:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();