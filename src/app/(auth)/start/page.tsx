"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
    MessageSquareOff, Landmark, ShieldCheck,
    Mail, Lock, ArrowRight, Loader2, User,
    Check, X, Eye, EyeOff, AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TRUST_ICONS = [
    { icon: <MessageSquareOff className="w-4 h-4" />, label: "No SMS reading" },
    { icon: <Landmark className="w-4 h-4" />, label: "No bank scraping" },
    { icon: <ShieldCheck className="w-4 h-4" />, label: "No ads, ever" },
];

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_STORAGE_KEY_LOGIN = "sv_login_limit";
const LOCKOUT_STORAGE_KEY_SIGNUP = "sv_signup_limit";

type LockState = { count: number; since: number };

function getRateLimitState(key: string, email: string): LockState {
    try {
        const raw = localStorage.getItem(`${key}:${email.toLowerCase()}`);
        return raw ? JSON.parse(raw) : { count: 0, since: 0 };
    } catch {
        return { count: 0, since: 0 };
    }
}

function recordAttempt(key: string, email: string): LockState {
    const state = getRateLimitState(key, email);
    const now = Date.now();
    // Reset window if lockout period has passed
    const newState: LockState = (now - state.since) >= LOCKOUT_MS
        ? { count: 1, since: now }
        : { count: state.count + 1, since: state.since };
    localStorage.setItem(`${key}:${email.toLowerCase()}`, JSON.stringify(newState));
    return newState;
}

function clearRateLimit(key: string, email: string) {
    localStorage.removeItem(`${key}:${email.toLowerCase()}`);
}

function getRemainingLockoutSeconds(state: LockState): number {
    if (state.count < MAX_ATTEMPTS) return 0;
    const elapsed = Date.now() - state.since;
    if (elapsed >= LOCKOUT_MS) return 0;
    return Math.ceil((LOCKOUT_MS - elapsed) / 1000);
}

type Mode = "splash" | "login" | "signup" | "forgot_password" | "registration_success";

export default function AuthGateway() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
        }>
            <AuthGatewayContent />
        </Suspense>
    );
}

