import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidGoogleAccessToken } from '@/lib/googleAuth';

/**
 * GET /api/google-drive/download?fileId=...
 * Gets the webViewLink for a Google Drive file, or the file content directly.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

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

    // Fetch file metadata to get the webViewLink
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Drive download error:', errText);
      if (res.status === 401) {
         return NextResponse.json({ error: 'Google token expired. Please log out and log back in.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch file from Google Drive' }, { status: res.status });
    }

    const fileData = await res.json();
    return NextResponse.json({
        success: true,
        data: {
            fileId: fileData.id,
            fileName: fileData.name,
            webViewLink: fileData.webViewLink,
            webContentLink: fileData.webContentLink,
        }
    });
  } catch (err: any) {
    console.error('[Google Drive Download]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
