"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { Info } from "lucide-react"; // unused
// import { Shield } from "lucide-react"; // unused
// import { TrendingUp } from "lucide-react"; // unused
// import { Eye } from "lucide-react"; // unused
// import { CheckCircle2 } from "lucide-react"; // unused
import { ArrowLeft, ChevronRight } from "lucide-react";
import { IncomeStore, formatRupee, INCOME_TYPES } from "@/lib/incomeStore";
import { DependencyBadge } from "@/components/treasury/DependencyBadge";
import { PageGuide } from "@/components/ui/PageGuide";

// Captured once at module load — react-hooks/purity forbids Date.now() inside components
const PAGE_LOAD_NOW = Date.now();

import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

export default function AnalyticsPage() {
    const router = useRouter();
    const records = IncomeStore.getRecords();
    const strength = IncomeStore.getStrengthIndex();
    const dep = IncomeStore.getDependencyRatio();
    const depLevel = IncomeStore.getDependencyLevel();
    const diversity = IncomeStore.getDiversityScore();
    const contributions = IncomeStore.getSourceContributions();

    const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/family').then(res => res.json()).then(data => {
            if (data.data) setFamilyMembers(data.data);
        }).catch(err => console.error(err));
    }, []);

    // Calculate family income split
    const familySplit = records.reduce((acc, r) => {
        const id = r.linkedFamilyMemberId || "self";
        const net = (r.grossIncome - r.deductions);
        const monthly = r.frequency === "monthly" ? net : 
                       r.frequency === "quarterly" ? net / 3 :
                       r.frequency === "annual" ? net / 12 :
                       (r.allocationMonths ? net / r.allocationMonths : 0);
        if (monthly > 0) {
            acc[id] = (acc[id] || 0) + monthly;
        }
        return acc;
    }, {} as Record<string, number>);

    const totalMonthlyFamily = Object.values(familySplit).reduce((a, b) => a + b, 0);

    const familySplitData = Object.entries(familySplit).map(([id, amount]) => {
        const name = id === "self" ? "Self" : familyMembers.find(f => f.id === id)?.name || "Unknown Member";
        return {
            id,
            name,
            amount: Math.round(amount),
            percentage: totalMonthlyFamily > 0 ? Math.round((amount / totalMonthlyFamily) * 100) : 0
        };
    }).sort((a, b) => b.amount - a.amount);

    // Stable timestamp — captured at module load to satisfy react-hooks/purity
    const now = PAGE_LOAD_NOW;

    if (records.length === 0) {
        return (
            <div className="flex flex-col min-h-screen p-6 pb-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
                    <p className="text-[var(--color-rajya-muted)]">Add income sources first to see analytics.</p>
                    <button onClick={() => router.push("/kosh/add")} className="mt-4 text-[var(--color-rajya-accent)] text-sm">Add Income Source</button>
                </div>
            </div>
        );
    }

    const statusColor = (score: number, max: number) => {
        const pct = max > 0 ? (score / max) * 100 : 0;
        if (pct >= 75) return "text-[var(--color-rajya-success)]";
        if (pct >= 50) return "text-[var(--color-rajya-accent)]";
        return "text-[var(--color-rajya-danger)]";
    };

    const isiColor = strength.overall >= 76 ? "var(--color-rajya-success)" : strength.overall >= 41 ? "var(--color-rajya-accent)" : "var(--color-rajya-danger)";

    // Pillar data
    const pillars = [
        {
            id: "diversification",
            icon: "🏛️",
            label: "Diversification",
            score: strength.diversity,
            max: strength.diversityMax,
            description: "Multiple income streams & types reduce structural risk.",
            details: [
                `Source count: ${diversity.sourceCount} → ${diversity.sourceCountScore}/10`,
                `Income types: ${diversity.uniqueTypes} → ${diversity.typeScore}/8`,
                `Spread balance → ${diversity.spreadScore}/7`,
            ],
            action: diversity.uniqueTypes < 3 ? "Add another income type" : null,
        },
        {
            id: "dependency",
            icon: "⚖️",
            label: "Dependency Risk",
            score: strength.dependency,
            max: strength.dependencyMax,
            description: "Concentration risk — how much one source dominates.",
            details: [
                `Top source: ${dep.highSourceName || "None"}`,
                `Contribution: ${Math.round(dep.ratio * 100)}%`,
                dep.flag ? "⚠ High dependency detected" : "✓ Dependency within acceptable range",
            ],
            action: dep.flag ? "Reduce dependency by adding sources" : null,
        },
        {
            id: "stability",
            icon: "🛡️",
            label: "Stability",
            score: strength.stability,
            max: strength.stabilityMax,
            description: "Risk level of your income and predictability.",
            details: [
                `Low-risk sources: ${records.filter(r => r.riskLevel === "low").length}`,
                `Medium-risk: ${records.filter(r => r.riskLevel === "medium").length}`,
                `High-risk: ${records.filter(r => r.riskLevel === "high").length}`,
            ],
            action: records.some(r => r.riskLevel === "high") ? "Review high-risk sources" : null,
        },
        {
            id: "growth",
            icon: "📈",
            label: "Growth Outlook",
            score: strength.growth,
            max: strength.growthMax,
            description: "Forward visibility — expected growth drives planning.",
            details: [
                `Sources with growth data: ${records.filter(r => r.expectedGrowthPct !== undefined).length}/${records.length}`,
                ...(records.filter(r => r.expectedGrowthPct !== undefined).length > 0 ? [
                    `Avg expected growth: ${Math.round(records.filter(r => r.expectedGrowthPct !== undefined).reduce((s, r) => s + (r.expectedGrowthPct || 0), 0) / records.filter(r => r.expectedGrowthPct !== undefined).length)}%`
                ] : ["No growth data entered yet"]),
            ],
            action: records.some(r => r.expectedGrowthPct === undefined) ? "Add growth % to income sources" : null,
        },
        {
            id: "governance",
            icon: "✅",
            label: "Recency & Governance",
            score: strength.governance,
            max: strength.governanceMax,
            description: "Review discipline and record completeness.",
            details: [
                `Recently reviewed: ${records.filter(r => r.lastReviewedAt && (now - r.lastReviewedAt) < 90 * 24 * 60 * 60 * 1000).length}/${records.length}`,
                `Records with risk level: ${records.filter(r => r.riskLevel).length}/${records.length}`,
                `Records with growth data: ${records.filter(r => r.expectedGrowthPct !== undefined).length}/${records.length}`,
            ],
            action: records.some(r => !r.lastReviewedAt) ? "Review all income sources" : null,
        },
    ];

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-5">
                    <button onClick={() => router.push("/kosh")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Income Analytics</h1>
                        <p className="text-xs text-white/50 mt-0.5">Understand stability and diversification.</p>
                    </div>
                </div>

                {/* Guide */}
                <PageGuide
                    title="How is your Income Strength Index scored?"
                    description="Your ISI is built from 5 pillars: Diversification (how many income streams), Dependency (concentration risk), Stability (predictability), Growth (future outlook), and Governance (review discipline). Each pillar is scored individually — tap to see details and improve."
                    actions={[{ emoji: "🏛️", label: "5 pillars" }, { emoji: "📋", label: "Transparent scoring" }]}
                />
                <div className="h-3" />

                {/* YouTube tutorial */}
                <VideoTutorialPlaceholder youtubeId="3Ob3stTkGLs" label="Understanding your income strength & financial analytics" />
                <div className="h-4" />

                {/* ——— ISI HEADLINE — Circular ring + label ——— */}
                <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-2xl p-6 text-center mb-5">
                    <div className="relative w-28 h-28 mx-auto mb-3">
                        <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/8" />
                            <circle
                                cx="18" cy="18" r="15" fill="none"
                                stroke={isiColor} strokeWidth="2.5"
                                strokeDasharray={`${strength.overall * 0.94} 100`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-[var(--color-rajya-text)]">{strength.overall}</span>
                            <span className="text-[9px] text-[var(--color-rajya-muted)]">/ 100</span>
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-rajya-text)]">Income Strength Index</p>
                    <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${strength.overall >= 76 ? "bg-emerald-600/20 text-emerald-400"
                        : strength.overall >= 41 ? "bg-amber-600/20 text-amber-400"
                            : "bg-red-600/20 text-red-400"
                        }`}>
                        {strength.label}
                    </span>
                    <p className="text-[10px] text-[var(--color-rajya-muted)] mt-3 max-w-xs mx-auto">
                        {strength.overall >= 76
                            ? "Your income structure is strong. Keep reviewing to maintain resilience."
                            : strength.overall >= 41
                                ? "Improve diversification and reduce dependency to increase strength."
                                : "Your treasury is fragile. Add more income sources and reduce concentration risk."
                        }
                    </p>
                </div>

                {/* ——— 5 PILLARS — Card-based, no graphs ——— */}
                <div className="space-y-3 mb-5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">5 Pillars of Income Strength</p>

                    {pillars.map(p => {
                        const isExpanded = expandedPillar === p.id;
                        const pct = p.max > 0 ? Math.round((p.score / p.max) * 100) : 0;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setExpandedPillar(isExpanded ? null : p.id)}
                                className="w-full text-left bg-white/4 border border-white/8 rounded-xl p-4 transition-all hover:border-white/15"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{p.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-[var(--color-rajya-text)]">{p.label}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${statusColor(p.score, p.max)}`}>
                                                    {p.score}
                                                </span>
                                                <span className="text-[10px] text-[var(--color-rajya-muted)]">/ {p.max}</span>
                                                <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                            </div>
                                        </div>

                                        {/* Score tier dots — replaces progress bar */}
                                        <div className="flex gap-1 mt-2">
                                            {Array.from({ length: p.max }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${i < p.score
                                                        ? pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                                                        : "bg-white/6"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail — text-based, no charts */}
                                {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                                        <p className="text-[10px] text-[var(--color-rajya-muted)]">{p.description}</p>
                                        {p.details.map((d, i) => (
                                            <p key={i} className="text-xs text-white/50 pl-2 border-l-2 border-white/10">
                                                {d}
                                            </p>
                                        ))}
                                        {p.action && (
                                            <p className="text-[10px] text-[var(--color-rajya-accent)] font-medium mt-1">
                                                💡 {p.action}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ——— DEPENDENCY PANEL ——— */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-[var(--color-rajya-text)]">Dependency Ratio</p>
                        <DependencyBadge level={depLevel} />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[var(--color-rajya-text)]">{Math.round(dep.ratio * 100)}</span>
                        <span className="text-sm text-[var(--color-rajya-muted)]">%</span>
                    </div>
                    <p className="text-xs text-[var(--color-rajya-muted)] mt-1">Highest source: {dep.highSourceName}</p>

                    {dep.flag && (
                        <div className="mt-3 bg-[var(--color-rajya-danger)]/10 border border-[var(--color-rajya-danger)]/20 rounded-lg p-2.5">
                            <p className="text-[10px] text-[var(--color-rajya-danger)]">
                                ⚠ High dependency: {dep.highSourceName} contributes {Math.round(dep.ratio * 100)}% of your income.
                            </p>
                        </div>
                    )}
                </div>

                {/* ——— INCOME SOURCES — Ranked list, no charts ——— */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-[var(--color-rajya-text)]">Income Sources</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-rajya-muted)]">
                            <span>{diversity.sourceCount} sources</span>
                            <span>•</span>
                            <span>{diversity.uniqueTypes} types</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {contributions.map((c, i) => {
                            const typeMeta = INCOME_TYPES.find(t => t.id === c.incomeType);
                            const isKing = i === 0;
                            return (
                                <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isKing ? "bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/15" : "bg-white/3"}`}>
                                    <span className="text-lg">{isKing ? "♚" : i <= 2 ? "♜" : "♟"}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs">{typeMeta?.emoji}</span>
                                            <span className="text-xs font-medium text-[var(--color-rajya-text)] truncate">{c.sourceName}</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--color-rajya-muted)] mt-0.5">{formatRupee(c.monthlyNet)}/mo</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${isKing && dep.flag ? "text-[var(--color-rajya-danger)]" : "text-[var(--color-rajya-accent)]"}`}>
                                            {c.percentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[9px] text-[var(--color-rajya-muted)] mt-3">
                        {diversity.uniqueTypes < 3 ? "At least 3 diversified streams reduce structural risk." : "✓ Good type diversity."}
                    </p>
                </div>

                {/* ——— FAMILY INCOME SPLIT ——— */}
                {familySplitData.length > 0 && (
                    <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-[var(--color-rajya-text)]">Family Income Split</p>
                            <span className="text-[10px] text-[var(--color-rajya-muted)]">Total: {formatRupee(totalMonthlyFamily)}/mo</span>
                        </div>

                        {/* Progress Bar Chart */}
                        <div className="flex h-3 rounded-full overflow-hidden mb-4">
                            {familySplitData.map((d, i) => {
                                const colors = ["bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-pink-500"];
                                return (
                                    <div 
                                        key={d.id} 
                                        style={{ width: `${d.percentage}%` }} 
                                        className={`${colors[i % colors.length]} transition-all`}
                                        title={`${d.name}: ${d.percentage}%`}
                                    />
                                );
                            })}
                        </div>

                        <div className="space-y-3">
                            {familySplitData.map((d, i) => {
                                const colors = ["bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-pink-500"];
                                return (
                                    <div key={d.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                            <span className="text-xs text-[var(--color-rajya-text)]">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-[var(--color-rajya-muted)]">{formatRupee(d.amount)}/mo</span>
                                            <span className="text-sm font-bold text-[var(--color-rajya-accent)]">{d.percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ——— ACTIONS ——— */}
                <div className="space-y-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">What you can do</p>
                    {strength.diversity < 15 && (
                        <button onClick={() => router.push("/kosh/add")} className="w-full bg-white/4 border border-white/8 rounded-xl py-3 px-4 text-xs text-white/60 hover:border-[var(--color-rajya-accent)]/30 transition-colors text-left">
                            💡 Add another income type to improve diversification
                        </button>
                    )}
                    {strength.governance < 10 && (
                        <button onClick={() => router.push("/kosh/income")} className="w-full bg-white/4 border border-white/8 rounded-xl py-3 px-4 text-xs text-white/60 hover:border-[var(--color-rajya-accent)]/30 transition-colors text-left">
                            🔄 Review and update income sources for better governance score
                        </button>
                    )}
                    {strength.growth < 8 && (
                        <button onClick={() => router.push("/kosh/income")} className="w-full bg-white/4 border border-white/8 rounded-xl py-3 px-4 text-xs text-white/60 hover:border-[var(--color-rajya-accent)]/30 transition-colors text-left">
                            📈 Add expected growth % to improve growth outlook
                        </button>
                    )}
                    <button onClick={() => router.push("/kosh/income")} className="w-full bg-white/4 border border-white/8 rounded-xl py-3 px-4 text-xs text-white/60 hover:border-[var(--color-rajya-accent)]/30 transition-colors text-left">
                        📋 Go to Income Registry
                    </button>
                </div>
            </div>
        </div>
    );
}
