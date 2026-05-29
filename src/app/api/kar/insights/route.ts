import { NextRequest, NextResponse } from 'next/server';
import { taxService } from '@/lib/services/taxService';
import { gstService } from '@/lib/services/gstService';
import { dinService } from '@/lib/services/dinService';
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

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);
  }

  try {
    const [taxRecords, gstRecords, dinRecords] = await Promise.all([
      taxService.getForUser(authContext.userId),
      gstService.getForUser(authContext.userId),
      dinService.getForUser(authContext.userId),
    ]);

    const cards: InsightCard[] = [];

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
