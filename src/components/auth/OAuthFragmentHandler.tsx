"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OAuthFragmentHandler() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    const hash = window.location.hash;

    // No auth fragment present
    if (!hash || !hash.includes("access_token=")) return;

    const params = new URLSearchParams(hash.substring(1));

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const authType = params.get("type");

    // IMPORTANT:
    // Recovery/password reset links also contain access_token and refresh_token.
    // We must NOT treat them as normal OAuth logins.
    if (authType === "recovery" || pathname.startsWith("/reset-password")) {
      console.log("Password recovery flow detected. Skipping OAuth redirect.");
      return;
    }

    if (!accessToken || !refreshToken) return;

    const handleOAuthSession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("Error setting session from fragment:", error);
        router.push("/start?error=Authentication_failed");
        return;
      }

      try {
        const profileRes = await fetch("/api/profile");

        if (profileRes.ok) {
          const { data } = await profileRes.json();

          if (data?.isFirstLogin) {
            router.push("/onboarding/intro");
          } else {
            router.push("/rajya");
          }
        } else {
          router.push("/rajya");
        }
      } catch (e) {
        console.error("Failed to check first login status", e);
        router.push("/rajya");
      } finally {
        // Clean URL after processing
        const newUrl = new URL(window.location.href);
        newUrl.hash = "";
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    };

    handleOAuthSession();
  }, [router, supabase.auth]);

  return null;
}
