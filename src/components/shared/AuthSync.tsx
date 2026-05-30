"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingStore } from "@/lib/stores/onboardingStore";

// Routes where AuthSync should never fire
const BYPASS_PATHS = ["/", "/start", "/login", "/register", "/reset-password", "/verify-email"];

// AuthSync should NEVER redirect away when already inside these sections
const PROTECTED_PREFIXES = [
    "/rajya", "/dwaar", "/pehchaan", "/khate", "/kosh", "/vyaya",
    "/raksha", "/rin", "/mitra", "/leakage", "/foundation", "/suchak",
    "/beej", "/bhoomi", "/kar", "/lakshya", "/mantri", "/raj-mantri",
    "/doot", "/sampatti", "/granthagaar", "/suraksha", "/succession",
    "/onboarding", "/notifications", "/vault"
];

export function AuthSync() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip on public/auth pages
        if (BYPASS_PATHS.some(p => pathname === p || pathname.startsWith(p + "?"))) return;

        // Skip inside dashboard & onboarding — just silently hydrate store
        if (PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
            // Quietly seed store in background when in dashboard
            if (!pathname.startsWith("/onboarding")) {
                OnboardingStore.hydrate().catch(() => {});
            }
            return;
        }

        const syncUserData = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const user = session.user;
            const metadata = user.user_metadata ?? {};

            // Seed name + email into store immediately from Supabase metadata
            const registeredName = metadata.full_name ?? "";
            const registeredEmail = user.email ?? "";
            if (registeredName || registeredEmail) {
                await OnboardingStore.set({
                    ...(registeredName ? { fullName: registeredName } : {}),
                    email: registeredEmail,
                }).catch(() => {});
            }

            // KEY LOGIC: Check if user has ever completed onboarding
            // Use is_first_login flag from the users table via API.
            let isFirstLogin = true;
            try {
                const profileRes = await fetch("/api/profile");
                if (profileRes.ok) {
                    const { data } = await profileRes.json();
                    if (data && typeof data.isFirstLogin === 'boolean') {
                        isFirstLogin = data.isFirstLogin;
                    }
                }
            } catch (e) {
                console.error("Failed to fetch profile", e);
            }

            if (isFirstLogin) {
                // New user or incomplete onboarding — send to intro
                router.replace("/onboarding/intro");
            } else {
                // Returning user — go straight to dashboard
                router.replace("/rajya");
            }
        };

        syncUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return null;
}
