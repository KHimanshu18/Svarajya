import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const userId = auth.userId;

    const [assetInventory, propertyAssets, investments, insurancePolicies, nomineeRecords] = await Promise.all([
      prisma.assetInventory.findMany({ where: { userId }, select: { id: true, itemType: true, description: true, currentValue: true, purchaseValue: true } }),
      prisma.propertyAsset.findMany({ where: { userId }, select: { id: true, type: true, address: true, currentValue: true, purchaseAmount: true } }),
      prisma.investmentHolding.findMany({ where: { userId }, select: { id: true, type: true, name: true, currentValue: true, investedAmount: true } }),
      prisma.insurancePolicy.findMany({ where: { userId }, select: { id: true, type: true, policyNumber: true, nomineeId: true, sumAssured: true } }),
      prisma.successionNominee.findMany({ where: { userId } }),
    ]);

    // Build a quick lookup for nominee assignments by assetType+assetId
    const nomineeMap = new Map<string, any[]>();
    for (const n of nomineeRecords) {
      const key = `${n.assetType}::${n.assetId}`;
      if (!nomineeMap.has(key)) nomineeMap.set(key, []);
      nomineeMap.get(key)!.push(n);
    }

    const assets: any[] = [];

    for (const a of assetInventory) {
      const key = `asset_inventory::${a.id}`;
      assets.push({
        id: a.id,
        title: a.description || a.itemType,
        type: 'asset_inventory',
        nominee: (nomineeMap.get(key) || []).length > 0,
        value: a.currentValue ?? a.purchaseValue ?? 0,
      });
    }

    for (const p of propertyAssets) {
      const key = `property::${p.id}`;
      assets.push({
        id: p.id,
        title: `${p.type} ${p.address || ''}`.trim(),
        type: 'property',
        nominee: (nomineeMap.get(key) || []).length > 0,
        value: p.currentValue ?? p.purchaseAmount ?? 0,
      });
    }

    for (const inv of investments) {
      const key = `investment::${inv.id}`;
      assets.push({
        id: inv.id,
        title: inv.name || inv.type,
        type: 'investment',
        nominee: (nomineeMap.get(key) || []).length > 0,
        value: inv.currentValue ?? inv.investedAmount ?? 0,
      });
    }

    for (const ins of insurancePolicies) {
      const key = `insurance::${ins.id}`;
      assets.push({
        id: ins.id,
        title: ins.policyNumber || ins.type,
        type: 'insurance',
        nominee: (nomineeMap.get(key) || []).length > 0,
        value: ins.sumAssured ?? 0,
      });
    }

    return successResponse(assets);
  } catch (error) {
    console.error('[Succession Assets GET]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
