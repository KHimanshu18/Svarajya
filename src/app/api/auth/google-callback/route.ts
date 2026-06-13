import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getEmailWrapperHtml } from '@/lib/email-templates/html-templates';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const resend = new Resend(process.env.RESEND_API_KEY);

function createErrorHtml(message: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        window.addEventListener('load', function() {
          const errorUrl = '/start?error=' + encodeURIComponent('${message}');
          if (window.opener) {
            window.opener.location.href = errorUrl;
            window.close();
          } else {
            window.location.href = errorUrl;
          }
        });
      </script>
    </body>
    </html>
  `;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return createErrorHtml('Missing authentication code. Please try again.');
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      return createErrorHtml('Invalid authentication state. Please try again.');
    }

    const action = stateData.action || 'link';
    const userId = stateData.userId;
    const redirectTo = stateData.redirectTo || '/pehchaan/records';

    if (action === 'link' && !userId) {
      return createErrorHtml('User ID missing. Please try again.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/google-callback`;

    if (!clientId || !clientSecret) {
      return createErrorHtml('Server configuration error. Please contact support.');
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
      return createErrorHtml('Failed to exchange authentication code. Please try again.');
    }

    const tokens = await tokenResponse.json();

    // Fetch user details from Google to get email and name
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Google userinfo fetch failed:', await userInfoResponse.text());
      return createErrorHtml('Failed to fetch Google account details. Please try again.');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;
    const name = userInfo.name || email.split('@')[0];

    if (action === 'link') {
      // Store in Prisma
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleLinked: true,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined,
          googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Account Linked</title>
          <meta http-equiv="refresh" content="2">
        </head>
        <body style="margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
            <div style="text-align: center;">
              <div style="width: 60px; height: 60px; margin: 0 auto 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <p style="color: #333; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Google Account Linked!</p>
              <p style="color: #666; margin: 0; font-size: 14px;">Redirecting you back...</p>
            </div>
          </div>
          <script>
            window.addEventListener('load', function() {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'google-auth-success'
                }, '*');
                setTimeout(() => {
                  window.opener.location.reload();
                  window.close();
                }, 1000);
              } else {
                setTimeout(() => {
                  window.location.href = '${redirectTo}?success=Google_Linked';
                }, 2000);
              }
            });
          </script>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } else {
      // LOGIN Flow
      // LOGIN Flow
      const existingUserByEmail = await prisma.user.findUnique({ where: { email } });

      // Block Google login if the account was registered with email/password.
      if (existingUserByEmail && existingUserByEmail.authProvider === 'EMAIL') {
        return createErrorHtml('This account was created with email/password. Please login using email and password only.');
      }

      // 1. Check if user exists in Supabase
      const { data: listUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Supabase list users error:', listError);
        return createErrorHtml('Authentication service error. Please try again.');
      }

      const existingSupaUser = listUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      let supabaseUser;
      let isNewUser = false;

      if (existingSupaUser) {
        supabaseUser = existingSupaUser;
      } else {
        // Create user in Supabase
        const { data: newSupaUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createError || !newSupaUser.user) {
          console.error('Supabase user creation error:', createError);
          return createErrorHtml('Failed to create user account. Please try again.');
        }

        supabaseUser = newSupaUser.user;
        isNewUser = true;
      }

      // 2. Upsert in Prisma User table
      await prisma.user.upsert({
        where: { id: supabaseUser.id },
        update: {
          googleLinked: true,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined,
          googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        },
        create: {
          id: supabaseUser.id,
          email: email,
          name: name,
          googleLinked: true,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined,
          googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          profileType: 'INDIVIDUAL_SALARIED',
          authProvider: 'GOOGLE',
        },
      });

      // 3. Generate magiclink to automatically log user in
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/start?success=${isNewUser ? 'Google_Signup' : 'Google_Login'}`,
        },
      });

      if (linkError || !linkData.properties?.action_link) {
        console.error('Failed to generate secure magiclink for Google login:', linkError);
        return NextResponse.redirect(new URL('/start?error=MagicLink_Generation_Failed', request.url));
      }

      // If this was a newly created user, send a welcome email (do not block flow on errors)
      if (isNewUser) {
        try {
          const origin = request.nextUrl.origin;
          await fetch(`${origin}/api/auth/send-welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
        } catch (err) {
          console.error('Failed to send welcome email for Google signup:', err);
        }
      }

      // Return HTML that redirects parent window to the action link and closes popup
      try {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Complete</title>
          </head>
          <body style="margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
              <div style="text-align: center;">
                <div style="margin-bottom: 20px;">
                  <div style="width: 50px; height: 50px; margin: 0 auto 20px; animation: spin 1s linear infinite;">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="#fbbf24" stroke-width="2" stroke-dasharray="15.7 62.8" style="animation: spin 2s linear infinite;"/>
                    </svg>
                  </div>
                  <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">Signing you in...</p>
                </div>
              </div>
            </div>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
            <script>
              window.addEventListener('load', function() {
                const actionLink = '${linkData.properties.action_link}';
                if (window.opener) {
                  window.opener.location.href = actionLink;
                  window.close();
                } else {
                  window.location.href = actionLink;
                }
              });
            </script>
          </body>
          </html>
        `;
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      } catch (err) {
        console.error('Error generating callback HTML:', err);
        return NextResponse.redirect(new URL('/start?error=Internal_Server_Error', request.url));
      }
    }
  } catch (error: any) {
    console.error('Error in google-callback:', error);
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          window.addEventListener('load', function() {
            const errorUrl = '/start?error=Authentication_failed';
            if (window.opener) {
              window.opener.location.href = errorUrl;
              window.close();
            } else {
              window.location.href = errorUrl;
            }
          });
        </script>
      </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
