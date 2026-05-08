"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";

const OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/10"}`} />
            ))}
        </div>
    );
}

export default function StatusStep() {
    const router = useRouter();
    const [selected, setSelected] = useState("");
    const [placed, setPlaced] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/profile', { cache: 'no-store' });
                if (response.ok) {
                    const json = await response.json();
                    const profile = json?.data;
                    const maritalStatus = profile?.maritalStatus || "";

                    if (maritalStatus) {
                        setSelected(maritalStatus);
                        OnboardingStore.set({ maritalStatus }, { sync: false });
                    } else {
                        const storedStatus = OnboardingStore.get().maritalStatus;
                        if (storedStatus) {
                            setSelected(storedStatus);
                        }
                    }
                } else {
                    const storedStatus = OnboardingStore.get().maritalStatus;
                    if (storedStatus) {
                        setSelected(storedStatus);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch status:', error);
                const storedStatus = OnboardingStore.get().maritalStatus;
                if (storedStatus) {
                    setSelected(storedStatus);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatus();
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleContinue = () => {
        if (!selected) {
            setError("Please pick your current marital status.");
            return;
        }

        OnboardingStore.set({ maritalStatus: selected });

        fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maritalStatus: selected })
        }).catch(err => console.error('Failed to save status:', err));

        setPlaced(true);
        setTimeout(() => router.push("/onboarding/occupation"), 800);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen p-6 relative">
                <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex flex-col min-h-screen">
                    <div className="flex items-center gap-2 pt-10 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-white/6 animate-pulse" />
                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full mt-3 animate-pulse" />
                    <div className="flex-1 flex flex-col justify-center space-y-8 mt-12">
                        <div className="flex justify-center">
                            <div className="w-44 h-20 bg-white/6 rounded-xl animate-pulse" />
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-24 bg-white/6 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 relative">
            <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex items-center gap-2 pt-10 mb-2">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest">Step 3 of 5</p>
                </div>
                <ProgressBar step={3} />

                <div className="flex-1 flex flex-col justify-center space-y-8">
                    <div className="flex justify-center">
                        <svg width="180" height="80" viewBox="0 0 180 80">
                            <rect x="75" y="40" width="30" height="28" rx="2" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" />
                            <rect x="78" y="28" width="24" height="14" rx="2" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.25)" strokeWidth="1" />
                            <rect x="25" y="46" width="22" height="22" rx="2" fill="rgba(251,191,36,0.05)" stroke={selected && selected !== "Single" ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.15)"} strokeWidth="1" />
                            <rect x="52" y="46" width="18" height="22" rx="2" fill="rgba(251,191,36,0.04)" stroke={selected && selected !== "Single" ? "rgba(251,191,36,0.4)" : "rgba(251,191,36,0.12)"} strokeWidth="1" />
                            <rect x="110" y="46" width="18" height="22" rx="2" fill="rgba(251,191,36,0.04)" stroke={selected && selected !== "Single" ? "rgba(251,191,36,0.4)" : "rgba(251,191,36,0.12)"} strokeWidth="1" />
                            <rect x="133" y="46" width="22" height="22" rx="2" fill="rgba(251,191,36,0.05)" stroke={selected && selected !== "Single" ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.15)"} strokeWidth="1" />
                            <line x1="10" y1="68" x2="170" y2="68" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
                        </svg>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold text-white mb-1">Household Structure</h1>
                            <p className="text-xs text-white/40">This helps us understand dependents and future legacy planning.</p>
                        </div>

                        <div>
                            <p className="text-sm text-white/60 uppercase tracking-[0.18em] mb-3">Marital status</p>
                            <div className="grid grid-cols-2 gap-3">
                                {OPTIONS.map(opt => (
                                    <button key={opt} type="button" onClick={() => { setSelected(opt); setError(""); }}
                                        className={`py-4 rounded-xl border text-sm font-medium transition-all ${selected === opt ? "bg-amber-400/15 border-amber-400 text-amber-400" : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        {placed && selected && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-sm text-center">
                                ✓ Council hall assembled.
                            </motion.p>
                        )}
                    </div>
                </div>

                <div className="pb-4 space-y-3">
                    <button onClick={handleContinue} className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors">
                        Confirm status
                    </button>
                    <button onClick={() => router.push("/onboarding/occupation")} className="w-full text-white/35 text-sm py-3 hover:text-white/60 transition-colors">
                        Skip this step
                    </button>
                </div>
            </div>
        </div>
    );
}