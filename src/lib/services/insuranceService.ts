import { prisma } from '@/lib/prisma';
import { InsurancePolicy, InsuranceCoverage } from '@prisma/client';

export interface InsurancePolicyWithCoverage extends InsurancePolicy {
  coverage: (InsuranceCoverage & {
    member: {
      id: string;
      name: string;
      relation: string;
    };
  })[];
  reminder?: any;
}

export interface CreateInsurancePolicyInput {
  type: string;
  policyNumber: string;
  insurerName?: string;
  sumAssured: number;
  premium: number;
  premiumFrequency?: string;
  dueDate: Date;
  maturityDate?: Date;
  nomineeId?: string;
  agentContact?: string;
  status?: string;
  coveredMemberIds?: string[];
}

export interface UpdateInsurancePolicyInput extends Partial<CreateInsurancePolicyInput> {}

export class InsuranceService {
  /**
   * Get all insurance policies for a user
   */
  async getForUser(userId: string): Promise<InsurancePolicyWithCoverage[]> {
    return prisma.insurancePolicy.findMany({
      where: { userId },
      include: {
        coverage: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                relation: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    }) as unknown as InsurancePolicyWithCoverage[];
  }

  /**
   * Get a single insurance policy by ID
   */
  async getById(id: string, userId: string): Promise<InsurancePolicyWithCoverage | null> {
    return prisma.insurancePolicy.findFirst({
      where: { id, userId },
      include: {
        coverage: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                relation: true,
              },
            },
          },
        },
      },
    }) as unknown as InsurancePolicyWithCoverage | null;
  }

  /**
   * Create a new insurance policy
   */
  async create(userId: string, data: CreateInsurancePolicyInput): Promise<InsurancePolicyWithCoverage> {
    const { coveredMemberIds, ...policyData } = data;

    const policy = await prisma.insurancePolicy.create({
      data: {
        ...policyData,
        userId,
        coverage: coveredMemberIds ? {
          create: coveredMemberIds.map(memberId => ({
            memberId
          }))
        } : undefined
      },
      include: {
        coverage: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                relation: true,
              },
            },
          },
        },
      }
    });

    // Auto-create reminder for renewal
    await this.syncReminder(userId, policy);

    return policy as unknown as InsurancePolicyWithCoverage;
  }

  /**
   * Sync renewal reminder for a policy
   */
  private async syncReminder(userId: string, policy: any) {
    try {
      const { reminderService } = await import('./reminderService');
      
      const dueDate = new Date(policy.dueDate);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - 30);

      let reminder;
      if (policy.reminderId) {
        reminder = await reminderService.update(policy.reminderId, userId, {
          targetDate: reminderDate,
          message: `Policy ${policy.policyNumber} (${policy.insurerName}) is due for renewal on ${dueDate.toLocaleDateString()}`,
        });
      } else {
        reminder = await reminderService.create(userId, {
          type: 'INSURANCE_RENEWAL',
          targetDate: reminderDate,
          linkedEntityId: policy.id,
          message: `Policy ${policy.policyNumber} (${policy.insurerName}) is due for renewal on ${dueDate.toLocaleDateString()}`,
          priority: 'MEDIUM',
        });
      }

      if (reminder && !policy.reminderId) {
        await prisma.insurancePolicy.update({
          where: { id: policy.id },
          data: { reminderId: reminder.id }
        });
      }
    } catch (err) {
      console.error('[InsuranceService.syncReminder] Failed:', err);
    }
  }

  /**
   * Update an existing insurance policy
   */
  async update(id: string, userId: string, data: UpdateInsurancePolicyInput): Promise<InsurancePolicyWithCoverage> {
    const { coveredMemberIds, ...policyData } = data;

    // Use transaction to update policy and coverage
    const policy = await prisma.$transaction(async (tx) => {
      // 1. Update basic policy info
      await tx.insurancePolicy.update({
        where: { id, userId },
        data: policyData,
      });

      // 2. Update coverage if member IDs are provided
      if (coveredMemberIds) {
        // Delete existing coverage
        await tx.insuranceCoverage.deleteMany({
          where: { policyId: id }
        });

        // Create new coverage
        await tx.insuranceCoverage.createMany({
          data: coveredMemberIds.map(memberId => ({
            policyId: id,
            memberId
          }))
        });
      }

      return tx.insurancePolicy.findUnique({
        where: { id },
        include: {
          coverage: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  relation: true,
                },
              },
            },
          },
        }
      });
    });

    // Sync reminder after update
    if (policy) {
      await this.syncReminder(userId, policy);
    }

    return policy as unknown as InsurancePolicyWithCoverage;
  }

  /**
   * Delete an insurance policy
   */
  async delete(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.insurancePolicy.delete({
        where: { id, userId }
      });
      return true;
    } catch (error) {
      console.error('[InsuranceService.delete]', error);
      return false;
    }
  }

  /**
   * Get insurance statistics for a user
   */
  async getStats(userId: string) {
    const policies = await this.getForUser(userId);
    
    const stats = {
      totalPolicies: policies.length,
      totalSumAssured: policies.reduce((sum, p) => sum + p.sumAssured, 0),
      totalAnnualPremium: policies.reduce((sum, p) => {
        let annual = p.premium;
        if (p.premiumFrequency === 'MONTHLY') annual *= 12;
        if (p.premiumFrequency === 'QUARTERLY') annual *= 4;
        return sum + annual;
      }, 0),
      byType: {} as Record<string, number>,
      healthStatus: 'critical' as 'critical' | 'warning' | 'secure'
    };

    policies.forEach(p => {
      stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
    });

    // Simple health status logic
    const hasLife = stats.byType['LIFE'] || stats.byType['TERM'];
    const hasHealth = stats.byType['HEALTH'];

    if (hasLife && hasHealth) {
      stats.healthStatus = 'secure';
    } else if (hasLife || hasHealth) {
      stats.healthStatus = 'warning';
    } else {
      stats.healthStatus = 'critical';
    }

    return stats;
  }
}

export const insuranceService = new InsuranceService();
