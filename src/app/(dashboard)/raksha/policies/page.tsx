"use client";
import React from 'react';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Shield, Plus, ArrowLeft, Calendar,
    ChevronRight, AlertCircle, CheckCircle2,
    Clock, Building2, User
} from "lucide-react";
import { motion } from "framer-motion";
import { useRakshaStore } from "@/lib/stores/rakshaStore";
import { formatRupee } from "@/lib/incomeStore";

export default function InsuranceListPage() {
    const router = useRouter();
    const { policies, stats, loading, fetchPolicies } = useRakshaStore();
    const [annualIncome, setAnnualIncome] = React.useState<number>(0);

    useEffect(() => {
        fetchPolicies();

        const fetchIncome = async () => {
            try {
                const res = await fetch('/api/income');
                const result = await res.json();
                if (result.data) {
                    const totalIncome = result.data.reduce((sum: number, inc: any) => sum + (inc.amountNet * (inc.frequency === 'MONTHLY' ? 12 : 1)), 0);
                    setAnnualIncome(totalIncome);
                }
            } catch (err) { }
        };
        fetchIncome();
    }, [fetchPolicies]);

    const getStatusColor = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "text-red-500 bg-red-500/10 border-red-500/20";
        if (diffDays <= 30) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    };

    const getStatusText = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "Lapsed";
        if (diffDays <= 30) return `Due in ${diffDays}d`;
        return "Active";
    };

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24 lg:p-10">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/raksha")}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/60" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-display text-white">Insurance Policies</h1>
                            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Raksha Mandal</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push("/raksha/policies/add")}
                        className="flex items-center gap-2 bg-[var(--color-rajya-accent)] text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" />
                        Add Policy
                    </button>
                </div>

                {/* Stats Summary */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total Sum Assured</p>
                            <p className="text-xl font-display text-[var(--color-rajya-accent)]">{formatRupee(stats.totalSumAssured)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Annual Premium</p>
                            <p className="text-xl font-display text-white">{formatRupee(stats.totalAnnualPremium)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Fortress Health</p>
                                <p className={`text-sm font-bold uppercase tracking-widest ${stats.healthStatus === 'secure' ? 'text-emerald-500' :
                                        stats.healthStatus === 'warning' ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                    {stats.healthStatus}
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.healthStatus === 'secure' ? 'bg-emerald-500/10 text-emerald-500' :
                                    stats.healthStatus === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Policy List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-2 border-[var(--color-rajya-accent)]/20 border-t-[var(--color-rajya-accent)] rounded-full animate-spin" />
                            <p className="text-white/40 text-sm">Inspecting the archives...</p>
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <Shield className="w-10 h-10 text-white/20" />
                            </div>
                            <h3 className="text-xl text-white font-display mb-2">No Shields Erected</h3>
                            <p className="text-white/40 text-sm max-w-xs mb-8">
                                Your kingdom is currently exposed. Add your first insurance policy to secure your Kosh.
                            </p>
                            <button
                                onClick={() => router.push("/raksha/policies/add")}
                                className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-xl hover:bg-white/10 transition-all"
                            >
                                Secure Your Kingdom
                            </button>
                        </div>
                    ) : (
                        policies.map((policy, i) => (
                            <motion.div
                                key={policy.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => router.push(`/raksha/policies/${policy.id}`)}
                                className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 w-24 h-24 bg-[var(--color-rajya-accent)]/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-[var(--color-rajya-accent)]/30 transition-colors">
                                            <Shield className="w-6 h-6 text-[var(--color-rajya-accent)]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-white font-semibold">{policy.insurerName || 'Unknown Insurer'}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest ${getStatusColor(policy.dueDate)}`}>
                                                    {getStatusText(policy.dueDate)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{policy.type} • {policy.policyNumber}</p>

                                            {/* Underinsurance Warning */}
                                            {(() => {
                                                let recommendation = 0;
                                                let isUnderinsured = false;
                                                if (policy.type === 'LIFE' || policy.type === 'TERM') {
                                                    recommendation = annualIncome * 10;
                                                    isUnderinsured = annualIncome > 0 && policy.sumAssured < recommendation;
                                                } else if (policy.type === 'HEALTH') {
                                                    recommendation = 500000;
                                                    isUnderinsured = policy.sumAssured < recommendation;
                                                }

                                                if (isUnderinsured) {
                                                    return (
                                                        <div className="flex items-center gap-1.5 mt-2 text-red-400">
                                                            <AlertCircle className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Underinsured</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-12">
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sum Assured</p>
                                            <p className="text-sm text-white font-medium">{formatRupee(policy.sumAssured)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Due Date</p>
                                            <div className="flex items-center gap-1.5 text-sm text-white font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-white/40" />
                                                {new Date(policy.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <div className="hidden md:block">
                                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[var(--color-rajya-accent)] transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {policy.coverage && policy.coverage.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                                        <User className="w-3 h-3 text-white/20 shrink-0" />
                                        <div className="flex items-center gap-1.5">
                                            {policy.coverage.map((c) => (
                                                <span key={c.id} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/60 whitespace-nowrap">
                                                    {c.member.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
