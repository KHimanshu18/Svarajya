"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function OAuthFragmentHandler() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session explicitly
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(async ({ error }) => {
          if (error) {
            console.error('Error setting session from fragment:', error);
            router.push('/start?error=Authentication_failed');
            return;
          }

          // Fetch profile to check first login status
          try {
            const profileRes = await fetch('/api/profile');
            if (profileRes.ok) {
              const { data } = await profileRes.json();
              if (data && data.isFirstLogin) {
                router.push('/onboarding/intro');
              } else {
                router.push('/rajya');
              }
            } else {
              router.push('/rajya');
            }
          } catch (e) {
            console.error('Failed to check first login status', e);
            router.push('/rajya');
          }
        });

        // Clean up the URL to prevent duplicate processing
        const newUrl = new URL(window.location.href);
        newUrl.hash = '';
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    }
  }, [router, supabase.auth]);

  return null;
}
