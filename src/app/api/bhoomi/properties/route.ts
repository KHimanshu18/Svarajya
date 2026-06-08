import { NextRequest, NextResponse } from 'next/server';
import { bhoomiService } from '@/lib/services/bhoomiService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const properties = await bhoomiService.getForUser(authContext.userId);
    const normalized = properties.map((property) => {
      const propertyRecord = property as any;
      const rawOwnership = propertyRecord.ownershipType || propertyRecord.ownership || propertyRecord.ownerType || null;
      const ownershipType = rawOwnership === 'Sole' ? 'Solo' : (rawOwnership || 'Solo');
      return {
        id: propertyRecord.id,
        propertyTitle: propertyRecord.address || propertyRecord.type || 'Property',
        propertyType: propertyRecord.type,
        ownershipType,
        marketValue: propertyRecord.currentValue ?? propertyRecord.purchaseAmount ?? null,
        // Map stored rental and annual cost fields to the API-friendly names used by the UI
        rentalIncomeAnnual: propertyRecord.rentalIncome ?? null,
        carryingCostsAnnual: propertyRecord.annualCosts ?? null,
        loanLinked: Boolean(propertyRecord.linkedLoanId),
        purchaseDate: propertyRecord.purchaseDate ? propertyRecord.purchaseDate.toISOString() : null,
        purchasePrice: propertyRecord.purchaseAmount ?? null,
        loanId: propertyRecord.linkedLoanId ?? null,
        vaultFileIds: propertyRecord.vaultFileIds || null,
        secretFieldId: propertyRecord.secretFieldId || null,
        createdAt: propertyRecord.createdAt.toISOString(),
      };
    });
    return successResponse({ properties: normalized });
  } catch (error) {
    console.error('[Bhoomi GET]', error);
    return handlePrismaError(error);
  }
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const data = await request.json();

    if (!data.propertyTitle || !data.propertyType || !data.ownershipType) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const created = await bhoomiService.createForUser(authContext.userId, {
      propertyTitle: data.propertyTitle,
      propertyType: data.propertyType,
      ownershipType: data.ownershipType,
      coOwners: data.coOwners || null,
      marketValue: data.marketValue !== undefined && data.marketValue !== null && data.marketValue !== '' ? Number(data.marketValue) : undefined,
      purchaseDate: data.purchaseDate || null,
      purchasePrice: data.purchasePrice !== undefined && data.purchasePrice !== null && data.purchasePrice !== '' ? Number(data.purchasePrice) : undefined,
      loanId: data.loanId || null,
      linkedInsuranceId: data.linkedInsuranceId || null,
      carryingCostsAnnual: data.carryingCostsAnnual ? Number(data.carryingCostsAnnual) : undefined,
      rentalIncomeAnnual: data.rentalIncomeAnnual ? Number(data.rentalIncomeAnnual) : undefined,
      vaultFileIds: data.vaultFileIds || null,
      secretFieldId: data.secretFieldId || null,
    });

    return successResponse(created, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Bhoomi POST]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(handleGET), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(handlePOST), AuthLevel.AUTHENTICATED);
