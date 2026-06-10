/**
 * googleDriveUtils.ts
 *
 * Reusable server-side utilities for:
 * 1. Moving a file in Google Drive from one nested folder to another.
 * 2. Syncing the linkedFamilyMemberId in document_meta after a family member
 *    reassignment on identity, education, insurance, or loan records.
 */

import { prisma } from '@/lib/prisma';
import { getValidGoogleAccessToken } from '@/lib/googleAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriveCategory = 'Identity' | 'Education' | 'Insurance' | 'Loans' | 'Property' | 'Tax' | 'Other';

// ---------------------------------------------------------------------------
// Helpers – folder management
// ---------------------------------------------------------------------------

/**
 * Find or create a folder with `folderName` inside `parentId`.
 */
async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Build query
  let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id as string;
  }

  // Create it
  const body: Record<string, unknown> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) body.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const created = await createRes.json();
  return created.id as string;
}

/**
 * Resolve (or create) the nested folder:
 * `Svarajya_Nidhi / {memberName} / {category}`
 *
 * Pass `memberName` as `null` / `undefined` / `""` to use `Myself` bucket.
 */
async function resolveTargetFolder(
  accessToken: string,
  memberName: string | null | undefined,
  category: DriveCategory
): Promise<string> {
  const rootId = await getOrCreateFolder(accessToken, 'Svarajya_Nidhi');
  const bucketName = memberName?.trim() || 'Myself';
  const memberId = await getOrCreateFolder(accessToken, bucketName, rootId);
  return getOrCreateFolder(accessToken, category, memberId);
}

// ---------------------------------------------------------------------------
// Core: move a Drive file
// ---------------------------------------------------------------------------

/**
 * Move `driveFileId` from its current parent(s) into the target folder.
 * Returns `true` on success, `false` on failure.
 */
export async function moveGoogleDriveFile(
  userId: string,
  driveFileId: string,
  newMemberName: string | null | undefined,
  category: DriveCategory
): Promise<boolean> {
  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    if (!accessToken) {
      console.warn('[moveGoogleDriveFile] No Google access token for user', userId);
      return false;
    }

    // Fetch current parents
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=parents,name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      const txt = await metaRes.text();
      console.warn('[moveGoogleDriveFile] Could not fetch file metadata', { status: metaRes.status, body: txt });
      return false;
    }
    const meta = await metaRes.json();
    const oldParents: string[] = meta.parents ?? [];
    console.log('[moveGoogleDriveFile] oldParents:', oldParents);

    // Resolve new folder
    const newParentId = await resolveTargetFolder(accessToken, newMemberName, category);
    console.log('[moveGoogleDriveFile] newParentId:', newParentId, 'newMemberName:', newMemberName, 'category:', category);

    // If file is already in the target parent, no-op
    if (oldParents.includes(newParentId)) {
      console.log('[moveGoogleDriveFile] File already in target folder', driveFileId, newParentId);
      return true;
    }

    // Build URL params: include removeParents only when there are existing parents
    let url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?addParents=${newParentId}&fields=id,parents`;
    if (oldParents.length > 0) {
      url += `&removeParents=${encodeURIComponent(oldParents.join(','))}`;
    }

    // Move
    const moveRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const moveStatus = moveRes.status;
    const moveBody = await moveRes.text();
    console.log('[moveGoogleDriveFile] Drive PATCH response', { status: moveStatus, body: moveBody });

    if (!moveRes.ok) {
      console.error('[moveGoogleDriveFile] Move failed', { status: moveStatus, body: moveBody });
      return false;
    }

    console.log('[moveGoogleDriveFile] Moved file', driveFileId, 'to folder', newParentId);
    return true;
  } catch (err) {
    console.error('[moveGoogleDriveFile] Unexpected error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core: sync document_meta
// ---------------------------------------------------------------------------

/**
 * Update `linkedFamilyMemberId` in `document_meta` for a given entity,
 * and (if Drive backup exists) move the file to the new member's folder.
 *
 * @param userId         Owner's user ID (needed for Drive token)
 * @param linkedEntityId The ID of the parent record (identity, insurance, loan, education)
 * @param newFamilyMemberId  null  → "Myself" bucket
 * @param newMemberName  Display name used for the Drive folder path
 * @param category       Drive sub-folder name
 */
export async function syncDocumentMemberAssociation(
  userId: string,
  linkedEntityId: string,
  newFamilyMemberId: string | null,
  newMemberName: string | null | undefined,
  category: DriveCategory
): Promise<void> {
  try {
    // Find matching document_meta rows
    const docs = await prisma.documentMeta.findMany({
      where: { linkedEntityId },
    });

    for (const doc of docs) {
      // Update DB


      await prisma.documentMeta.update({
        where: { id: doc.id },
        data: { linkedFamilyMemberId: newFamilyMemberId },
      });

      // Move Drive file if cloudId present
      if (!doc.cloudId) {
        console.warn(
          '[syncDocumentMemberAssociation] Missing cloudId for document',
          doc.id
        );
      } else {
        const moved = await moveGoogleDriveFile(
          userId,
          doc.cloudId,
          newMemberName,
          category
        );

        console.log(
          '[syncDocumentMemberAssociation] Move result:',
          moved
        );
      }
    }
  } catch (err) {
    console.error('[syncDocumentMemberAssociation] Error:', err);
    // Non-fatal – do not rethrow; the DB record update is the critical part
  }
}
