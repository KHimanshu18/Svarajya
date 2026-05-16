"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Shield, ArrowLeft, Edit2, Trash2,
    Calendar, Building2, User, CreditCard,
    Clock, CheckCircle2, AlertTriangle,
    FileText, Phone, Download
} from "lucide-react";
import { motion } from "framer-motion";
import { useRakshaStore } from "@/lib/stores/rakshaStore";
import { NotificationStore } from "@/lib/notificationStore";
import { formatRupee } from "@/lib/incomeStore";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const { deletePolicy } = useRakshaStore();

    const [policy, setPolicy] = useState<any>(null);
    const [nomineeName, setNomineeName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [annualIncome, setAnnualIncome] = useState<number>(0);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await fetch(`/api/insurance/${id}`);
                const result = await res.json();
                if (result.data) {
                    setPolicy(result.data);
                    
                    // Fetch nominee name separately
                    if (result.data.nomineeId) {
                        const famRes = await fetch('/api/family');
                        const famResult = await famRes.json();
                        if (famResult.data) {
                            const nominee = famResult.data.find((m: any) => m.id === result.data.nomineeId);
                            if (nominee) setNomineeName(nominee.name);
                        }
                    }
                }

                // Fetch income for underinsurance check
                const incRes = await fetch('/api/income');
                const incResult = await incRes.json();
                if (incResult.data) {
                    const totalIncome = incResult.data.reduce((sum: number, inc: any) => sum + (inc.amountNet * (inc.frequency === 'MONTHLY' ? 12 : 1)), 0);
                    setAnnualIncome(totalIncome);
                }

            } catch (err) {
                console.error("Failed to fetch policy details");
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, [id]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/insurance/${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.data?.success) {
                deletePolicy(id);
                NotificationStore.push({
                    type: 'warning',
                    title: 'Shield Abandoned',
                    message: `Policy ${policy.policyNumber} has been removed from your kingdom.`,
                });
                router.push('/raksha/policies');
            }
        } catch (err) {
            NotificationStore.push({
                type: 'warning',
                title: 'Operation Failed',
                message: "The shield could not be abandoned at this time.",
            });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950">
                <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl text-white font-display mb-2">Shield Not Found</h2>
                <p className="text-white/40 mb-8 text-sm">The records of this shield have been lost in time.</p>
                <button onClick={() => router.push('/raksha/policies')} className="text-amber-500 font-bold uppercase tracking-widest text-xs">Return to Raksha</button>
            </div>
        );
    }

    const isLapsed = new Date(policy.dueDate) < new Date();
    const isExpiringSoon = !isLapsed && (new Date(policy.dueDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000);

    // Underinsurance Check
    let recommendation = 0;
    let isUnderinsured = false;
    if (policy.type === 'LIFE' || policy.type === 'TERM') {
        recommendation = annualIncome * 10;
        isUnderinsured = annualIncome > 0 && policy.sumAssured < recommendation;
    } else if (policy.type === 'HEALTH') {
        recommendation = 500000; // 5 Lakhs min
        isUnderinsured = policy.sumAssured < recommendation;
    }

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24 lg:p-10">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/60" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-display text-white">{policy.insurerName}</h1>
                            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{policy.type} • {policy.policyNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/raksha/policies/${id}/edit`)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Alerts */}
                    <div className="lg:col-span-3 space-y-4">
                        {isExpiringSoon && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <Clock className="w-6 h-6 text-amber-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Renewal Warning</h4>
                                    <p className="text-xs text-white/60">This shield expires in less than 30 days. Plan your renewal to maintain protection.</p>
                                </div>
                            </div>
                        )}
                        {isUnderinsured && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider">Underinsurance Alert</h4>
                                    <p className="text-xs text-white/60">
                                        Your cover is lower than the recommended ₹{formatRupee(recommendation)}. 
                                        Consider reinforcing this shield.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Left Column: Key Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <Shield className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${isLapsed ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                        }`}>
                                        {isLapsed ? "Lapsed" : "Active"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold">Sum Assured</p>
                                        <p className="text-3xl font-display text-white">{formatRupee(policy.sumAssured)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold">Annual Premium</p>
                                        <p className="text-3xl font-display text-amber-500">{formatRupee(policy.premium)}</p>
                                        <p className="text-[10px] text-white/20 uppercase tracking-wider mt-1">{policy.premiumFrequency} PAYMENT</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Covered Members */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Protected Souls
                            </h3>
                            {policy.coverage && policy.coverage.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {policy.coverage.map((c: any) => (
                                        <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/60">
                                                {c.member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{c.member.name}</p>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider">{c.member.relation}</p>
                                            </div>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/20 italic">No specific members linked to this shield.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Schedule & Details */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Renewal Timeline
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/30">Next Due Date</span>
                                    <span className="text-sm text-white font-medium">
                                        {new Date(policy.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${isLapsed ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: isLapsed ? '100%' : '60%' }} />
                                </div>
                                {policy.maturityDate && (
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-xs text-white/30">Maturity Date</span>
                                        <span className="text-sm text-white font-medium">
                                            {new Date(policy.maturityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Support & Nominee
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Primary Nominee</p>
                                    <p className="text-sm text-white">{nomineeName || 'Not assigned'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Agent / Contact</p>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <Phone className="w-3 h-3 text-white/30" />
                                        {policy.agentContact || 'None listed'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Google Drive Integration Pending */}
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group transition-all opacity-50">
                            <div className="flex items-center gap-3 text-left">
                                <FileText className="w-5 h-5 text-white/20" />
                                <div>
                                    <p className="text-sm font-medium">Policy Document</p>
                                    <p className="text-[10px] text-[var(--color-rajya-accent)] uppercase tracking-widest">Google Drive Coming Soon</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
                    >
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl text-white font-display mb-2">Abandon this Shield?</h3>
                        <p className="text-white/40 text-sm mb-8">This action will remove the protection records from your kingdom forever. It cannot be undone.</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                            >
                                Stay Protected
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {deleting ? <Clock className="w-4 h-4 animate-spin" /> : "Abandon"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
