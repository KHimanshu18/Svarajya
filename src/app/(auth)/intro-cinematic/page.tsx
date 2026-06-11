"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// Deterministic pseudo-random for stable SSR/hydration
const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

const GoldenParticles = () => {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {Array.from({ length: 40 }).map((_, i) => {
                const size = pseudoRandom(i) * 3 + 1;
                const left = pseudoRandom(i + 100) * 100;
                const duration = pseudoRandom(i + 200) * 15 + 15;
                const delay = pseudoRandom(i + 300) * -20;
                const drift = (pseudoRandom(i + 400) - 0.5) * 60;

                return (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-amber-300/40 blur-[1px]"
                        style={{
                            width: size,
                            height: size,
                            left: `${left}%`,
                            bottom: "-5%",
                        }}
                        animate={{
                            y: ["0vh", "-110vh"],
                            x: [0, drift, -drift, 0],
                            opacity: [0, 0.4, 0.4, 0],
                        }}
                        transition={{
                            duration,
                            repeat: Infinity,
                            ease: "linear",
                            delay,
                        }}
                    />
                );
            })}
        </div>
    );
};

const LightSweep = () => (
    <motion.div
        className="absolute inset-0 pointer-events-none z-50 overflow-hidden mix-blend-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        <motion.div
            className="w-[200%] h-full bg-linear-to-r from-transparent via-amber-200/5 to-transparent skew-x-[-30deg]"
            animate={{
                x: ["-100%", "100%", "100%", "-100%"]
            }}
            transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
            }}
        />
    </motion.div>
);

const FloatingPapers = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-16 h-20 bg-white/5 border border-white/10 rounded sm shadow-lg backdrop-blur-sm"
                style={{
                    left: `${pseudoRandom(i) * 100}%`,
                    top: `${pseudoRandom(i + 10) * 100}%`,
                }}
                animate={{
                    y: [0, pseudoRandom(i+20) * 100 - 50],
                    x: [0, pseudoRandom(i+30) * 100 - 50],
                    rotate: [pseudoRandom(i+40) * -20, pseudoRandom(i+50) * 20],
                }}
                transition={{
                    duration: 20 + pseudoRandom(i) * 10,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                }}
            >
                <div className="w-1/2 h-0.5 bg-white/20 mt-3 mx-2 rounded-full" />
                <div className="w-3/4 h-0.5 bg-white/10 mt-1 mx-2 rounded-full" />
                <div className="w-2/3 h-0.5 bg-white/10 mt-1 mx-2 rounded-full" />
                <div className="w-full h-px bg-white/5 mt-auto mb-2" />
            </motion.div>
        ))}
    </div>
);

