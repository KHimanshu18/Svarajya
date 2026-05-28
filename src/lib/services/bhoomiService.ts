import { PropertyAsset } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateBhoomiPropertyInput {
  propertyTitle: string;
  propertyType: string;
  ownershipType: string;
  coOwners?: any;
  marketValue?: number;
  purchaseDate?: Date | string | null;
  purchasePrice?: number | null;
  loanId?: string | null;
  carryingCostsAnnual?: number | null;
  rentalIncomeAnnual?: number | null;
  vaultFileIds?: any;
  secretFieldId?: string | null;
}

export interface UpdateBhoomiPropertyInput {
  propertyTitle?: string;
  propertyType?: string;
  ownershipType?: string;
  coOwners?: any;
  marketValue?: number | null;
  purchaseDate?: Date | string | null;
  purchasePrice?: number | null;
  loanId?: string | null;
  loanLinked?: boolean;
  carryingCostsAnnual?: number | null;
  rentalIncomeAnnual?: number | null;
  vaultFileIds?: any;
  secretFieldId?: string | null;
}

class BhoomiService extends BaseService<PropertyAsset, CreateBhoomiPropertyInput, UpdateBhoomiPropertyInput> {
  constructor() {
    super(prisma.propertyAsset as any);
  }

  async getForUser(userId: string): Promise<PropertyAsset[]> {
    try {
      return await prisma.propertyAsset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          type: true,
          address: true,
            ownershipType: true,
            coOwners: true,
          purchaseDate: true,
          purchaseAmount: true,
          currentValue: true,
          ownContribution: true,
          linkedLoanId: true,
          rentalIncome: true,
          annualCosts: true,
          vaultFileIds: true,
          secretFieldId: true,
          propertyTax: true,
          vacancyMonths: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('[BhoomiService] getForUser error', error);
      throw error;
    }
  }

  async getById(id: string): Promise<PropertyAsset | null> {
    try {
      return await prisma.propertyAsset.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          type: true,
          address: true,
            ownershipType: true,
            coOwners: true,
          purchaseDate: true,
          purchaseAmount: true,
          currentValue: true,
          ownContribution: true,
          linkedLoanId: true,
          rentalIncome: true,
          annualCosts: true,
          vaultFileIds: true,
          secretFieldId: true,
          propertyTax: true,
          vacancyMonths: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('[BhoomiService] getById error', error);
      throw error;
    }
  }

  async createForUser(userId: string, data: CreateBhoomiPropertyInput): Promise<PropertyAsset> {
    try {
      return await prisma.propertyAsset.create({
        data: {
          userId,
          type: data.propertyType,
          ownershipType: data.ownershipType ?? undefined,
          coOwners: data.coOwners === undefined ? undefined : data.coOwners,
          address: data.propertyTitle,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          purchaseAmount: data.purchasePrice ?? undefined,
          currentValue: data.marketValue ?? undefined,
          linkedLoanId: data.loanId ?? null,
          rentalIncome: data.rentalIncomeAnnual ?? undefined,
          annualCosts: data.carryingCostsAnnual ?? undefined,
          vaultFileIds: data.vaultFileIds === undefined ? undefined : data.vaultFileIds,
          secretFieldId: data.secretFieldId ?? undefined,
        },
      });
    } catch (error) {
      console.error('[BhoomiService] createForUser error', error);
      throw error;
    }
  }

  async updateProperty(id: string, data: UpdateBhoomiPropertyInput): Promise<PropertyAsset> {
    try {
      return await prisma.propertyAsset.update({
        where: { id },
        data: {
          type: data.propertyType,
          ownershipType: data.ownershipType ?? undefined,
          coOwners: data.coOwners === undefined ? undefined : data.coOwners,
          address: data.propertyTitle,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          purchaseAmount: data.purchasePrice ?? undefined,
          currentValue: data.marketValue ?? undefined,
          linkedLoanId: data.loanId ?? null,
          rentalIncome: data.rentalIncomeAnnual ?? undefined,
          annualCosts: data.carryingCostsAnnual ?? undefined,
          vaultFileIds: data.vaultFileIds === undefined ? undefined : data.vaultFileIds,
          secretFieldId: data.secretFieldId ?? undefined,
        },
      });
    } catch (error) {
      console.error('[BhoomiService] updateProperty error', error);
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    try {
      await prisma.propertyAsset.delete({ where: { id } });
    } catch (error) {
      console.error('[BhoomiService] deleteProperty error', error);
      throw error;
    }
  }
}

export const bhoomiService = new BhoomiService();