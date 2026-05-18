"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    Plus, 
    Landmark, 
    CreditCard, 
    AlertTriangle, 
    ChevronRight, 
    ShieldAlert, 
    TrendingDown,
    Calendar,
    Wallet,
    Info,
    ArrowUpRight
} from "lucide-react";
import { MicroLearningWrapper } from "@/components/module/MicroLearningWrapper";

interface LoanAccount {
    id: string;
    type: string;
    lenderName: string | null;
    principal: number;
    outstandingAmount: number;
    emi: number;
    interestRate: number;
    status: string;
    endDate: string | null;
}

interface LoanMetrics {
    totalOutstanding: number;
    totalEMI: number;
    monthlyNetIncome: number;
    emiBurdenRatio: number;
    activeCount: number;
}

export default function RinDashboard() {
    const router = useRouter();
    const [loans, setLoans] = useState<LoanAccount[]>([]);
    const [metrics, setMetrics] = useState<LoanMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchLoans = async () => {
        try {
            const res = await fetch("/api/loans");
            const json = await res.json();
            if (json.success) {
                setLoans(json.data.loans);
                setMetrics(json.data.metrics);
            }
        } catch (err) {
            setError("Failed to load loan data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchLoans();
    }, []);

    const emiBurden = metrics?.emiBurdenRatio || 0;
    const isOverBurdened = emiBurden > 40;

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-rajya-bg)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <main className="min-h-screen pb-32 font-sans selection:bg-amber-500/30">
            {/* Header */}
            <header className="px-6 pt-12 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <TrendingDown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                            Rin (Debt)
                        </h1>
                        <p className="text-sm text-white/50">Measure your chains. Plan your liberation.</p>
                    </div>
                </div>
            </header>

            <div className="px-6 space-y-6">
                {/* Metrics Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">Total Outstanding Debt</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl text-white/30 font-light">₹</span>
                                    <h2 className="text-3xl font-bold text-white tracking-tight">
                                        {metrics?.totalOutstanding.toLocaleString("en-IN") || 0}
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Monthly EMI</p>
                                    <p className="text-lg font-bold text-white">₹{metrics?.totalEMI.toLocaleString("en-IN") || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Active Loans</p>
                                    <p className="text-lg font-bold text-white">{metrics?.activeCount || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-center md:items-end">
                            <div className={`relative w-24 h-24 flex items-center justify-center rounded-full border-4 ${isOverBurdened ? "border-red-500/30" : "border-amber-500/30"}`}>
                                <div className="text-center">
                                    <p className={`text-xl font-bold ${isOverBurdened ? "text-red-400" : "text-amber-400"}`}>{emiBurden.toFixed(1)}%</p>
                                    <p className="text-[8px] text-white/40 uppercase font-bold">EMI Burden</p>
                                </div>
                                {isOverBurdened && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                        <ShieldAlert className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-white/40 mt-3 text-center md:text-right">
                                {isOverBurdened 
                                    ? "Critical: Above 40% income threshold." 
                                    : "Healthy: Within safe borrowing limits."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/rin/loans/add" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <Plus className="w-6 h-6 text-amber-400" />
                        <span className="text-sm font-medium text-white/80">Add New Loan</span>
                    </Link>
                    <Link href="/rin/loans" className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <Calendar className="w-6 h-6 text-orange-400" />
                        <span className="text-sm font-medium text-white/80">View All Loans</span>
                    </Link>
                </div>

                {/* Loan List Preview */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white/90">Active Loans</h3>
                        <Link href="/rin/loans" className="text-xs text-amber-400 font-medium">View All</Link>
                    </div>

                    {loans.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 border-dashed rounded-3xl">
                            <ShieldAlert className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/40 font-medium px-8 leading-relaxed">
                                No active loans recorded. A debt-free life is the ultimate Rajya.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {loans.filter(l => l.status === 'ACTIVE').slice(0, 3).map(loan => (
                                <Link 
                                    key={loan.id}
                                    href={`/rin/loans/${loan.id}`}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            {loan.type === 'CREDIT_CARD' ? <CreditCard className="w-6 h-6 text-red-400" /> : <Landmark className="w-6 h-6 text-amber-400" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{loan.lenderName || loan.type}</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{loan.type} • EMI: ₹{loan.emi.toLocaleString("en-IN")}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">₹{loan.outstandingAmount.toLocaleString("en-IN")}</p>
                                            <p className="text-[10px] text-white/40 mt-0.5">Outstanding</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Prepayment Advice */}
                {metrics && metrics.totalEMI > 0 && (
                    <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <ArrowUpRight className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-100 text-sm">Strategic Prepayment Advice</h4>
                                <p className="text-xs text-indigo-200/60 mt-1 leading-relaxed">
                                    Increasing your total monthly EMI by just <span className="text-indigo-300 font-bold">10%</span> could save you approximately <span className="text-indigo-300 font-bold">₹{(metrics.totalOutstanding * 0.15).toLocaleString("en-IN")}</span> in total interest over the next 5 years.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Trust */}
            <div className="mt-12 px-6 flex items-start gap-3 opacity-50 justify-center text-center pb-8">
                <ShieldAlert className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/60 leading-relaxed max-w-[250px]">
                    Svarajya calculations are estimates. Consult a financial advisor for specific debt restructuring.
                </p>
            </div>
        </main>
    );
}
