"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankAccount, LiquiditySettings } from "@/lib/stores/bankStore";
import { fetchBankSummary, maskAccountNumber, saveLiquiditySettings } from "@/lib/bankApi";
import { ArrowLeft, Scale, ArrowRight, CheckCircle2, SlidersHorizontal, ShieldAlert } from "lucide-react";

export default function IdleMoneyEngine() {
    const router = useRouter();

    const [threshold, setThreshold] = useState<number>(0);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [outflow, setOutflow] = useState<number>(0);
    const [settings, setSettings] = useState<LiquiditySettings | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;

        fetchBankSummary()
            .then((summary) => {
                if (!active) return;
                setAccounts(summary?.accounts?.filter((account) => account.status === "active" || account.status === "ACTIVE") || []);
                setSettings(summary?.settings || null);
                setThreshold(summary?.settings?.idleThresholdAmount || 0);
                setOutflow(summary?.metrics?.flow?.outflow || 0);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : "Failed to load idle-money data.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const targetMonths = settings?.emergencyFundTargetMonths || 6;

    const handleSave = async () => {
        if (threshold < 0 || isNaN(threshold)) {
            setError("Threshold must be 0 or greater.");
            return;
        }
        if (!settings) return;

        setSaving(true);
        try {
            await saveLiquiditySettings({
                ...settings,
                idleThresholdAmount: threshold,
            });
        } catch (err: unknown) {
            setSaving(false);
            setError(err instanceof Error ? err.message : "Failed to save settings.");
            return;
        }

        router.push("/khate/accounts");
    };

    if (loading) {
        return <div className="bg-black text-white/50 min-h-screen flex items-center justify-center">Loading idle-money data...</div>;
    }

    // Analyze accounts based on the dynamic preview threshold
    const analyzedAccounts = accounts.map(a => {
        const excessIdle = Math.max(0, a.latestBalance - (outflow * targetMonths));
        const isFlagged = excessIdle > threshold;
        return { ...a, excessIdle, isFlagged };
    }).sort((a, b) => {
        if (a.isFlagged && !b.isFlagged) return -1;
        if (!a.isFlagged && b.isFlagged) return 1;
        return b.excessIdle - a.excessIdle;
    });

    const flaggedCount = analyzedAccounts.filter(a => a.isFlagged).length;

    return (
        <div className="bg-black text-white min-h-screen px-6 py-6 pb-24 font-sans animate-fade-in relative">
            <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-6 hover:bg-white/10 transition-colors relative z-10">
                <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Scale className="w-6 h-6 text-purple-400" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-indigo-400 bg-clip-text text-transparent">Idle Money Detection</h1>
                </div>
                <p className="text-sm text-white/60 mb-8">
                    Identify funds sitting beyond your comfort threshold.
                </p>
            </div>

            {error && (
                <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 animate-shake relative z-10">
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
                        <input type="number" value={threshold || ""} onChange={e => { setThreshold(Number(e.target.value)); setError(""); }} placeholder="0"
                            className="w-full bg-white/5 border border-purple-500/30 rounded-xl pl-10 pr-4 py-4 text-purple-100 placeholder-white/20 focus:outline-none focus:border-purple-400/60 font-bold text-2xl tracking-tight transition-colors" />
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
                            {analyzedAccounts.map(acc => {
                                return (
                                    <div key={acc.id} className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${acc.isFlagged
                                            ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                            : "bg-white/5 border-white/10 opacity-70"
                                        }`}>
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div>
                                                <p className="font-medium text-white">{acc.nickname || acc.bankName}</p>
                                                <p className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wider">
                                                    {maskAccountNumber(acc.accountLast4)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-white tracking-tight">₹{acc.latestBalance.toLocaleString("en-IN")}</p>
                                            </div>
                                        </div>

                                        {acc.isFlagged ? (
                                            <div className="mt-3 pt-3 border-t border-purple-500/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs text-purple-300 font-medium">Exceeds idle threshold of ₹ {threshold.toLocaleString("en-IN")}.</p>
                                                </div>
                                                <button className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-xs font-semibold text-purple-300 transition-colors flex items-center justify-center gap-1.5 mt-2">
                                                    Review Allocation <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-3 pt-2 text-[10px] text-white/40 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400/50" /> Good job. No accounts exceed your idle threshold.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                <button onClick={() => { void handleSave(); }} disabled={saving}
                    className="w-full py-4 rounded-xl font-bold tracking-wide shadow-xl transition-all bg-purple-600 hover:bg-purple-500 text-white">
                    {saving ? "Saving..." : "Save Threshold"}
                </button>
            </div>
        </div>
    );
}
