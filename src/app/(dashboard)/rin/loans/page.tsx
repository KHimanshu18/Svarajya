"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    Plus, 
    Landmark, 
    CreditCard, 
    ChevronRight, 
    Search,
    Filter
} from "lucide-react";

interface LoanAccount {
    id: string;
    type: string;
    lenderName: string | null;
    principal: number;
    outstandingAmount: number;
    emi: number;
    interestRate: number;
    status: string;
    startDate: string;
}

export default function LoanListPage() {
    const router = useRouter();
    const [loans, setLoans] = useState<LoanAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const res = await fetch("/api/loans");
                const json = await res.json();
                if (json.success) {
                    setLoans(json.data.loans);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        void fetchLoans();
    }, []);

    const filteredLoans = loans.filter(l => 
        (l.lenderName || "").toLowerCase().includes(search.toLowerCase()) ||
        l.type.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <main className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <header className="pt-12 pb-6 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/rin")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <h1 className="text-xl font-bold text-white">Your Loans</h1>
                    </div>
                    <Link href="/rin/loans/add" className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Plus className="w-5 h-5 text-black" />
                    </Link>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                            type="text" 
                            placeholder="Search lender or type..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Filter className="w-4 h-4 text-white/60" />
                    </button>
                </div>
            </header>

            <div className="space-y-3">
                {filteredLoans.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-sm text-white/30">No loans found matching your search.</p>
                    </div>
                ) : (
                    filteredLoans.map(loan => (
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
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-white">{loan.lenderName || loan.type}</p>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${loan.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-white/40 border-white/20'}`}>
                                            {loan.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                                        {loan.type.replace('_', ' ')} • {loan.interestRate}% Int.
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <p className="text-sm font-bold text-white">₹{loan.outstandingAmount.toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">₹{loan.emi.toLocaleString("en-IN")}/mo</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </main>
    );
}
