"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ShieldCheck, AlertTriangle } from "lucide-react";
import { ExpenseStore, formatRupee } from "@/lib/expenseStore";

export default function BudgetPage() {
    const router = useRouter();
    const [totalBudget, setTotalBudget] = useState<number>(0);
    const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const categories = ExpenseStore.getActiveCategories();

    useEffect(() => {
        ExpenseStore.hydrate().then(() => {
            setTotalBudget(ExpenseStore.getTotalBudget());
            const catBudgets: Record<string, number> = {};
            categories.forEach(c => {
                catBudgets[c.id] = c.budgetAmount;
            });
            setCategoryBudgets(catBudgets);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        ExpenseStore.setTotalBudget(totalBudget);
        Object.entries(categoryBudgets).forEach(([id, amt]) => {
            ExpenseStore.setCategoryBudget(id, amt);
        });
        // Store.syncBudget is called internally by setCategoryBudget/setTotalBudget
        setTimeout(() => {
            setSaving(false);
            router.push("/vyaya");
        }, 1000);
    };

    const sumCategoryBudgets = Object.values(categoryBudgets).reduce((a, b) => a + b, 0);
    const remaining = totalBudget - sumCategoryBudgets;

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50">Loading...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950">
            <header className="pt-8 mb-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Budgeting</h1>
                        <p className="text-xs text-white/35">Define your boundaries.</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    {saving ? "Saving..." : <><Save className="w-3.5 h-3.5" /> Save</>}
                </button>
            </header>

            <div className="space-y-6">
                {/* Total Budget Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Monthly Spending Limit</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-white/30">₹</span>
                        <input
                            type="number"
                            value={totalBudget || ""}
                            onChange={e => setTotalBudget(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-4 text-2xl font-bold text-white focus:border-amber-400/50 outline-none"
                            placeholder="0"
                        />
                    </div>
                    <p className="text-[10px] text-white/40 mt-3 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        This is your primary defense line.
                    </p>
                </div>

                {/* Category Budgets */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Category-wise Limits</h2>
                        <span className={`text-[10px] ${remaining < 0 ? "text-red-400" : "text-white/30"}`}>
                            {remaining < 0 ? "Exceeds total by " : "Remaining: "} {formatRupee(Math.abs(remaining))}
                        </span>
                    </div>

                    <div className="grid gap-3">
                        {categories.map(cat => (
                            <div key={cat.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{cat.emoji}</span>
                                    <div>
                                        <p className="text-xs text-white font-medium">{cat.name}</p>
                                        <p className="text-[9px] text-white/30">Target spend</p>
                                    </div>
                                </div>
                                <div className="relative w-32">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/30">₹</span>
                                    <input
                                        type="number"
                                        value={categoryBudgets[cat.id] || ""}
                                        onChange={e => setCategoryBudgets({ ...categoryBudgets, [cat.id]: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white text-right focus:border-amber-400/50 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {remaining < 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-400 leading-relaxed">
                            Your category budgets sum up to more than your total monthly limit. 
                            This creates a &quot;Discipline Gap&quot; of {formatRupee(Math.abs(remaining))}.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
