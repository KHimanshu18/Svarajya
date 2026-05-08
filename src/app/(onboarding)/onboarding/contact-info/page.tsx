"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { validateIndianMobile } from "@/lib/validators/contactValidator";

const MOCK_OTP = "1234";

function ProgressBar({ step }: { step: number }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/10"}`} />
            ))}
        </div>
    );
}

export default function ContactStep() {
    const router = useRouter();
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [whatsapp, setWhatsapp] = useState(false);
    const [otpState, setOtpState] = useState<"none" | "sending" | "sent" | "verified">("none");
    const [otpInput, setOtpInput] = useState("");
    const [error, setError] = useState("");
    const [unlocked, setUnlocked] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchContactInfo = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/profile', { cache: 'no-store' });
                if (response.ok) {
                    const json = await response.json();
                    const profile = json?.data;

                    const mobileValue = profile?.phone || "";
                    const emailValue = profile?.email || "";
                    const whatsappValue = profile?.whatsappEnabled ?? false;
                    const isVerified = profile?.isMobileVerified === true;

                    setMobile(mobileValue);
                    setEmail(emailValue);
                    setWhatsapp(whatsappValue);

                    if (mobileValue && isVerified) {
                        setOtpState('verified');
                        setUnlocked(true);
                        setIsReadOnly(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch contact info:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContactInfo();
    }, []);

    const handleSaveContinue = async () => {
        setIsSaving(true);
        try {
            router.push("/onboarding/firstwin");
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen p-6 relative">
                <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400 text-center">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/60 text-sm">Loading...</p>
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
                    <p className="text-xs text-amber-400/70 uppercase tracking-widest">Step 5 of 5</p>
                </div>
                <ProgressBar step={5} />

                <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="flex justify-center">
                        <svg width="180" height="80" viewBox="0 0 180 80">
                            <rect x="15" y="10" width="150" height="60" rx="3" fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.2)" strokeWidth="1.5" />
                            <rect x="20" y="15" width="65" height="55" rx="2" fill="rgba(251,191,36,0.05)" stroke={unlocked ? "rgba(251,191,36,0.6)" : "rgba(251,191,36,0.2)"} strokeWidth="1"
                                transform={unlocked ? "translate(-20, 0)" : ""} />
                            <rect x="95" y="15" width="65" height="55" rx="2" fill="rgba(251,191,36,0.05)" stroke={unlocked ? "rgba(251,191,36,0.6)" : "rgba(251,191,36,0.2)"} strokeWidth="1"
                                transform={unlocked ? "translate(20, 0)" : ""} />
                            {unlocked && <ellipse cx="90" cy="70" rx="40" ry="15" fill="rgba(251,191,36,0.12)" />}
                            <circle cx="82" cy="45" r="3" fill="rgba(251,191,36,0.4)" />
                            <circle cx="98" cy="45" r="3" fill="rgba(251,191,36,0.4)" />
                        </svg>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <h1 className="text-xl font-semibold text-white mb-1">Secure Messenger Contact</h1>
                            <p className="text-xs text-white/40">We use this only for important alerts and financial reminders.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs text-white/50 uppercase tracking-wider">Mobile number</label>
                                {isReadOnly && (
                                    <span className="text-emerald-400 text-[11px] uppercase tracking-[0.15em]">Verified</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-white/6 border border-white/15 rounded-xl px-3 flex items-center text-white/55 text-sm shrink-0">+91</div>
                                <input
                                    type="tel"
                                    value={mobile}
                                    readOnly
                                    disabled
                                    placeholder="10-digit number"
                                    className="flex-1 bg-white/6 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-colors opacity-70 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {otpState === "verified" && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-emerald-400 text-sm">
                                ✓ Mobile verified. Gate unlocked.
                            </motion.p>
                        )}

                        {error && <p className="text-red-400 text-xs">{error}</p>}

                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleSaveContinue}
                            disabled={isSaving}
                            className="w-full bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm hover:bg-amber-300 transition-colors disabled:opacity-60 mt-4"
                        >
                            {isSaving ? "Saving..." : "Save & Continue"}
                        </motion.button>

                        <div className="space-y-2">
                            <label className="text-xs text-white/50 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                readOnly
                                disabled
                                placeholder="yourname@email.com"
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-colors text-sm cursor-not-allowed opacity-70"
                            />
                            <p className="text-[10px] text-white/25">Email is synced from your login account.</p>
                        </div>

                        <div className="flex items-start justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-white font-medium">Enable WhatsApp reminders</p>
                                    <p className="text-xs text-white/35 mt-0.5">Only if you switch it on.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setWhatsapp(!whatsapp)}
                                className={`w-10 h-6 rounded-full transition-colors shrink-0 ${whatsapp ? "bg-emerald-500" : "bg-white/15"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${whatsapp ? "translate-x-4" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}