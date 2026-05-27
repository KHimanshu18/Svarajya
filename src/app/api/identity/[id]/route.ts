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
import { syncDocumentMemberAssociation, moveGoogleDriveFile } from '@/lib/googleDriveUtils';
import { prisma } from '@/lib/prisma';

/**
 * Helper: Create or update document_meta record for identity documents
 * Ensures that identity files are properly linked for family member reassociation
 */
async function syncIdentityDocumentMeta(
  userId: string,
  identityRecordId: string,
  vaultFileId: string | undefined | null,
  familyMemberId: string | null | undefined
): Promise<void> {
  if (!vaultFileId) return; // Nothing to sync if no file

  try {
    // Find or create document_meta record linking this vault file to the identity record
    const existing = await prisma.documentMeta.findFirst({
      where: {
        userId,
        linkedEntityId: identityRecordId,
      },
    });

    if (existing) {
      console.log('[syncIdentityDocumentMeta] Updating document_meta for', identityRecordId);
      await prisma.documentMeta.update({
        where: { id: existing.id },
        data: {
          cloudId: vaultFileId,
          linkedFamilyMemberId: familyMemberId || null,
        },
      });
    } else {
      console.log('[syncIdentityDocumentMeta] Creating document_meta for', identityRecordId);
      await prisma.documentMeta.create({
        data: {
          userId,
          docType: 'IDENTITY',
          linkedEntityId: identityRecordId,
          cloudId: vaultFileId,
          fileName: `Identity-${identityRecordId}`,
          linkedFamilyMemberId: familyMemberId || null,
        },
      });
    }
  } catch (err) {
    console.error('[syncIdentityDocumentMeta] Error:', err);
    // Non-fatal - don't throw
  }
}


/**
 * GET /api/identity/[id]
 * Get single identity record by ID
 */
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  console.log('[Identity GET by ID] Looking for id:', id);

  if (!id) {
    return errorResponse(
      ErrorCodes.INVALID_REQUEST,
      'Document ID is required',
      StatusCodes.BAD_REQUEST
    );
  }

  try {
    const record = await identityService.findById(id);

    if (!record) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        StatusCodes.NOT_FOUND
      );
    }

    if (record.userId !== authContext.userId) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied',
        StatusCodes.FORBIDDEN
      );
    }

    const response = {
      id: record.id,
      idType: record.idType,
      numberMasked: record.numberMasked,
      expiryDate: record.expiryDate?.toISOString() || null,
      issuedDate: record.issuedDate?.toISOString() || null,
      placeOfIssue: record.placeOfIssue,
      dobOnDoc: record.dobOnDoc?.toISOString() || null,
      nameOnDoc: record.nameOnDoc,
      vaultFileId: record.vaultFileId,
      familyMemberId: record.familyMemberId ?? null,
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Identity GET by ID]', error);
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/identity/[id]
 * Update identity record
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  
  const authContext = getAuthContext(request);
  if (!authContext) {
    return errorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      StatusCodes.UNAUTHORIZED
    );
  }

  console.log('[Identity PUT] Updating id:', id);

  if (!id) {
    return errorResponse(
      ErrorCodes.INVALID_REQUEST,
      'Document ID is required',
      StatusCodes.BAD_REQUEST
    );
  }

  try {
    const data = await request.json();
    console.log('[Identity PUT] Received data:', data);

    // Verify ownership first
    const existing = await identityService.findById(id);
    if (!existing) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        StatusCodes.NOT_FOUND
      );
    }

    if (existing.userId !== authContext.userId) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied',
        StatusCodes.FORBIDDEN
      );
    }

    // Normalize family member IDs (treat empty string as null)
    const newFamilyMemberId: string | null = data.familyMemberId || null;
    const existingFamilyMemberId: string | null = existing.familyMemberId || null;
    const familyMemberChanged = existingFamilyMemberId !== newFamilyMemberId;

    console.log('[Identity PUT] familyMemberChanged:', familyMemberChanged, {
      existing: existingFamilyMemberId,
      new: newFamilyMemberId,
      vaultFileId: data.vaultFileId,
    });

    // Update the record
    const updatedRecord = await identityService.update(id, {
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
      placeOfIssue: data.placeOfIssue,
      dobOnDoc: data.dobOnDoc ? new Date(data.dobOnDoc) : undefined,
      nameOnDoc: data.nameOnDoc,
      vaultFileId: data.vaultFileId,
      familyMemberId: newFamilyMemberId || undefined,
    });

    console.log('[Identity PUT] Updated record:', updatedRecord.id);

    // Always sync document_meta to ensure it's created/updated (especially for initial file uploads)
    await syncIdentityDocumentMeta(
      authContext.userId,
      id,
      data.vaultFileId,
      newFamilyMemberId
    );

    // Sync document_meta and Google Drive folder if family member changed
    if (familyMemberChanged) {
      let newMemberName: string | null = null;
      if (newFamilyMemberId) {
        const member = await prisma.familyMember.findUnique({
          where: { id: newFamilyMemberId },
          select: { name: true },
        });
        newMemberName = member?.name ?? null;
      }

      console.log('[Identity PUT] Calling syncDocumentMemberAssociation:', {
        recordId: id,
        newFamilyMemberId,
        newMemberName,
        vaultFileId: data.vaultFileId,
      });

      await syncDocumentMemberAssociation(
        authContext.userId,
        id,
        newFamilyMemberId,
        newMemberName,
        'Identity'
      );

      // Also directly move the vault file if it exists (for cases where document_meta might not be synced)
      if (data.vaultFileId) {
        console.log('[Identity PUT] Also moving vault file directly:', data.vaultFileId);
        await moveGoogleDriveFile(
          authContext.userId,
          data.vaultFileId,
          newMemberName,
          'Identity'
        );
      }
    }

    const response = {
      id: updatedRecord.id,
      idType: updatedRecord.idType,
      numberMasked: updatedRecord.numberMasked,
      expiryDate: updatedRecord.expiryDate?.toISOString() || null,
      issuedDate: updatedRecord.issuedDate?.toISOString() || null,
      placeOfIssue: updatedRecord.placeOfIssue,
      dobOnDoc: updatedRecord.dobOnDoc?.toISOString() || null,
      nameOnDoc: updatedRecord.nameOnDoc,
      vaultFileId: updatedRecord.vaultFileId,
      familyMemberId: updatedRecord.familyMemberId ?? null,
    };

    return successResponse(response);
  } catch (error) {
    console.error('[Identity PUT]', error);
    return handlePrismaError(error);
  }
}

export const GET = withAuth(withErrorHandler(getHandler), AuthLevel.AUTHENTICATED);
export const PUT = withAuth(withErrorHandler(putHandler), AuthLevel.AUTHENTICATED);