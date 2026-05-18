import { NomineeMapping } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateNomineeMappingInput {
  assetRef: string;
  assetType: string;
  nomineeId: string;
  sharePercent?: number;
  proofDocLinked?: boolean;
  confirmed?: boolean;
}

export interface UpdateNomineeMappingInput {
  nomineeId?: string;
  sharePercent?: number;
  proofDocLinked?: boolean;
  confirmed?: boolean;
}

class NomineeService extends BaseService<NomineeMapping, CreateNomineeMappingInput, UpdateNomineeMappingInput> {
  constructor() {
    super(prisma.nomineeMapping);
  }

  async getForUser(userId: string): Promise<any[]> {
    try {
      return await prisma.nomineeMapping.findMany({
        where: { userId },
        include: {
          nominee: {
            select: {
              id: true,
              name: true,
              relation: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('[NomineeService] Error getting nominee mappings:', error);
      throw error;
    }
  }

  async upsertMapping(userId: string, data: CreateNomineeMappingInput): Promise<NomineeMapping> {
    try {
      // Find if mapping already exists for this assetRef and nomineeId
      const existing = await prisma.nomineeMapping.findFirst({
        where: {
          userId,
          assetRef: data.assetRef,
          nomineeId: data.nomineeId,
        }
      });

      if (existing) {
        return await prisma.nomineeMapping.update({
          where: { id: existing.id },
          data: {
            sharePercent: data.sharePercent !== undefined ? data.sharePercent : existing.sharePercent,
            proofDocLinked: data.proofDocLinked !== undefined ? data.proofDocLinked : existing.proofDocLinked,
            confirmed: data.confirmed !== undefined ? data.confirmed : existing.confirmed,
          }
        });
      } else {
        return await prisma.nomineeMapping.create({
          data: {
            ...data,
            userId,
          }
        });
      }
    } catch (error) {
      console.error('[NomineeService] Error upserting nominee mapping:', error);
      throw error;
    }
  }
}

export const nomineeService = new NomineeService();
