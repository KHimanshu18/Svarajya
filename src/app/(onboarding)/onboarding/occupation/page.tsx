"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";

const OCCUPATIONS = ["Salaried", "Business", "Freelancer", "Student", "Homemaker", "Retired", "Other"];

function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/10"}`} />
            ))}
        </div>
    );
}

export default function OccupationStep() {
    const router = useRouter();
    const [selected, setSelected] = useState("");
    const [otherText, setOtherText] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOccupation = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/profile', { cache: 'no-store' });
                if (response.ok) {
                    const json = await response.json();
                    const profile = json?.data;
                    const occupationType = profile?.occupationType || "";
                    const occupationOther = profile?.occupationOther || "";

                    if (occupationType) {
                        setSelected(occupationType);
                        setOtherText(occupationOther);
                        OnboardingStore.set({ occupationType, occupationOther }, { sync: false });
                    } else {
                        const stored = OnboardingStore.get();
                        if (stored.occupationType) {
                            setSelected(stored.occupationType);
                            setOtherText(stored.occupationOther || "");
                        }
                    }
                } else {
                    const stored = OnboardingStore.get();
                    if (stored.occupationType) {
                        setSelected(stored.occupationType);
                        setOtherText(stored.occupationOther || "");
                    }
                }
            } catch (error) {
                console.error('Failed to fetch occupation:', error);
                const stored = OnboardingStore.get();
                if (stored.occupationType) {
                    setSelected(stored.occupationType);
                    setOtherText(stored.occupationOther || "");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchOccupation();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchOccupation();
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleContinue = () => {
        if (!selected) {
            setError("Please choose one option.");
            return;
        }
        if (selected === "Other" && !otherText.trim()) {
            setError("Please describe your occupation.");
            return;
        }
        setError("");

        OnboardingStore.set({ occupationType: selected, occupationOther: otherText.trim() });

        fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                occupationType: selected,
                occupationOther: otherText.trim()
            })
        }).catch(err => console.error('Failed to save occupation:', err));

        router.push("/onboarding/contact-info");
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
                            <div className="w-48 h-24 bg-white/6 rounded-xl animate-pulse" />
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-8 w-24 bg-white/6 rounded-full animate-pulse" />
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
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest">Step 4 of 5</p>
                </div>
                <ProgressBar step={4} />

                <div className="flex-1 flex flex-col justify-center space-y-8">
                    <div className="flex justify-center">
                        <svg width="200" height="90" viewBox="0 0 200 90">
                            <rect x="20" y="30" width="160" height="50" rx="4" fill="rgba(251,191,36,0.05)" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />
                            {[45, 80, 115, 150].map((x, i) => (
                                <g key={x}>
                                    <rect x={x} y="60" width="20" height={8 + i * 4} rx="2" fill={selected ? "rgba(251,191,36,0.3)" : "rgba(251,191,36,0.08)"} stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
                                </g>
                            ))}
                            <path d="M80 80 L80 52 Q100 38 120 52 L120 80" fill="rgba(10,22,40,1)" stroke="rgba(251,191,36,0.25)" strokeWidth="1" />
                            {selected && <ellipse cx="100" cy="72" rx="25" ry="15" fill="rgba(251,191,36,0.12)" />}
                        </svg>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <h1 className="text-xl font-semibold text-white mb-1">
                                Where does your treasury usually get filled from?
                            </h1>
                            <p className="text-xs text-white/40 mt-1">Primary income source.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {OCCUPATIONS.map(opt => (
                                <motion.button
                                    key={opt}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setSelected(opt); setError(""); }}
                                    className={`px-4 py-2.5 rounded-full border text-sm transition-all ${selected === opt
                                        ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                        : "bg-white/5 border-white/10 text-white/55 hover:border-white/30"
                                        }`}
                                >
                                    {opt}
                                </motion.button>
                            ))}
                        </div>

                        {selected === "Other" && (
                            <motion.input
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                type="text"
                                placeholder="Tell us in 2–3 words"
                                value={otherText}
                                onChange={e => setOtherText(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/60 text-sm"
                            />
                        )}

                        {error && <p className="text-red-400 text-xs">{error}</p>}
                    </div>
                </div>

                <div className="pb-4">
                    <button
                        onClick={handleContinue}
                        className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                    >
                        Light up the Treasury
                    </button>
                </div>
            </div>
        </div>
    );
}