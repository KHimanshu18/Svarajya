"use client";

import { useState } from "react";
import useSWR from 'swr';
import { createClient } from "@/lib/supabase/client";
import { fetcher } from "@/lib/utils/fetcher";

interface UserAvatarProps {
    size?: "sm" | "md" | "lg";
    showName?: boolean;
    className?: string;
    src?: string | null;
    fallback?: string;
}

const SIZE_MAP = {
    sm: { img: "w-8 h-8", text: "w-8 h-8 text-xs", font: "text-xs" },
    md: { img: "w-10 h-10", text: "w-10 h-10 text-sm", font: "text-sm" },
    lg: { img: "w-14 h-14", text: "w-14 h-14 text-lg", font: "text-base" },
};

export function UserAvatar({
    size = "md",
    showName = false,
    className = "",
    src,
    fallback
}: UserAvatarProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(src || null);

    // Use SWR for caching - only one API call across all components
    const { data: profile, isLoading } = useSWR('/api/profile', fetcher, {
        dedupingInterval: 60000, // Cache for 60 seconds
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    // Get user data from SWR response
    const userData = profile?.data;
    const fullName = userData?.name || "";
    const profilePhoto = userData?.photo || src;

    // Compute initials from name - only first letter (as per Sir's instruction)
    let initials = "?";
    if (fullName) {
        initials = fullName.trim().charAt(0).toUpperCase();
    } else if (fallback) {
        initials = fallback;
    }

    const s = SIZE_MAP[size];
    const displayPhoto = profilePhoto || avatarUrl;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Avatar circle */}
            <div className="relative shrink-0">
                {isLoading ? (
                    <div className={`${s.text} rounded-full bg-white/10 animate-pulse`} />
                ) : displayPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={displayPhoto}
                        alt={fullName || "User"}
                        className={`${s.img} rounded-full object-cover border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]`}
                    />
                ) : (
                    <div className={`${s.text} rounded-full bg-amber-400/20 flex items-center justify-center font-bold text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.1)] border border-amber-400/20 uppercase`}>
                        {initials}
                    </div>
                )}
                {/* Online indicator */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[var(--color-rajya-bg)]" />
            </div>

            {/* Name - shows loading skeleton instead of "User" */}
            {showName && (
                <div className="min-w-0">
                    {isLoading ? (
                        <div className="space-y-1">
                            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                            <div className="h-2 w-12 bg-white/5 rounded animate-pulse" />
                        </div>
                    ) : (
                        <>
                            <p className={`font-semibold text-[var(--color-rajya-text)] truncate ${s.font}`}>
                                {fullName ? fullName.split(" ")[0] : (fallback || "User")}
                            </p>
                            <p className="text-[10px] text-amber-400/70 uppercase tracking-widest">Rajya Admin</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}