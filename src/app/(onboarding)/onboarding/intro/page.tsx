"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function RajyaNirmaanIntro() {
    const router = useRouter();
    const [showWhy, setShowWhy] = useState(false);

    // Mark isFirstLogin = false immediately when user enters onboarding.
    // This ensures that if they leave mid-onboarding and log in again,
    // they go to /rajya instead of being forced through onboarding again.
    // Their partial data is preserved via progressive saves on each step.
    useEffect(() => {
        const markOnboardingStarted = async () => {
            try {
                const res = await fetch("/api/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        isFirstLogin: false,
                        _internal_secret: 'SVARAJYA_INTERNAL_SYNC_2025'
                    }),
                });
                if (!res.ok) {
                    console.error("[Intro] Failed to mark isFirstLogin=false:", await res.text());
                }
            } catch (e) {
                console.error("[Intro] Error marking onboarding started:", e);
            }
        };
        markOnboardingStarted();
    }, []);

    // Disable browser back button on intro page without affecting normal CTA navigation.
    const allowNavRef = useRef(false);

    useEffect(() => {
        const lockKey = "introLock";

        // Ensure a locked entry exists so there's nowhere meaningful to go back to
        if (!window.history.state?.[lockKey]) {
            window.history.replaceState({ [lockKey]: true }, "", window.location.href);
            window.history.pushState({ [lockKey]: true }, "", window.location.href);
        }

        const handlePopState = (event: PopStateEvent) => {
            // Allow one programmatic navigation through
            if (allowNavRef.current) {
                allowNavRef.current = false;
                return;
            }
            // Otherwise re-lock the history so back doesn't leave this page
            window.history.pushState({ [lockKey]: true }, "", window.location.href);
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    // Use replace instead of push when navigating away
    const handleStartBuilding = () => {
        allowNavRef.current = true;
        router.replace("/onboarding/name");
    };

    return (
        <div className="flex flex-col min-h-screen p-6 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="pt-10">
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest mb-1">Step 0 of 5</p>
                    <div className="flex items-center gap-2 mt-3">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="h-1 flex-1 rounded-full bg-white/10" />
                        ))}
                    </div>
                </div>

                {/* Palace SVG illustration */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        {/* SVG Blueprint / Foundation illustration */}
                        <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
                            {/* Foundation base */}
                            <rect x="20" y="130" width="180" height="16" rx="3" fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
                            {/* Left pillar */}
                            <rect x="35" y="60" width="30" height="70" rx="2" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.25)" strokeWidth="1" />
                            {/* Right pillar */}
                            <rect x="155" y="60" width="30" height="70" rx="2" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.25)" strokeWidth="1" />
                            {/* Central door */}
                            <rect x="88" y="90" width="44" height="40" rx="3" fill="rgba(251,191,36,0.05)" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
                            {/* Arch */}
                            <path d="M88 90 Q110 68 132 90" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" fill="none" />
                            {/* Roof / Shikhara */}
                            <path d="M30 60 L110 12 L190 60 Z" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
                            {/* Dashed construction lines */}
                            <line x1="10" y1="130" x2="210" y2="130" stroke="rgba(251,191,36,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                            <line x1="110" y1="10" x2="110" y2="150" stroke="rgba(251,191,36,0.10)" strokeWidth="1" strokeDasharray="4 4" />
                            {/* Blueprint dots */}
                            {[35, 110, 185].map(x => (
                                <circle key={x} cx={x} cy="130" r="3" fill="rgba(251,191,36,0.5)" />
                            ))}
                        </svg>
                        {/* Subtle glow under illustration */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-amber-400/10 blur-2xl" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center space-y-3 max-w-xs"
                    >
                        <h1 className="text-2xl font-semibold text-white">
                            Let&apos;s build your Rajya.
                        </h1>
                        <p className="text-white/50 text-sm leading-relaxed">
                            5 simple steps. After this, you can explore everything in read-only mode first.
                        </p>
                        <p className="text-xs text-amber-400/60 italic">
                            This is not a &quot;signup.&quot; This is your foundation.
                        </p>
                    </motion.div>

                    {/* Why this matters expandable */}
                    {showWhy && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/55 leading-relaxed max-w-xs"
                        >
                            Your financial profile is the single source of truth for everything Sva-Rajya does — insurance gaps, loan burden, investment readiness, and family protection. The more complete it is, the more accurate and useful your insights become.
                        </motion.div>
                    )}

                    <div className="flex justify-center mt-2">
                        <button
                            onClick={() => setShowWhy(!showWhy)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white/35 hover:text-white/60 transition-colors"
                        >
                            <Info className="w-3.5 h-3.5" />
                            {showWhy ? "Hide" : "Why this matters"}
                        </button>
                    </div>
                </div>

                {/* CTA */}
                <div className="pb-4">
                    <button
                        onClick={handleStartBuilding}
                        className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                    >
                        Start Building <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}