"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Shield, ArrowLeft, Save, Loader2, 
    Calendar, Building2, User, CreditCard,
    Info, Plus, Trash2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRakshaStore } from "@/lib/stores/rakshaStore";
import { NotificationStore } from "@/lib/stores/notificationStore";

const POLICY_TYPES = ["LIFE", "TERM", "HEALTH", "VEHICLE", "HOME", "TRAVEL", "OTHER"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "ANNUAL"];

export default function AddPolicyPage() {
    const router = useRouter();
    const { addPolicy } = useRakshaStore();
    
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        type: "LIFE",
        policyNumber: "",
        insurerName: "",
        sumAssured: "",
        premium: "",
        premiumFrequency: "ANNUAL",
        dueDate: "",
        maturityDate: "",
        nomineeId: "",
        agentContact: "",
        status: "ACTIVE",
        coveredMemberIds: [] as string[]
    });

    useEffect(() => {
        const fetchFamily = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/family');
                const result = await res.json();
                if (result.data) setFamilyMembers(result.data);
            } catch (err) {
                console.error("Failed to fetch family members");
            } finally {
                setLoading(false);
            }
        };
        fetchFamily();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const res = await fetch('/api/insurance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    sumAssured: Number(formData.sumAssured),
                    premium: Number(formData.premium),
                })
            });
            
            const result = await res.json();
            
            if (result.data) {
                addPolicy(result.data);
                NotificationStore.push({
                    type: 'milestone',
                    title: 'Shield Erected',
                    message: `Successfully added ${formData.insurerName} ${formData.type} policy.`,
                });
                router.push('/raksha/policies');
            } else {
                NotificationStore.push({
                    type: 'warning',
                    title: 'Seal Failed',
                    message: result.message || "Failed to create policy",
                });
            }
        } catch (err) {
            NotificationStore.push({
                type: 'warning',
                title: 'System Error',
                message: "An unexpected error occurred while sealing the shield.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCoveredMember = (id: string) => {
        setFormData(prev => ({
            ...prev,
            coveredMemberIds: prev.coveredMemberIds.includes(id)
                ? prev.coveredMemberIds.filter(mid => mid !== id)
                : [...prev.coveredMemberIds, id]
        }));
    };

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24 lg:p-10">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => router.back()} 
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-display text-white">Erect New Shield</h1>
                        <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Add Insurance Policy</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2 text-[var(--color-rajya-accent)]">
                            <Shield className="w-4 h-4" />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Policy Foundation</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Policy Type</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    required
                                >
                                    {POLICY_TYPES.map(type => (
                                        <option key={type} value={type} className="bg-slate-900">{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Policy Number</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. POL-123456"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                                    value={formData.policyNumber}
                                    onChange={e => setFormData({...formData, policyNumber: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Insurer Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input 
                                        type="text"
                                        placeholder="e.g. LIC, HDFC Ergo, ICICI Prudential"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                                        value={formData.insurerName}
                                        onChange={e => setFormData({...formData, insurerName: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

        {/* Financials Section */}
                    
<div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
    <div className="flex items-center gap-2 mb-2 text-[var(--color-rajya-accent)]">
        <CreditCard className="w-4 h-4" />
        <h3 className="text-xs font-bold uppercase tracking-widest">Financial Cover</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">
                Sum Assured
            </label>

            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">₹</span>

                <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                    value={formData.sumAssured}
                    onChange={e =>
                        setFormData({
                            ...formData,
                            sumAssured: e.target.value.replace(/^0+(?=\d)/, "")
                        })
                    }
                    required
                    min="1"
                />
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">
                Premium Amount
            </label>

            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">₹</span>

                <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                    value={formData.premium}
                    onChange={e =>
                        setFormData({
                            ...formData,
                            premium: e.target.value.replace(/^0+(?=\d)/, "")
                        })
                    }
                    required
                    min="1"
                />
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Premium Frequency</label>
            <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                value={formData.premiumFrequency}
                onChange={e => setFormData({...formData, premiumFrequency: e.target.value})}
            >
                {FREQUENCIES.map(freq => (
                    <option key={freq} value={freq} className="bg-slate-900">{freq}</option>
                ))}
            </select>
        </div>

        <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Next Due Date</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    required
                />
            </div>
        </div>
    </div>
</div>

                    {/* Coverage & Nominee Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2 text-[var(--color-rajya-accent)]">
                            <User className="w-4 h-4" />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Beneficiaries & Coverage</h3>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs text-white/40 uppercase tracking-wider ml-1 block">Covered Members</label>
                            {loading ? (
                                <p className="text-xs text-white/20 italic">Summoning family members...</p>
                            ) : familyMembers.length === 0 ? (
                                <p className="text-xs text-amber-500/60 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                                    No family members found. Add them in Foundation (Shapana) first.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {familyMembers.map(member => {
                                        const isSelected = formData.coveredMemberIds.includes(member.id);
                                        return (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => toggleCoveredMember(member.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
                                                    isSelected 
                                                    ? "bg-[var(--color-rajya-accent)]/20 border-[var(--color-rajya-accent)] text-[var(--color-rajya-accent)]" 
                                                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/30"
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {member.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Primary Nominee</label>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[var(--color-rajya-accent)]/50 outline-none transition-all"
                                value={formData.nomineeId}
                                onChange={e => setFormData({...formData, nomineeId: e.target.value})}
                            >
                                <option value="" className="bg-slate-900">Select Nominee</option>
                                {familyMembers.filter(m => m.nomineeEligible).map(member => (
                                    <option key={member.id} value={member.id} className="bg-slate-900">
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-white/20 ml-1">Only family members marked as 'Nominee Eligible' are shown here.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Agent / Contact</label>
                            <input 
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                value={formData.agentContact}
                                onChange={e => setFormData({...formData, agentContact: e.target.value})}
                                placeholder="e.g., Ramesh - 9876543210"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-[2] px-6 py-4 bg-[var(--color-rajya-accent)] text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sealing...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Seal Shield
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
