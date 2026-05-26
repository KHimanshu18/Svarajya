import { NextRequest, NextResponse } from 'next/server';
import { identityService } from '@/lib/services/identityService';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';
import { withErrorHandler } from '@/lib/middleware/error.middleware';
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  StatusCodes,
  handlePrismaError,
} from '@/lib/middleware/standardResponse';
import { IdentityRecordResponse, CreateIdentityRecordRequest, UpdateIdentityRecordRequest } from '@/lib/types/api.types';

/**
 * GET /api/identity
 * Get all identity records for user
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const expiring = searchParams.get('expiring') === 'true';

    let records;
    if (expiring) {
      records = await identityService.getExpiringSoon(authContext.userId);
    } else {
      records = await identityService.getForUser(authContext.userId);
    }

    const responses: IdentityRecordResponse[] = records.map((record) => ({
      id: record.id,
      userId: record.userId,
      idType: record.idType,
      numberMasked: record.numberMasked,
      expiryDate: record.expiryDate?.toISOString() || null,
      issuedDate: record.issuedDate?.toISOString() || null,
      placeOfIssue: record.placeOfIssue,
      dobOnDoc: record.dobOnDoc?.toISOString() || null,
      nameOnDoc: record.nameOnDoc,
      vaultFileId: record.vaultFileId,
      familyMemberId: record.familyMemberId || null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));

    return successResponse(responses);
  } catch (error) {
    console.error('[Identity GET]', error);
    return handlePrismaError(error);
  }
}

/**
 * POST /api/identity
 * Create or update identity record
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const authContext = getAuthContext(request);
  if (!authContext) {
    console.error('[Identity POST] No auth context');
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  console.log('[Identity POST] Auth context userId:', authContext.userId);

  try {
    const data: CreateIdentityRecordRequest | (UpdateIdentityRecordRequest & { id?: string }) = await request.json();
    console.log('[Identity POST] Received data:', data);

    // Validate required fields
    if (!data.idType || !data.numberMasked) {
      console.error('[Identity POST] Validation failed: missing idType or numberMasked');
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'ID type and masked number are required',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let record;

    if ('id' in data && data.id) {
      console.log('[Identity POST] Updating existing record:', data.id);
      // Update existing
      record = await identityService.update(data.id, {
        idType: data.idType,
        numberMasked: data.numberMasked,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        placeOfIssue: data.placeOfIssue,
        dobOnDoc: data.dobOnDoc ? new Date(data.dobOnDoc) : undefined,
        nameOnDoc: data.nameOnDoc,
        vaultFileId: data.vaultFileId,
        familyMemberId: data.familyMemberId,
      });
      console.log('[Identity POST] Updated record:', record.id);
    } else {
      console.log('[Identity POST] Creating new record for user:', authContext.userId);
      // Create new (will handle unique constraint on userId + idType + familyMemberId)
      record = await identityService.createForUser(authContext.userId, {
        idType: data.idType,
        numberMasked: data.numberMasked,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        placeOfIssue: data.placeOfIssue,
        dobOnDoc: data.dobOnDoc ? new Date(data.dobOnDoc) : undefined,
        nameOnDoc: data.nameOnDoc,
        vaultFileId: data.vaultFileId,
        familyMemberId: data.familyMemberId,
      });
      console.log('[Identity POST] Created record:', record.id);
    }

    const response: IdentityRecordResponse = {
      id: record.id,
      userId: record.userId,
      idType: record.idType,
      numberMasked: record.numberMasked,
      expiryDate: record.expiryDate?.toISOString() || null,
      issuedDate: record.issuedDate?.toISOString() || null,
      placeOfIssue: record.placeOfIssue,
      dobOnDoc: record.dobOnDoc?.toISOString() || null,
      nameOnDoc: record.nameOnDoc,
      vaultFileId: record.vaultFileId,
      familyMemberId: record.familyMemberId || null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    console.log('[Identity POST] Returning response:', response);
    return successResponse(response, StatusCodes.CREATED);
  } catch (error) {
    console.error('[Identity POST] Error:', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const POST = withAuth(withErrorHandler(postHandler), AuthLevel.AUTHENTICATED);