function AuthGatewayContent() {
    const router = useRouter();
    const supabase = createClient();

    const [mode, setMode] = useState<Mode>("splash");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode>("");
    const [msg, setMsg] = useState("");
    const [countdown, setCountdown] = useState(10);
    const searchParams = useSearchParams();

    // Rate-limit countdown (for lockout UI)
    const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
    const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);

    // ------------------------------------------
    // Clear all fields whenever mode changes (fixes email persisting)
    // ------------------------------------------
    const resetForm = useCallback(() => {
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setError("");
        setMsg("");
        setAttemptsLeft(MAX_ATTEMPTS);
        setRateLimitSeconds(0);
    }, []);

    const switchMode = useCallback((next: Mode) => {
        resetForm();
        setMode(next);
    }, [resetForm]);

    // ------------------------------------------
    // 10s countdown for registration_success
    // ------------------------------------------
    useEffect(() => {
        if (mode !== "registration_success") return;
        // Removed auto-redirect - user should manually go back to login after confirming email        //if (countdown <= 0) { switchMode("login"); setCountdown(10); return; }
        //const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        //return () => clearTimeout(t);
    }, [mode, countdown, switchMode]);

    // Handle verification success from URL
    useEffect(() => {
        if (searchParams.get("verification_success") === "true") {
            // Immediately sign out to clear any auto-created session from email link
            supabase.auth.signOut().then(() => {
                setEmail("");
                setPassword("");
                setFullName("");
                setConfirmPassword("");
                setMode("login");
                setMsg("Email verified successfully! Please log in with your credentials.");

                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete("verification_success");
                window.history.replaceState({}, "", newUrl);
            });
        }
    }, [searchParams, supabase.auth]);

    // Clear any auto-created session on login page load
    useEffect(() => {
        if (mode !== "splash" && mode !== "login") return;

        const clearAutoSession = async () => {
            // Add 100ms delay to ensure session is fully detected
            await new Promise(resolve => setTimeout(resolve, 100));
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                console.log("Auto-session detected, signing out...");
                await supabase.auth.signOut();
                setEmail("");
                setPassword("");
                setFullName("");
                setConfirmPassword("");
                // Force a clean page state
                window.location.reload();
            }
        };
        clearAutoSession();
    }, [supabase.auth, mode]);

    // ------------------------------------------
    // Rate limit countdown ticker
    // ------------------------------------------
    useEffect(() => {
        if (rateLimitSeconds <= 0) return;
        const t = setTimeout(() => setRateLimitSeconds(s => {
            if (s <= 1) { setAttemptsLeft(MAX_ATTEMPTS); return 0; }
            return s - 1;
        }), 1000);
        return () => clearTimeout(t);
    }, [rateLimitSeconds]);

    // ------------------------------------------
    // Update attemptsLeft from localStorage based on current email
    // ------------------------------------------
    const refreshAttemptState = useCallback((currentEmail: string, storageKey: string) => {
        if (!currentEmail) return;
        const state = getRateLimitState(storageKey, currentEmail);
        const remaining = getRemainingLockoutSeconds(state);
        if (remaining > 0) {
            setRateLimitSeconds(remaining);
            setAttemptsLeft(0);
        } else {
            setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - state.count));
            setRateLimitSeconds(0);
        }
    }, []);

    // Live attempt count as user types their email
    useEffect(() => {
        const key = mode === "login" ? LOCKOUT_STORAGE_KEY_LOGIN : LOCKOUT_STORAGE_KEY_SIGNUP;
        refreshAttemptState(email, key);
    }, [email, mode, refreshAttemptState]);

    // ------------------------------------------
    const getErrorMessage = (err: unknown, fallback: string): string => {
        if (typeof err === "object" && err !== null && "message" in err) {
            return (err as { message?: string }).message || fallback;
        }
        return fallback;
    };

    const checkRateLimit = (storageKey: string): boolean => {
        const state = getRateLimitState(storageKey, email);
        const lockSecs = getRemainingLockoutSeconds(state);
        if (lockSecs > 0) {
            setRateLimitSeconds(lockSecs);
            setAttemptsLeft(0);
            setError(`Too many attempts. Please try again in ${Math.ceil(lockSecs / 60)} minute(s).`);
            return true; // locked out
        }
        return false;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setMsg("");

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
            setError("Please enter a valid email address."); return;
        }

        const storageKey = mode === "login" ? LOCKOUT_STORAGE_KEY_LOGIN : LOCKOUT_STORAGE_KEY_SIGNUP;

        // Rate limit gate
        if (checkRateLimit(storageKey)) return;

        if (mode === "signup") {
            if (!fullName.trim()) { setError("Please enter your full name."); return; }
            if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
            if (!/\d/.test(password)) { setError("Password must contain at least one number."); return; }
            if (!/[!@#$%^&*(),.?":{}|<>_-]/.test(password)) { setError("Password must contain at least one special character."); return; }
            if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        }

        setLoading(true);

        try {
            if (mode === "signup") {
                const res = await fetch('/api/auth/send-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: trimmedEmail,
                        password,
                        name: fullName.trim()
                    })
                });
                
                const responseData = await res.json();

                if (!res.ok) {
                    const newState = recordAttempt(storageKey, trimmedEmail);
                    const left = Math.max(0, MAX_ATTEMPTS - newState.count);
                    setAttemptsLeft(left);

                    const errMsg = responseData.error?.toLowerCase() ?? "";
                    if (errMsg.includes("already registered") || errMsg.includes("user already registered")) {
                        setError(
                            <span>
                                Email already registered. Please{" "}
                                <button type="button" onClick={() => switchMode("login")} className="underline font-semibold hover:text-red-300">
                                    login instead
                                </button>.
                            </span>
                        );
                    } else {
                        setError(getErrorMessage(responseData.error, "Registration failed. Please try again."));
                    }
                    return;
                }

                // FIXED: Create user in Prisma immediately after signup using secret bypass
                if (responseData.user) {
                    try {
                        const profileRes = await fetch('/api/auth/create-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: responseData.user.id,
                                email: responseData.user.email,
                                name: fullName.trim() || trimmedEmail.split('@')[0],
                            }),
                        });

                        if (!profileRes.ok) {
                            console.error("Profile creation failed:", await profileRes.text());
                        } else {
                            console.log("User successfully created in Prisma via public create-user endpoint");
                        }

                        // Also attempt to sign in immediately to establish session (if confirmation not required)
                        await supabase.auth.signInWithPassword({
                            email: trimmedEmail,
                            password: password
                        });
                    } catch (e) {
                        console.error("Failed to create user profile", e);
                    }
                }

                // Clear rate limit on success
                clearRateLimit(storageKey, trimmedEmail);

                setMode("registration_success");
                setCountdown(10);
                return;

            } else if (mode === "forgot_password") {
                const checkRes = await fetch(`/api/check-user?email=${encodeURIComponent(trimmedEmail)}`);
                const checkData = await checkRes.json();

                if (!checkData.exists) {
                    setError("No account found with this email. Please sign up first.");
                    return;
                }

                const res = await fetch('/api/auth/send-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: trimmedEmail })
                });
                
                const responseData = await res.json();
                if (!res.ok) throw new Error(responseData.error || "Failed to send reset email");

                setMode("login");
                setMsg("Reset link sent! Please check your inbox.");

            } else {
                // LOGIN
                if (!trimmedEmail || !password) {
                    setError("Please enter both email and password.");
                    return;
                }

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail, password,
                });

                if (signInError) {
                    const newState = recordAttempt(storageKey, trimmedEmail);
                    const left = Math.max(0, MAX_ATTEMPTS - newState.count);
                    setAttemptsLeft(left);

                    const errMsg = signInError.message?.toLowerCase() ?? "";
                    if (left <= 0) {
                        const lockSecs = getRemainingLockoutSeconds(newState);
                        setRateLimitSeconds(lockSecs);
                        setError(`Too many failed attempts. Try again in ${Math.ceil(lockSecs / 60)} minute(s).`);
                    } else if (errMsg.includes("invalid login credentials")) {
                        // Check if user exists to distinguish between wrong password vs no account
                        try {
                            const res = await fetch(`/api/check-user?email=${encodeURIComponent(trimmedEmail)}`);
                            const { exists } = await res.json();

                            if (exists) {
                                setError("Incorrect password. Please try again.");
                            } else {
                                setError(
                                    <span>
                                        No account found with this email. Please{" "}
                                        <button type="button" onClick={() => switchMode("signup")} className="underline font-semibold hover:text-amber-300">
                                            sign up first
                                        </button>.
                                    </span>
                                );
                            }
                        } catch (e) {
                            setError("Invalid email or password. Please check your credentials.");
                        }
                    } else if (errMsg.includes("email not confirmed") || errMsg.includes("email_not_confirmed")) {
                        setError(
                            <span>
                                Email not confirmed. Please check your inbox and click the verification link to activate your account.
                            </span>
                        );

                    } else {
                        setError(signInError.message || `Invalid email or password. ${left} attempt(s) remaining.`);
                    }
                    return;
                }

                // Login success — clear rate limit
                clearRateLimit(storageKey, trimmedEmail);

                try {
                    const profileRes = await fetch("/api/profile");
                    if (profileRes.ok) {
                        const { data } = await profileRes.json();
                        if (data && data.isFirstLogin) {
                            router.push("/onboarding/intro");
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Failed to check first login status", e);
                }

                router.push("/rajya");
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Something went wrong. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true); setError("");
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/callback`,
                    scopes: "profile email https://www.googleapis.com/auth/drive.file"
                }
            });
            if (error) throw error;
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to initialize Google login."));
            setLoading(false);
        }
    };

    const isLocked = rateLimitSeconds > 0;
    const lockMins = Math.floor(rateLimitSeconds / 60);
    const lockSecs = rateLimitSeconds % 60;

    return (
        <div className="flex flex-col min-h-screen items-center justify-between p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/6 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-sm mt-8 pb-12">
                <AnimatePresence mode="wait">

                    {/* SPLASH */}
                    {mode === "splash" && (
                        <motion.div key="splash"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                            className="flex flex-col items-center space-y-8 w-full"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.12)]">
                                <span className="text-3xl">⚖️</span>
                            </div>
                            <div className="text-center">
                                <h1 className="font-display text-4xl text-amber-400 leading-none tracking-wide">Sva-Rajya</h1>
                                <p className="text-white/45 text-sm mt-2 tracking-wide">Govern your sovereign financial realm.</p>
                                <p className="text-white/70 text-sm mt-4 font-medium px-4">Organise your entire financial life in one place.</p>
                                <p className="text-white/40 text-[10px] mt-2 tracking-widest uppercase">Documents • Income • Banks • Expenses • Insurance • Legacy</p>
                            </div>
                            <div className="w-full space-y-3 pt-6">
                                <button onClick={() => switchMode("signup")}
                                    className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors flex items-center justify-center gap-2">
                                    Build Your Rajya <ArrowRight className="w-4 h-4" />
                                </button>
                                <button onClick={() => switchMode("login")}
                                    className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
                                    Enter Existing Rajya
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* REGISTRATION SUCCESS */}
                    {mode === "registration_success" && (
                        <motion.div key="registration_success"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}
                            className="w-full flex flex-col items-center text-center space-y-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-semibold text-emerald-400">Creation Initiated</h2>
                            <p className="text-sm text-white/70 leading-relaxed px-4">
                                Registration is completed. Please check your email ID for account opening.
                            </p>
                            <p className="text-xs text-amber-500/70 px-4">
                                ⏱ The verification link expires in 30 minutes. Open it promptly.
                            </p>
                            <div className="pt-4 w-full">
                                <button onClick={() => { switchMode("login"); setCountdown(10); }}
                                    className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                    Back to Login <ArrowRight className="w-4 h-4" />
                                </button>
                                {/*
                                 * Redirecting automatically in 
                                    <span className="text-amber-400">{countdown}s</span><div styleName={styles['---']}>
                                    */}
                                <p className="text-[10px] text-white/50 mt-4 tracking-wider">
                                    Once you confirm your email, you can log in using the button below.
                                </p>

                            </div>


                        </motion.div>
                    )}

                    {/* LOGIN / SIGNUP / FORGOT */}
                    {(mode === "login" || mode === "signup" || mode === "forgot_password") && (
                        <motion.div key="authForm"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}
                            className="w-full flex flex-col items-center"
                        >
                            <div className="w-12 h-12 mb-6 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                                <span className="text-xl">⚖️</span>
                            </div>

                            <h2 className="text-2xl font-semibold text-white mb-2">
                                {mode === "signup" ? "Begin Creation" : mode === "forgot_password" ? "Recover Password" : "Welcome Back"}
                            </h2>
                            <p className="text-sm text-white/40 mb-8 text-center px-4">
                                {mode === "signup" ? "Secure your identity to access the Rajya."
                                    : mode === "forgot_password" ? "Enter your email to receive a password reset link."
                                        : "Enter your credentials to regain command."}
                            </p>

                            <form onSubmit={handleAuth} className="w-full space-y-4">
                                <div className="space-y-4">
                                    {/* FULL NAME - signup only */}
                                    {mode === "signup" && (
                                        <div className="space-y-1.5">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                    <User className="w-4 h-4 text-white/30" />
                                                </div>
                                                <input type="text" required disabled={loading} maxLength={100}
                                                    value={fullName} onChange={e => setFullName(e.target.value)}
                                                    placeholder="Full Name (As per Aadhaar)"
                                                    autoComplete="off"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                                />
                                            </div>
                                            <p className="text-[10px] text-amber-500/70 italic px-2">
                                                Use the name exactly as it appears on your Aadhaar card — no nicknames.
                                            </p>
                                        </div>
                                    )}

                                    {/* EMAIL */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Mail className="w-4 h-4 text-white/30" />
                                        </div>
                                        <input type="email" required disabled={loading} maxLength={100}
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="Identity (Email)"
                                            autoComplete="off"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                        />
                                    </div>

                                    {/* PASSWORD */}
                                    {mode !== "forgot_password" && (
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Lock className="w-4 h-4 text-white/30" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required disabled={loading} maxLength={100}
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                placeholder="Enter your Password"
                                                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-amber-400 transition-colors">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}

                                    {/* CONFIRM PASSWORD + REQUIREMENTS - signup only */}
                                    {mode === "signup" && (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                    <Lock className="w-4 h-4 text-white/30" />
                                                </div>
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    required disabled={loading} maxLength={100}
                                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm Password"
                                                    autoComplete="new-password"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-colors text-sm disabled:opacity-50"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                                                    className="absolute inset-y-0 right-4 flex items-center text-white/40 hover:text-amber-400 transition-colors">
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                {[
                                                    { label: "At least 8 characters", ok: password.length >= 8 },
                                                    { label: "Contains a number", ok: /\d/.test(password) },
                                                    { label: "Contains a special character", ok: /[!@#$%^&*(),.?":{}|<>_-]/.test(password) },
                                                ].map(r => (
                                                    <div key={r.label} className="flex items-center gap-2 text-xs">
                                                        {r.ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-500/70" />}
                                                        <span className={r.ok ? "text-emerald-400/90" : "text-white/40"}>{r.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RATE LIMIT LOCKOUT BANNER */}
                                {isLocked && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-red-400 text-xs font-semibold">Account temporarily locked</p>
                                            <p className="text-red-400/80 text-xs mt-0.5">
                                                Try again in{" "}
                                                <span className="font-bold text-red-300">
                                                    {lockMins > 0 ? `${lockMins}m ` : ""}{lockSecs}s
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ATTEMPTS LEFT INDICATOR */}
                                {!isLocked && attemptsLeft < MAX_ATTEMPTS && attemptsLeft > 0 && email && (
                                    <p className="text-xs text-amber-500/80 text-center">
                                        {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before temporary lockout
                                    </p>
                                )}

                                {/* ERROR + SUCCESS MESSAGES */}
                                {error && !isLocked && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                                        {error}
                                    </div>
                                )}
                                {msg && (
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                                        {msg}
                                    </div>
                                )}

                                {mode === "login" && (
                                    <div className="flex justify-end">
                                        <button type="button"
                                            onClick={() => { switchMode("forgot_password"); }}
                                            className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors uppercase tracking-wider font-semibold">
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                <button type="submit" disabled={loading || isLocked}
                                    className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : mode === "signup" ? "Create Rajya"
                                            : mode === "forgot_password" ? "Send Reset Link"
                                                : "Unlock Gates"}
                                </button>
                            </form>

                            {/* GOOGLE OAUTH */}
                            <div className="w-full flex items-center gap-4 my-6">
                                <div className="h-px bg-white/10 flex-1" />
                                <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Or</span>
                                <div className="h-px bg-white/10 flex-1" />
                            </div>

                            <button onClick={handleGoogleLogin} disabled={loading} type="button"
                                className="w-full bg-white/5 border border-white/10 text-white font-medium py-3.5 rounded-xl text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-50 hover:bg-white/10">
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.69 17.57V20.34H19.26C21.35 18.41 22.56 15.58 22.56 12.25Z" fill="#4285F4" />
                                    <path d="M12 23C14.97 23 17.46 22.01 19.26 20.34L15.69 17.57C14.71 18.23 13.46 18.66 12 18.66C9.18 18.66 6.78 16.75 5.91 14.18H2.21V17.05C4.01 20.64 7.72 23 12 23Z" fill="#34A853" />
                                    <path d="M5.91 14.18C5.69 13.51 5.56 12.78 5.56 12C5.56 11.22 5.69 10.49 5.91 9.82V6.95H2.21C1.47 8.43 1.04 10.16 1.04 12C1.04 13.84 1.47 15.57 2.21 17.05L5.91 14.18Z" fill="#FBBC05" />
                                    <path d="M12 5.34C13.62 5.34 15.07 5.9 16.21 6.99L19.34 3.86C17.46 2.1 14.97 1 12 1C7.72 1 4.01 3.36 2.21 6.95L5.91 9.82C6.78 7.25 9.18 5.34 12 5.34Z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>

                            {mode === "forgot_password" ? (
                                <button onClick={() => switchMode("login")}
                                    className="mt-8 text-xs text-amber-400/60 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5">
                                    <ArrowRight className="w-3 h-3 rotate-180" /> Back to Login
                                </button>
                            ) : (
                                <button onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
                                    className="mt-8 text-xs text-amber-400/60 hover:text-amber-400 transition-colors">
                                    {mode === "signup" ? "Already have a Rajya? Login instead" : "Need to establish your Rajya? Sign up"}
                                </button>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Trust strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="relative z-10 w-full space-y-5">
                <div className="flex items-center justify-center gap-5">
                    {TRUST_ICONS.map((t, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                            <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center text-[#f2faf5]/90">
                                {t.icon}
                            </div>
                            <span className="text-[9px] text-[#f2faf5] text-center leading-tight ">{t.label}</span>
                        </div>
                    ))}
                </div>
                <p className="text-center text-[10px] text-[#f2faf5]/70 mt-3">
                    Local-first cryptography • Zero data brokering
                </p>
            </motion.div>
        </div>
    );
}