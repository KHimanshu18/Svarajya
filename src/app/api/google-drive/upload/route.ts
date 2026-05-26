import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidGoogleAccessToken } from '@/lib/googleAuth';

/**
 * POST /api/google-drive/upload
 * Uploads a file to the user's Google Drive via their OAuth provider token.
 * 
 * Expects multipart/form-data with:
 * - file: the file to upload
 * - folderName: optional folder name in Drive (defaults to "Svarajya_Nidhi")
 * - fileName: optional custom file name
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const providerToken = await getValidGoogleAccessToken(session.user.id);
    if (!providerToken) {
      return NextResponse.json(
        { error: 'Google Drive access not available. Please link your Google Drive.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderName = (formData.get('folderName') as string) || 'Svarajya_Nidhi';
    const fileName = (formData.get('fileName') as string) || file?.name;
    const familyMemberName = (formData.get('familyMemberName') as string) || 'Myself';
    const category = (formData.get('category') as string) || 'Other';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 0. Check storage quota before upload
    const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    
    if (aboutRes.ok) {
      const aboutData = await aboutRes.json();
      const quota = aboutData?.storageQuota;
      if (quota && quota.limit) {
        const usage = parseInt(quota.usage || '0', 10);
        const limit = parseInt(quota.limit, 10);
        if (usage + file.size > limit) {
          return NextResponse.json(
            { error: 'Your Google Drive storage is full. Please free up space or connect another account.' },
            { status: 403 }
          );
        }
      }
    }

    // 1. Resolve or create the nested folder structure: Svarajya_Nidhi/{familyMemberName}/{category}/
    const foldersToCreate = [folderName, familyMemberName, category];
    const folderId = await getOrCreateNestedFolders(providerToken, foldersToCreate);

    // 2. Upload the file
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerToken}` },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Google Drive upload failed:', errText);

      if (uploadRes.status === 401) {
        return NextResponse.json(
          { error: 'Google token expired. Please log out and log back in.' },
          { status: 401 }
        );
      }

      if (errText.includes('storageQuotaExceeded') || errText.includes('quota') || errText.includes('storage limit')) {
        return NextResponse.json(
          { error: 'Your Google Drive storage is full. Please free up space or connect another account.' },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 });
    }

    const driveFile = await uploadRes.json();

    return NextResponse.json({
      success: true,
      data: {
        fileId: driveFile.id,
        fileName: driveFile.name,
        webViewLink: driveFile.webViewLink,
        webContentLink: driveFile.webContentLink,
        cloudStorageUrl: `Svarajya_Nidhi/${familyMemberName}/${category}/${fileName}`,
      },
    });
  } catch (err: any) {
    console.error('[Google Drive Upload]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function getOrCreateFolder(accessToken: string, folderName: string, parentId?: string): Promise<string> {
  let query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const searchData = await searchRes.json();

  if (searchData?.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const created = await createRes.json();
  return created.id;
}

async function getOrCreateNestedFolders(accessToken: string, folders: string[]): Promise<string> {
  let parentId: string | undefined = undefined;
  for (const folder of folders) {
    parentId = await getOrCreateFolder(accessToken, folder, parentId);
  }
  return parentId!;
}
