"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Countdown effect for success auto-redirect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (success && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (success && countdown === 0) {
            router.replace("/start");
        }
        return () => clearTimeout(timer);
    }, [success, countdown, router]);

    // Token verification on mount
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const search = window.location.search;
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(search);
        
        const token = hashParams.get('access_token') || queryParams.get('access_token');
        const err = hashParams.get('error') || queryParams.get('error');
        const errDesc = hashParams.get('error_description') || queryParams.get('error_description');

        if (err || errDesc) {
            const description = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : "";
            if (description.toLowerCase().includes('expired')) {
                setError("Link expired. Please request a new reset link.");
            } else {
                setError("Invalid reset link. Please request a new one.");
            }
        } else if (!token) {
            setError("Invalid or missing reset token. Please request a new password reset link.");
        }
    }, []);

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (typeof err === "object" && err !== null && "message" in err) {
            const msg = (err as { message?: string }).message;
            return msg || fallback;
        }
        return fallback;
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        if (!/\d/.test(password)) {
            setError("Password must contain at least one number.");
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>_-]/.test(password)) {
            setError("Password must contain at least one special character.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            console.log("Extracting tokens from URL...");
            const hash = window.location.hash.substring(1);
            const search = window.location.search;

            const hashParams = new URLSearchParams(hash);
            const queryParams = new URLSearchParams(search);

            const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
            const err = hashParams.get('error') || queryParams.get('error');
            const errDesc = hashParams.get('error_description') || queryParams.get('error_description');

            if (err || errDesc) {
                const description = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : "";
                if (description.toLowerCase().includes('expired')) {
                    throw new Error("Link expired. Please request a new reset link.");
                } else {
                    throw new Error("Invalid reset link. Please request a new one.");
                }
            }

            if (!accessToken) {
                throw new Error("Invalid reset link. Please request a new password reset link.");
            }

            // Set the session using the token
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
            });

            if (sessionError) throw sessionError;

            // Now update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Sign out after password update
            await supabase.auth.signOut();
            setSuccess(true);
            setCountdown(5);
        } catch (err: unknown) {
            console.error("Password reset error:", err);
            setError(getErrorMessage(err, "Failed to update password. The link may have expired. Please request a new reset link."));
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-8 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/6 blur-[100px] rounded-full pointer-events-none" />

            {/* Dynamic Content Area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-sm mt-8 pb-12">
                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="w-full flex flex-col items-center text-center space-y-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] mb-4">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-semibold text-emerald-400">Password Updated</h2>
                            <p className="text-sm text-white/70 leading-relaxed px-4">
                                Your password has been updated successfully.
                            </p>

                            <div className="pt-8 w-full">
                                <button
                                    onClick={() => router.replace("/start")}
                                    className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    Go to Login <ArrowRight className="w-4 h-4" />
                                </button>
                                <p className="text-[10px] text-white/30 mt-4 tracking-wider">
                                    Redirecting automatically in {countdown}s...
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="resetForm"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="w-full flex flex-col items-center"
                        >
                            <div className="w-12 h-12 mb-6 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                                <span className="text-xl">🔐</span>
                            </div>

                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Set New Password
                            </h2>
                            <p className="text-sm text-white/40 mb-8 text-center px-4">
                                Enter your new password to regain access to your Rajya.
                            </p>

                            <form onSubmit={handleReset} className="w-full space-y-4">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Lock className="w-4 h-4 text-white/30" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            disabled={loading}
                                            maxLength={100}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new Password"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-amber-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Lock className="w-4 h-4 text-white/30" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            disabled={loading}
                                            maxLength={100}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new Password"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-amber-400 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Password Requirements Checklist */}
                                    <div className="space-y-2 px-1 pb-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            {password.length >= 8 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-500/70" />}
                                            <span className={password.length >= 8 ? "text-emerald-400/90" : "text-white/40"}>At least 8 characters</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {/\d/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-500/70" />}
                                            <span className={/\d/.test(password) ? "text-emerald-400/90" : "text-white/40"}>Contains at least one number</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {/[!@#$%^&*(),.?":{}|<>_-]/.test(password) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-500/70" />}
                                            <span className={/[!@#$%^&*(),.?":{}|<>_-]/.test(password) ? "text-emerald-400/90" : "text-white/40"}>Contains a special character</span>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
