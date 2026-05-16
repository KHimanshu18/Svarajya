"use client";

import { useRouter } from "next/navigation";
import { IncomeRecord, INCOME_TYPES, formatRupee, IncomeStore } from "@/lib/incomeStore";
import { useToast } from "@/components/providers/ToastProvider";
import { useState } from "react";

interface IncomeCardProps {
    record: IncomeRecord;
    contribution?: number; // percentage
}

export function IncomeCard({ record, contribution }: IncomeCardProps) {
    const router = useRouter();
    const toast = useToast();
    const meta = INCOME_TYPES.find(t => t.id === record.incomeType);
    const net = record.grossIncome - record.deductions;

    const freqLabel = record.frequency === "one_time" ? "one-time" : `/ ${record.frequency.replace("ly", "")}`;
    const riskColors = {
        low: "text-[var(--color-rajya-success)]",
        medium: "text-[var(--color-rajya-accent)]",
        high: "text-[var(--color-rajya-danger)]",
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (IncomeStore.deleteRecord(record.id)) {
            toast("Income deleted successfully", "success");
            // Optionally, we might need to refresh the page or trigger a re-render
            window.location.reload();
        } else {
            toast("Failed to delete income", "error");
        }
    };

    return (
        <>
        <div
            onClick={() => router.push(`/kosh/record/${record.id}`)}
            className="w-full text-left bg-white/5 border border-white/10 hover:border-[var(--color-rajya-accent)]/40 rounded-xl p-4 transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{meta?.emoji || "📋"}</span>
                    <div>
                        <p className="text-sm font-medium text-[var(--color-rajya-text)]">
                            {meta?.label || record.incomeType} — {record.sourceName}
                        </p>
                        <p className="text-xs text-[var(--color-rajya-muted)] mt-0.5">
                            {formatRupee(net)} {freqLabel}
                        </p>
                    </div>
                </div>
                {contribution !== undefined && contribution > 0 && (
                    <span className="text-xs font-bold text-[var(--color-rajya-accent)]">{contribution}%</span>
                )}
            </div>
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium ${riskColors[record.riskLevel]}`}>
                        Risk: {record.riskLevel.charAt(0).toUpperCase() + record.riskLevel.slice(1)}
                    </span>
                    {record.frequency === "one_time" && !record.allocationMonths && (
                        <span className="text-[10px] text-[var(--color-rajya-muted)]">Not in monthly</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/kosh/income/${record.id}/edit`); }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[var(--color-rajya-accent)]/20 text-white/40 hover:text-[var(--color-rajya-accent)] transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        </div>

        {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                    <h3 className="text-lg font-semibold text-white mb-2">Delete Income Source?</h3>
                    <p className="text-sm text-white/60 mb-6">Are you sure you want to delete {record.sourceName}? This action cannot be undone and will affect your Income Strength Index.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition-all"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
