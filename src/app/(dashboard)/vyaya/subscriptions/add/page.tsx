"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ExpenseStore } from "@/lib/expenseStore";
import { useToast } from "@/components/providers/ToastProvider";

export default function AddSubscriptionPage() {
    const router = useRouter();
    const toast = useToast();

    // Form fields
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("STREAMING");
    const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split("T")[0]);
    const [lastUsedDate, setLastUsedDate] = useState("");

    // Validation errors
    const [nameError, setNameError] = useState("");
    const [amountError, setAmountError] = useState("");
    const [renewalDateError, setRenewalDateError] = useState("");
    const [saving, setSaving] = useState(false);

    // Form validation check
    const validateForm = () => {
        let isValid = true;

        if (!name.trim()) {
            setNameError("Service name is required");
            isValid = false;
        } else {
            setNameError("");
        }

        const amt = parseFloat(amount);
        if (!amount || isNaN(amt) || amt <= 0) {
            setAmountError("Monthly amount must be greater than 0");
            isValid = false;
        } else {
            setAmountError("");
        }

        if (!renewalDate) {
            setRenewalDateError("Next renewal date is required");
            isValid = false;
        } else {
            setRenewalDateError("");
        }

        return isValid;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast("Please fill in all required fields correctly.", "error");
            return;
        }

        setSaving(true);
        try {
            const amt = parseFloat(amount);
            
            // Add subscription to the store and trigger background database sync
            ExpenseStore.addSubscription({
                name: name.trim(),
                amount: amt,
                category,
                renewalDate,
                lastUsedDate: lastUsedDate || undefined
            });

            toast("Subscription added successfully!", "success");
            
            // Redirect immediately to the subscriptions dashboard
            router.push("/vyaya/subscriptions");
        } catch (err) {
            console.error("Failed to save subscription:", err);
            toast("Could not track subscription. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950">
            <header className="pt-8 mb-8 flex items-center gap-3">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Track Subscription</h1>
                    <p className="text-xs text-white/35">Measure the silent drain.</p>
                </div>
            </header>

            <div className="space-y-5">
                {/* Service Name */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Service Name *</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Netflix, Spotify, AWS" 
                        value={name} 
                        onChange={e => { setName(e.target.value); setNameError(""); }}
                        className={`w-full bg-white/6 border rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all ${
                            nameError ? "border-red-500/50 focus:border-red-500" : "border-white/15"
                        }`} 
                    />
                    {nameError && <p className="text-[11px] text-red-400 mt-1">⚠️ {nameError}</p>}
                </div>

                {/* Amount and Category Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Monthly Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Monthly Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">₹</span>
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={amount} 
                                onChange={e => { setAmount(e.target.value); setAmountError(""); }}
                                className={`w-full bg-white/6 border rounded-xl pl-7 pr-3 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all ${
                                    amountError ? "border-red-500/50 focus:border-red-500" : "border-white/15"
                                }`} 
                            />
                        </div>
                        {amountError && <p className="text-[11px] text-red-400 mt-1">⚠️ {amountError}</p>}
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70">Category</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none appearance-none cursor-pointer"
                        >
                            <option value="STREAMING">Streaming</option>
                            <option value="SOFTWARE">Software/SaaS</option>
                            <option value="GYM">Gym/Health</option>
                            <option value="SIM">Mobile/SIM</option>
                            <option value="UTILITIES">Utilities</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                </div>

                {/* Next Renewal Date */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Next Renewal Date *</label>
                    <input 
                        type="date" 
                        value={renewalDate} 
                        onChange={e => { setRenewalDate(e.target.value); setRenewalDateError(""); }}
                        className={`w-full bg-white/6 border rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all ${
                            renewalDateError ? "border-red-500/50 focus:border-red-500" : "border-white/15"
                        }`} 
                    />
                    {renewalDateError && <p className="text-[11px] text-red-400 mt-1">⚠️ {renewalDateError}</p>}
                </div>

                {/* Last Used Date */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Last Used Date <span className="text-white/20 font-normal">(optional)</span></label>
                    <input 
                        type="date" 
                        value={lastUsedDate} 
                        onChange={e => setLastUsedDate(e.target.value)}
                        className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none" 
                    />
                    <p className="text-[10px] text-white/30 px-1">Helps calculate the Leakage Index and detect dormant subscriptions.</p>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={`w-full bg-amber-400 text-black font-bold py-4 rounded-xl text-sm shadow-lg shadow-amber-400/10 active:scale-[0.98] transition-all hover:bg-amber-300 ${
                            saving ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        {saving ? "Saving..." : "Start Tracking"}
                    </button>
                </div>
            </div>
        </div>
    );
}
