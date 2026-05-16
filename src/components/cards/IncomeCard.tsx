"use client";

import { useRouter } from "next/navigation";
import { IncomeRecord, INCOME_TYPES, formatRupee } from "@/lib/stores/incomeStore";

interface IncomeCardProps {
    record: IncomeRecord;
    contribution?: number; // percentage
}

export function IncomeCard({ record, contribution }: IncomeCardProps) {
    const router = useRouter();
    const meta = INCOME_TYPES.find(t => t.id === record.incomeType);
    const net = record.grossIncome - record.deductions;

    const freqLabel = record.frequency === "one_time" ? "one-time" : `/ ${record.frequency.replace("ly", "")}`;
    const riskColors = {
        low: "text-[var(--color-rajya-success)]",
        medium: "text-[var(--color-rajya-accent)]",
        high: "text-[var(--color-rajya-danger)]",
    };

    return (
        <button
            onClick={() => router.push(`/kosh/record/${record.id}`)}
            className="w-full text-left bg-white/5 border border-white/10 hover:border-[var(--color-rajya-accent)]/40 rounded-xl p-4 transition-all"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{meta?.emoji || "ðŸ“‹"}</span>
                    <div>
                        <p className="text-sm font-medium text-[var(--color-rajya-text)]">
                            {meta?.label || record.incomeType} â€” {record.sourceName}
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
            <div className="flex items-center gap-3 mt-2">
                <span className={`text-[10px] font-medium ${riskColors[record.riskLevel]}`}>
                    Risk: {record.riskLevel ? record.riskLevel.charAt(0).toUpperCase() + record.riskLevel.slice(1) : "Not set"}
                </span>
                {record.frequency === "one_time" && !record.allocationMonths && (
                    <span className="text-[10px] text-[var(--color-rajya-muted)]">Not in monthly</span>
                )}
            </div>
        </button>
    );
}
