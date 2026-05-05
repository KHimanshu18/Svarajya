import { prisma } from '@/lib/prisma';

export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  });

  if (!user || !user.googleAccessToken) {
    return null;
  }

  // Check if expired or expiring in next 5 minutes
  if (user.googleTokenExpiry && user.googleTokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
    if (!user.googleRefreshToken) {
      return null;
    }

    // Refresh token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: user.googleRefreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        console.error('Failed to refresh Google token:', await tokenResponse.text());
        return null;
      }

      const tokens = await tokenResponse.json();

      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return tokens.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  return user.googleAccessToken;
}