export default function IntroOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const nextStep = () => {
        if (step < 2) {
            setStep(s => s + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsExiting(true);
        setTimeout(() => {
            router.push("/start");
        }, 600); // Wait for zoom animation
    };

    // Swipe handling
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (diff > 50) nextStep(); // swipe left
        setTouchStart(null);
    };

    return (
        <motion.div 
            className="relative flex flex-col min-h-[100dvh] bg-slate-950 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            animate={isExiting ? { scale: 1.05, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Base Background: Deep dark with subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,30,15,1)_0%,rgba(10,15,30,1)_100%)] z-0" />
            
            {/* Dynamic Gold Light Texture (Parallax emulation via slow motion) */}
            <motion.div 
                className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-0"
                animate={{ x: [0, -20, 0], y: [0, -10, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />

            <GoldenParticles />
            <LightSweep />

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-1">
                            <motion.div 
                                className={`h-1 rounded-full ${i === step ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20'}`}
                                animate={{ width: i === step ? 16 : 6, backgroundColor: i === step ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    ))}
                </div>
                <button onClick={handleComplete} className="text-white/40 text-xs uppercase tracking-widest font-semibold hover:text-white/70 transition-colors">
                    Skip
                </button>
            </div>

            {/* Screen Content Container */}
            <div className="flex-1 relative z-20 flex flex-col items-center justify-center p-6 pb-24">
                <AnimatePresence mode="wait">
                    {/* SCREEN 1: The Treasury */}
                    {step === 0 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex flex-col items-center text-center max-w-sm w-full"
                        >
                            {/* Emblem / Diya Icon */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="w-16 h-16 rounded-full border border-amber-400/30 flex items-center justify-center bg-amber-400/5 mb-8 shadow-[0_0_40px_rgba(251,191,36,0.15)]"
                            >
                                <span className="text-2xl">🏛️</span>
                            </motion.div>

                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                                className="font-display text-2xl text-amber-400 mb-2 leading-relaxed"
                            >
                                हर राज्य का एक <br/>राजकोष होता था.
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45, duration: 0.6 }}
                                className="text-white/70 text-sm font-medium tracking-wide mb-8"
                            >
                                Every kingdom had a treasury.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9, duration: 0.6 }}
                                className="space-y-1"
                            >
                                <p className="text-amber-200/60 text-sm italic">वहीं से राज्य की समृद्धि संचालित होती थी.</p>
                                <p className="text-white/40 text-[11px] uppercase tracking-widest leading-relaxed px-4">From there, the prosperity of the kingdom was governed.</p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* SCREEN 2: The Problem */}
                    {step === 1 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex flex-col items-center text-center max-w-sm w-full relative h-[60vh] justify-center"
                        >
                            <FloatingPapers />
                            
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="bg-slate-950/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 relative z-10 w-full"
                            >
                                <h2 className="font-display text-2xl text-amber-400 mb-2 leading-tight">
                                    आज धन है…<br/>पर राजकोष नहीं.
                                </h2>
                                <p className="text-white/70 text-sm font-medium tracking-wide mb-8">
                                    Today we earn wealth…<br/>but we no longer have a treasury.
                                </p>

                                <ul className="space-y-3 text-left w-full pl-6">
                                    {[
                                        "Accounts scattered",
                                        "Assets forgotten",
                                        "Obligations unclear"
                                    ].map((item, i) => (
                                        <motion.li
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + i * 0.3, duration: 0.5 }}
                                            className="text-white/50 text-sm font-medium flex items-center gap-3"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400/50 block shrink-0" />
                                            {item}
                                        </motion.li>
                                    ))}
                                </ul>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* SCREEN 3: Svarajya Return */}
                    {step === 2 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="flex flex-col items-center text-center max-w-sm w-full h-[60vh] justify-center relative"
                        >
                            {/* Glow accumulation */}
                            <motion.div 
                                className="absolute w-64 h-64 bg-amber-400/20 rounded-full blur-[80px]"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                            />

                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                className="relative z-10 mb-8"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] mx-auto mb-6">
                                    <span className="text-4xl text-amber-400 drop-shadow-lg">⚖️</span>
                                </div>
                                <h2 className="font-display text-2xl text-amber-400 mb-1">अब आपका अपना राजकोष.</h2>
                                <p className="text-white/70 text-sm tracking-wide">Your personal treasury.</p>
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.6 }}
                                className="relative z-10 space-y-4 w-full"
                            >
                                <div className="flex items-center justify-center gap-3 text-amber-100/60 text-xs font-semibold tracking-widest uppercase">
                                    <span>Assets</span>
                                    <span className="w-1 h-1 bg-amber-400/30 rounded-full" />
                                    <span>Obligations</span>
                                    <span className="w-1 h-1 bg-amber-400/30 rounded-full" />
                                    <span>Documents</span>
                                </div>
                                
                                <p className="text-white/40 text-xs mt-6">This is where financial clarity begins.</p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Persistent Bottom Action Area */}
            <div className="absolute bottom-0 left-0 w-full p-6 pb-10 flex justify-center z-50 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent">
                <AnimatePresence mode="wait">
                    {step < 2 ? (
                        <motion.button
                            key="continue"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={nextStep}
                            className="bg-amber-400/10 border border-amber-400/30 text-amber-400 px-8 py-3.5 rounded-full font-semibold tracking-wide flex items-center gap-2 hover:bg-amber-400/20 transition-all shadow-[0_0_20px_rgba(251,191,36,0.1)] w-full max-w-[240px] justify-center"
                        >
                            {step === 0 ? "Continue" : "Restore Your Rajkosh"}
                        </motion.button>
                    ) : (
                        <motion.button
                            key="enter"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleComplete}
                            className="relative overflow-hidden group bg-amber-400 text-black px-8 py-4 rounded-full font-bold tracking-wide transition-all shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] w-full max-w-[240px] flex justify-center"
                        >
                            <span className="relative z-10">Enter Svarajya</span>
                            {/* Gold Shimmer Sweep inside button */}
                            <motion.div 
                                className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] w-full"
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                            />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
