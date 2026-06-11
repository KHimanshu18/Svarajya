"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, RefreshCw, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [isExpiredLink, setIsExpiredLink] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const emailParam = searchParams.get("email") || "";
        setEmail(emailParam);

        const errorParam = searchParams.get("error");
        if (errorParam === "link_expired") {
            setIsExpiredLink(true);
        }
    }, [searchParams]);

    const handleResend = async () => {
        if (!email.trim()) {
            setError("Email address is missing. Please go back to registration.");
            return;
        }

        setResendLoading(true);
        setError("");
        setResendSuccess(false);

        try {
            const { error: resendError } = await supabase.auth.resend({
                type: "signup",
                email: email.trim(),
            });

            if (resendError) throw resendError;

            setResendSuccess(true);
            setIsExpiredLink(false);
        } catch (err: any) {
            setError(err?.message || "Failed to resend email.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-6">

                <div className={`w-16 h-16 rounded-full flex items-center justify-center
                    ${isExpiredLink
                        ? "bg-red-500/10 border border-red-500/25"
                        : "bg-amber-400/10 border border-amber-400/25"
                    }`}>
                    {isExpiredLink
                        ? <Clock className="w-8 h-8 text-red-400" />
                        : <Mail className="w-8 h-8 text-amber-400" />
                    }
                </div>

                <h1 className="text-2xl font-semibold text-white">
                    {isExpiredLink ? "Link Expired" : "Check Your Email"}
                </h1>

                <p className="text-sm text-white/50">
                    {email || "your email"}
                </p>

                {error && (
                    <div className="text-red-400 text-xs">{error}</div>
                )}

                {resendSuccess && (
                    <div className="text-green-400 text-xs">
                        Email sent successfully!
                    </div>
                )}

                <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="bg-amber-400 px-4 py-2 rounded"
                >
                    {resendLoading ? "Sending..." : "Resend Email"}
                </button>

                <button onClick={() => router.push("/start")}>
                    Back
                </button>
            </div>
        </div>
    );
}