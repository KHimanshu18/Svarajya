import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/pehchaan/records?error=Missing_Code_Or_State', request.url));
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      return NextResponse.redirect(new URL('/pehchaan/records?error=Invalid_State', request.url));
    }

    const userId = stateData.userId;
    if (!userId) {
      return NextResponse.redirect(new URL('/pehchaan/records?error=Missing_UserId', request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/google-callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/pehchaan/records?error=Server_Config_Error', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Google token exchange error:', err);
      return NextResponse.redirect(new URL('/pehchaan/records?error=Token_Exchange_Failed', request.url));
    }

    const tokens = await tokenResponse.json();

    // Store in Prisma
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleLinked: true,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined, // Only provided on first consent usually
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(new URL('/pehchaan/records?success=Google_Linked', request.url));
  } catch (error: any) {
    console.error('Error in google-callback:', error);
    return NextResponse.redirect(new URL('/pehchaan/records?error=Internal_Server_Error', request.url));
  }
}
