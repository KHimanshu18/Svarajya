"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, CheckCircle2, Crown } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { createClient } from "@/lib/supabase/client";

const LAST_LOGIN_KEY = "svarajya_last_login";

const PRIORITIES = [
    { id: "save", label: "Savings", icon: "🏦", desc: "Build a safety net and grow reserves" },
    { id: "protect", label: "Family Security", icon: "🛡️", desc: "Insurance, nominees, and legacy" },
];

function FirstWinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isReturning = searchParams.get("returning") === "true";
    const [priority, setPriority] = useState("");
    const [profileCompletion, setProfileCompletion] = useState(0);
    const [firstName, setFirstName] = useState("Ruler");
    const [isLoading, setIsLoading] = useState(true);
    const [progressChecks, setProgressChecks] = useState([
        { label: "Name", done: false },
        { label: "Date of Birth", done: false },
        { label: "Marital Status", done: false },
        { label: "Occupation", done: false },
        { label: "Contact Info", done: false },
    ]);

    const lastLoginDisplay = (() => {
        if (typeof window === "undefined") return null;
        const stored = localStorage.getItem(LAST_LOGIN_KEY);
        if (!stored || !isReturning) return null;
        const d = new Date(stored);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    })();

    useEffect(() => {
        const loadProfileCompletion = async () => {
            setIsLoading(true);
            try {
                const profileResponse = await fetch('/api/profile', { cache: 'no-store' });
                const profileJson = profileResponse.ok ? await profileResponse.json() : null;
                const profile = profileJson?.data;

                const profileName = profile?.name || "";
                if (profileName) setFirstName(profileName.split(' ')[0]);

                const checkData = [
                    { label: "Name", done: !!profile?.name },
                    { label: "Date of Birth", done: !!profile?.dob },
                    { label: "Marital Status", done: !!profile?.maritalStatus },
                    { label: "Occupation", done: !!profile?.occupationType },
                    { label: "Contact Info", done: !!(profile?.mobile) },
                ];

                setProgressChecks(checkData);
                const completed = checkData.filter(c => c.done).length;
                setProfileCompletion(Math.round((completed / checkData.length) * 100));
            } catch (error) {
                console.error('Failed to load progress data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfileCompletion();

        // Reload data when page becomes visible again (after editing from foundation)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadProfileCompletion();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleGoToDashboard = async () => {
        if (priority) OnboardingStore.set({ priority });
        localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());

        try {
            const supabase = createClient();
            await supabase.auth.updateUser({ data: { onboarding_completed: true } });
            await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFirstLogin: false })
            });
        } catch (e) {
            console.error("Error finalizing onboarding:", e);
        }

        router.push("/rajya");
    };

    const progressRows = progressChecks.map(check => (
        <div key={check.label} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${check.done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
                <p className={`text-sm font-medium ${check.done ? 'text-white' : 'text-white/60'}`}>{check.label}</p>
                <p className="text-[11px] text-white/35">{check.done ? 'Completed' : 'Pending information'}</p>
            </div>
        </div>
    ));

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen p-6 relative">
                <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400 text-center">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/60 text-sm">Loading your Rajya...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isReturning) {
        return (
            <div className="flex flex-col min-h-screen p-6 relative">
                <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-400/6 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col min-h-screen items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-24 h-24 rounded-full bg-amber-400/15 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)] mb-6"
                    >
                        <Crown className="w-12 h-12 text-amber-400" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center space-y-2 mb-8"
                    >
                        <p className="text-xs text-amber-400/70 uppercase tracking-widest">Welcome Back</p>
                        <h1 className="text-3xl font-display text-amber-400">{firstName}</h1>
                        <p className="text-white/60 text-sm">Your Rajya awaits your command.</p>
                        {lastLoginDisplay && (
                            <p className="text-white/30 text-xs mt-2">Last session: {lastLoginDisplay}</p>
                        )}
                    </motion.div>

                    <div className="w-full max-w-md space-y-3 mb-10">
                        {progressRows}
                    </div>

                    <motion.button
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={handleGoToDashboard}
                        className="w-full max-w-xs bg-amber-400 text-black font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors"
                    >
                        Enter Rajya
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 relative">
            <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-400/6 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="pt-10 flex flex-col items-center space-y-4">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                        className="relative"
                    >
                        <div className="w-24 h-24 rounded-full bg-amber-400/15 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                            <Award className="w-12 h-12 text-amber-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs">✓</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center space-y-1"
                    >
                        <p className="text-xs text-amber-400/70 uppercase tracking-widest">Foundation Badge</p>
                        <h1 className="text-2xl font-semibold text-white">Rajya Foundation Complete</h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                    >
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Rajya Strength</p>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                            <motion.div
                                className="h-full bg-amber-400 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${profileCompletion}%` }}
                                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                        <p className="text-amber-400 font-bold text-lg">{profileCompletion}%</p>
                        <p className="text-white/40 text-xs mt-1">You have established the base of your financial kingdom.</p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex-1 flex flex-col justify-center"
                >
                    <p className="text-sm text-white/60 text-center mb-4">Next: choose your first priority.</p>
                    <div className="grid grid-cols-2 gap-3 pb-8">
                        {PRIORITIES.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPriority(p.id)}
                                className={`p-3 rounded-xl border text-left transition-all hover:-translate-y-1 ${priority === p.id ? "bg-amber-400/15 border-amber-400" : "bg-white/5 border-white/10 hover:border-amber-400/30"}`}
                            >
                                <span className="text-xl">{p.icon}</span>
                                <p className={`text-sm font-medium mt-1 ${priority === p.id ? "text-amber-400" : "text-white"}`}>{p.label}</p>
                                <p className="text-xs text-white/35 mt-0.5 leading-tight">{p.desc}</p>
                            </button>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="pb-6"
                >
                    <button
                        onClick={handleGoToDashboard}
                        className="w-full bg-amber-400 text-black font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>

                {firstName && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center text-white/35 text-xs pb-6">
                        Welcome to Sva-Rajya, {firstName}. Tap a priority above to enter your Rajya.
                    </motion.p>
                )}
            </div>
        </div>
    );
}

export default function FirstWin() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}>
            <FirstWinContent />
        </Suspense>
    );
}