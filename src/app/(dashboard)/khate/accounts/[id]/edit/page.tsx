"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { AccountType } from "@/lib/bankStore";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export default function EditBankAccount({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    // Core details
    const [bankName, setBankName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("savings");
    const [last4, setLast4] = useState("");
    const [nickname, setNickname] = useState("");

    // Balance details
    const [currentBalance, setCurrentBalance] = useState("");
    const [balanceAsOf, setBalanceAsOf] = useState("");

    const [status, setStatus] = useState<"active" | "dormant" | "closed">("active");
    const [isPrimary, setIsPrimary] = useState(false);
    const [notes, setNotes] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const res = await fetch(`/api/bank/${id}`);
                const data = await res.json();
                
                if (data.success && data.data) {
                    const acc = data.data;
                    setBankName(acc.bankName || "");
                    setAccountType((acc.accountType?.toLowerCase() as AccountType) || "savings");
                    setLast4(acc.accountLast4 || "");
                    setNickname(acc.nickname || "");
                    setCurrentBalance(String(acc.latestBalance || "0"));
                    setBalanceAsOf(acc.latestBalanceAsOf ? acc.latestBalanceAsOf.split("T")[0] : "");
                    setStatus((acc.status?.toLowerCase() as any) || "active");
                    setIsPrimary(acc.isPrimary || false);
                    setNotes(acc.notes || "");
                } else {
                    setError("Failed to load account details.");
                }
            } catch (err) {
                setError("Error fetching account data.");
            } finally {
                setLoading(false);
            }
        };

        void fetchAccount();
    }, [id]);

    const handleSave = async () => {
        if (!bankName) { setError("Bank name is required."); return; }
        if (!last4 || last4.length !== 4) { setError("Last 4 digits must be exactly 4 numbers."); return; }
        if (!currentBalance || !balanceAsOf) { setError("Please fill all balance fields."); return; }

        const currBal = parseFloat(currentBalance.replace(/,/g, ""));
        if (isNaN(currBal) || currBal < 0) {
            setError("Balance must be 0 or more.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await fetch(`/api/bank/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bankName,
                    accountType: accountType.toUpperCase(),
                    accountLast4: last4,
                    nickname: nickname || undefined,
                    currentBalance: currBal,
                    latestBalanceAsOf: balanceAsOf,
                    status: status.toUpperCase(),
                    isPrimary,
                    notes: notes || undefined,
                }),
            });

            if (!res.ok) throw new Error("Failed to update account.");
            
            setSuccess(true);
            setTimeout(() => {
                router.push("/khate/accounts");
            }, 1500);
        } catch (err: unknown) {
            setSaving(false);
            setError(err instanceof Error ? err.message : "Failed to update account.");
        }
    };

    if (loading) {
        return (
            <div className="text-white min-h-screen flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-white/50 text-sm">Loading Treasury Vault...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="text-white min-h-screen flex items-center justify-center font-sans animate-fade-in px-6">
                <div className="text-center p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-emerald-100 mb-2">Vault updated successfully.</h2>
                    <p className="text-sm text-emerald-200/80">Returning to Treasury dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white p-6 font-sans">
            <div className="max-w-xl mx-auto pb-24">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Edit Bank Account</h1>
                        <p className="text-xs text-white/50 mt-0.5">Update vault details or change status.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Bank Name */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1">
                            Bank Name
                        </label>
                        <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g., HDFC Bank"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Account Type</label>
                        <div className="flex flex-wrap gap-2">
                            {(["savings", "salary", "current", "joint", "od"] as AccountType[]).map(t => (
                                <button key={t} onClick={() => setAccountType(t)}
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
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Account Last 4 Digits</label>
                            <input type="text" maxLength={4} value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} placeholder="1234"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-center tracking-[0.5em] font-mono text-lg" />
                        </div>

                        {/* Nickname */}
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Nickname</label>
                            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Home Savings"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-6" />

                    {/* Balances */}
                    <div className="space-y-4">
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

                    {/* Account Status */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Account Status</label>
                        <div className="flex gap-2">
                            {(["active", "dormant", "closed"] as const).map(s => (
                                <button key={s} onClick={() => setStatus(s)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${status === s ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        }`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="w-5 h-5 accent-blue-500 rounded bg-white/10 border-white/20" />
                            <div>
                                <p className="text-sm font-semibold text-white">Make this my primary account</p>
                                <p className="text-[10px] text-white/50">Used as default for incoming transactions</p>
                            </div>
                        </label>
                        
                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any specific purpose..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none" />
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <button
                        disabled={saving}
                        onClick={() => { void handleSave(); }}
                        className="w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-all disabled:opacity-50"
                    >
                        {saving ? "Updating Vault..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
