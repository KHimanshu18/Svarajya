"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { IncomeStore, formatRupee } from "@/lib/incomeStore";
import { ExpenseStore } from "@/lib/expenseStore";
import { NumberInputRupee } from "@/components/treasury/NumberInputRupee";
import { PageGuide } from "@/components/ui/PageGuide";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

/**
 * Panchabhuta (Five Elements) Wealth Distribution
 * ─────────────────────────────────────────────────
 * Inspired by the Indian concept of Panchabhuta (पंचभूत), the five great
 * elements that compose all matter. Financial flow is represented as the
 * balance of these cosmic elements:
 *
 *   🌍 Prithvi (Earth)  — Fixed obligations: Rent, EMIs, loans (foundation)
 *   💧 Jal (Water)      — Daily living expenses: Food, transport, utilities (flow)
 *   🔥 Agni (Fire)      — Savings & investments: The fire that builds wealth
 *   💨 Vayu (Air)       — Disposable income: Free-flowing, flexible money
 *   ✨ Akash (Space)    — Income source: The vast potential from which all flows
 *
 * When all 5 elements are in harmony, the Rajya prospers.
 */

function ElementRing({
    label, emoji, amount, total, description, elementColor, isNegative
}: {
    label: string; emoji: string; amount: number; total: number;
    description: string; elementColor: string; isNegative?: boolean;
}) {
    const pct = total > 0 ? Math.min(Math.max(Math.round((amount / total) * 100), 0), 100) : 0;
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const dashArray = `${(pct / 100) * circumference} ${circumference}`;

    return (
        <div className="flex items-center gap-3 py-2.5">
            {/* Circular element ring */}
            <div className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 60 60" className="w-14 h-14 -rotate-90">
                    <circle cx="30" cy="30" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/6" />
                    <circle
                        cx="30" cy="30" r={radius} fill="none"
                        stroke={elementColor} strokeWidth="3"
                        strokeDasharray={dashArray}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">{emoji}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-rajya-text)]">{label}</span>
                    <span className={`text-sm font-bold ${isNegative ? "text-[var(--color-rajya-danger)]" : ""}`} style={!isNegative ? { color: elementColor } : {}}>
                        {formatRupee(amount)}
                    </span>
                </div>
                <p className="text-[10px] text-[var(--color-rajya-muted)] mt-0.5">{description}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold" style={{ color: elementColor }}>{pct}%</span>
                    <span className="text-[10px] text-[var(--color-rajya-muted)]">of total income</span>
                </div>
            </div>
        </div>
    );
}

