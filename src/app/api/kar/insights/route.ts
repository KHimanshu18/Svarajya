import { NextRequest, NextResponse } from 'next/server';
import { taxService } from '@/lib/services/taxService';
import { gstService } from '@/lib/services/gstService';
import { dinService } from '@/lib/services/dinService';
import { incomeService } from '@/lib/services/incomeService';
import { loanService } from '@/lib/services/loanService';
import { bhoomiService } from '@/lib/services/bhoomiService';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

type InsightCard = {
  id: string;
  title: string;
  description: string;
  action: string;
};

function daysUntil(date?: Date | string | null) {
  if (!date) return Infinity;
  const parsed = new Date(date as string);
  if (Number.isNaN(parsed.getTime())) return Infinity;
  return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDueDate(date?: Date | string | null) {
  if (!date) return 'soon';
  const parsed = new Date(date as string);
  if (Number.isNaN(parsed.getTime())) return 'soon';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTaxSlab(annualIncome: number): string {
  // FY 2024-25 tax slabs for individuals (under new tax regime)
  if (annualIncome <= 300000) return '0-30 lakhs';
  if (annualIncome <= 600000) return '30-60 lakhs';
  if (annualIncome <= 900000) return '60-90 lakhs';
  if (annualIncome <= 1200000) return '90 lakhs-1.2 crore';
  if (annualIncome <= 1500000) return '1.2-1.5 crore';
  return '1.5+ crore';
}

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    // Fetch all cross-module data in parallel
    const [
      taxRecords,
      gstRecords,
      dinRecords,
      incomeStreams,
      loans,
      properties,
      investments,
    ] = await Promise.all([
      taxService.getForUser(authContext.userId),
      gstService.getForUser(authContext.userId),
      dinService.getForUser(authContext.userId),
      incomeService.getForUser(authContext.userId),
      loanService.getForUser(authContext.userId),
      bhoomiService.getForUser(authContext.userId),
      prisma.investmentHolding.findMany({
        where: { userId: authContext.userId },
      }),
    ]);

    const cards: InsightCard[] = [];

    // ========== EXISTING TAX/GST/DIN INSIGHTS ==========
    const soonGst = gstRecords.find((record) => record.nextDueDate && daysUntil(record.nextDueDate) <= 7);
    if (soonGst) {
      const days = daysUntil(soonGst.nextDueDate);
      cards.push({
        id: 'gst-filing-due',
        title: `GST filing due ${days <= 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`,
        description: `GSTIN ${soonGst.gstin} has a next due date of ${formatDueDate(soonGst.nextDueDate)}. Keep filing dates updated to avoid penalties.`, 
        action: '/kar/gst',
      });
    }

    const pendingTax = taxRecords.find((record) => {
      const status = record.status?.toString().toLowerCase() || '';
      return ['pending', 'draft', 'not filed', 'open'].includes(status);
    });
    if (pendingTax) {
      cards.push({
        id: 'tax-pending-filing',
        title: 'Pending ITR filing detected',
        description: `An ITR record for ${pendingTax.assessmentYear} is still ${pendingTax.status?.toLowerCase()}. Review the record and update filing status.`, 
        action: '/kar/itr',
      });
    }

    const shortfall = taxRecords.find((record) => (record.taxDue ?? 0) > (record.taxPaid ?? 0));
    if (shortfall) {
      cards.push({
        id: 'tax-shortfall',
        title: 'Potential tax shortfall',
        description: `Tax due of ₹${shortfall.taxDue?.toFixed(2)} exceeds paid amount of ₹${shortfall.taxPaid?.toFixed(2)} for ${shortfall.assessmentYear}.`, 
        action: '/kar/itr',
      });
    }

    const soonDsc = dinRecords.find((record) => record.dscExpiryDate && daysUntil(record.dscExpiryDate) <= 30);
    if (soonDsc) {
      const days = daysUntil(soonDsc.dscExpiryDate);
      cards.push({
        id: 'dsc-renewal',
        title: `DSC renewal ${days <= 0 ? 'due now' : `in ${days} day${days === 1 ? '' : 's'}`}`,
        description: `${soonDsc.companyName || soonDsc.dinNumber} has a DSC expiry date of ${formatDueDate(soonDsc.dscExpiryDate)}. Renew before expiry to stay compliant.`, 
        action: '/kar/din',
      });
    }

    // ========== NEW: INCOME & TAX SLAB AWARENESS ==========
    if (incomeStreams.length > 0) {
      const totalAnnualIncome = incomeStreams.reduce((sum, stream) => {
        let multiplier = 1;
        if (stream.frequency === 'MONTHLY') multiplier = 12;
        else if (stream.frequency === 'QUARTERLY') multiplier = 4;
        return sum + (stream.amountNet * multiplier);
      }, 0);

      if (totalAnnualIncome > 0) {
        const taxSlab = getTaxSlab(totalAnnualIncome);
        cards.push({
          id: 'income-tax-slab',
          title: `Your estimated tax slab: ${taxSlab}`,
          description: `Based on total annual income of ₹${totalAnnualIncome.toLocaleString('en-IN')}. Tax slab changes can affect deduction limits. Consult your tax advisor for deduction optimization.`,
          action: '/kosh',
        });
      }
    } else {
      cards.push({
        id: 'add-income-data',
        title: 'Add Kosh (Income) data to see tax insights',
        description: 'Track your income streams to get tax slab awareness and deduction optimization tips.',
        action: '/kosh/sources/add',
      });
    }

    // ========== NEW: 80C DEDUCTION POTENTIAL ==========
    const eligible80C = investments.filter((inv) =>
      ['ELSS', 'PPF', 'NSC', 'FD', 'Insurance Premium'].some(type =>
        inv.type?.toUpperCase().includes(type.toUpperCase())
      )
    );

    if (eligible80C.length > 0) {
      const total80C = eligible80C.reduce((sum, inv) => sum + inv.investedAmount, 0);
      const deduction80C = Math.min(total80C, 150000); // Section 80C limit is ₹1,50,000
      cards.push({
        id: '80c-deduction',
        title: `80C Deduction Potential: ₹${deduction80C.toLocaleString('en-IN')}`,
        description: `You have ₹${total80C.toLocaleString('en-IN')} in 80C-eligible investments (ELSS, PPF, NSC, etc.). You may claim up to ₹${deduction80C.toLocaleString('en-IN')} under Section 80C.`,
        action: '/beej',
      });
    } else if (investments.length === 0) {
      cards.push({
        id: 'add-investment-data',
        title: 'Add Beej (Investment) data to see 80C deduction insights',
        description: 'Track your investments in ELSS, PPF, NSC, and other instruments to see tax deduction potential.',
        action: '/beej',
      });
    }

    // ========== NEW: HOME LOAN INTEREST BENEFIT (SECTION 24B) ==========
    const homeLoans = loans.filter((loan) => loan.type?.toUpperCase().includes('HOME'));
    if (homeLoans.length > 0) {
      const totalInterestPaid = homeLoans.reduce((sum, loan) => {
        // Estimate annual interest from EMI (simple calculation)
        const annualEMI = (loan.emi ?? 0) * 12;
        const principalPaid = loan.principal ? (loan.principal / loan.tenure) : 0;
        const estimatedInterest = annualEMI - principalPaid;
        return sum + Math.max(estimatedInterest, 0);
      }, 0);

      if (totalInterestPaid > 0) {
        cards.push({
          id: '24b-deduction',
          title: `Home Loan Interest Benefit: ₹${totalInterestPaid.toLocaleString('en-IN')}`,
          description: `You paid approximately ₹${totalInterestPaid.toLocaleString('en-IN')} in home loan interest. You may be eligible for deduction under Section 24(b).`,
          action: '/rin',
        });
      }
    } else if (loans.length === 0) {
      cards.push({
        id: 'add-loan-data',
        title: 'Add Rin (Loan) data to see Section 24(b) deduction insights',
        description: 'Track your home loans to see potential interest deduction benefits.',
        action: '/rin',
      });
    }

    // ========== NEW: RENTAL INCOME & PROPERTY TAX DEDUCTION ==========
    if (properties.length > 0) {
      const rentalProperties = properties.filter((p: any) => (p.rentalIncome ?? 0) > 0);
      const propertyTaxAmount = properties.reduce((sum, p: any) => sum + (p.annualCosts ?? 0), 0);

      if (rentalProperties.length > 0) {
        const totalRentalIncome = rentalProperties.reduce((sum, p: any) => sum + (p.rentalIncome ?? 0), 0);
        cards.push({
          id: 'rental-income-tax',
          title: `Rental Income Tax: ₹${totalRentalIncome.toLocaleString('en-IN')} annually`,
          description: `Your rental income of ₹${totalRentalIncome.toLocaleString('en-IN')} is taxable. Property tax and maintenance costs of ₹${propertyTaxAmount.toLocaleString('en-IN')} can be deducted.`,
          action: '/bhoomi',
        });
      } else if (propertyTaxAmount > 0) {
        cards.push({
          id: 'property-tax-deduction',
          title: `Property Tax Deduction: ₹${propertyTaxAmount.toLocaleString('en-IN')}`,
          description: `You paid ₹${propertyTaxAmount.toLocaleString('en-IN')} in property taxes and maintenance costs. These can be claimed as deductions.`,
          action: '/bhoomi',
        });
      }
    } else {
      cards.push({
        id: 'add-property-data',
        title: 'Add Bhoomi (Property) data to see rental income and tax deduction insights',
        description: 'Track your properties to see potential rental income tax and deduction benefits.',
        action: '/bhoomi',
      });
    }

    // ========== FALLBACK IF NO CARDS GENERATED ==========
    if (cards.length === 0) {
      if (taxRecords.length === 0) {
        cards.push({
          id: 'no-tax-records',
          title: 'No ITR filings tracked yet',
          description: 'Add your tax records to monitor filing status, due dates and refund tracking.',
          action: '/kar/itr',
        });
      }
      if (gstRecords.length === 0) {
        cards.push({
          id: 'no-gst-registrations',
          title: 'No GST registrations found',
          description: 'Add your GSTINs so you can track filing frequency, return deadlines, and compliance status.',
          action: '/kar/gst',
        });
      }
      if (dinRecords.length === 0) {
        cards.push({
          id: 'no-din-records',
          title: 'No DIN records found',
          description: 'Record your director details and DSC deadlines to avoid MCA and DIN non-compliance.',
          action: '/kar/din',
        });
      }
      if (cards.length === 0) {
        cards.push({
          id: 'compliance-healthy',
          title: 'All tracked records look healthy',
          description: 'Keep using the module to maintain compliance awareness and update records regularly.',
          action: '/kar',
        });
      }
    }

    return successResponse(cards);
  } catch (error) {
    console.error('[Kar Insights GET]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
