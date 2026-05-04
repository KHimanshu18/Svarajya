"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MicroLearningWrapper } from "@/components/module/MicroLearningWrapper";
import { SelectGridGame } from "@/components/module/SelectGridGame";
import { Shield, HeartPulse, Home, Car, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

const RAKSHA_TYPES = [
    { id: 'term', label: 'Term (Life)', icon: <Shield /> },
    { id: 'health', label: 'Health', icon: <HeartPulse /> },
    { id: 'vehicle', label: 'Vehicle', icon: <Car /> },
    { id: 'property', label: 'Property', icon: <Home /> },
];

export default function RakshaModule() {
    const router = useRouter();
    const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
    const [step, setStep] = useState<"identify" | "review">("identify");

    const handleIdentify = (ids: string[]) => {
        setSelectedPolicies(ids);
        setStep("review");
    };

    const handleFinish = () => {
        console.log("Raksha Array:", selectedPolicies);
        router.push('/rajya');
    };

    const hasLifeHealth = selectedPolicies.includes('term') && selectedPolicies.includes('health');

    return (
        <div className="flex flex-col min-h-screen relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/4 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col flex-1 p-6 pb-28">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Raksha (Insurance & Protection)</h1>
                        <p className="text-xs text-white/35 mt-0.5">The Shield & Fortress</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    <MicroLearningWrapper
                        moduleTitle="The Raksha (Shield & Fortress)"
                        contextText="A kingdom builds its treasury (Kosh), but an invading army — like an unforeseen medical crisis or accident — can pillage it overnight if there are no walls."
                        insightText="68% of families who face a sudden medical emergency are forced to liquidate their core assets or take predatory loans due to inadequate Raksha."
                        quizQuestion="What is the primary purpose of Raksha (Insurance)?"
                        quizOptions={[
                            { label: "To get a return on investment over time", isCorrect: false },
                            { label: "To protect the Kosh from critical, sudden depletion", isCorrect: true },
                            { label: "To save on yearly taxes", isCorrect: false }
                        ]}
                        onDataCaptureUnlock={() => console.log("Raksha Unlocked")}
                    >
                        {step === "identify" ? (
                            <SelectGridGame
                                label="Erect The Walls"
                                description="Which shields currently protect your kingdom?"
                                items={RAKSHA_TYPES}
                                multiSelect={true}
                                onSave={handleIdentify}
                            />
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-8 flex flex-col items-center py-4"
                            >
                                <div className="text-center space-y-5 w-full max-w-sm">
                                    <Shield className={`w-16 h-16 mx-auto ${hasLifeHealth ? 'text-[var(--color-rajya-success)]' : 'text-[var(--color-rajya-danger)]'}`} />
                                    <h3 className="text-xl text-[var(--color-rajya-text)] font-display">
                                        Fortress Status
                                    </h3>

                                    {hasLifeHealth ? (
                                        <p className="text-[var(--color-rajya-success)]/90 text-sm bg-[var(--color-rajya-success)]/10 p-5 rounded-xl border border-[var(--color-rajya-success)]/20 leading-relaxed">
                                            Your core walls (Life & Health) are standing. The foundation is secure against major sieges.
                                        </p>
                                    ) : (
                                        <p className="text-[var(--color-rajya-danger)]/90 text-sm bg-[var(--color-rajya-danger)]/10 p-5 rounded-xl border border-[var(--color-rajya-danger)]/20 leading-relaxed">
                                            CRITICAL CRACK DETECTED: Without both Term and Health shields, your entire Kosh remains exposed to a single catastrophic event.
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleFinish}
                                    className="w-full max-w-sm flex items-center justify-center gap-2 bg-[var(--color-rajya-accent)] text-black py-4 rounded-xl font-bold font-display uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Acknowledge & Seal
                                </button>
                            </motion.div>
                        )}
                    </MicroLearningWrapper>
                </div>

                {/* YouTube Tutorial */}
                <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">🎓 Learn More</p>
                    <VideoTutorialPlaceholder youtubeId="3Ob3stTkGLs" label="Term insurance & health insurance explained for beginners" />
                </div>
            </div>
        </div>
    );
}
