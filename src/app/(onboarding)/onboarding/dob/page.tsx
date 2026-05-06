"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { OnboardingStore, deriveLifePhase } from "@/lib/stores/onboardingStore";
import { useProfile } from "@/lib/hooks/useProfile";

function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/10"}`} />
            ))}
        </div>
    );
}

export default function DOBStep() {
    const router = useRouter();
    const [dob, setDob] = useState(() => OnboardingStore.get().dob || "");
    const [lifePhase, setLifePhase] = useState(() => OnboardingStore.get().lifePhase || "");
    const [error, setError] = useState("");
    const [placed, setPlaced] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { profile: profileData, isLoading: profileLoading } = useProfile();

    useEffect(() => {
        if (profileLoading) return;

        if (profileData?.dob) {
            const dobValue = profileData.dob.split('T')[0];
            setDob(dobValue);
            setLifePhase(deriveLifePhase(dobValue));
            setIsReadOnly(true);
            OnboardingStore.set({ dob: dobValue, lifePhase: deriveLifePhase(dobValue) }, { sync: false });
        }
        setIsLoading(false);
    }, [profileData, profileLoading]);

    const handleDobChange = (val: string) => {
        if (isReadOnly) return;
        setDob(val);
        setError("");
        if (val) setLifePhase(deriveLifePhase(val));
    };

    const handleContinue = () => {
        if (!dob) { setError("Please enter your date of birth."); return; }
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age < 18) { setError("This version supports users aged 18 and above."); return; }
        setError("");
        OnboardingStore.set({ dob, lifePhase });
        setPlaced(true);
        setTimeout(() => router.push("/onboarding/status"), 1200);
    };

    const year = dob ? new Date(dob).getFullYear() : null;

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
                            <div className="w-44 h-24 bg-white/6 rounded-xl animate-pulse" />
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="h-12 w-full bg-white/6 rounded-xl animate-pulse" />
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
                {/* Back + step */}
                <div className="flex items-center gap-2 pt-10 mb-2">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest">Step 2 of 5</p>
                </div>
                <ProgressBar step={2} />

                <div className="flex-1 flex flex-col justify-center space-y-8">
                    {/* Foundation stone visual */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <svg width="180" height="90" viewBox="0 0 180 90">
                                <rect x="15" y="50" width="150" height="32" rx="4" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.25)" strokeWidth="1.5" />
                                <line x1="40" y1="58" x2="40" y2="74" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
                                <line x1="70" y1="58" x2="70" y2="74" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
                                <line x1="110" y1="58" x2="110" y2="74" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
                                <line x1="140" y1="58" x2="140" y2="74" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
                                {year && <text x="90" y="72" textAnchor="middle" fill="rgba(251,191,36,0.7)" fontSize="14" fontFamily="serif">{year}</text>}
                            </svg>
                            {placed && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-amber-400/70 whitespace-nowrap">
                                    Foundation stone set.
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold text-white mb-1">When was the foundation of this Rajya laid?</h1>
                            <p className="text-xs text-white/40">Your date of birth helps us plan financial milestones and reminders.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs text-white/50 uppercase tracking-wider">Date of birth</label>
                                {isReadOnly && (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] uppercase tracking-[0.15em]">
                                        <Lock className="w-3.5 h-3.5" /> Verified
                                    </span>
                                )}
                            </div>
                            <input
                                type="date"
                                value={dob}
                                onChange={e => handleDobChange(e.target.value)}
                                max={new Date().toISOString().split("T")[0]}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-amber-400/60 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isReadOnly}
                            />
                            <p className="text-[10px] text-white/30 italic">
                                Note: On iPhone/Safari, tap the Month & Year at the top of the calendar to scroll rapidly to your birth year.
                            </p>
                            {error && <p className="text-red-400 text-xs">{error}</p>}
                            {isReadOnly && (
                                <p className="text-white/45 text-[10px] italic">Date of Birth cannot be changed after verification.</p>
                            )}
                        </div>

                        {lifePhase && (
                            <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-4">
                                <p className="text-xs text-white/40 uppercase tracking-wider">Your current phase</p>
                                <p className="text-amber-400 font-semibold text-lg mt-0.5">{lifePhase}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pb-4">
                    <button onClick={handleContinue} disabled={placed} className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors disabled:opacity-60">
                        Set the Foundation Stone
                    </button>
                </div>
            </div>
        </div>
    );
}