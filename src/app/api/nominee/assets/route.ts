import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required', StatusCodes.UNAUTHORIZED);

  const userId = authContext.userId;

  try {
    // 1. Fetch all nominee mappings with nominee names
    const mappings = await prisma.nomineeMapping.findMany({
      where: { userId },
      include: {
        nominee: {
          select: {
            id: true,
            name: true,
            relation: true,
          }
        }
      }
    });

    // Helper to group mappings by assetRef
    const mappingsByAsset: Record<string, typeof mappings> = {};
    mappings.forEach(m => {
      if (!mappingsByAsset[m.assetRef]) {
        mappingsByAsset[m.assetRef] = [];
      }
      mappingsByAsset[m.assetRef].push(m);
    });

    // 2. Fetch all Insurance Policies
    const insurances = await prisma.insurancePolicy.findMany({
      where: { userId },
    });

    // 3. Fetch all Bank Accounts
    const banks = await prisma.bankAccount.findMany({
      where: { userId },
    });

    // 4. Fetch all Property Assets
    const properties = await prisma.propertyAsset.findMany({
      where: { userId },
    });

    // 5. Fetch all Investment Holdings
    const investments = await prisma.investmentHolding.findMany({
      where: { userId },
    });

    // 6. Map everything into standard Asset structure
    const assetsList: any[] = [];

    // Map Insurances
    insurances.forEach(ins => {
      assetsList.push({
        id: ins.id,
        name: `${ins.insurerName || 'Insurance'} Policy`,
        type: 'INSURANCE',
        value: ins.sumAssured || ins.premium,
        details: `Policy #${ins.policyNumber} (${ins.type})`,
        nominees: mappingsByAsset[ins.id] || [],
      });
    });

    // Map Bank Accounts
    banks.forEach(b => {
      assetsList.push({
        id: b.id,
        name: `${b.bankName} Account`,
        type: 'BANK',
        value: b.currentBalance || 0,
        details: `${b.accountType} Account (...${b.accountLast4})`,
        nominees: mappingsByAsset[b.id] || [],
      });
    });

    // Map Properties
    properties.forEach(p => {
      assetsList.push({
        id: p.id,
        name: `${p.type.replace('_', ' ')} Property`,
        type: 'PROPERTY',
        value: p.currentValue || p.purchaseAmount || 0,
        details: p.address || 'No address set',
        nominees: mappingsByAsset[p.id] || [],
      });
    });

    // Map Investments
    investments.forEach(inv => {
      assetsList.push({
        id: inv.id,
        name: inv.name || `${inv.type.replace('_', ' ')} Holding`,
        type: 'INVESTMENT',
        value: inv.currentValue || inv.investedAmount || 0,
        details: `${inv.type.replace('_', ' ')} Asset`,
        nominees: mappingsByAsset[inv.id] || [],
      });
    });

    return successResponse(assetsList);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
