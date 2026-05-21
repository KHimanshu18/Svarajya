"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Shield, ArrowLeft, Save, Loader2,
    Calendar, Building2, User, CreditCard,
    Check
} from "lucide-react";
import { useRakshaStore } from "@/lib/stores/rakshaStore";
import { NotificationStore } from "@/lib/stores/notificationStore";

const POLICY_TYPES = ["LIFE", "TERM", "HEALTH", "VEHICLE", "HOME", "TRAVEL", "OTHER"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "ANNUAL"];

export default function EditPolicyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const { updatePolicy } = useRakshaStore();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        type: "LIFE",
        policyNumber: "",
        insurerName: "",
        sumAssured: 0,
        premium: 0,
        premiumFrequency: "ANNUAL",
        dueDate: "",
        maturityDate: "",
        nomineeId: "",
        agentContact: "",
        status: "ACTIVE",
        coveredMemberIds: [] as string[]
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch family members
                const familyRes = await fetch('/api/family');
                const familyResult = await familyRes.json();
                if (familyResult.data) setFamilyMembers(familyResult.data);

                // Fetch policy details
                const policyRes = await fetch(`/api/insurance/${id}`);
                const policyResult = await policyRes.json();
                if (policyResult.data) {
                    const p = policyResult.data;
                    setFormData({
                        type: p.type,
                        policyNumber: p.policyNumber,
                        insurerName: p.insurerName || "",
                        sumAssured: p.sumAssured,
                        premium: p.premium,
                        premiumFrequency: p.premiumFrequency,
                        dueDate: p.dueDate.split('T')[0],
                        maturityDate: p.maturityDate ? p.maturityDate.split('T')[0] : "",
                        nomineeId: p.nomineeId || "",
                        agentContact: p.agentContact || "",
                        status: p.status,
                        coveredMemberIds: p.coverage ? p.coverage.map((c: any) => c.memberId) : []
                    });
                }
            } catch (err) {
                console.error("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`/api/insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (result.data) {
                updatePolicy(result.data);
                NotificationStore.push({
                    type: 'milestone',
                    title: 'Shield Reinforced',
                    message: `Successfully updated ${formData.insurerName} policy.`,
                });
                router.replace(`/raksha/policies/${id}`);
            } else {
                NotificationStore.push({
                    type: 'warning',
                    title: 'Reinforcement Failed',
                    message: result.message || "Failed to update policy",
                });
            }
        } catch (err) {
            NotificationStore.push({
                type: 'warning',
                title: 'System Error',
                message: "An unexpected error occurred while reinforcing the shield.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCoveredMember = (id: string) => {
        setFormData((prev: any) => ({
            ...prev,
            coveredMemberIds: prev.coveredMemberIds.includes(id)
                ? prev.coveredMemberIds.filter((mid: string) => mid !== id)
                : [...prev.coveredMemberIds, id]
        }));
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950">
                <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24 lg:p-10">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-display text-white">Reinforce Shield</h1>
                        <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Edit Policy</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Policy Type</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
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
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.policyNumber}
                                    onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Insurer Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.insurerName}
                                    onChange={e => setFormData({ ...formData, insurerName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Sum Assured (₹)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.sumAssured}
                                    onChange={e => setFormData({ ...formData, sumAssured: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Premium Amount (₹)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.premium}
                                    onChange={e => setFormData({ ...formData, premium: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Next Due Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Status</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE" className="bg-slate-900">ACTIVE</option>
                                    <option value="LAPSED" className="bg-slate-900">LAPSED</option>
                                    <option value="MATURED" className="bg-slate-900">MATURED</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs text-white/40 uppercase tracking-wider ml-1 block">Covered Members</label>
                            <div className="flex flex-wrap gap-2">
                                {familyMembers.map(member => {
                                    const isSelected = formData.coveredMemberIds.includes(member.id);
                                    return (
                                        <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => toggleCoveredMember(member.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${isSelected
                                                ? "bg-amber-500/20 border-amber-500 text-amber-500"
                                                : "bg-white/5 border-white/10 text-white/40"
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3" />}
                                            {member.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase tracking-wider ml-1">Primary Nominee</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                value={formData.nomineeId}
                                onChange={e => setFormData({ ...formData, nomineeId: e.target.value })}
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
                                onChange={e => setFormData({ ...formData, agentContact: e.target.value })}
                                placeholder="e.g., Ramesh - 9876543210"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={() => router.back()} className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-[2] px-6 py-4 bg-amber-500 text-black rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
