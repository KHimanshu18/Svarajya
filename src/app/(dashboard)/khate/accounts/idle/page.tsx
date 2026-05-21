"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankAccount, LiquiditySettings } from "@/lib/bankStore";
import { fetchBankSummary, maskAccountNumber, saveLiquiditySettings } from "@/lib/bankApi";
import { ArrowLeft, Scale, ArrowRight, CheckCircle2, SlidersHorizontal, ShieldAlert, X, TrendingUp, Target, Shield, CreditCard } from "lucide-react";

// ——— Types ———
type AnalyzedAccount = BankAccount & { excessIdle: number; isFlagged: boolean };

type AllocationRec = {
    icon: string;
    label: string;
    amount: number;
    pct: number;
    color: string;
    action: string;
    detail: string;
};

function buildRecommendations(excess: number, outflow: number, targetMonths: number, currentEfBalance: number): AllocationRec[] {
    const recs: AllocationRec[] = [];
    const efTarget = outflow * targetMonths;
    const efGap = Math.max(0, efTarget - currentEfBalance);

    let remaining = excess;

    // 1. Emergency Fund top-up
    const efAlloc = Math.min(efGap, Math.round(excess * 0.4));
    if (efAlloc > 0) {
        recs.push({
            icon: "🛡️",
            label: "Emergency Fund Top-up",
            amount: efAlloc,
            pct: Math.round((efAlloc / excess) * 100),
            color: "emerald",
            action: "Add to Emergency Fund",
            detail: `Boosts safety net towards ${targetMonths}-month goal`,
        });
        remaining -= efAlloc;
    }

    // 2. FD Investment
    const fdAlloc = Math.round(remaining * 0.5);
    if (fdAlloc > 0) {
        recs.push({
            icon: "📈",
            label: "Fixed Deposit (3-6 months)",
            amount: fdAlloc,
            pct: Math.round((fdAlloc / excess) * 100),
            color: "blue",
            action: "Invest in FD",
            detail: "Earns 6-7% p.a. with guaranteed returns",
        });
        remaining -= fdAlloc;
    }

    // 3. Goal / Debt
    if (remaining > 0) {
        recs.push({
            icon: "🎯",
            label: "Goal or Debt Prepayment",
            amount: remaining,
            pct: Math.round((remaining / excess) * 100),
            color: "purple",
            action: "Create a Goal",
            detail: "Allocate to a savings goal or prepay high-interest debt",
        });
    }

    return recs;
}

