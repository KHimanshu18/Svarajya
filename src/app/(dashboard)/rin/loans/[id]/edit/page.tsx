"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Landmark, CreditCard, Calendar, Info, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

const LOAN_TYPES = [
    { value: "HOME", label: "Home Loan" },
    { value: "PERSONAL", label: "Personal Loan" },
    { value: "VEHICLE", label: "Vehicle Loan" },
    { value: "EDUCATION", label: "Education Loan" },
    { value: "BUSINESS", label: "Business Loan" },
    { value: "CREDIT_CARD", label: "Credit Card Debt" },
    { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Active" },
    { value: "CLOSED", label: "Closed" },
    { value: "FORECLOSED", label: "Foreclosed" },
];

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        type: "PERSONAL",
        lenderName: "",
        principal: "",
        outstandingAmount: "",
        emi: "",
        interestRate: "",
        tenure: "",
        startDate: "",
        endDate: "",
        status: "ACTIVE",
        linkedPropertyId: ""
    });

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const res = await fetch(`/api/loans/${id}`);
                const json = await res.json();
                if (json.success) {
                    const l = json.data;
                    setFormData({
                        type: l.type,
                        lenderName: l.lenderName || "",
                        principal: l.principal.toString(),
                        outstandingAmount: l.outstandingAmount.toString(),
                        emi: l.emi.toString(),
                        interestRate: l.interestRate.toString(),
                        tenure: l.tenure.toString(),
                        startDate: l.startDate ? l.startDate.split('T')[0] : "",
                        endDate: l.endDate ? l.endDate.split('T')[0] : "",
                        status: l.status,
                        linkedPropertyId: l.linkedPropertyId || ""
                    });
                } else {
                    toast("Loan not found", "error");
                    router.push("/rin/loans");
                }
            } catch (err) {
                toast("Error loading loan", "error");
            } finally {
                setLoading(false);
            }
        };
        void fetchLoan();
    }, [id, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/loans/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast("Loan updated successfully!", "success");
                router.push(`/rin/loans/${id}`);
            } else {
                toast(json.error?.message || "Failed to update loan", "error");
            }
        } catch (err) {
            toast("An unexpected error occurred.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <main className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <header className="pt-12 pb-6 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <h1 className="text-xl font-bold text-white">Edit Loan</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Loan Status */}
                <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Account Status</label>
                    <div className="flex gap-2">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, status: s.value })}
                                className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    formData.status === s.value 
                                    ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" 
                                    : "bg-white/5 border-white/10 text-white/40"
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loan Type */}
                <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Loan Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {LOAN_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: t.value })}
                                className={`px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                                    formData.type === t.value 
                                    ? "bg-white/10 border-amber-500/50 text-amber-400" 
                                    : "bg-white/5 border-white/10 text-white/60"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lender Name */}
                <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Lender / Bank Name</label>
                    <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            required
                            placeholder="Bank Name"
                            value={formData.lenderName}
                            onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Principal</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                value={formData.principal}
                                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Outstanding</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                value={formData.outstandingAmount}
                                onChange={(e) => setFormData({ ...formData, outstandingAmount: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Monthly EMI</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                value={formData.emi}
                                onChange={(e) => setFormData({ ...formData, emi: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Interest Rate (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.interestRate}
                            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Tenure (Months)</label>
                        <input
                            type="number"
                            required
                            value={formData.tenure}
                            onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Start Date</label>
                        <input
                            type="date"
                            required
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                </div>
            </form>

            <div className="mt-8 pb-12">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-[10px] text-amber-200/60 leading-relaxed">
                        Updating your loan status to 'Closed' will remove it from active EMI calculations and reflect in your debt-free progress.
                    </p>
                </div>
            </div>
        </main>
    );
}
