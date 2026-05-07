"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { useAuth } from "@/components/providers/AuthProvider";

const ProgressBar = React.memo(function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/10"
                        }`}
                />
            ))}
        </div>
    );
});

export default function NameStep() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [name, setName] = useState("");
    const [placed, setPlaced] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isMounted = true;

        const loadName = async () => {
            if (authLoading) return;

            // Load from local store IMMEDIATELY
            const storeData = OnboardingStore.get();
            if (storeData.fullName) {
                setName(storeData.fullName);
                setIsLoading(false);
                if (!isMounted) return;
            }

            // Set loading false immediately to show page
            setIsLoading(false);

            // Fetch from API in background to sync (non-blocking)
            try {
                const profileRes = await fetch('/api/profile');
                if (!isMounted) return;

                const authName = user?.user_metadata?.full_name || user?.user_metadata?.name;
                const profileJson = profileRes.ok ? await profileRes.json() : null;
                const profileData = profileJson?.data;

                const prismaName = profileData?.name || storeData.fullName;
                const initialName = prismaName || authName || (user?.email?.split('@')[0] ?? '');

                if (initialName && !storeData.fullName) {
                    setName(initialName);
                    OnboardingStore.set({ fullName: initialName }, { sync: false });
                }
            } catch (error) {
                console.error('Failed to load name:', error);
            }
        };

        loadName();
        return () => { isMounted = false; };
    }, [user, authLoading]);

    const handleContinue = useCallback(() => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Please enter your name.");
            return;
        }
        setError("");
        OnboardingStore.set({ fullName: trimmed });

        // Save to API in background (non-blocking)
        fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: trimmed })
        }).catch(err => console.error('Failed to save name:', err));

        setPlaced(true);
        startTransition(() => {
            setTimeout(() => router.push("/onboarding/dob"), 1200);
        });
    }, [name, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex items-center gap-2 pt-10 mb-2">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest">Step 1 of 5</p>
                </div>
                <ProgressBar step={1} />

                <div className="flex-1 flex flex-col justify-center space-y-8">
                    <div className="flex justify-center">
                        <div className="relative">
                            <svg width="200" height="80" viewBox="0 0 200 80">
                                <rect x="10" y="20" width="180" height="44" rx="4" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" />
                                <line x1="40" y1="20" x2="40" y2="8" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
                                <line x1="160" y1="20" x2="160" y2="8" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
                                <circle cx="40" cy="6" r="3" fill="rgba(251,191,36,0.5)" />
                                <circle cx="160" cy="6" r="3" fill="rgba(251,191,36,0.5)" />
                            </svg>

                            <AnimatePresence>
                                {placed && name && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 flex items-center justify-center pb-2"
                                    >
                                        <span className="font-display text-amber-400 text-lg truncate max-w-[160px]">
                                            {name.split(" ")[0]}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold text-white mb-1">
                                Who governs this Rajya?
                            </h1>
                            <p className="text-xs text-white/40">
                                Enter your legal name. We use it later for documents, nominees, and legacy records.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/50 uppercase tracking-wider">Full name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && handleContinue()}
                                placeholder="e.g. Raja Indra / Maharani Durga Devi"
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-4 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-colors text-base"
                                autoFocus
                            />
                            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                        </div>

                        {placed && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-emerald-400 text-sm text-center"
                            >
                                ✓ Nameplate placed. Rajya begins.
                            </motion.p>
                        )}
                    </div>
                </div>

                <div className="pb-4 space-y-3">
                    <button
                        onClick={handleContinue}
                        disabled={placed}
                        className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors disabled:opacity-60"
                    >
                        Place the Nameplate
                    </button>
                </div>
            </div>
        </div>
    );
}