export default function DisposablePage() {
    const router = useRouter();
    const monthlyNet = IncomeStore.getMonthlyNetIncome();

    const [expenses, setExpenses] = useState(0);
    const [emi, setEmi] = useState(0);
    const [savingsTarget, setSavingsTarget] = useState(0);
    const [calculated, setCalculated] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch cross-module data
    useEffect(() => {
        const fetchExpenses = async () => {
            if (ExpenseStore.getEntries().length === 0) {
                await ExpenseStore.hydrate();
            }
            const monthlyExpenses = ExpenseStore.getMonthlyTotal();
            if (monthlyExpenses > 0) {
                setExpenses(monthlyExpenses);
            }
        };
        fetchExpenses();
    }, []);

    const handleCalculate = () => {
        const errs: Record<string, string> = {};
        if (expenses <= 0) errs.expenses = "Please enter your monthly expenses.";
        if (expenses < 0) errs.expenses = "Expenses can\u2019t be negative.";
        if (emi < 0) errs.emi = "EMI can\u2019t be negative.";
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setCalculated(true);
    };

    const result = IncomeStore.getDisposableIncome(expenses, emi);
    const disposable = result.disposable - savingsTarget;

    // Panchabhuta harmony assessment
    const getHarmonyStatus = () => {
        if (result.isNegative) return { label: "विषम (Disharmony)", emoji: "☠️", desc: "Your outflow exceeds income. The five elements are in conflict.", color: "text-[var(--color-rajya-danger)]" };
        if (result.bufferRatio < 0.2) return { label: "अस्थिर (Unstable)", emoji: "⚡", desc: "Thin buffer. One disruption could break the balance.", color: "text-[var(--color-rajya-danger)]" };
        if (result.bufferRatio < 0.5) return { label: "सन्तुलन (Balanced)", emoji: "⚖️", desc: "Moderate balance. Aim for stronger Vayu (free flow).", color: "text-[var(--color-rajya-accent)]" };
        return { label: "सामंजस्य (Harmony)", emoji: "🕉️", desc: "All five elements are in harmony. Your Rajya prospers.", color: "text-[var(--color-rajya-success)]" };
    };

    const harmony = getHarmonyStatus();

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-4">
                    <button onClick={() => router.push("/kosh")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Disposable Income</h1>
                        <p className="text-xs text-white/50 mt-0.5">Panchabhuta — Five Element Balance</p>
                    </div>
                </div>

                {/* Guide */}
                <PageGuide
                    title="How the Panchabhuta Balance works"
                    description="Inspired by the Indian Panchabhuta (Five Elements), your income flows through: Akash (Source) → Prithvi (Fixed costs) → Jal (Living) → Agni (Savings) → Vayu (Free cash). Harmony means all elements coexist without conflict."
                    actions={[{ emoji: "🕉️", label: "Panchabhuta" }, { emoji: "⚖️", label: "Balance check" }]}
                />
                <div className="h-3" />

                {/* YouTube tutorial */}
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="How to calculate your disposable income — the smart way" />
                <div className="h-4" />

                {/* Current monthly income reference */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-rajya-muted)]">✨ Akash (Total Income)</span>
                    <span className="text-sm font-bold text-[var(--color-rajya-accent)]">{formatRupee(monthlyNet)}</span>
                </div>

                {monthlyNet === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-[var(--color-rajya-muted)] mb-3">Add income sources first to estimate disposable income.</p>
                        <button onClick={() => router.push("/kosh/add")} className="text-[var(--color-rajya-accent)] text-sm">Add Income Source</button>
                    </div>
                ) : (
                    <>
                        {/* Input section */}
                        <div className="space-y-5 mb-6">
                            <NumberInputRupee label="💧 Jal — Monthly Living Expenses (Auto-fetched from Vyaya)" value={expenses} onChange={setExpenses} placeholder="Rent, food, bills, transport..." error={errors.expenses} />
                            <NumberInputRupee label="🌍 Prithvi — Fixed EMIs & Loans" value={emi} onChange={setEmi} placeholder="Home EMI, car EMI, education loan..." optional error={errors.emi} />
                            <NumberInputRupee label="🔥 Agni — Savings & Investment Target" value={savingsTarget} onChange={setSavingsTarget} placeholder="SIP, FD, PPF target..." optional />
                        </div>

                        <button
                            onClick={handleCalculate}
                            className="w-full bg-[var(--color-rajya-accent)] text-black font-semibold py-4 rounded-xl text-sm"
                        >
                            Check Panchabhuta Balance
                        </button>

                        {/* Result — Panchabhuta Visualization */}
                        {calculated && (
                            <div className="mt-6 space-y-4">
                                {/* Harmony Status */}
                                <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-2xl p-5 text-center">
                                    <span className="text-4xl block mb-2">{harmony.emoji}</span>
                                    <h3 className={`text-xl font-display ${harmony.color}`}>{harmony.label}</h3>
                                    <p className="text-xs text-[var(--color-rajya-muted)] mt-1.5 max-w-xs mx-auto">{harmony.desc}</p>
                                </div>

                                {/* Five Elements Breakdown */}
                                <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/15 rounded-2xl p-4">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">पंचभूत Breakdown</p>

                                    <ElementRing
                                        label="Akash — Total Income"
                                        emoji="✨"
                                        amount={monthlyNet}
                                        total={monthlyNet}
                                        description="The vast source — all that flows into your Rajya"
                                        elementColor="#a78bfa"
                                    />

                                    <div className="border-t border-white/6 my-1" />

                                    {emi > 0 && (
                                        <>
                                            <ElementRing
                                                label="Prithvi — Fixed Obligations"
                                                emoji="🌍"
                                                amount={emi}
                                                total={monthlyNet}
                                                description="EMIs, loans — the immovable foundation"
                                                elementColor="#f59e0b"
                                            />
                                            <div className="border-t border-white/6 my-1" />
                                        </>
                                    )}

                                    <ElementRing
                                        label="Jal — Living Expenses"
                                        emoji="💧"
                                        amount={expenses}
                                        total={monthlyNet}
                                        description="Daily flow — food, rent, transport, utilities"
                                        elementColor="#3b82f6"
                                    />

                                    {savingsTarget > 0 && (
                                        <>
                                            <div className="border-t border-white/6 my-1" />
                                            <ElementRing
                                                label="Agni — Savings Fire"
                                                emoji="🔥"
                                                amount={savingsTarget}
                                                total={monthlyNet}
                                                description="Wealth-building fire — SIPs, FDs, investments"
                                                elementColor="#ef4444"
                                            />
                                        </>
                                    )}

                                    <div className="border-t border-white/6 my-1" />

                                    <ElementRing
                                        label="Vayu — Free Cash"
                                        emoji="💨"
                                        amount={Math.max(0, disposable)}
                                        total={monthlyNet}
                                        description="Unrestricted air — your true financial freedom"
                                        elementColor="#10b981"
                                        isNegative={disposable < 0}
                                    />
                                </div>

                                {/* Vayu (Disposable) Highlight */}
                                <div className={`rounded-xl p-4 border ${disposable < 0
                                    ? "bg-[var(--color-rajya-danger)]/10 border-[var(--color-rajya-danger)]/30"
                                    : "bg-[var(--color-rajya-success)]/10 border-[var(--color-rajya-success)]/30"
                                    }`}>
                                    <p className="text-xs text-[var(--color-rajya-muted)]">💨 Vayu — Your True Disposable</p>
                                    <p className={`text-3xl font-bold mt-1 ${disposable < 0 ? "text-[var(--color-rajya-danger)]" : "text-[var(--color-rajya-success)]"}`}>
                                        {formatRupee(disposable)}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-rajya-muted)] mt-2">
                                        Buffer Ratio: <span className={`font-bold ${result.bufferRatio >= 0.5 ? "text-[var(--color-rajya-success)]" : result.bufferRatio >= 0.2 ? "text-[var(--color-rajya-accent)]" : "text-[var(--color-rajya-danger)]"}`}>
                                            {result.bufferRatio}
                                        </span>
                                        {result.bufferRatio >= 0.5 ? " — Strong flexibility" : result.bufferRatio >= 0.2 ? " — Moderate, aim for 0.5+" : " — Low, review expenses"}
                                    </p>
                                </div>

                                {/* Warnings */}
                                {result.isNegative && (
                                    <div className="bg-[var(--color-rajya-danger)]/10 border border-[var(--color-rajya-danger)]/30 rounded-xl p-3 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-[var(--color-rajya-danger)] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[var(--color-rajya-danger)]">
                                            Vayu has turned into a storm. Your outflow exceeds income — reduce expenses or add income sources.
                                        </p>
                                    </div>
                                )}

                                {/* CTAs */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => router.push("/kosh/add")}
                                        className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors"
                                    >
                                        + Add Income
                                    </button>
                                    <button
                                        onClick={() => router.push("/kosh/analytics")}
                                        className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors"
                                    >
                                        🏛️ Analytics
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
