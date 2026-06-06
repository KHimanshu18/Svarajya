"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Landmark, CreditCard, Calendar, Info } from "lucide-react";
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

export default function AddLoanPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState<Array<{ id: string; propertyTitle: string; propertyType: string }>>([]);
    const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; bankName: string }>>([]);
    const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string; relation?: string; nomineeEligible?: boolean }>>([]);

    const [formData, setFormData] = useState({
        type: "PERSONAL",
        lenderName: "",
        principal: "",
        outstandingAmount: "",
        emi: "",
        interestRate: "",
        tenure: "",
        startDate: new Date().toISOString().split('T')[0],
        status: "ACTIVE",
        linkedPropertyId: "",
        paidFromAccountId: "",
        coBorrowerId: ""
    });

    // Fetch properties, bank accounts, and family members on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch properties from Module 10
                const propsRes = await fetch("/api/bhoomi/properties");
                const propsData = await propsRes.json();
                setProperties(propsData?.data?.properties || []);
            } catch (err) {
                console.error("Failed to fetch properties", err);
            }

            try {
                // Fetch bank accounts from Module 6
                const bankRes = await fetch("/api/bank");
                const bankData = await bankRes.json();
                setBankAccounts(bankData?.data?.accounts || []);
            } catch (err) {
                console.error("Failed to fetch bank accounts", err);
            }

            try {
                // Fetch family members from Module 1
                const familyRes = await fetch("/api/family");
                const familyData = await familyRes.json();
                // Filter for spouse, parent, and adult children (nomineeEligible = true)
                const filtered = (familyData?.data || []).filter((member: any) => 
                    member.nomineeEligible === true
                );
                setFamilyMembers(filtered);
            } catch (err) {
                console.error("Failed to fetch family members", err);
            }
        };

        void fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/loans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast("Loan account created successfully!", "success");
                router.push("/rin/loans");
            } else {
                toast(json.error?.message || "Failed to create loan", "error");
            }
        } catch (err) {
            toast("An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <header className="pt-12 pb-6 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <h1 className="text-xl font-bold text-white">Add New Loan</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                                    ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" 
                                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
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
                            placeholder="e.g. HDFC Bank, SBI, ICICI"
                            value={formData.lenderName}
                            onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Principal */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Principal Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.principal}
                                onChange={(e) => setFormData({ ...formData, principal: e.target.value, outstandingAmount: formData.outstandingAmount || e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                    {/* Outstanding */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Outstanding</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.outstandingAmount}
                                onChange={(e) => setFormData({ ...formData, outstandingAmount: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* EMI */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Monthly EMI</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20 font-bold">₹</span>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={formData.emi}
                                onChange={(e) => setFormData({ ...formData, emi: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                    {/* Interest Rate */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Interest Rate (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="8.5"
                                value={formData.interestRate}
                                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Tenure */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Tenure (Months)</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 120"
                            value={formData.tenure}
                            onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    {/* Start Date */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Home Loan specific - Linked Property */}
                {formData.type === 'HOME' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                        <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Linked Property (Optional)</label>
                        <select
                            value={formData.linkedPropertyId}
                            onChange={(e) => setFormData({ ...formData, linkedPropertyId: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                        >
                            <option value="" className="bg-slate-900">Select a property</option>
                            {properties.map((prop) => (
                                <option key={prop.id} value={prop.id} className="bg-slate-900">
                                    {prop.propertyTitle || 'Unnamed Property'} ({prop.propertyType})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-white/40">Link this loan to a property from Module 10 (Bhoomi).</p>
                    </div>
                )}

                {/* Paid From Account (Optional) */}
                <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Paid From Account (Optional)</label>
                    <select
                        value={formData.paidFromAccountId}
                        onChange={(e) => setFormData({ ...formData, paidFromAccountId: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                    >
                        <option value="" className="bg-slate-900">Select a bank account</option>
                        {bankAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-slate-900">
                                {acc.bankName}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-white/40">Select the bank account from which EMI is paid (Module 6).</p>
                </div>

                {/* Co-borrower (Optional) */}
                <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-semibold ml-1">Co-borrower (Optional)</label>
                    <select
                        value={formData.coBorrowerId}
                        onChange={(e) => setFormData({ ...formData, coBorrowerId: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                    >
                        <option value="" className="bg-slate-900">Select a co-borrower</option>
                        {familyMembers.map((member) => (
                            <option key={member.id} value={member.id} className="bg-slate-900">
                                {member.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-white/40">Link a co-borrower from your family members (Module 1).</p>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        Create Loan Account
                    </button>
                </div>
            </form>

            <div className="mt-8 pb-12">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-[10px] text-amber-200/60 leading-relaxed">
                        Data is used to calculate your EMI burden ratio and financial health score. All data is encrypted and private.
                    </p>
                </div>
            </div>
        </main>
    );
}
