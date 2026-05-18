"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, BarChart3, Settings, CreditCard, Scissors, ArrowLeft } from "lucide-react";
import { ExpenseStore, formatRupee } from "@/lib/expenseStore";
import { IncomeStore } from "@/lib/incomeStore";
import { PageGuide } from "@/components/ui/PageGuide";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

export default function VyayaHub() {
    const router = useRouter();
    const [, setHydrated] = useState(false);
    useEffect(() => {
        Promise.all([IncomeStore.hydrate(), ExpenseStore.hydrate()]).then(() => setHydrated(true));
    }, []);
    const monthlyExpense = ExpenseStore.getMonthlyTotal();
    const monthlyIncome = IncomeStore.getMonthlyNetIncome();
    const ratio = ExpenseStore.getExpenseToIncomeRatio();
    const breakdown = ExpenseStore.getCategoryBreakdown();
    const insights = ExpenseStore.getInsights();
    const alerts = ExpenseStore.getAlerts();
    const maturity = ExpenseStore.getMaturity();
    const entryCount = ExpenseStore.getEntryCount();
    const subTotal = ExpenseStore.getMonthlySubscriptionTotal();
    const leakageIndex = ExpenseStore.getLeakageIndex();
    const balance = monthlyIncome - monthlyExpense;

    // Matka water level: % of income remaining
    const waterLevel = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((balance / monthlyIncome) * 100))) : 100;

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10">

                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-4">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-white">Vyaya <span className="text-white/40 text-sm font-normal">(Expenses)</span></h1>
                        <p className="text-xs text-white/50 mt-0.5">Track, control, and stop silent drains.</p>
                    </div>
                </div>

                {/* Guide */}
                <PageGuide
                    title="What is Vyaya?"
                    description="Track your expenses, set budgets, and detect silent leaks like dormant subscriptions. The Matka shows how much water (money) remains after all drains."
                    actions={[{ emoji: "💧", label: "Track drains" }, { emoji: "🏺", label: "Fill the Matka" }]}
                />
                <div className="h-3" />

                {/* YouTube tutorial */}
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="How to track expenses & build a budget" />
                <div className="h-4" />

                {/* ——— MATKA HERO CARD ——— */}
                <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-2xl p-5 mb-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider">Matka Water Level</p>
                            <p className="text-xs text-white/50 mt-1">Remaining after expenses</p>
                        </div>
                        <span className="text-3xl">🏺</span>
                    </div>

                    {/* SVG Matka visualization */}
                    <div className="flex items-center gap-5">
                        <div className="relative w-20 h-24 shrink-0">
                            <svg viewBox="0 0 80 96" className="w-20 h-24">
                                {/* Pot outline */}
                                <path d="M15,20 Q10,20 10,30 L8,75 Q8,90 20,92 L60,92 Q72,90 72,75 L70,30 Q70,20 65,20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                                {/* Pot rim */}
                                <ellipse cx="40" cy="20" rx="27" ry="6" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                                {/* Water fill */}
                                <clipPath id="potClip">
                                    <path d="M10,30 L8,75 Q8,90 20,92 L60,92 Q72,90 72,75 L70,30 Z" />
                                </clipPath>
                                <rect
                                    x="8" y={92 - (waterLevel * 0.62)}
                                    width="64" height={waterLevel * 0.62}
                                    fill={waterLevel > 50 ? "rgba(52,211,153,0.3)" : waterLevel > 20 ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}
                                    clipPath="url(#potClip)"
                                />
                                {/* Water level % */}
                                <text x="40" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{waterLevel}%</text>
                            </svg>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Income (Monthly)</span>
                                <span className="text-white/70">{monthlyIncome > 0 ? formatRupee(monthlyIncome) : "—"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">Expenses (Monthly)</span>
                                <span className="text-white/70">{formatRupee(monthlyExpense)}</span>
                            </div>
                            <div className="border-t border-white/10 pt-1.5 flex justify-between text-xs">
                                <span className="text-white/40">Balance</span>
                                <span className={`font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatRupee(balance)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expense-to-Income Ratio */}
                    {ratio ? (
                        <div className="mt-3 flex items-center gap-2">
                            <p className="text-xs text-white/40">Expense-to-Income:</p>
                            <span className={`text-xs font-bold ${ratio.color === "red" ? "text-red-400" : ratio.color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                                {ratio.ratio}% ({ratio.label})
                            </span>
                        </div>
                    ) : monthlyIncome === 0 ? (
                        <div className="mt-3 flex items-center gap-2">
                            <p className="text-xs text-white/40">Expense-to-Income: —</p>
                            <button onClick={() => router.push("/kosh")} className="text-[10px] text-[var(--color-rajya-accent)] underline">Add income in Kosh</button>
                        </div>
                    ) : null}
                </div>

                {/* Category Chips (top 6 by spend) */}
                {breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {breakdown.slice(0, 6).map(b => (
                            <span key={b.categoryId} className="text-[10px] bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white/60">
                                {b.emoji} {b.name} {formatRupee(b.amount)}
                            </span>
                        ))}
                    </div>
                )}

                {/* Quick Insights */}
                {insights.length > 0 && (
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-4 space-y-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Quick Insights</p>
                        {insights.map((ins, i) => (
                            <p key={i} className="text-xs text-white/50">• {ins}</p>
                        ))}
                    </div>
                )}

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                        {alerts.map((a, i) => (
                            <div key={i} className={`rounded-xl p-2.5 text-xs flex items-start gap-2 ${a.type === "danger"
                                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                : "bg-amber-400/10 border border-amber-400/20 text-amber-400"
                                }`}>
                                <span>⚠</span>
                                <span>{a.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Subscription & Leakage total */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col justify-between">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider mb-1">📦 Subscriptions</span>
                        <span className="text-xs font-bold text-white/70">{formatRupee(subTotal)}/mo</span>
                    </div>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col justify-between">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider mb-1">📉 Leakage Index</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${leakageIndex > 50 ? "text-red-400" : leakageIndex > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                                {leakageIndex}/100
                            </span>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${leakageIndex > 50 ? "bg-red-400" : leakageIndex > 20 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${leakageIndex}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maturity Bar */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Vyaya Maturity</p>
                        <span className="text-xs text-amber-400/60">{maturity.level}/4</span>
                    </div>
                    <div className="flex gap-1">
                        {maturity.milestones.map((m /*, i*/) => ( // i was unused
                            <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`h-1.5 w-full rounded-full ${m.unlocked ? "bg-amber-400" : "bg-white/10"}`} />
                                <p className={`text-[8px] ${m.unlocked ? "text-amber-400/70" : "text-white/20"}`}>{m.label.split(" ").pop()}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Empty state */}
                {entryCount === 0 && (
                    <div className="text-center py-8 mb-4">
                        <p className="text-3xl mb-3">🏺</p>
                        <p className="text-sm text-white/50 mb-1 font-medium">No Expenses Yet</p>
                        <p className="text-xs text-white/30 mb-4">Start tracking to see where your money flows.</p>
                        <button onClick={() => router.push("/vyaya/add")}
                            className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl text-sm">
                            Add First Expense
                        </button>
                    </div>
                )}

                {/* Primary Actions */}
                <div className="space-y-3">
                    {entryCount > 0 && (
                        <button onClick={() => router.push("/vyaya/add")}
                            className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Expense
                        </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => router.push("/vyaya/categories")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5" /> Categories
                        </button>
                        <button onClick={() => router.push("/vyaya/budget")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Budget
                        </button>
                        <button onClick={() => router.push("/vyaya/subscriptions")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors flex items-center gap-2">
                            <Scissors className="w-3.5 h-3.5" /> Subscriptions
                        </button>
                        <button onClick={() => router.push("/vyaya/analytics")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5" /> Analytics
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
