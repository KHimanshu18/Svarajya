"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { IncomeStore, IncomeType, Frequency, RiskLevel, FREQUENCIES } from "@/lib/incomeStore";
import { IncomeTypeChips } from "@/components/treasury/IncomeTypeChips";
import { NumberInputRupee } from "@/components/treasury/NumberInputRupee";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

export default function AddIncomePage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | "win">(1);
    const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

    // Step 1 fields
    const [incomeType, setIncomeType] = useState<IncomeType | null>(null);
    const [sourceName, setSourceName] = useState("");
    const [frequency, setFrequency] = useState<Frequency>("monthly");
    const [grossIncome, setGrossIncome] = useState(0);
    const [deductions, setDeductions] = useState(0);
    const [allocationMonths, setAllocationMonths] = useState<number | undefined>(undefined);
    const [creditedBank, setCreditedBank] = useState("");

    // Step 2 fields
    const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");
    const [historicalIncome, setHistoricalIncome] = useState(0);
    const [expectedGrowth, setExpectedGrowth] = useState(0);
    const [tdsAmount, setTdsAmount] = useState(0);
    const [notes, setNotes] = useState("");

    // Risk level guide
    const [showRiskGuide, setShowRiskGuide] = useState(false);

    // Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Live preview
    const netIncome = grossIncome - deductions;
    const monthlyPreview = (() => {
        const net = netIncome;
        switch (frequency) {
            case "monthly": return net;
            case "quarterly": return Math.round(net / 3);
            case "annual": return Math.round(net / 12);
            case "one_time":
                return allocationMonths ? Math.round(net / allocationMonths) : 0;
        }
    })();

    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!incomeType) errs.incomeType = "Please choose an income type.";
        if (!sourceName.trim()) errs.sourceName = "Source name is required.";
        if (grossIncome <= 0) errs.grossIncome = "Enter a valid amount (greater than 0).";
        if (deductions > grossIncome) errs.deductions = "Deductions can\u2019t exceed gross income.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSaveStep1 = () => {
        if (!validateStep1()) return;

        // Check for duplicates
        if (IncomeStore.checkDuplicate(sourceName, frequency)) {
            setErrors({ sourceName: "A source with this name and frequency already exists." });
            return;
        }

        const record = IncomeStore.addRecord({
            status: "finalized",
            incomeType: incomeType!,
            sourceName: sourceName.trim(),
            frequency,
            grossIncome,
            deductions,
            allocationMonths: frequency === "one_time" ? allocationMonths : undefined,
            tdsAmount: undefined,
            riskLevel: "low",
            lastReviewedAt: Date.now(),
            creditedAccountId: creditedBank.trim() || undefined,
        });

        setSavedRecordId(record.id);
        setStep("win");
    };

    const handleSaveStep2 = () => {
        if (savedRecordId) {
            const patch: Record<string, unknown> = { riskLevel };
            if (historicalIncome > 0) patch.historicalIncome = historicalIncome;
            if (expectedGrowth !== 0) patch.expectedGrowthPct = expectedGrowth;
            if (tdsAmount > 0) patch.tdsAmount = tdsAmount;
            if (notes.trim()) patch.notes = notes.trim();
            IncomeStore.updateRecord(savedRecordId, patch);
        }
        router.push("/kosh");
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            {step === 1 ? "Add Income Source" : step === 2 ? "Strengthen This Source" : "Treasury Updated"}
                        </h1>
                        <p className="text-xs text-white/50 mt-0.5">
                            {step === 1 ? "Basic details first. You can add more later." : step === 2 ? "Optional details for better analytics." : ""}
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                {step !== "win" && (
                    <div className="flex items-center gap-2 mb-6">
                        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[var(--color-rajya-accent)]" : "bg-white/10"}`} />
                        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[var(--color-rajya-accent)]" : "bg-white/10"}`} />
                    </div>
                )}

                {/* ——— STEP 1: Quick Capture ——— */}
                {step === 1 && (
                    <div className="flex-1 space-y-7">
                        {/* Tutorial strip */}
                        <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3">
                            <p className="text-xs text-[var(--color-rajya-muted)]">
                                💡 <strong className="text-[var(--color-rajya-text)]">Step 1: Quick Capture</strong> — Enter the basics in 60 seconds. Select your income type, name the source, enter the amount, and optionally link your bank account.
                            </p>
                        </div>

                        {/* YouTube tutorial */}
                        <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="How to record and track your income sources" />

                        <IncomeTypeChips selected={incomeType} onSelect={setIncomeType} error={errors.incomeType} />

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-3 block">Source Name</label>
                            <input
                                type="text"
                                value={sourceName}
                                onChange={e => setSourceName(e.target.value)}
                                placeholder="e.g. ABC Pvt Ltd"
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none"
                            />
                            {errors.sourceName && <p className="text-[10px] text-[var(--color-rajya-danger)] mt-1">⚠ {errors.sourceName}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-3 block">Frequency</label>
                            <div className="flex gap-2">
                                {FREQUENCIES.map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFrequency(f.id)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${frequency === f.id
                                            ? "bg-[var(--color-rajya-accent)] text-black border-[var(--color-rajya-accent)]"
                                            : "bg-white/5 border-white/10 text-[var(--color-rajya-text)]"
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <NumberInputRupee label="Gross Income" value={grossIncome} onChange={setGrossIncome} error={errors.grossIncome} />
                        <NumberInputRupee label="Deductions" value={deductions} onChange={setDeductions} optional error={errors.deductions} />

                        {/* Allocation months for one_time */}
                        {frequency === "one_time" && (
                            <div>
                                <label className="text-xs text-[var(--color-rajya-muted)] mb-3 block">
                                    Allocate across months <span className="opacity-50">(Optional)</span>
                                </label>
                                <input
                                    type="number"
                                    value={allocationMonths || ""}
                                    onChange={e => setAllocationMonths(e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="Leave empty to exclude from monthly"
                                    className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none"
                                />
                                <p className="text-[10px] text-[var(--color-rajya-muted)] mt-1">
                                    One-time income is not counted in monthly cash flow unless you allocate it.
                                </p>
                            </div>
                        )}

                        {/* Bank account field */}
                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-3 block">
                                Credited Bank Account <span className="opacity-50">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={creditedBank}
                                onChange={e => setCreditedBank(e.target.value)}
                                placeholder="e.g. SBI Salary Account, HDFC Current A/C"
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none"
                            />
                            <p className="text-[10px] text-[var(--color-rajya-muted)] mt-1">
                                🏦 Name the bank account where this income is credited. In Module 5 you can add full bank details and link them.
                            </p>
                        </div>

                        {/* Live preview */}
                        {grossIncome > 0 && (
                            <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3">
                                <p className="text-xs text-[var(--color-rajya-muted)]">Estimated Monthly Net</p>
                                <p className="text-lg font-bold text-[var(--color-rajya-accent)]">
                                    {monthlyPreview > 0
                                        ? `₹${monthlyPreview.toLocaleString("en-IN")}`
                                        : "Not included in monthly"
                                    }
                                </p>
                                {frequency === "one_time" && !allocationMonths && (
                                    <p className="text-[10px] text-[var(--color-rajya-muted)] mt-1">This will not be included in monthly income unless allocated.</p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleSaveStep1}
                            className="w-full bg-[var(--color-rajya-accent)] text-black font-semibold py-4 rounded-xl text-sm mt-4"
                        >
                            Save & Continue
                        </button>
                    </div>
                )}

                {/* ——— WIN MODAL ——— */}
                {step === "win" && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <CheckCircle2 className="w-16 h-16 text-[var(--color-rajya-success)]" />
                        <h2 className="font-display text-2xl text-[var(--color-rajya-text)]">Treasury Updated</h2>
                        <div className="space-y-2 text-center">
                            <p className="text-xs text-[var(--color-rajya-muted)]">✓ Income source saved</p>
                            <p className="text-xs text-[var(--color-rajya-muted)]">✓ Dependency risk updated</p>
                            <p className="text-xs text-[var(--color-rajya-accent)]">♚ {IncomeStore.getRecords().length === 1 ? "King piece placed!" : "Board updated!"}</p>
                        </div>
                        <div className="w-full space-y-3 mt-4">
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-[var(--color-rajya-accent)] text-black font-semibold py-4 rounded-xl text-sm"
                            >
                                Add Strength Details
                            </button>
                            <button
                                onClick={() => router.push("/kosh")}
                                className="w-full text-center text-xs text-white/50 py-2"
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>
                )}

                {/* ——— STEP 2: Strength Details ——— */}
                {step === 2 && (
                    <div className="flex-1 space-y-5">
                        {/* Tutorial strip */}
                        <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3">
                            <p className="text-xs text-[var(--color-rajya-muted)]">
                                💡 <strong className="text-[var(--color-rajya-text)]">Step 2: Strengthen</strong> — Adding risk level and growth % improves your Income Strength Index (ISI). This step is optional — you can <em>Skip for Now</em> and add later.
                            </p>
                        </div>

                        {/* YouTube tutorial */}
                        <VideoTutorialPlaceholder youtubeId="3Ob3stTkGLs" label="Understanding income risk levels & tax planning" />

                        {/* Risk Level with Guide */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-[var(--color-rajya-muted)]">Risk Level</label>
                                <button
                                    onClick={() => setShowRiskGuide(!showRiskGuide)}
                                    className="text-[10px] text-[var(--color-rajya-accent)] underline"
                                >
                                    {showRiskGuide ? "Hide guide" : "What is this?"}
                                </button>
                            </div>

                            {/* Risk level guide */}
                            {showRiskGuide && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3 space-y-2">
                                    <p className="text-[10px] text-[var(--color-rajya-muted)] font-medium">Risk Level helps assess how stable and predictable this income source is:</p>
                                    <div className="space-y-1.5">
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold shrink-0">LOW</span>
                                            <p className="text-[10px] text-[var(--color-rajya-muted)]">Stable, predictable income — e.g. government salary, pension, fixed deposit interest, rent from long-term tenant</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded font-bold shrink-0">MEDIUM</span>
                                            <p className="text-[10px] text-[var(--color-rajya-muted)]">Moderately variable — e.g. private sector salary, business with regular clients, freelance retainer contracts</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-bold shrink-0">HIGH</span>
                                            <p className="text-[10px] text-[var(--color-rajya-muted)]">Unpredictable or volatile — e.g. stock market gains, project-based freelancing, crypto income, seasonal business</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[var(--color-rajya-accent)]">💡 Lower risk = higher Stability score in your ISI analytics</p>
                                </div>
                            )}

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

                        <NumberInputRupee label="Historical Income (Last Year)" value={historicalIncome} onChange={setHistoricalIncome} optional />

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Expected Growth (%)</label>
                            <input
                                type="number"
                                value={expectedGrowth || ""}
                                onChange={e => setExpectedGrowth(e.target.value ? parseInt(e.target.value) : 0)}
                                placeholder="e.g. 10"
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none"
                            />
                            <p className="text-[10px] text-[var(--color-rajya-muted)] mt-1">Enter the expected annual growth % for this income (e.g. annual raise, rent escalation).</p>
                        </div>

                        <NumberInputRupee label="TDS Amount" value={tdsAmount} onChange={setTdsAmount} optional />

                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Notes <span className="opacity-50">(Optional)</span></label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Any notes about this income source..."
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none resize-none"
                            />
                        </div>

                        <button
                            onClick={handleSaveStep2}
                            className="w-full bg-[var(--color-rajya-accent)] text-black font-semibold py-4 rounded-xl text-sm mt-4"
                        >
                            Save Details
                        </button>
                        <button
                            onClick={() => router.push("/kosh")}
                            className="w-full text-center text-xs text-white/50 py-2"
                        >
                            Skip for Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
