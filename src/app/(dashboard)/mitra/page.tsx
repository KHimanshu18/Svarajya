"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MicroLearningWrapper } from "@/components/module/MicroLearningWrapper";
import { Users, FileMinus, FileCheck, ArrowRight, Shield, Award, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { useToast } from "@/components/providers/ToastProvider";

export default function MitraModule() {
    const router = useRouter();
    const toast = useToast();
    
    // Will states
    const [hasWill, setHasWill] = useState<boolean | null>(null);
    const [step, setStep] = useState<"loading" | "question" | "dashboard">("loading");
    const [willData, setWillData] = useState<any>(null);

    useEffect(() => {
        // Fetch existing Will status on load
        fetch("/api/will")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data && res.data.id) {
                    setWillData(res.data);
                    setHasWill(res.data.existsFlag);
                    setStep("dashboard");
                } else {
                    setStep("question");
                }
            })
            .catch(err => {
                console.error("Error fetching Will details:", err);
                setStep("question");
            });
    }, []);

    const handleAnswer = async (val: boolean) => {
        setHasWill(val);
        
        // Save initial Will status immediately
        try {
            await fetch("/api/will", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ existsFlag: val })
            });
            toast("Succession status recorded!", "success");
        } catch (e) {
            console.warn("Failed to persist will answer:", e);
        }

        setStep("dashboard");
    };

    if (step === "loading") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50 font-display">
                Loading Legacy Shield...
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-6 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 text-white">
            <header className="mb-8 pt-4 flex items-center gap-3">
                <button onClick={() => router.push('/rajya')} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white/60 rotate-185" />
                </button>
                <div>
                    <h1 className="text-xl font-bold font-display">The Mitra</h1>
                    <p className="text-xs text-white/40">Legacy & Succession Protector</p>
                </div>
            </header>

            {step === "question" ? (
                <MicroLearningWrapper
                    moduleTitle="The Mitra (Legacy & Succession)"
                    contextText="A kingdom without a designated heir invites chaos the moment the king falls. Your assets mean nothing if your family cannot legally access them."
                    insightText="In India, over ₹82,000 Crores (approx $10 Billion) lies unclaimed in banks and insurance companies simply because nominees were not updated."
                    quizQuestion="Are nominees the final legal heirs to an asset?"
                    quizOptions={[
                        { label: "Yes, the nominee owns the money instantly", isCorrect: false },
                        { label: "No, a nominee is just a trustee. A registered Will determines the final heir.", isCorrect: true },
                        { label: "Only if the asset is in a joint account", isCorrect: false }
                    ]}
                    onDataCaptureUnlock={() => console.log("Mitra Unlock!")}
                >
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl text-amber-400 flex justify-center gap-2 items-center font-display">
                                <Users className="w-6 h-6" /> Declare The Heir
                            </h3>
                            <p className="text-sm text-white/50">Does your Rajya have a registered, legally binding Will?</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <button
                                onClick={() => handleAnswer(true)}
                                className="bg-slate-900 border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/5 text-white p-6 rounded-xl transition-all flex flex-col items-center gap-4 group"
                            >
                                <FileCheck className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-xs">Yes, Legally Sealed</span>
                            </button>

                            <button
                                onClick={() => handleAnswer(false)}
                                className="bg-slate-900 border border-white/10 hover:border-red-500 hover:bg-red-500/5 text-white p-6 rounded-xl transition-all flex flex-col items-center gap-4 group"
                            >
                                <FileMinus className="w-8 h-8 text-red-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-xs">No, or Unsure</span>
                            </button>
                        </div>
                    </div>
                </MicroLearningWrapper>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 max-w-md mx-auto"
                >
                    {/* Status Header Shield */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl" />
                        <div className="w-14 h-14 bg-amber-400/10 rounded-2xl flex items-center justify-center border border-amber-400/20 mb-4 animate-pulse">
                            <Shield className="w-7 h-7 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-bold font-display text-white">Legacy Shield Active</h2>
                        <p className="text-xs text-white/55 mt-1 leading-relaxed max-w-[260px]">
                            {hasWill 
                              ? "Your Will status is active. Your wealth distribution decrees are defined."
                              : "Kingdom vulnerable: You have not filed a registered Will yet. Declare asset-wise nominees to mitigate immediate risks."}
                        </p>
                    </div>

                    {/* Dashboard Navigation Cards */}
                    <div className="space-y-4">
                        {/* 1. Will Status Management Card */}
                        <div 
                            onClick={() => router.push("/mitra/will")}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-5 hover:border-amber-400/30 hover:bg-white/3 transition-all cursor-pointer flex justify-between items-center group"
                        >
                            <div className="flex gap-4 items-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasWill ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                                    {hasWill ? <FileCheck className="w-5 h-5 text-emerald-400" /> : <FileMinus className="w-5 h-5 text-red-400" />}
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-widest text-white/35 font-bold">1. Estate decree</h4>
                                    <p className="text-sm font-semibold text-white mt-0.5">Manage Will & Succession</p>
                                    <span className="text-[10px] font-medium text-emerald-400/80 block mt-1">
                                        {hasWill ? "✓ Legally Signed" : "⚠ Not Yet Configured"}
                                    </span>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </div>

                        {/* 2. Asset Nomination Dashboard Card */}
                        <div 
                            onClick={() => router.push("/mitra/assets")}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-5 hover:border-amber-400/30 hover:bg-white/3 transition-all cursor-pointer flex justify-between items-center group"
                        >
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-widest text-white/35 font-bold">2. Nomination Matrix</h4>
                                    <p className="text-sm font-semibold text-white mt-0.5">Asset Nominee Dashboard</p>
                                    <p className="text-[10px] text-white/40 mt-1">Audit mappings across Insurance, Banks, & Kosh.</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>

                    {/* Seal / Return */}
                    <button
                        onClick={() => router.push("/rajya")}
                        className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black py-4 rounded-xl font-bold font-display uppercase tracking-widest hover:bg-amber-300 transition-all text-xs"
                    >
                        Return to Rajya
                    </button>
                </motion.div>
            )}

            {/* YouTube Tutorial */}
            <div className="mt-12 max-w-md mx-auto">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">🎓 Learn More</p>
                <VideoTutorialPlaceholder youtubeId="GnxYjBU9E_U" label="How to write a Will in India — estate planning basics" />
            </div>
        </div>
    );
}
