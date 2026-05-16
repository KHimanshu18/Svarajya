"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountType, BankAccount } from "@/lib/bankStore";
import { checkDuplicateAccounts, fetchBankSummary, saveBankAccount } from "@/lib/bankApi";
import { MicroLearningWrapper } from "@/components/module/MicroLearningWrapper";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AddBankAccount() {
    const router = useRouter();

    // Core details
    const [bankName, setBankName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("savings");
    const [last4, setLast4] = useState("");
    const [nickname, setNickname] = useState("");

    // Balance details
    const [openingBalance, setOpeningBalance] = useState("");
    const [currentBalance, setCurrentBalance] = useState("");
    const [balanceAsOf, setBalanceAsOf] = useState(new Date().toISOString().split("T")[0]);

    const [status, _setStatus] = useState<"active" | "dormant" | "closed">("active");
    const [isPrimary, setIsPrimary] = useState(false);
    const [notes, setNotes] = useState("");

    const [error, setError] = useState("");
    const [duplicateWarning, setDuplicateWarning] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingAccounts, setExistingAccounts] = useState<BankAccount[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBankSummary()
            .then((summary) => setExistingAccounts(summary?.accounts || []))
            .catch(() => undefined);
    }, []);

    const handleCheckPrefix = () => {
        if (!bankName || !last4 || last4.length < 4) return;

        const { exact, possible } = checkDuplicateAccounts(existingAccounts, bankName, accountType, last4, nickname);
        if (exact) {
            setError("An exact duplicate account already exists.");
            setDuplicateWarning(true);
        } else if (possible) {
            setDuplicateWarning(true);
        } else {
            setDuplicateWarning(false);
            setError("");
        }
    };

    const handleSave = async () => {
        if (!bankName) { setError("Bank name is required."); return; }
        if (!accountType) { setError("Account type is required."); return; }
        if (!last4 || last4.length !== 4) { setError("Last 4 digits must be exactly 4 numbers."); return; }
        if (!openingBalance || !currentBalance || !balanceAsOf) { setError("Please fill all balance fields."); return; }

        const openBal = parseFloat(openingBalance.replace(/,/g, ""));
        const currBal = parseFloat(currentBalance.replace(/,/g, ""));

        if (isNaN(openBal) || openBal < 0 || isNaN(currBal) || currBal < 0) {
            setError("Balance must be 0 or more.");
            return;
        }

        const selectedDate = new Date(balanceAsOf);
        const today = new Date();
        if (selectedDate > today) {
            setError("Balance date cannot be in the future.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            await saveBankAccount({
                bankName,
                accountType,
                accountLast4: last4,
                nickname: nickname || undefined,
                openingBalance: openBal,
                currentBalance: currBal,
                latestBalanceAsOf: balanceAsOf,
                status: status.toUpperCase() as "ACTIVE" | "DORMANT" | "CLOSED",
                isPrimary,
                notes: notes || undefined,
            });
        } catch (err: unknown) {
            setSaving(false);
            setError(err instanceof Error ? err.message : "Failed to save account.");
            return;
        }

        setSuccess(true);
        setTimeout(() => {
            router.push("/khate/accounts");
        }, 1500);
    };

    if (success) {
        return (
            <div className="bg-black text-white min-h-screen flex items-center justify-center font-sans animate-fade-in px-6">
                <div className="text-center p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-emerald-100 mb-2">Account added successfully.</h2>
                    <p className="text-sm text-emerald-200/80">Your liquidity has been updated.</p>
                </div>
            </div>
        );
    }

    return (
        <MicroLearningWrapper
            moduleTitle="Treasury Chest Builder"
            contextText="Your wealth is not in one chest — it is scattered across many hidden vaults. Centralize them to see your true liquidity."
            insightText="Silent liquidity sits in forgotten accounts. 15% of wealth is often lost to inactive balances."
            quizQuestion="What percentage of wealth is often lost to inactive balances?"
            quizOptions={[
                { label: "5%", isCorrect: false },
                { label: "15%", isCorrect: true },
                { label: "50%", isCorrect: false }
            ]}
            onDataCaptureUnlock={() => { }}
        >
            <div className="pb-24 font-sans animate-fade-in relative">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Add Bank Account</h1>
                        <p className="text-xs text-white/50 mt-0.5">Enter basic details. You can update balances anytime.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                {duplicateWarning && !error && (
                    <div className="p-4 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 relative">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-amber-100 mb-1">Possible duplicate detected.</p>
                            <p className="text-xs text-amber-200/80 mb-3">Another account with last digits <strong className="text-amber-100">{last4}</strong> already exists.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setDuplicateWarning(false)} className="text-xs font-semibold px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 transition-colors text-amber-300 border border-amber-500/30 rounded-lg">
                                    Continue Anyway
                                </button>
                                <button onClick={() => { setDuplicateWarning(false); setLast4(""); }} className="text-xs font-semibold px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors text-white/60 border border-white/10 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Bank Name */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                            Bank Name
                        </label>
                        <input type="text" value={bankName} onChange={e => { setBankName(e.target.value); handleCheckPrefix(); }} placeholder="e.g., HDFC Bank"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Account Type</label>
                        <div className="flex flex-wrap gap-2">
                            {(["savings", "salary", "current", "joint", "od"] as AccountType[]).map(t => (
                                <button key={t} onClick={() => { setAccountType(t); handleCheckPrefix(); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${accountType === t ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                        }`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Last 4 Digits */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                                Account Last 4 Digits
                            </label>
                            <input type="text" maxLength={4} value={last4} onChange={e => { setLast4(e.target.value.replace(/\D/g, '')); handleCheckPrefix(); }} placeholder="1234"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-center tracking-[0.5em] font-mono text-lg" />
                            <p className="text-[10px] text-white/30 pt-1">We only display the last 4 digits publicly.</p>
                        </div>

                        {/* Nickname */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                                Nickname (Optional)
                            </label>
                            <input type="text" value={nickname} onChange={e => { setNickname(e.target.value); handleCheckPrefix(); }} placeholder="Home Savings"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-6" />

                    {/* Balances */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold flex justify-between">
                                <span>Opening Balance (₹)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                                <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-emerald-400/80 uppercase tracking-widest font-semibold flex justify-between">
                                <span>Current Balance (₹)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400/50">₹</span>
                                <input type="number" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} placeholder="0"
                                    className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl pl-9 pr-4 py-3 text-emerald-100 placeholder-white/30 focus:outline-none focus:border-emerald-500/50 font-semibold text-lg" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Balance As Of</label>
                            <input type="date" value={balanceAsOf} onChange={e => setBalanceAsOf(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="w-5 h-5 accent-blue-500 rounded bg-white/10 border-white/20" />
                            <div>
                                <p className="text-sm font-semibold text-white">Make this my primary account</p>
                                <p className="text-[10px] text-white/50">Used as default for incoming transactions</p>
                            </div>
                        </label>
                        
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any specific purpose or branch details..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none" />
                        </div>
                    </div>
                </div>

                    <div className="pt-8">
                        <button
                            disabled={saving || (duplicateWarning && !error)}
                            onClick={() => {
                                if (saving || (duplicateWarning && !error)) return;
                                void handleSave();
                            }}
                            className={`w-full py-4 rounded-xl font-bold shadow-xl transition-all ${duplicateWarning && !error ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
                                }`}
                        >
                            {duplicateWarning && !error ? "Resolve Warning Above" : saving ? "Saving..." : "Save Account"}
                        </button>
                    </div>
                </div>
        </MicroLearningWrapper>
    );
}
