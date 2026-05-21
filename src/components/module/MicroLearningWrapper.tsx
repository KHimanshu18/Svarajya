"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Lightbulb, ShieldQuestion, CheckCircle2 } from "lucide-react";

type WrapperStep = "context" | "insight" | "quiz" | "data";

interface MicroLearningWrapperProps {
    moduleTitle: string;
    contextText: string;
    insightText: string;
    quizQuestion: string;
    quizOptions: { label: string; isCorrect: boolean }[];
    onDataCaptureUnlock: () => void;
    children: React.ReactNode; // The actual data entry game UI
    widthClassName?: string;
}

export function MicroLearningWrapper({
    moduleTitle,
    contextText,
    insightText,
    quizQuestion,
    quizOptions,
    onDataCaptureUnlock,
    children,
    widthClassName = "max-w-lg"
}: MicroLearningWrapperProps) {
    const [step, setStep] = useState<WrapperStep>("context");
    const [quizError, setQuizError] = useState(false);

    const handleQuizAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setQuizError(false);
            setStep("data");
            onDataCaptureUnlock();
        } else {
            setQuizError(true);
            setTimeout(() => setQuizError(false), 2000);
        }
    };

    return (
        <div className={`w-full ${widthClassName} mx-auto min-h-[400px] flex flex-col`}>
            <div className="py-6 mb-6">
                <h2 className="text-center font-display text-[var(--color-rajya-accent)] text-2xl tracking-wide leading-relaxed">
                    {moduleTitle}
                </h2>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-rajya-accent)]/40 to-transparent mx-auto mt-4" />
            </div>

            <AnimatePresence mode="wait">

                {/* STEP 1: CONTEXT */}
                {step === "context" && (
                    <motion.div
                        key="context"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex-1 flex flex-col justify-center space-y-8 text-center px-4"
                    >
                        <BookOpen className="w-12 h-12 text-[var(--color-rajya-muted)] mx-auto" />
                        <p className="text-lg leading-relaxed text-[var(--color-rajya-text)] font-light">
                            {contextText}
                        </p>
                        <button
                            onClick={() => setStep("insight")}
                            className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Examine the Scroll
                        </button>
                    </motion.div>
                )}

                {/* STEP 2: INSIGHT */}
                {step === "insight" && (
                    <motion.div
                        key="insight"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="flex-1 flex flex-col justify-center space-y-8 text-center px-4"
                    >
                        <Lightbulb className="w-12 h-12 text-[var(--color-rajya-accent)] mx-auto" />
                        <div className="p-6 rounded-xl bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent-dim)] shadow-[0_0_30px_rgba(251,191,36,0.05)]">
                            <p className="text-lg leading-relaxed font-medium text-[var(--color-rajya-accent)]">
                                {insightText}
                            </p>
                        </div>
                        <button
                            onClick={() => setStep("quiz")}
                            className="mt-8 px-8 py-3 bg-[var(--color-rajya-accent)]/10 text-[var(--color-rajya-accent)] border border-[var(--color-rajya-accent)] rounded-lg hover:bg-[var(--color-rajya-accent)]/20 transition-colors"
                        >
                            Prove Thy Understanding
                        </button>
                    </motion.div>
                )}

                {/* STEP 3: QUIZ */}
                {step === "quiz" && (
                    <motion.div
                        key="quiz"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col justify-center space-y-8 px-4"
                    >
                        <div className="text-center space-y-4">
                            <ShieldQuestion className="w-10 h-10 text-[var(--color-rajya-muted)] mx-auto" />
                            <h3 className="text-xl text-[var(--color-rajya-text)]">
                                {quizQuestion}
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {quizOptions.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuizAnswer(opt.isCorrect)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${quizError && !opt.isCorrect
                                            ? "bg-[var(--color-rajya-danger)]/10 border-[var(--color-rajya-danger)]/50 text-[var(--color-rajya-danger)]"
                                            : "bg-[var(--color-rajya-card)] border-white/10 hover:border-white/30 text-[var(--color-rajya-text)]"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: DATA CAPTURE (The Reward) */}
                {step === "data" && (
                    <motion.div
                        key="data"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="flex items-center justify-center gap-2 mb-8 text-[var(--color-rajya-success)]">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">Wisdom Proven</span>
                        </div>

                        {/* The actual Data Game Template is injected here */}
                        {children}

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
