"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Scissors, Trash2, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { ExpenseStore, formatRupee, Subscription } from "@/lib/expenseStore";
import { useToast } from "@/components/providers/ToastProvider";

export default function SubscriptionsPage() {
    const router = useRouter();
    const toast = useToast();
    const [subs, setSubs] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);

    useEffect(() => {
        ExpenseStore.hydrate().then(() => {
            setSubs(ExpenseStore.getSubscriptions());
            setLoading(false);
        });
    }, []);

    const triggerDeleteConfirm = (sub: Subscription) => {
        setSubscriptionToDelete(sub);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!subscriptionToDelete) return;
        ExpenseStore.deleteSubscription(subscriptionToDelete.id);
        setSubs(ExpenseStore.getSubscriptions());
        setShowDeleteModal(false);
        setSubscriptionToDelete(null);
        toast("Subscription cancelled successfully", "success");
    };

    const totalMonthly = ExpenseStore.getMonthlySubscriptionTotal();
    const annualLeakage = ExpenseStore.getAnnualLeakageEstimate();
    const dormant = ExpenseStore.getDormantSubscriptions();

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50">Loading...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950">
            <header className="pt-8 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/vyaya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Subscriptions</h1>
                        <p className="text-xs text-white/35">Detect & stop silent leaks.</p>
                    </div>
                </div>
                <button onClick={() => router.push("/vyaya/subscriptions/add")} className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-black" />
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Monthly Total</p>
                    <p className="text-lg font-bold text-white">{formatRupee(totalMonthly)}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                    <p className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1">Potential Leakage</p>
                    <p className="text-lg font-bold text-red-400">{formatRupee(annualLeakage)}<span className="text-[10px] ml-1">/yr</span></p>
                </div>
            </div>

            {dormant.length > 0 && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 mb-6 flex items-start gap-3">
                    <Scissors className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400 leading-relaxed">
                        You have {dormant.length} subscriptions unused for 90+ days. Consider cancelling them to save {formatRupee(dormant.reduce((a, b) => a + b.amount, 0))} monthly.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1">Active Subscriptions ({subs.length})</h2>
                
                {subs.length === 0 ? (
                    <div className="text-center py-12 bg-white/3 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-white/20 text-sm">No subscriptions tracked yet.</p>
                        <button onClick={() => router.push("/vyaya/subscriptions/add")} className="text-amber-400 text-xs mt-2 underline">Add your first subscription</button>
                    </div>
                ) : (
                    subs.map(sub => (
                        <div key={sub.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                                        {sub.category === "STREAMING" ? "🎬" : sub.category === "SOFTWARE" ? "💻" : sub.category === "GYM" ? "💪" : "📦"}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">{sub.name}</h3>
                                        <p className="text-[10px] text-white/40">{sub.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">{formatRupee(sub.amount)}</p>
                                    <p className="text-[9px] text-white/30">per month</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                        <Calendar className="w-3 h-3" />
                                        Next: {new Date(sub.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                    {sub.lastUsedDate && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                            <CreditCard className="w-3 h-3" />
                                            Used: {new Date(sub.lastUsedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => triggerDeleteConfirm(sub)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && subscriptionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        
                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-2">Delete Subscription?</h3>
                        <p className="text-xs text-white/50 mb-6 leading-relaxed">
                            Are you sure you want to delete <strong className="text-white">{subscriptionToDelete.name}</strong>? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setShowDeleteModal(false); setSubscriptionToDelete(null); }}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
