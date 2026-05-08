"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { createClient } from "@/lib/supabase/client";
import { validateControlledEmail, validateIndianMobile } from "@/lib/validators/contactValidator";

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
    const [userId, setUserId] = useState("");

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
                    const userIdValue = profile?.id || "";

                    setMobile(mobileValue);
                    setEmail(emailValue);
                    setWhatsapp(whatsappValue);
                    setUserId(userIdValue);

                    if (mobileValue && isVerified) {
                        setOtpState('verified');
                        setUnlocked(true);
                        setIsReadOnly(true);
                    } else if (mobileValue) {
                        setOtpState('none');
                    }

                    OnboardingStore.set({
                        mobile: mobileValue,
                        email: emailValue,
                        whatsappEnabled: whatsappValue,
                    });
                } else {

                }
            } catch (error) {

            } finally {
                setIsLoading(false);
            }
        };

        fetchContactInfo();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchContactInfo();
            }
        };

        const handleFocus = () => {
            fetchContactInfo();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handleSendOtp = async () => {
        const mobileResult = validateIndianMobile(mobile);
        if (!mobileResult.valid) {
            setError(mobileResult.message || "Enter a valid 10-digit mobile number.");
            return;
        }

        const normalizedMobile = mobileResult.normalized;

        // Check if phone number already exists for another user
        if (userId) {
            const checkResponse = await fetch(`/api/check-phone?phone=${normalizedMobile}&userId=${userId}`);
            const checkResult = await checkResponse.json();
            if (checkResult.exists) {
                setError("This phone number is already registered with another account. Please use a different number.");
                return;
            }
        }

        setMobile(normalizedMobile);
        setError("");
        setOtpState("sending");
        await new Promise(r => setTimeout(r, 1500));
        setOtpState("sent");
    };

    const handleVerify = async () => {
        const mobileResult = validateIndianMobile(mobile);
        if (!mobileResult.valid) {
            setError(mobileResult.message || "Enter a valid 10-digit mobile number.");
            return;
        }

        if (otpInput !== MOCK_OTP) {
            setError("Invalid code. Enter the 4-digit OTP sent to your mobile.");
            return;
        }

        setError("");
        setOtpState("verified");
        setUnlocked(true);
        setIsReadOnly(true);

        const normalizedMobile = mobileResult.normalized;
        const currentEmail = email;

        // Update local store immediately
        OnboardingStore.set({
            mobile: normalizedMobile,
            email: currentEmail,
            whatsappEnabled: whatsapp,
        });

        // Save to API
        try {
            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: normalizedMobile,
                    email: currentEmail,
                    whatsappEnabled: whatsapp,
                    isMobileVerified: true
                })
            });
        } catch (err) {
            console.error('Failed to save contact info:', err);
        }
    };

    const handleSaveContinue = async () => {
        setIsSaving(true);
        try {
            const mobileResult = validateIndianMobile(mobile);
            const normalizedMobile = mobileResult.normalized;
            const currentEmail = email;

            OnboardingStore.set({
                mobile: normalizedMobile,
                email: currentEmail,
                whatsappEnabled: whatsapp,
            });

            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: normalizedMobile,
                    email: currentEmail,
                    whatsappEnabled: whatsapp,
                    isFirstLogin: false,
                    isMobileVerified: true
                })
            });

            router.push("/onboarding/firstwin");
        } catch (error) {
            console.error('Error saving contact info:', error);
            setError('Failed to save contact information. Please try again.');
        } finally {
            setIsSaving(false);
        }
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
                    <div className="flex-1 flex flex-col justify-center space-y-6 mt-12">
                        <div className="flex justify-center">
                            <div className="w-44 h-20 bg-white/6 rounded-xl animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                            <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
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
                                    autoComplete="off"
                                    onChange={e => { if (!isReadOnly && otpState !== 'verified') { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); } }}
                                    placeholder="10-digit number"
                                    maxLength={10}
                                    inputMode="numeric"
                                    pattern="[0-9]{10}"
                                    className="flex-1 bg-white/6 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isReadOnly || otpState === "verified"}
                                />
                            </div>
                        </div>

                        {otpState !== "verified" && otpState === "none" && !isReadOnly && (
                            <button onClick={handleSendOtp} className="w-full bg-white/8 border border-white/15 text-white/70 py-3 rounded-xl text-sm hover:bg-white/12 transition-colors">
                                Send OTP to mobile
                            </button>
                        )}

                        {otpState === "sending" && (
                            <p className="text-center text-white/40 text-sm animate-pulse">Sending OTP...</p>
                        )}

                        {otpState === "sent" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                <div className="bg-amber-400/10 border border-amber-400/25 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Test OTP (Dev Mode)</p>
                                    <p className="text-2xl font-mono font-bold tracking-[0.4em] text-amber-400 mt-1">{MOCK_OTP}</p>
                                </div>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={otpInput}
                                    onChange={e => { setOtpInput(e.target.value); setError(""); }}
                                    placeholder="Enter 4-digit OTP"
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] text-white focus:outline-none focus:border-amber-400/60"
                                />
                                <button onClick={handleVerify} className="w-full bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm">
                                    Verify OTP
                                </button>
                            </motion.div>
                        )}

                        {otpState === "verified" && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-emerald-400 text-sm">
                                ✓ Mobile verified. Gate unlocked.
                            </motion.p>
                        )}

                        {error && <p className="text-red-400 text-xs">{error}</p>}

                        {otpState === "verified" && (
                            <motion.button
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleSaveContinue}
                                disabled={isSaving}
                                className="w-full bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm hover:bg-amber-300 transition-colors disabled:opacity-60 mt-4"
                            >
                                {isSaving ? "Saving..." : "Save & Continue"}
                            </motion.button>
                        )}

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
                            <p className="text-[10px] text-white/25">Email is synced from your login account and cannot be changed here.</p>
                        </div>

                        <div className="flex items-start justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-white font-medium">Enable WhatsApp reminders</p>
                                    <p className="text-xs text-white/35 mt-0.5">Only if you switch it on. We never read your messages.</p>
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

                {otpState === "none" && (
                    <div className="pb-4">
                        <button onClick={() => router.push("/onboarding/firstwin")} className="w-full text-amber-400/60 text-[10px] font-semibold uppercase tracking-wider py-3 hover:text-amber-400 transition-colors">
                            Skip verification
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}