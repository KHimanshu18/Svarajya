"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { ExpenseStore, PAYMENT_MODES, PaymentMode, ExpenseFrequency, formatRupee } from "@/lib/expenseStore";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

export default function AddExpensePage() {
    const router = useRouter();

    // Fast fields
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
    const [recurring, setRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<ExpenseFrequency>("monthly");

    // Optional (collapsed)
    const [showOptional, setShowOptional] = useState(false);
    const [description, setDescription] = useState("");
    const [linkedFamilyId, setLinkedFamilyId] = useState("");
    const [paidFromAccount] = useState("");

    // UI State
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");

    const categories = ExpenseStore.getActiveCategories();
    const filteredCategories = categorySearch
        ? categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
        : categories;

    const entryCount = ExpenseStore.getEntryCount();

    const handleSave = () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { 
            setError("Amount must be greater than 0."); 
            return; 
        }

        // If no category chosen, default to "other"
        const finalCategory = categoryId || "other";

        setError("");
        ExpenseStore.addEntry({
            date,
            amount: amt,
            categoryId: finalCategory,
            paymentMode,
            recurring,
            recurringFrequency: recurring ? recurringFrequency : undefined,
            description: description.trim() || undefined,
            linkedFamilyMemberId: linkedFamilyId || undefined,
            paidFromAccountId: paidFromAccount || undefined,
        });
        setSaved(true);
    };

    const monthlyTotal = ExpenseStore.getMonthlyTotal();

    // --- SUCCESS VIEW ---
    if (saved) {
        const showInsightStrip = entryCount + 1 >= 5; 
        const breakdown = ExpenseStore.getCategoryBreakdown();
        const top2 = breakdown.slice(0, 2);

        return (
            <div className="flex flex-col min-h-screen p-6 pb-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-400/6 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col min-h-screen items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Expense Added</h2>
                    <p className="text-sm text-white/50 mb-1">Vyaya updated. Monthly spend: <span className="text-amber-400 font-semibold">{formatRupee(monthlyTotal)}</span></p>

                    {showInsightStrip && top2.length >= 2 && (
                        <div className="bg-[var(--color-rajya-accent)]/10 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3 mt-4 w-full max-w-sm">
                            <p className="text-xs text-[var(--color-rajya-text)]">
                                📊 Pattern detected: <strong>{top2[0].name} + {top2[1].name}</strong> = {top2[0].percentage + top2[1].percentage}% of spends.
                            </p>
                            <button onClick={() => router.push("/vyaya/analytics")} className="text-[10px] text-[var(--color-rajya-accent)] underline mt-1">View Analytics</button>
                        </div>
                    )}

                    {!categoryId && (
                        <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 mt-3 w-full max-w-sm">
                            <p className="text-xs text-amber-400">📋 This expense was saved as &quot;Other&quot;. Classify it for better clarity.</p>
                            <button onClick={() => router.push("/vyaya/categories")} className="text-[10px] text-amber-400 underline mt-1">Set up categories</button>
                        </div>
                    )}

                    <div className="w-full max-w-sm space-y-3 mt-6">
                        <button onClick={() => { setSaved(false); setAmount(""); setCategoryId(""); setDescription(""); }}
                            className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm transition-transform active:scale-[0.98]">
                            Add Another Expense
                        </button>
                        <button onClick={() => router.push("/vyaya")}
                            className="w-full bg-white/8 border border-white/15 text-white/70 py-3 rounded-xl text-sm">
                            Back to Vyaya Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- FORM VIEW ---
    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-4">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Add Expense</h1>
                        <p className="text-xs text-white/35 mt-0.5">Quick entry. Details optional.</p>
                    </div>
                </div>

                {/* Tutorial */}
                <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3 mb-4">
                    <p className="text-xs text-[var(--color-rajya-muted)]">💡 <strong className="text-[var(--color-rajya-text)]">Real clarity</strong> begins when the drain is measured.</p>
                </div>
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="How to track expenses effectively" />
                <div className="h-4" />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mb-4 animate-in fade-in slide-in-from-top-1">
                        <span className="text-xs text-red-400">⚠ {error}</span>
                    </div>
                )}

                <div className="space-y-4 mb-4">
                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                    </div>

                    {/* Amount Input (Auto-Focus & Step Added) */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/60">₹</span>
                            <input 
                                type="number" 
                                inputMode="decimal" 
                                placeholder="0.00" 
                                value={amount}
                                autoFocus
                                step="0.01"
                                onChange={e => { setAmount(e.target.value); setError(""); }}
                                className="w-full bg-white/6 border border-white/15 rounded-xl pl-7 pr-3 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 transition-all" 
                            />
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Category <span className="text-white/40 font-normal">(default: Other)</span></label>
                        <input type="text" placeholder="Search categories..." value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60" />
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
                            {filteredCategories.map(c => (
                                <button key={c.id} onClick={() => { setCategoryId(c.id); setCategorySearch(""); }}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${categoryId === c.id
                                        ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                        : "bg-white/5 border-white/10 text-white/40"}`}>
                                    {c.emoji} {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Payment Mode</label>
                        <div className="flex flex-wrap gap-2">
                            {PAYMENT_MODES.map(m => (
                                <button key={m.id} onClick={() => setPaymentMode(m.id)}
                                    className={`px-2.5 py-2 rounded-lg border text-[11px] transition-all ${paymentMode === m.id
                                        ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                        : "bg-white/5 border-white/10 text-white/40"}`}>
                                    {m.emoji} {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recurring Toggle */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                        <div>
                            <p className="text-sm text-white">Repeat this expense?</p>
                            <p className="text-[10px] text-white/30">Mark as recurring to auto-track monthly.</p>
                        </div>
                        <button onClick={() => setRecurring(!recurring)}
                            className={`w-12 h-7 rounded-full border transition-colors flex items-center px-0.5 ${recurring ? "bg-emerald-500 border-emerald-500" : "bg-white/10 border-white/20"}`}>
                            <div className={`w-6 h-6 rounded-full bg-white transition-transform ${recurring ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>

                    {recurring && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <label className="text-xs font-medium text-white/70">Frequency</label>
                            <div className="flex gap-2">
                                {(["monthly", "quarterly", "annual"] as ExpenseFrequency[]).map(f => (
                                    <button key={f} onClick={() => setRecurringFrequency(f)}
                                        className={`flex-1 px-2 py-2.5 rounded-xl border text-xs transition-all capitalize ${recurringFrequency === f
                                            ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                            : "bg-white/5 border-white/10 text-white/40"}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Optional Details */}
                <button onClick={() => setShowOptional(!showOptional)}
                    className="w-full flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 mb-3 text-sm text-white/70 hover:bg-white/5 transition-colors">
                    <span>Optional Details</span>
                    {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showOptional && (
                    <div className="space-y-4 mb-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/70">Description</label>
                            <input type="text" placeholder="What was this for?" value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/70">Linked Family Member <span className="text-white/40 font-normal">(optional)</span></label>
                            <select value={linkedFamilyId} onChange={e => setLinkedFamilyId(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                <option value="">Select family member</option>
                            </select>
                            <p className="text-[11px] text-white/40">Family members from Foundation module appear here.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/70">Paid From Account <span className="text-white/40 font-normal">(Module 6)</span></label>
                            <p className="text-[11px] text-white/40">Account linking will be available after Module 6 setup.</p>
                        </div>
                    </div>
                )}

                {/* Matka Leak Animation logic */}
                {amount && parseFloat(amount) > 0 && (
                    <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-4 flex items-center gap-3 animate-pulse">
                        <span className="text-2xl">💧</span>
                        <p className="text-xs text-white/50">
                            This expense reduces your water level by <strong className="text-white/70">{formatRupee(parseFloat(amount))}</strong>
                        </p>
                    </div>
                )}

                {/* Primary Action */}
                <button onClick={handleSave}
                    className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm transition-all hover:bg-amber-300 active:scale-[0.98]">
                    Save Expense
                </button>
            </div>
        </div>
    );
}
