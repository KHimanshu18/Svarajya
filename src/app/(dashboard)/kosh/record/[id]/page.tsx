"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { IncomeStore, INCOME_TYPES, FREQUENCIES, formatRupee, RiskLevel } from "@/lib/incomeStore";
import { NumberInputRupee } from "@/components/treasury/NumberInputRupee";
import { useEffect } from "react";

export default function RecordDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const record = IncomeStore.getRecord(id);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [now] = useState(() => Date.now());

    useEffect(() => {
        if (searchParams.get('edit') === 'true') setEditing(true);
        if (searchParams.get('delete') === 'true') setShowDeleteConfirm(true);
    }, [searchParams]);

    // Edit state
    const [grossIncome, setGrossIncome] = useState(record?.grossIncome || 0);
    const [deductions, setDeductions] = useState(record?.deductions || 0);
    const [riskLevel, setRiskLevel] = useState<RiskLevel>(record?.riskLevel || "low");
    const [tdsAmount, setTdsAmount] = useState(record?.tdsAmount || 0);
    const [expectedGrowth, setExpectedGrowth] = useState(record?.expectedGrowthPct || 0);
    const [historicalIncome, setHistoricalIncome] = useState(record?.historicalIncome as number || 0);
    const [notes, setNotes] = useState(record?.notes || "");

    if (!record) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <p className="text-[var(--color-rajya-muted)]">Record not found.</p>
                <button onClick={() => router.push("/kosh")} className="mt-4 text-[var(--color-rajya-accent)] text-sm">Go back</button>
            </div>
        );
    }

    const meta = INCOME_TYPES.find(t => t.id === record.incomeType);
    const freqLabel = FREQUENCIES.find(f => f.id === record.frequency)?.label || record.frequency;
    const contribution = IncomeStore.getSourceContributions().find(c => c.id === record.id);
    const net = record.grossIncome - record.deductions;

    const handleSaveEdit = () => {
        IncomeStore.updateRecord(id, {
            grossIncome,
            deductions,
            riskLevel,
            tdsAmount: tdsAmount || undefined,
            expectedGrowthPct: expectedGrowth || undefined,
            historicalIncome: historicalIncome || undefined,
            notes: notes.trim() || undefined,
        });
        setEditing(false);
    };

    const handleDelete = () => {
        IncomeStore.deleteRecord(id);
        router.push("/kosh");
    };

    const handleMarkReviewed = () => {
        IncomeStore.updateRecord(id, { lastReviewedAt: Date.now() });
        router.refresh();
    };

    const reviewedAgo = record.lastReviewedAt
        ? `${Math.floor((now - record.lastReviewedAt) / (24 * 60 * 60 * 1000))} days ago`
        : "Never";

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.push("/kosh/income")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-white">
                            {meta?.label} — {record.sourceName}
                        </h1>
                        <p className="text-xs text-white/50 mt-0.5">
                            {formatRupee(net)} / {record.frequency.replace("_", "-")}
                            {contribution ? ` • Contribution: ${contribution.percentage}%` : ""}
                        </p>
                    </div>
                </div>

                {/* Tutorial */}
                <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3 mb-4">
                    <p className="text-xs text-[var(--color-rajya-muted)]">
                        💡 Review each source regularly to improve your <strong className="text-[var(--color-rajya-text)]">Governance score</strong>. Fill in risk level, growth %, and mark as reviewed every quarter.
                    </p>
                </div>

                {/* Review status */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-[var(--color-rajya-muted)]">
                        Last Reviewed: <span className="text-[var(--color-rajya-text)]">{reviewedAgo}</span>
                    </p>
                    <button
                        onClick={handleMarkReviewed}
                        className="text-[10px] text-[var(--color-rajya-accent)] font-bold bg-[var(--color-rajya-accent)]/10 px-3 py-1.5 rounded-lg"
                    >
                        ✓ Mark Reviewed Today
                    </button>
                </div>

                {!editing ? (
                    /* View mode */
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                            <DetailRow label="Income Type" value={`${meta?.emoji} ${meta?.label}`} />
                            <DetailRow label="Frequency" value={freqLabel} />
                            <DetailRow label="Gross Income" value={formatRupee(record.grossIncome)} />
                            <DetailRow label="Deductions" value={formatRupee(record.deductions)} />
                            <DetailRow label="Net Income" value={formatRupee(net)} highlight />
                            {record.tdsAmount ? <DetailRow label="TDS Amount" value={formatRupee(record.tdsAmount)} /> : null}
                            <DetailRow label="Risk Level" value={record.riskLevel ? record.riskLevel.charAt(0).toUpperCase() + record.riskLevel.slice(1) : "Low"
                            } />
                            {record.historicalIncome ? <DetailRow label="Historical Income" value={formatRupee(record.historicalIncome)} /> : null}
                            {record.expectedGrowthPct !== undefined ? <DetailRow label="Expected Growth" value={`${record.expectedGrowthPct}%`} /> : null}
                            {record.notes ? <DetailRow label="Notes" value={record.notes} /> : null}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setEditing(true)}
                                className="bg-[var(--color-rajya-accent)] text-black font-semibold py-3 rounded-xl text-sm"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="bg-white/5 border border-[var(--color-rajya-danger)]/30 text-[var(--color-rajya-danger)] font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Edit mode */
                    <div className="space-y-5">
                        <NumberInputRupee label="Gross Income" value={grossIncome} onChange={setGrossIncome} />
                        <NumberInputRupee label="Deductions" value={deductions} onChange={setDeductions} optional />

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-2 block">Risk Level</label>
                            <div className="flex gap-2">
                                {(["low", "medium", "high"] as RiskLevel[]).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRiskLevel(r)}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all ${riskLevel === r
                                            ? r === "low" ? "bg-emerald-600 text-white border-emerald-600"
                                                : r === "medium" ? "bg-amber-600 text-white border-amber-600"
                                                    : "bg-red-600 text-white border-red-600"
                                            : "bg-white/5 border-white/10 text-[var(--color-rajya-text)]"
                                            }`}
                                    >
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <NumberInputRupee label="TDS Amount" value={tdsAmount} onChange={setTdsAmount} optional />
                        
                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Expected Growth (%)</label>
                            <input
                                type="number"
                                value={expectedGrowth || ""}
                                onChange={e => setExpectedGrowth(e.target.value ? parseInt(e.target.value) : 0)}
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none"
                            />
                        </div>

                        <NumberInputRupee label="Historical Income (Last Year)" value={historicalIncome} onChange={setHistoricalIncome} optional />

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handleSaveEdit} className="bg-[var(--color-rajya-accent)] text-black font-semibold py-3 rounded-xl text-sm">Save</button>
                            <button onClick={() => setEditing(false)} className="bg-white/5 border border-white/10 text-[var(--color-rajya-text)] py-3 rounded-xl text-sm">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Delete confirmation modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                        <div className="bg-[var(--color-rajya-card)] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                            <h3 className="text-sm font-semibold text-[var(--color-rajya-text)] mb-2">Delete Income Source?</h3>
                            <p className="text-xs text-[var(--color-rajya-muted)] mb-5">
                                Are you sure you want to delete this income source? This will affect your income analytics.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="bg-white/5 border border-white/10 text-[var(--color-rajya-text)] py-3 rounded-xl text-sm">Cancel</button>
                                <button onClick={handleDelete} className="bg-[var(--color-rajya-danger)] text-white font-semibold py-3 rounded-xl text-sm">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-rajya-muted)]">{label}</span>
            <span className={`text-sm ${highlight ? "font-bold text-[var(--color-rajya-accent)]" : "text-[var(--color-rajya-text)]"}`}>{value}</span>
        </div>
    );
}
