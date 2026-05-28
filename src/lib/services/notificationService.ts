import { Notification, NotifChannel, NotifStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BaseService } from './baseService';

export interface CreateNotificationInput {
  userId: string;
  templateId?: string | null;
  channel: NotifChannel;
  subject?: string | null;
  body: string;
  link?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  status?: NotifStatus;
}

export interface UpdateNotificationInput {
  templateId?: string | null;
  channel?: NotifChannel;
  subject?: string | null;
  body?: string;
  link?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  status?: NotifStatus;
}

class NotificationService extends BaseService<Notification, CreateNotificationInput, UpdateNotificationInput> {
  constructor() {
    super(prisma.notification);
  }

  async triggerAutomaticAlerts(userId: string): Promise<void> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // 1. Insurance Renewal Reminder (30 days before due date)
      const policies = await prisma.insurancePolicy.findMany({
        where: { userId, status: 'ACTIVE' }
      });
      for (const policy of policies) {
        if (policy.dueDate && new Date(policy.dueDate) <= thirtyDaysFromNow && new Date(policy.dueDate) >= now) {
          const subject = `Insurance renewal due: ${policy.insurerName}`;
          const body = `Your ${policy.type} insurance policy #${policy.policyNumber} premium of ₹${policy.premium} is due on ${new Date(policy.dueDate).toLocaleDateString()}.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

      // 2. Budget Overspend Alert (when expense exceeds category budget)
      const budgetPlan = await prisma.budgetPlan.findFirst({
        where: { userId, isActive: true }
      });
      if (budgetPlan && budgetPlan.categories && typeof budgetPlan.categories === 'object') {
        const expenses = await prisma.expenseEntry.findMany({
          where: {
            userId,
            createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
          }
        });
        const categoryTotals: Record<string, number> = {};
        for (const exp of expenses) {
          categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        }
        const limits = budgetPlan.categories as Record<string, number>;
        for (const [category, limit] of Object.entries(limits)) {
          const spent = categoryTotals[category] || 0;
          if (spent > limit) {
            const subject = `Budget overspent on ${category}`;
            const body = `You spent ₹${spent} on ${category}, exceeding your monthly budget limit of ₹${limit} by ₹${spent - limit}.`;
            const exists = await prisma.notification.findFirst({ where: { userId, subject } });
            if (!exists) {
              await prisma.notification.create({
                data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
              });
            }
          }
        }
      }

      // 3. Idle Money Alert (when bank balance exceeds threshold ₹150,000)
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { userId, status: 'ACTIVE' }
      });
      for (const account of bankAccounts) {
        const balance = account.currentBalance ?? 0;
        if (balance > 150000) {
          const subject = `Idle Money Detected: ${account.bankName}`;
          const body = `Your bank account ${account.bankName} (ending in ${account.accountLast4 || 'xxxx'}) has a high balance of ₹${balance}. Consider optimizing or investing the excess idle funds.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

      // 4. Subscription Renewal Reminder (7 days before renewal date)
      const subscriptions = await prisma.subscription.findMany({
        where: { userId, isActive: true }
      });
      for (const sub of subscriptions) {
        if (sub.renewalDate && new Date(sub.renewalDate) <= sevenDaysFromNow && new Date(sub.renewalDate) >= now) {
          const subject = `Subscription renewal soon: ${sub.name}`;
          const body = `Your subscription for ${sub.name} is scheduled to renew on ${new Date(sub.renewalDate).toLocaleDateString()} for ₹${sub.amount}.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

      // 5. Document Expiry Reminder (30 days before expiry)
      const documents = await prisma.identityRecord.findMany({
        where: { userId }
      });
      for (const doc of documents) {
        if (doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysFromNow && new Date(doc.expiryDate) >= now) {
          const subject = `Document expiry reminder: ${doc.idType}`;
          const body = `Your identity document ${doc.idType} (Number: ${doc.numberMasked || 'N/A'}) is set to expire on ${new Date(doc.expiryDate).toLocaleDateString()}. Make sure to renew or replace it.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

      // 6. Module Completion Milestones
      const will = await prisma.willStatus.findUnique({ where: { userId } });
      if (will && will.existsFlag) {
        const subject = `Milestone achieved: Will Status Set`;
        const body = `Congratulations! You have updated and sealed your Will Status details in Mitra Mandal.`;
        const exists = await prisma.notification.findFirst({ where: { userId, subject } });
        if (!exists) {
          await prisma.notification.create({
            data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
          });
        }
      }

      const docCount = await prisma.identityRecord.count({ where: { userId } });
      if (docCount >= 3) {
        const subject = `Milestone achieved: Identity Vault Foundation Complete`;
        const body = `Awesome job! You have uploaded at least 3 crucial identity documents in your Pehchaan Vault.`;
        const exists = await prisma.notification.findFirst({ where: { userId, subject } });
        if (!exists) {
          await prisma.notification.create({
            data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
          });
        }
      }

      const policyCount = await prisma.insurancePolicy.count({ where: { userId } });
      if (policyCount >= 1) {
        const subject = `Milestone achieved: Protection Shield Erected`;
        const body = `Great milestone! You have secured your family's future by registering your insurance policy.`;
        const exists = await prisma.notification.findFirst({ where: { userId, subject } });
        if (!exists) {
          await prisma.notification.create({
            data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
          });
        }
      }

      // 1. Rin (Loans) - EMI reminders
      const loans = await prisma.loanAccount.findMany({
        where: { userId, status: 'ACTIVE' }
      });
      for (const loan of loans) {
        if (loan.startDate && loan.emi) {
          const start = new Date(loan.startDate);
          const dayOfMonth = start.getDate();
          
          let nextEmi = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
          if (nextEmi < now) {
            nextEmi = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
          }
          
          const diffTime = nextEmi.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 3) {
            const subject = `EMI due soon for loan: ${loan.type}`;
            const body = `Your monthly EMI of ₹${loan.emi} for your ${loan.type} loan (Lender: ${loan.lenderName || 'N/A'}) is due in 3 days on ${nextEmi.toLocaleDateString()}.`;
            const exists = await prisma.notification.findFirst({ where: { userId, subject } });
            if (!exists) {
              await prisma.notification.create({
                data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
              });
            }
          }
        }
      }

      // 2. Kar (Tax) - Filing reminders
      const currentYear = now.getFullYear();
      let deadline = new Date(currentYear, 6, 31); // July 31st (0-indexed 6)
      if (now > deadline) {
        deadline = new Date(currentYear + 1, 6, 31);
      }
      const taxDiffTime = deadline.getTime() - now.getTime();
      const taxDiffDays = Math.ceil(taxDiffTime / (1000 * 60 * 60 * 24));
      
      let taxSubject = '';
      let taxBody = '';
      if (taxDiffDays === 30) {
        taxSubject = `Tax Filing Reminder: 30 days left`;
        taxBody = `Your Income Tax Return (ITR) filing deadline of July 31st is in 30 days. Plan your tax saving declarations soon.`;
      } else if (taxDiffDays === 7) {
        taxSubject = `Tax Filing Reminder: 7 days left`;
        taxBody = `Only 1 week left to file your Income Tax Return (ITR) before the July 31st deadline. Keep your Form 16 and calculations ready.`;
      } else if (taxDiffDays === 0) {
        taxSubject = `Tax Filing Deadline Day!`;
        taxBody = `Today is the final day to file your Income Tax Return (ITR) (July 31st). Submit your return today to avoid penalties.`;
      }
      
      if (taxSubject) {
        const exists = await prisma.notification.findFirst({ where: { userId, subject: taxSubject } });
        if (!exists) {
          await prisma.notification.create({
            data: { userId, channel: 'IN_APP', subject: taxSubject, body: taxBody, status: 'PENDING' }
          });
        }
      }

      // 3. Goals (Lakshya) - Milestone reminders
      const goals = await prisma.goal.findMany({
        where: { userId, status: 'IN_PROGRESS' }
      });
      for (const goal of goals) {
        if (goal.targetAmount && goal.targetAmount > 0) {
          const progressPct = (goal.currentSaved / goal.targetAmount) * 100;
          
          let milestonePct = 0;
          if (progressPct >= 100) milestonePct = 100;
          else if (progressPct >= 75) milestonePct = 75;
          else if (progressPct >= 50) milestonePct = 50;
          else if (progressPct >= 25) milestonePct = 25;
          
          if (milestonePct > 0) {
            const subject = `Goal Milestone Achieved: ${milestonePct}% for ${goal.name}`;
            const body = `Fantastic progress! Your savings for goal "${goal.name}" have reached ₹${goal.currentSaved}, which is ${milestonePct}% of your ₹${goal.targetAmount} target!`;
            const exists = await prisma.notification.findFirst({ where: { userId, subject } });
            if (!exists) {
              await prisma.notification.create({
                data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
              });
            }
          }
          
          if (goal.targetDate) {
            const goalTarget = new Date(goal.targetDate);
            const goalDiffTime = goalTarget.getTime() - now.getTime();
            const goalDiffDays = Math.ceil(goalDiffTime / (1000 * 60 * 60 * 24));
            
            if (goalDiffDays >= 0 && goalDiffDays <= 30) {
              const subject = `Goal Target Approaching: ${goal.name}`;
              const body = `Your target date for goal "${goal.name}" (₹${goal.targetAmount}) is in ${goalDiffDays} days on ${goalTarget.toLocaleDateString()}. Make sure to review your allocations.`;
              const exists = await prisma.notification.findFirst({ where: { userId, subject } });
              if (!exists) {
                await prisma.notification.create({
                  data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
                });
              }
            }
          }
        }
      }

      // 4. Shapana (Foundation) - Profile/family reminders
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { familyMembers: true }
      });
      if (user) {
        const isIncomplete = !user.name || !user.dob || (!user.phone && !user.primaryMobile);
        if (isIncomplete) {
          const subject = `Svarajya Profile incomplete`;
          const body = `Please complete your primary profile under Sthapana. Having a set name, Date of Birth, and mobile number guarantees exact verification mapping for nominee inheritance claims.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
        
        const familyCount = user.familyMembers.length;
        if (familyCount === 0) {
          const subject = `No family members registered`;
          const body = `Your Family Tree is currently empty. Head to the Sthapana Family tab to register your dependents, parents, or spouses, which is required to link nominees for key assets.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
        
        const yearAnniversary = new Date(user.createdAt);
        yearAnniversary.setFullYear(now.getFullYear());
        const annDiffTime = Math.abs(now.getTime() - yearAnniversary.getTime());
        const annDiffDays = Math.ceil(annDiffTime / (1000 * 60 * 60 * 24));
        if (annDiffDays <= 7) {
          const subject = `Annual Family Member Review`;
          const body = `It is time for your annual Svarajya family status review. Make sure to double-check contact numbers, address changes, or newly eligible dependent milestones in Sthapana Family.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

      // 5. Kosh (Income) - Income review reminder
      const incomeStreams = await prisma.incomeStream.findMany({
        where: { userId }
      });
      for (const stream of incomeStreams) {
        const lastReview = stream.lastReviewedAt ? new Date(stream.lastReviewedAt) : new Date(stream.createdAt);
        const incDiffTime = now.getTime() - lastReview.getTime();
        const incDiffDays = Math.ceil(incDiffTime / (1000 * 60 * 60 * 24));
        
        if (incDiffDays > 180) {
          const subject = `Income Review Reminder: ${stream.type}`;
          const body = `Your income stream from "${stream.source || stream.type}" was last reviewed ${incDiffDays} days ago. Please review and update expected growth, TDS deductions, or monthly credit status.`;
          const exists = await prisma.notification.findFirst({ where: { userId, subject } });
          if (!exists) {
            await prisma.notification.create({
              data: { userId, channel: 'IN_APP', subject, body, status: 'PENDING' }
            });
          }
        }
      }

    } catch (error) {
      console.error('[NotificationService] Error triggering automatic alerts:', error);
    }
  }

  getLinkForNotification(subject: string | null): string {
    const title = subject || "";
    if (
        title.toLowerCase().includes("vault") || 
        title.toLowerCase().includes("identity") || 
        title.toLowerCase().includes("pehchaan") || 
        title.toLowerCase().includes("document")
    ) {
        return "/pehchaan/records";
    } else if (title.toLowerCase().includes("profile setup incomplete") || title.toLowerCase().includes("profile incomplete")) {
        return "/foundation";
    } else if (title.toLowerCase().includes("family member review") || title.toLowerCase().includes("no family members")) {
        return "/foundation/family";
    } else if (
        title.toLowerCase().includes("profile") || 
        title.toLowerCase().includes("foundation") || 
        title.toLowerCase().includes("family") || 
        title.toLowerCase().includes("dependent")
    ) {
        return "/foundation";
    } else if (
        title.toLowerCase().includes("insurance") || 
        title.toLowerCase().includes("policy") || 
        title.toLowerCase().includes("raksha") ||
        title.toLowerCase().includes("shield") ||
        title.toLowerCase().includes("protection")
    ) {
        return "/raksha/policies";
    } else if (
        title.toLowerCase().includes("budget") || 
        title.toLowerCase().includes("overspend") || 
        title.toLowerCase().includes("expense") || 
        title.toLowerCase().includes("vyaya")
    ) {
        return "/vyaya/budget";
    } else if (title.toLowerCase().includes("subscription")) {
        return "/vyaya/subscriptions";
    } else if (
        title.toLowerCase().includes("idle") || 
        title.toLowerCase().includes("bank") || 
        title.toLowerCase().includes("pravah")
    ) {
        return "/khate/accounts/idle";
    } else if (title.toLowerCase().includes("will")) {
        return "/mitra/will";
    } else if (
        title.toLowerCase().includes("income") || 
        title.toLowerCase().includes("kosh") || 
        title.toLowerCase().includes("stream")
    ) {
        return "/kosh";
    } else if (
        title.toLowerCase().includes(" emi ") ||
        title.toLowerCase().startsWith("emi ") ||
        title.toLowerCase().endsWith(" emi") ||
        title.toLowerCase().includes("loan") || 
        title.toLowerCase().includes("rin")
    ) {
        return "/rin";
    } else if (
        title.toLowerCase().includes("tax") || 
        title.toLowerCase().includes("kar") || 
        title.toLowerCase().includes("itr")
    ) {
        return "/kar";
    } else if (title.toLowerCase().includes("property") || title.toLowerCase().includes("bhoomi")) {
        return "/bhoomi";
    } else if (
        title.toLowerCase().includes("goal") || 
        title.toLowerCase().includes("lakshya") || 
        title.toLowerCase().includes("milestone")
    ) {
        return "/lakshya";
    }
    return "/rajya";
  }

  async getForUser(userId: string): Promise<any[]> {
    try {
      await this.triggerAutomaticAlerts(userId);

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return notifications.map(n => ({
        ...n,
        link: n.link || this.getLinkForNotification(n.subject)
      }));
    } catch (error) {
      console.error('[NotificationService] Error getting user notifications:', error);
      throw error;
    }
  }

  async markAsRead(id: string, userId: string): Promise<any> {
    try {
      const notification = await prisma.notification.update({
        where: { id, userId },
        data: {
          status: 'OPENED',
          openedAt: new Date(),
        },
      });
      return {
        ...notification,
        link: notification.link || this.getLinkForNotification(notification.subject)
      };
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      return await prisma.notification.updateMany({
        where: { userId, status: 'PENDING' },
        data: {
          status: 'OPENED',
          openedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      throw error;
    }
  }

  async createNotification(userId: string, data: Omit<CreateNotificationInput, 'userId'>): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          ...data,
          userId,
          status: data.status || 'PENDING',
        },
      });
      return {
        ...notification,
        link: notification.link || this.getLinkForNotification(notification.subject)
      };
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