// ——— Modal ———
function AllocationModal({
    account,
    outflow,
    targetMonths,
    threshold,
    totalBalance,
    onClose,
}: {
    account: AnalyzedAccount;
    outflow: number;
    targetMonths: number;
    threshold: number;
    totalBalance: number;
    onClose: () => void;
}) {
    const excess = account.excessIdle;
    const recs = buildRecommendations(excess, outflow, targetMonths, totalBalance);
    const [saved, setSaved] = useState<string | null>(null);

    const handleAction = (label: string) => {
        // Store in localStorage as pending action (Goals module integration point)
        const pending = JSON.parse(localStorage.getItem("svarajya_pending_allocations") || "[]");
        pending.push({
            id: Date.now(),
            accountId: account.id,
            accountName: account.nickname || account.bankName,
            excessAmount: excess,
            label,
            createdAt: new Date().toISOString(),
        });
        localStorage.setItem("svarajya_pending_allocations", JSON.stringify(pending));
        setSaved(label);
    };

    const colorMap: Record<string, { bg: string; border: string; text: string; btn: string }> = {
        emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-500" },
        blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", btn: "bg-blue-600 hover:bg-blue-500" },
        purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300", btn: "bg-purple-600 hover:bg-purple-500" },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-[#0d0d1a] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5 animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Allocation Recommendations</h2>
                        <p className="text-xs text-white/50 mt-0.5">{account.nickname || account.bankName} · {maskAccountNumber(account.accountLast4)}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors">
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* Excess Summary */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-purple-300/70 uppercase tracking-wider">Excess Idle Amount</p>
                        <p className="text-2xl font-bold text-purple-100 mt-0.5">
                            ₹{excess.toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/40">Balance</p>
                        <p className="text-sm font-semibold text-white">₹{(account.latestBalance ?? 0).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-white/40 mt-0.5">Threshold ₹{threshold.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Suggested Allocation</p>
                    {recs.map((rec) => {
                        const c = colorMap[rec.color] || colorMap.purple;
                        const isSaved = saved === rec.action;
                        return (
                            <div key={rec.label} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{rec.icon}</span>
                                        <div>
                                            <p className={`text-sm font-semibold ${c.text}`}>{rec.label}</p>
                                            <p className="text-[11px] text-white/40 mt-0.5">{rec.detail}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-base font-bold text-white">₹{rec.amount.toLocaleString("en-IN")}</p>
                                        <p className="text-[10px] text-white/40">{rec.pct}%</p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
                                    <div className={`h-full ${c.btn.split(" ")[0]} rounded-full transition-all`} style={{ width: `${rec.pct}%` }} />
                                </div>

                                {isSaved ? (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Saved to pending actions
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleAction(rec.action)}
                                        className={`w-full py-2 rounded-xl text-xs font-semibold text-white transition-all ${c.btn}`}
                                    >
                                        {rec.action}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer note */}
                <p className="text-[10px] text-white/30 text-center leading-relaxed">
                    These are suggestions based on your current outflow of ₹{outflow.toLocaleString("en-IN")}/mo.
                    Actions are saved locally until the Goals module is ready.
                </p>
            </div>
        </div>
    );
}

// ——— Main Page ———
export default function IdleMoneyEngine() {
    const router = useRouter();

    const [threshold, setThreshold] = useState("");
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [outflow, setOutflow] = useState(0);
    const [totalBalance, setTotalBalance] = useState(0);
    const [settings, setSettings] = useState<LiquiditySettings | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<AnalyzedAccount | null>(null);

    useEffect(() => {
        let active = true;

        fetchBankSummary()
            .then((summary) => {
                if (!active) return;
                setAccounts(summary?.accounts?.filter((a) => a.status === "active" || a.status === "ACTIVE") || []);
                setSettings(summary?.settings || null);
                setThreshold(summary?.settings?.idleThresholdAmount?.toString() || "0");
                setOutflow(summary?.metrics?.flow?.outflow || 0);
                setTotalBalance(summary?.metrics?.totalLiquid || 0);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : "Failed to load idle-money data.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    const activeThreshold = parseInt(threshold || "0", 10);
    const targetMonths = settings?.emergencyFundTargetMonths || 6;

    const handleSave = async () => {
        if (activeThreshold < 0 || isNaN(activeThreshold)) {
            setError("Threshold must be 0 or greater.");
            return;
        }
        if (!settings) return;

        setSaving(true);
        try {
            await saveLiquiditySettings({ ...settings, idleThresholdAmount: activeThreshold });
        } catch (err: unknown) {
            setSaving(false);
            setError(err instanceof Error ? err.message : "Failed to save settings.");
            return;
        }
        router.push("/khate/accounts");
    };

    if (loading) {
        return <div className="text-white/50 min-h-screen flex items-center justify-center">Loading idle-money data...</div>;
    }

    const analyzedAccounts: AnalyzedAccount[] = accounts.map(a => {
        const excessIdle = Math.max(0, (a.latestBalance ?? 0) - (outflow * targetMonths));
        const isFlagged = excessIdle > activeThreshold;
        return { ...a, excessIdle, isFlagged };
    }).sort((a, b) => {
        if (a.isFlagged && !b.isFlagged) return -1;
        if (!a.isFlagged && b.isFlagged) return 1;
        return b.excessIdle - a.excessIdle;
    });

    const flaggedCount = analyzedAccounts.filter(a => a.isFlagged).length;

    return (
        <div className="text-white min-h-screen px-6 py-6 pb-32 font-sans animate-fade-in relative">

            {/* Allocation Modal */}
            {selectedAccount && (
                <AllocationModal
                    account={selectedAccount}
                    outflow={outflow}
                    targetMonths={targetMonths}
                    threshold={activeThreshold}
                    totalBalance={totalBalance}
                    onClose={() => setSelectedAccount(null)}
                />
            )}

            <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-6 hover:bg-white/10 transition-colors relative z-10">
                <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Scale className="w-6 h-6 text-purple-400" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-indigo-400 bg-clip-text text-transparent">Idle Money Detection</h1>
                </div>
                <p className="text-sm text-white/60 mb-8">Identify funds sitting beyond your comfort threshold.</p>
            </div>

            {error && (
                <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 relative z-10">
                    <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <div className="space-y-6 relative z-10">
                {/* Threshold Setter */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
                    <div className="flex items-center gap-2 mb-4">
                        <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                        <h3 className="font-semibold text-purple-200">Set Idle Threshold</h3>
                    </div>
                    <div className="relative mb-3">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/50 text-xl font-medium">₹</span>
                        <input
                            type="number"
                            value={threshold}
                            onChange={e => { setThreshold(e.target.value); setError(""); }}
                            placeholder="0"
                            className="w-full bg-white/5 border border-purple-500/30 rounded-xl pl-10 pr-4 py-4 text-purple-100 placeholder-white/20 focus:outline-none focus:border-purple-400/60 font-bold text-2xl tracking-tight transition-colors"
                        />
                    </div>
                    <p className="text-[10px] text-purple-200/60 leading-relaxed">
                        Accounts exceeding this amount (after your {targetMonths}-month emergency buffer) will be flagged.
                    </p>
                </div>

                {/* Accounts Analysis List */}
                <div>
                    <h3 className="font-semibold text-white/90 mb-4 flex justify-between items-center">
                        Active Accounts Analysis
                        <span className="text-xs px-2 py-1 bg-white/10 rounded-full font-medium text-white/70">
                            {flaggedCount} Flagged
                        </span>
                    </h3>

                    {accounts.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                            <p className="text-sm text-white/40">No active bank accounts found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {analyzedAccounts.map(acc => (
                                <div
                                    key={acc.id}
                                    className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${acc.isFlagged
                                        ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                        : "bg-white/5 border-white/10 opacity-70"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div>
                                            <p className="font-medium text-white">{acc.nickname || acc.bankName}</p>
                                            <p className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wider">
                                                {maskAccountNumber(acc.accountLast4)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-white tracking-tight">₹{(acc.latestBalance ?? 0).toLocaleString("en-IN")}</p>
                                            {acc.isFlagged && (
                                                <p className="text-[10px] text-purple-400 mt-0.5">
                                                    +₹{acc.excessIdle.toLocaleString("en-IN")} excess
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {acc.isFlagged ? (
                                        <div className="mt-3 pt-3 border-t border-purple-500/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs text-purple-300 font-medium">
                                                    Exceeds idle threshold of ₹{activeThreshold.toLocaleString("en-IN")}.
                                                </p>
                                            </div>
                                            {/* Allocation bar preview */}
                                            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden mb-3">
                                                <div className="bg-emerald-500/70 rounded-full" style={{ width: "40%" }} />
                                                <div className="bg-blue-500/70 rounded-full" style={{ width: "30%" }} />
                                                <div className="bg-purple-500/70 rounded-full" style={{ width: "30%" }} />
                                            </div>
                                            <div className="flex gap-3 text-[10px] text-white/40 mb-2">
                                                <span>🛡️ 40% Emergency</span>
                                                <span>📈 30% FD</span>
                                                <span>🎯 30% Goal</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedAccount(acc)}
                                                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                Review Allocation <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-3 pt-2 text-[10px] text-white/40 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400/50" /> Within healthy range.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="pt-8">
                    <button
                        onClick={() => { void handleSave(); }}
                        disabled={saving}
                        className="w-full py-4 rounded-xl font-bold tracking-wide shadow-xl transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Threshold"}
                    </button>
                </div>
            </div>
        </div>
    );
}
