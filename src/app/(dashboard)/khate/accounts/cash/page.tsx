"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BankStore } from "@/lib/bankStore";
import { fetchBankSummary, saveCashWallet } from "@/lib/bankApi";
import { ArrowLeft, Wallet, ShieldAlert, Coins, CheckCircle2 } from "lucide-react";

export default function CashWalletPage() {
    const router = useRouter();

    const initialCash = BankStore.getCashWallet();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

        const [inHandStr, setInHandStr] = useState(() => (initialCash.cashInHand > 0 ? initialCash.cashInHand.toString() : ""));
        const [emergencyStr, setEmergencyStr] = useState(() => (initialCash.emergencyCash > 0 ? initialCash.emergencyCash.toString() : ""));
      const [pettyStr, setPettyStr] = useState(() => (initialCash.pettyCash > 0 ? initialCash.pettyCash.toString() : ""));

    useEffect(() => {
        let active = true;

        fetchBankSummary()
            .then((summary) => {
                if (!active) return;
                setInHandStr(summary.cashWallet.cashInHand > 0 ? summary.cashWallet.cashInHand.toString() : "");
                setEmergencyStr(summary.cashWallet.emergencyCash > 0 ? summary.cashWallet.emergencyCash.toString() : "");
                setPettyStr(summary.cashWallet.pettyCash > 0 ? summary.cashWallet.pettyCash.toString() : "");
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : "Failed to load cash wallet.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const validateAndSave = async () => {
        const inHand = parseInt(inHandStr || "0", 10);
        const emergency = parseInt(emergencyStr || "0", 10);
        const petty = parseInt(pettyStr || "0", 10);

        if (emergency > inHand) {
            setError("Emergency cash cannot exceed total cash.");
            return;
        }
        if (petty > inHand) {
            setError("Petty cash cannot exceed total cash.");
            return;
        }
        if (emergency + petty > inHand) {
            setError("Total of emergency + petty cannot exceed total cash.");
            return;
        }

        setError("");
        setSaving(true);
        try {
            await saveCashWallet({
                cashInHand: inHand,
                emergencyCash: emergency,
                pettyCash: petty,
            });
        } catch (err: unknown) {
            setSaving(false);
            setError(err instanceof Error ? err.message : "Failed to save cash wallet.");
            return;
        }

        setSuccess(true);
        setTimeout(() => {
            router.push("/khate/accounts");
        }, 1500);
    };

    if (loading) {
        return <div className="text-white min-h-screen flex items-center justify-center">Loading cash wallet...</div>;
    }

    if (success) {
        return (
            <div className="text-white min-h-screen flex items-center justify-center font-sans animate-fade-in px-6">
                <div className="text-center p-8 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
                    <CheckCircle2 className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-amber-100 mb-2">Cash wallet updated.</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white min-h-screen px-6 py-6 pb-24 font-sans animate-fade-in relative">
            <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-6 hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>

            <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 text-amber-400" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Cash Wallet</h1>
            </div>
            <p className="text-sm text-white/60 mb-8 whitespace-pre-line leading-relaxed">
                Track silent liquidity outside bank accounts.
            </p>

            {error && (
                <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 animate-shake">
                    <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Total Cash In Hand */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                    <label className="text-xs text-amber-200/80 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                        Cash In Hand (₹)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400/50 text-xl font-medium">₹</span>
                        <input type="number" value={inHandStr} onChange={e => setInHandStr(e.target.value)} placeholder="Total physical cash"
                            className="w-full bg-white/5 border border-amber-500/30 rounded-xl pl-10 pr-4 py-4 text-amber-100 placeholder-white/20 focus:outline-none focus:border-amber-400/60 font-bold text-lg transition-colors" />
                    </div>
                </div>

                <div className="relative flex justify-center py-2">
                    <div className="w-px h-8 bg-gradient-to-b from-amber-500/30 to-white/10" />
                    <div className="absolute top-1/2 -translate-y-1/2 bg-[var(--color-rajya-bg)] px-2 text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1">
                        <Coins className="w-3 h-3" /> Allocated To
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Emergency Stash */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-colors focus-within:border-white/20">
                        <label className="text-xs text-emerald-400/80 uppercase tracking-widest font-bold mb-2 block">
                            Emergency Cash (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">₹</span>
                            <input type="number" value={emergencyStr} onChange={e => setEmergencyStr(e.target.value)} placeholder="0"
                                className="w-full bg-transparent pl-8 pr-2 py-2 text-white placeholder-white/20 focus:outline-none font-semibold text-xl" />
                        </div>
                        <p className="text-[10px] text-white/40 mt-1">Reserved for emergencies only.</p>
                    </div>

                    {/* Petty Flow */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-colors focus-within:border-white/20">
                        <label className="text-xs text-blue-400/80 uppercase tracking-widest font-bold mb-2 block">
                            Petty Cash (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">₹</span>
                            <input type="number" value={pettyStr} onChange={e => setPettyStr(e.target.value)} placeholder="0"
                                className="w-full bg-transparent pl-8 pr-2 py-2 text-white placeholder-white/20 focus:outline-none font-semibold text-xl" />
                        </div>
                        <p className="text-[10px] text-white/40 mt-1">For routine daily expenses.</p>
                    </div>
                </div>

                <div className="pt-8">
                    <button onClick={() => { void validateAndSave(); }} disabled={saving}
                        className="w-full py-4 rounded-xl font-bold tracking-wide shadow-xl transition-all bg-amber-600 hover:bg-amber-500 text-white">
                        {saving ? "Saving..." : "Save Cash Wallet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
