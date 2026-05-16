"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchBankSummary, maskAccountNumber, type BankSummary } from "@/lib/bankApi";
import { BankAccount } from "@/lib/bankStore";
import { ArrowLeft, Droplets, Plus, Landmark, AlertTriangle, Wallet, History, ArrowUpRight, ArrowDownRight, Scale, Info, ShieldAlert, X, CheckCircle2, TrendingUp, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

const PAGE_LOAD_NOW = Date.now();

export default function BankHub() {
    const router = useRouter();
    const [summary, setSummary] = useState<BankSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const now = PAGE_LOAD_NOW;

    // Modal state
    const [updateBalanceAcc, setUpdateBalanceAcc] = useState<BankAccount | null>(null);
    const [timelineAcc, setTimelineAcc] = useState<BankAccount | null>(null);
    const [newBalance, setNewBalance] = useState("");
    const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split("T")[0]);
    const [balanceNote, setBalanceNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [history, setHistory] = useState<{ id: string; balance: number; recordedAt: string; note?: string | null }[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [deleteAcc, setDeleteAcc] = useState<BankAccount | null>(null);
    const [deleting, setDeleting] = useState(false);

    const refresh = useCallback(() => {
        fetchBankSummary().then(setSummary).catch(() => null);
    }, []);

    useEffect(() => {
        let active = true;
        fetchBankSummary()
            .then((data) => { if (!active) return; setSummary(data); })
            .catch((err: unknown) => { if (!active) return; setError(err instanceof Error ? err.message : "Failed to load bank data."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const handleUpdateBalance = async () => {
        if (!updateBalanceAcc || !newBalance || isNaN(Number(newBalance))) return;

        const amount = Number(newBalance);
        if (amount > 10000000 && !confirm("The balance exceeds ₹1 crore. Is this correct?")) {
            return;
        }

        setSaving(true);
        try {
            await fetch(`/api/bank/${updateBalanceAcc.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentBalance: amount,
                    latestBalanceAsOf: balanceDate,
                    note: balanceNote || undefined,
                }),
            });
            setSaveSuccess(true);
            refresh();
            setTimeout(() => { setSaveSuccess(false); setUpdateBalanceAcc(null); setNewBalance(""); setBalanceNote(""); }, 1500);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const openTimeline = async (acc: BankAccount) => {
        setTimelineAcc(acc);
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/bank/${acc.id}`);
            const json = await res.json();
            const rawHistory = json?.data?.history || json?.history || [];

            // Sort by date descending (newest first)
            const sortedHistory = [...rawHistory].sort((a, b) =>
                new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
            );

            setHistory(sortedHistory);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteAcc) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/bank/${deleteAcc.id}`, { method: "DELETE" });
            if (res.ok) {
                setDeleteAcc(null);
                refresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    const accounts = summary?.accounts || [];
    const metrics = summary?.metrics?.health;
    const totalLiquid = summary?.metrics?.totalLiquid ?? 0;
    const flow = summary?.metrics?.flow ?? { inflow: 0, outflow: 0, surplus: 0 };
    const efStatus = metrics?.efStatus ?? "unknown";
    const emergencyFundMonths = metrics?.emergencyFundMonths ?? 0;
    const idleAccounts = metrics?.idleAccounts ?? [];

    // Urgent Alerts Logic
    const alerts: { id: string, text: string, type: "critical" | "warning", link: string }[] = [];
    if (metrics) {
        if (efStatus === "critical") {
            alerts.push({ id: "ef", text: "Emergency fund below 1 month.", type: "critical", link: "/khate/accounts/flow" });
        } else if (efStatus === "low") {
            alerts.push({ id: "ef", text: "Emergency fund below 3 months.", type: "warning", link: "/khate/accounts/flow" });
        }

        const dormantUpdates = accounts.filter(a => new Date(a.latestBalanceAsOf) < new Date(now - 60 * 86400000));
        if (dormantUpdates.length > 0) {
            alerts.push({ id: "dormant", text: `${dormantUpdates.length} account(s) not updated in 60 days.`, type: "warning", link: "/khate/accounts" });
        }

        if (idleAccounts.length > 0) {
            alerts.push({ id: "idle", text: `${idleAccounts.length} account(s) exceed idle threshold.`, type: "warning", link: "/khate/accounts/idle" });
        }
    }

    // Helper for Recency text
    const getRecency = (dateStr: string) => {
        const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
        if (days < 30) return { text: `Updated ${days === 0 ? "today" : `${days}d ago`}`, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
        if (days <= 60) return { text: `Updated ${days}d ago`, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
        return { text: `Updated ${days}d ago`, color: "text-red-400 bg-red-500/10 border-red-500/20" };
    };

    if (loading) {
        return <main className="min-h-screen flex items-center justify-center text-sm text-white/50">Loading bank data...</main>;
    }

    if (error) {
        return <main className="min-h-screen flex items-center justify-center text-sm text-red-300">{error}</main>;
    }

    return (
        <main className="min-h-screen pb-32 font-sans selection:bg-blue-500/30">

            {/* ——— Update Balance Modal ——— */}
            {updateBalanceAcc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setUpdateBalanceAcc(null)}>
                    <div className="relative w-full max-w-md bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white">Update Balance</h2>
                                <p className="text-xs text-white/50 mt-0.5">{updateBalanceAcc.nickname || updateBalanceAcc.bankName} · {maskAccountNumber(updateBalanceAcc.accountLast4)}</p>
                            </div>
                            <button onClick={() => setUpdateBalanceAcc(null)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors">
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">New Current Balance (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                                    <input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 text-lg font-semibold" />
                                </div>
                                {Number(newBalance) > 10000000 && (
                                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
                                        <AlertTriangle className="w-3 h-3" /> Note: This balance exceeds ₹1 crore.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Balance As Of</label>
                                <input type="date" value={balanceDate} onChange={e => setBalanceDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/50 uppercase tracking-widest font-semibold">Note (optional)</label>
                                <input type="text" value={balanceNote} onChange={e => setBalanceNote(e.target.value)} placeholder="e.g. Monthly update"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
                            </div>
                        </div>

                        {saveSuccess ? (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold justify-center py-3">
                                <CheckCircle2 className="w-5 h-5" /> Balance updated!
                            </div>
                        ) : (
                            <button onClick={() => { void handleUpdateBalance(); }} disabled={saving || !newBalance}
                                className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-40">
                                {saving ? "Saving..." : "Save Balance"}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ——— Timeline Modal ——— */}
            {timelineAcc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setTimelineAcc(null)}>
                    <div className="relative w-full max-w-md bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 max-h-[80vh] flex flex-col space-y-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white">Balance Timeline</h2>
                                <p className="text-xs text-white/50 mt-0.5">{timelineAcc.nickname || timelineAcc.bankName} · {maskAccountNumber(timelineAcc.accountLast4)}</p>
                            </div>
                            <button onClick={() => setTimelineAcc(null)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors">
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {historyLoading ? (
                                <p className="text-sm text-white/40 text-center py-8">Loading history...</p>
                            ) : history.length === 0 ? (
                                <div className="text-center py-10">
                                    <TrendingUp className="w-10 h-10 text-white/20 mx-auto mb-3" />
                                    <p className="text-sm text-white/40">No balance history yet.</p>
                                    <p className="text-xs text-white/30 mt-1">Update the balance to start tracking.</p>
                                </div>
                            ) : (
                                history.map((h, i) => {
                                    const currentBalance = h.balance;
                                    const previousBalance = history[i + 1]?.balance;
                                    const delta = previousBalance !== undefined ? previousBalance - currentBalance : null;
                                    return (
                                        <div key={h.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                            <div>
                                                <p className="text-xs text-white/40">{new Date(h.recordedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                                {h.note && <p className="text-[10px] text-white/30 mt-0.5">{h.note}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">₹{h.balance.toLocaleString("en-IN")}</p>
                                                {delta !== null && (
                                                    <p className={`text-[10px] font-medium ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                        {delta >= 0 ? "+" : ""}₹{delta.toLocaleString("en-IN")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ——— Delete Confirmation Modal ——— */}
            {deleteAcc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteAcc(null)}>
                    <div className="relative w-full max-w-sm bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Delete Account?</h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Are you sure you want to delete <span className="text-white font-medium">{deleteAcc.nickname || deleteAcc.bankName}</span>? This action cannot be undone and will remove all history.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setDeleteAcc(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white/70 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => { void handleDelete(); }} disabled={deleting} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50">
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <header className="px-6 pt-12 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <Droplets className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                            Kosh & Pravah
                        </h1>
                        <p className="text-sm text-[var(--color-rajya-muted)]">Your liquid strength. Your financial breathing space.</p>
                    </div>
                </div>
            </header>

            <div className="px-6 space-y-6">
                {/* Top Summary Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
                    {/* Decorative background elements */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="flex items-center gap-1.5 mb-2 group relative">
                            <p className="text-sm text-white/60 font-medium uppercase tracking-wider">Total Liquid Assets</p>
                            <Info className="w-3.5 h-3.5 text-white/40 cursor-help" />
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center border border-white/10">
                                This includes all active bank balances and cash you&apos;ve entered.
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl text-white/50">₹</span>
                            <h2 className="text-4xl font-bold text-white tracking-tight">
                                {totalLiquid.toLocaleString("en-IN")}
                            </h2>
                        </div>

                        {/* Health Badges */}
                        <div className="flex flex-col items-center mt-5">
                            {metrics ? (
                                metrics.outflowIsZero ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-xs text-white/50">Add expenses in Vyaya to calculate emergency readiness.</p>
                                        <Link href="/vyaya" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors">
                                            Go to Vyaya
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="group relative">
                                        <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 border
                                                ${efStatus === "strong" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                                                efStatus === "ok" ? "bg-blue-500/20 border-blue-500/30 text-blue-300" :
                                                    efStatus === "low" ? "bg-amber-500/20 border-amber-500/30 text-amber-300" :
                                                        "bg-red-500/20 border-red-500/30 text-red-300"}`}>
                                            <Scale className="w-4 h-4" />
                                            {emergencyFundMonths.toFixed(1)} Months Covered
                                        </div>
                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center border border-white/10 z-20">
                                            Emergency Fund = Liquid Assets ÷ Monthly Expenses (from Vyaya).
                                            <br /><br />
                                            {efStatus === "critical" ? "Critical: Less than 1 month." :
                                                efStatus === "low" ? "Low: Below recommended safety buffer." :
                                                    efStatus === "ok" ? "Stable: 3-6 months covered." :
                                                        "Strong: More than 6 months covered."}
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="text-center text-sm text-white/50 px-4">
                                    Liquidity health metrics are unavailable right now. Add or refresh your account data to see readiness and emergency fund estimates.
                                </div>
                            )}
                        </div>

                        {/* Mini Cashflow Row */}
                        <div className="w-full mt-6 p-4 rounded-2xl bg-black/20 border border-white/5">
                            <p className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-3">Monthly Flow Snapshot</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <p className="text-[10px] text-emerald-400/80 uppercase mb-1 flex justify-center items-center gap-1">
                                        <ArrowDownRight className="w-3 h-3" /> Inflow
                                    </p>
                                    <p className="text-sm font-semibold text-white">₹ {(flow.inflow / 1000).toFixed(1)}k</p>
                                </div>
                                <div className="text-center border-l border-r border-white/10 px-2">
                                    <p className="text-[10px] text-red-400/80 uppercase mb-1 flex justify-center items-center gap-1">
                                        <ArrowUpRight className="w-3 h-3" /> Outflow
                                    </p>
                                    <p className="text-sm font-semibold text-white">₹ {(flow.outflow / 1000).toFixed(1)}k</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-blue-400/80 uppercase mb-1">Surplus</p>
                                    <p className="text-sm font-semibold text-white">₹ {(flow.surplus / 1000).toFixed(1)}k</p>
                                </div>
                            </div>
                            {flow.surplus < 0 && (
                                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400 bg-red-500/10 py-1.5 rounded text-center">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    ⚠ You are spending more than your monthly inflow.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Alerts Section (Conditional) */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-2xl flex items-center justify-between border ${alert.type === "critical" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className={`w-5 h-5 ${alert.type === "critical" ? "text-red-400" : "text-amber-400"}`} />
                                    <p className={`text-sm font-medium ${alert.type === "critical" ? "text-red-200" : "text-amber-200"}`}>{alert.text}</p>
                                </div>
                                <Link href={alert.link} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${alert.type === "critical" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                                    Review Now
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* Navigation Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/khate/accounts/add" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <Plus className="w-6 h-6 text-emerald-400" />
                        <span className="text-sm font-medium text-white/80">Add Bank Account</span>
                    </Link>
                    <Link href="/khate/accounts/cash" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <Wallet className="w-6 h-6 text-amber-400" />
                        <span className="text-sm font-medium text-white/80">Cash Wallet</span>
                    </Link>
                    <Link href="/khate/accounts/flow" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <History className="w-6 h-6 text-blue-400" />
                        <span className="text-sm font-medium text-white/80">Cash Flow Engine</span>
                    </Link>
                    <Link href="/khate/accounts/idle" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <Scale className="w-6 h-6 text-purple-400" />
                        <span className="text-sm font-medium text-white/80">Idle Money</span>
                    </Link>
                </div>

                {/* Top Accounts List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white/90">Bank Accounts</h3>
                    </div>

                    {accounts.length === 0 ? (
                        <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                            <Landmark className="w-10 h-10 text-white/20 mx-auto mb-3" />
                            <h3 className="font-semibold text-white/90 mb-1">You haven&apos;t added any bank accounts yet.</h3>
                            <p className="text-sm text-white/50 mb-6">Add your first account to see your true liquidity position.</p>
                            <Link href="/khate/accounts/add" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors">
                                <Plus className="w-4 h-4" /> Add Your First Account
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accounts.map(acc => {
                                const recency = getRecency(acc.latestBalanceAsOf);
                                return (
                                    <div key={acc.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner">
                                                    <Landmark className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white leading-tight">
                                                        {acc.nickname || acc.bankName}
                                                    </p>
                                                    <p className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wider flex items-center gap-2">
                                                        {acc.accountType} • {maskAccountNumber(acc.accountLast4)}
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold ${acc.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : acc.status === "dormant" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/10 text-white/40 border-white/20"}`}>
                                                            {acc.status}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1.5">
                                                    <span className={`px-1.5 py-0.5 border rounded ${recency.color}`}>
                                                        {recency.text}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-white/50">As of {new Date(acc.latestBalanceAsOf).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-white tracking-tight">
                                                    <span className="text-white/40 font-normal mr-1">₹</span>
                                                    {acc.latestBalance.toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => { setUpdateBalanceAcc(acc); setNewBalance(String(acc.latestBalance ?? "")); setBalanceDate(new Date().toISOString().split("T")[0]); setBalanceNote(""); }}
                                                className="flex-1 min-w-[120px] py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white/80 transition-colors">
                                                Update Balance
                                            </button>
                                            <button
                                                onClick={() => { void openTimeline(acc); }}
                                                className="flex-1 min-w-[100px] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white/80 transition-colors flex items-center justify-center gap-1.5">
                                                <History className="w-3.5 h-3.5" /> Timeline
                                            </button>
                                            <div className="flex gap-2 w-full pt-1">
                                                <button
                                                    onClick={() => router.push(`/khate/accounts/${acc.id}/edit`)}
                                                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white/80 transition-colors flex items-center justify-center gap-1">
                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteAcc(acc)}
                                                    className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400 transition-colors flex items-center justify-center gap-1">
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-12 px-6 flex items-start gap-3 opacity-50 justify-center text-center pb-8">
                <ShieldAlert className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/60 leading-relaxed max-w-[250px]">
                    Your balances are not auto-synced. All data is entered and stored locally on your device unless you choose cloud backup.
                </p>
            </div>
        </main>
    );
}
