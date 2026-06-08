import { NextRequest, NextResponse } from 'next/server';
import { bhoomiService } from '@/lib/services/bhoomiService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import { successResponse, errorResponse, ErrorCodes, StatusCodes, handlePrismaError } from '@/lib/middleware/standardResponse';

async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const { id } = await params;
    const existing = await bhoomiService.getById(id);
    if (!existing || existing.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Property not found', StatusCodes.NOT_FOUND);
    }

    const data = await request.json();
    const updated = await bhoomiService.updateProperty(id, {
      propertyTitle: data.propertyTitle,
      propertyType: data.propertyType,
      ownershipType: data.ownershipType,
      coOwners: data.coOwners || null,
      marketValue: data.marketValue !== undefined && data.marketValue !== null && data.marketValue !== '' ? Number(data.marketValue) : undefined,
      purchaseDate: data.purchaseDate || null,
      purchasePrice: data.purchasePrice !== undefined && data.purchasePrice !== null && data.purchasePrice !== '' ? Number(data.purchasePrice) : undefined,
      loanId: data.loanId || null,
      linkedInsuranceId: data.linkedInsuranceId || null,
      loanLinked: data.loanId ? true : undefined,
      carryingCostsAnnual: data.carryingCostsAnnual ? Number(data.carryingCostsAnnual) : undefined,
      rentalIncomeAnnual: data.rentalIncomeAnnual ? Number(data.rentalIncomeAnnual) : undefined,
      vaultFileIds: data.vaultFileIds || null,
      secretFieldId: data.secretFieldId || null,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[Bhoomi PUT ID]', error);
    return handlePrismaError(error);
  }
}

async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', StatusCodes.UNAUTHORIZED);

  try {
    const { id } = await params;
    const existing = await bhoomiService.getById(id);
    if (!existing || existing.userId !== authContext.userId) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Property not found', StatusCodes.NOT_FOUND);
    }

    await bhoomiService.deleteProperty(id);
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('[Bhoomi DELETE ID]', error);
    return handlePrismaError(error);
  }
}

export const PUT = withAuth(withErrorHandler(handlePUT), AuthLevel.AUTHENTICATED);
export const DELETE = withAuth(withErrorHandler(handleDELETE), AuthLevel.AUTHENTICATED);
