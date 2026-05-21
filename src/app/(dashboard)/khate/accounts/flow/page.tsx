"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BankStore } from "@/lib/bankStore";
import { fetchBankSummary, type BankSummary } from "@/lib/bankApi";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Scale, Droplet, ShieldAlert, Info } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CashFlowEngine() {
    const router = useRouter();
    const [summary, setSummary] = useState<BankSummary | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        fetchBankSummary()
            .then((data) => {
                if (active) setSummary(data);
            })
            .catch((err: unknown) => {
                if (active) setError(err instanceof Error ? err.message : "Failed to load cash flow.");
            });

        return () => {
            active = false;
        };
    }, []);

    const metrics = summary?.metrics.health;
    const flow = summary?.metrics.flow;

    if (error) return <div className="text-red-300 min-h-screen flex items-center justify-center">{error}</div>;
    if (!flow || !metrics) return <div className="text-white/50 min-h-screen flex items-center justify-center">Loading cash flow...</div>;

    return (
        <div className="text-white min-h-screen px-6 py-6 pb-24 font-sans animate-fade-in relative overflow-x-hidden">
            {/* Ambient Backgrounds */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-6 hover:bg-white/10 transition-colors z-10 relative">
                <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>

            <div className="relative z-10 mb-8">
                <h1 className="text-2xl font-bold mb-2">Cash Flow Engine</h1>
                <p className="text-sm text-white/60">
                    Understand your monthly movement of money.
                </p>
            </div>

            <div className="space-y-6 relative z-10">
                {/* River Flow Visualization */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden relative">
                    <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-6">The Monthly River</p>

                    <div className="relative h-64 flex flex-col items-center justify-between mt-2">
                        {/* Kosh Inflow */}
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center z-10">
                            <div className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 backdrop-blur-md flex items-center gap-2">
                                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                                <span className="font-semibold text-emerald-100">Income (Kosh): ₹{flow.inflow.toLocaleString()}</span>
                            </div>
                            <div className="h-10 w-px bg-gradient-to-b from-blue-500/50 to-transparent my-1" />
                        </motion.div>

                        {/* The Reservoir (Surplus) */}
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
                            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl z-10 ${flow.surplus > 0 ? "bg-white/5 border-blue-500/30" : "bg-red-500/10 border-red-500/30"
                                }`}>
                            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">
                                {flow.surplus >= 0 ? "Surplus / Deficit" : "Surplus / Deficit"}
                            </p>
                            <p className={`text-2xl font-bold ${flow.surplus >= 0 ? "text-white" : "text-red-400"}`}>
                                ₹{Math.abs(flow.surplus).toLocaleString()}
                            </p>
                        </motion.div>

                        {/* Vyaya Outflow */}
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col items-center z-10">
                            <div className="h-10 w-px bg-gradient-to-t from-red-500/50 to-transparent my-1" />
                            <div className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 backdrop-blur-md flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-red-400" />
                                <span className="font-semibold text-red-100">Expenses (Vyaya): ₹{flow.outflow.toLocaleString()}</span>
                            </div>
                        </motion.div>

                        {/* Animated River Lines */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[200%] w-px bg-blue-500/20 blur-[2px] mx-auto z-0" />
                    </div>

                    {flow.surplus < 0 && (
                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
                            <ShieldAlert className="w-4 h-4" />
                            ⚠ Your monthly outflow exceeds inflow.
                        </div>
                    )}

                    {/* Missing Data CTAs */}
                    {(flow.inflow === 0 || flow.outflow === 0) && (
                        <div className="mt-8 pt-4 border-t border-white/10 space-y-3 flex flex-col items-center">
                            {flow.inflow === 0 && (
                                <div className="text-center w-full">
                                    <p className="text-sm text-white/50 mb-2">Add income in Kosh to calculate monthly inflow.</p>
                                    <Link href="/kosh" className="inline-block px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors rounded-full text-white">
                                        Go to Kosh
                                    </Link>
                                </div>
                            )}
                            {flow.outflow === 0 && (
                                <div className="text-center w-full mt-4">
                                    <p className="text-sm text-white/50 mb-2">Add expenses in Vyaya to calculate sustainability.</p>
                                    <Link href="/vyaya" className="inline-block px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors rounded-full text-white">
                                        Go to Vyaya
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Liquidity Metrics Matrix */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between group relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Droplet className="w-4 h-4 text-blue-400" />
                            </div>
                            {metrics.outflowIsZero && <span className="text-[10px] text-white/30 bg-black px-2 py-0.5 rounded">N/A</span>}
                        </div>
                        <div>
                            <p className="text-2xl font-bold mb-1">
                                {metrics.outflowIsZero ? "—" : metrics.liquidityRatio.toFixed(1)}<span className="text-lg text-white/50 font-normal">x</span>
                            </p>
                            <p className="text-xs text-white/50 font-medium flex items-center gap-1">Liquidity Ratio <Info className="w-3 h-3 cursor-help text-white/30" /></p>
                        </div>

                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center border border-white/10">
                            Liquid Assets ÷ Monthly Expenses
                        </div>
                    </div>

                    <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-colors group relative ${metrics.efStatus === "strong" ? "bg-emerald-500/10 border-emerald-500/20" :
                            metrics.efStatus === "ok" ? "bg-blue-500/10 border-blue-500/20" :
                                metrics.efStatus === "low" ? "bg-amber-500/10 border-amber-500/20" :
                                    "bg-red-500/10 border-red-500/20"
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${metrics.efStatus === "strong" ? "bg-emerald-500/20 border-emerald-500/30" :
                                    metrics.efStatus === "ok" ? "bg-blue-500/20 border-blue-500/30" :
                                        metrics.efStatus === "low" ? "bg-amber-500/20 border-amber-500/30" :
                                            "bg-red-500/20 border-red-500/30"
                                }`}>
                                <Scale className={`w-4 h-4 ${metrics.efStatus === "strong" ? "text-emerald-400" :
                                        metrics.efStatus === "ok" ? "text-blue-400" :
                                            metrics.efStatus === "low" ? "text-amber-400" :
                                                "text-red-400"
                                    }`} />
                            </div>
                            {metrics.outflowIsZero && <span className="text-[10px] text-white/30 bg-black px-2 py-0.5 rounded">N/A</span>}
                        </div>
                        <div>
                            <p className="text-2xl font-bold mb-1">
                                {metrics.outflowIsZero ? "—" : metrics.emergencyFundMonths.toFixed(1)}<span className="text-lg text-white/50 font-normal">m</span>
                            </p>
                            <p className="text-xs text-white/50 font-medium flex items-center gap-1">Emergency Fund <Info className="w-3 h-3 cursor-help text-white/30" /></p>
                        </div>

                        <div className="absolute bottom-full mb-2 right-0 w-48 bg-black/90 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center border border-white/10 z-20">
                            How many months you can sustain current expenses.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
