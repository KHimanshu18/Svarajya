"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Vault, VaultFile } from "@/lib/vault";
import { 
    ArrowLeft, 
    Pencil, 
    Trash2, 
    Landmark, 
    CreditCard, 
    Calendar, 
    Clock, 
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    Info,
    ArrowUpRight,
    FileText
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface LoanAccount {
    id: string;
    type: string;
    lenderName: string | null;
    principal: number;
    outstandingAmount: number;
    emi: number;
    interestRate: number;
    tenure: number;
    startDate: string;
    endDate: string | null;
    status: string;
    linkedPropertyId: string | null;
    documentId: string | null;
}

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const [loan, setLoan] = useState<LoanAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [linkedDocumentMeta, setLinkedDocumentMeta] = useState<any | null>(null);
    const [linkedVaultFile, setLinkedVaultFile] = useState<VaultFile | null>(null);

    useEffect(() => {
        const fetchLoan = async () => {
            try {
                const res = await fetch(`/api/loans/${id}`);
                const json = await res.json();
                if (json.success) {
                    setLoan(json.data);
                } else {
                    toast("Loan not found", "error");
                    router.push("/rin/loans");
                }
            } catch (err) {
                toast("Error loading loan details", "error");
            } finally {
                setLoading(false);
            }
        };
        void fetchLoan();
    }, [id, router, toast]);

    useEffect(() => {
        if (!loan?.documentId) {
            setLinkedVaultFile(null);
            setLinkedDocumentMeta(null);
            return;
        }

        Vault.getFile(loan.documentId).then(file => {
            if (file) setLinkedVaultFile(file);
            else setLinkedVaultFile(null);
        });

        const fetchLinkedDocMeta = async () => {
            try {
                const res = await fetch(`/api/documents?linkedEntityId=${id}`);
                if (!res.ok) return;
                const json = await res.json();
                const docs = json.data || [];
                const loanDoc = docs.find((doc: any) => doc.docType === 'LOAN');
                setLinkedDocumentMeta(loanDoc || null);
            } catch (err) {
                console.error('Failed to load linked document metadata', err);
            }
        };

        fetchLinkedDocMeta();
    }, [loan?.documentId, id]);

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast("Loan deleted successfully", "success");
                router.push("/rin/loans");
            } else {
                toast("Failed to delete loan", "error");
            }
        } catch (err) {
            toast("An error occurred during deletion", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    if (!loan) return null;

    const progress = ((loan.principal - loan.outstandingAmount) / loan.principal) * 100;

    return (
        <main className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <header className="pt-12 pb-6 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/rin/loans")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <h1 className="text-xl font-bold text-white">Loan Details</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/rin/loans/${id}/edit`} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Pencil className="w-4 h-4 text-white/60" />
                        </Link>
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
                        >
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        {loan.type === 'CREDIT_CARD' ? <CreditCard className="w-24 h-24 text-white" /> : <Landmark className="w-24 h-24 text-white" />}
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${loan.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-white/40 border-white/20'}`}>
                                {loan.status}
                            </span>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{loan.type.replace('_', ' ')}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6">{loan.lenderName || "Unnamed Lender"}</h2>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Outstanding</p>
                                <p className="text-xl font-bold text-white">₹{loan.outstandingAmount.toLocaleString("en-IN")}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Principal</p>
                                <p className="text-xl font-bold text-white/60">₹{loan.principal.toLocaleString("en-IN")}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-8 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-white/40">Repayment Progress</span>
                                <span className="text-amber-400">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000" 
                                    style={{ width: `${progress}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-orange-400" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Interest Rate</span>
                        </div>
                        <p className="text-lg font-bold text-white">{loan.interestRate}% <span className="text-[10px] font-normal text-white/30">p.a.</span></p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Monthly EMI</span>
                        </div>
                        <p className="text-lg font-bold text-white">₹{loan.emi.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Start Date</span>
                        </div>
                        <p className="text-sm font-bold text-white">{new Date(loan.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-red-400" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">End Date</span>
                        </div>
                        <p className="text-sm font-bold text-white">{loan.endDate ? new Date(loan.endDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                {/* Property Link if applicable */}
                {loan.linkedPropertyId && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Landmark className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Linked Property</p>
                                <p className="text-sm font-bold text-white">{loan.linkedPropertyId}</p>
                            </div>
                        </div>
                        <Link href="/bhoomi" className="text-xs text-amber-400 font-medium">View Property</Link>
                    </div>
                )}

                {/* Document Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Loan Document
                            </h3>
                            <p className="text-[10px] text-white/50">Access the primary document associated with this loan.</p>
                        </div>
                        <Link
                            href={`/rin/loans/${id}/edit`}
                            className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold"
                        >
                            {loan.documentId ? 'Change' : 'Add Document'}
                        </Link>
                    </div>

                    {loan.documentId ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-3xl bg-slate-950/60 border border-white/10">
                                <p className="text-sm font-medium text-white">
                                    {linkedVaultFile?.name || linkedDocumentMeta?.fileName || 'Linked document'}
                                </p>
                                {linkedVaultFile?.size ? (
                                    <p className="text-[10px] text-white/40 mt-1">
                                        {Math.round(linkedVaultFile.size / 1024)} KB
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={async () => {
                                        if (!loan.documentId) return;
                                        const isGoogleDriveId = !loan.documentId.startsWith('http') && loan.documentId.length > 20 && !loan.documentId.startsWith('opfs');
                                        if (isGoogleDriveId) {
                                            window.open(`https://drive.google.com/file/d/${loan.documentId}/view`, '_blank', 'noopener,noreferrer');
                                        } else {
                                            const url = await Vault.getPreviewUrl(loan.documentId);
                                            if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-white/60">No document attached.</p>
                            <Link
                                href={`/rin/loans/${id}/edit`}
                                className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 text-sm font-semibold"
                            >
                                Add Document
                            </Link>
                        </div>
                    )}
                </div>

                {/* Prepayment Calculator Advice */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowUpRight className="w-5 h-5 text-amber-400" />
                        <h4 className="font-bold text-white">Prepayment Power</h4>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mb-4">
                        Paying just <span className="text-amber-400 font-bold">₹{(loan.emi * 0.1).toLocaleString("en-IN")}</span> extra every month could reduce your tenure by <span className="text-amber-400 font-bold">{(loan.tenure * 0.15).toFixed(0)} months</span> and save you approximately <span className="text-amber-400 font-bold">₹{(loan.outstandingAmount * 0.12).toLocaleString("en-IN")}</span> in interest.
                    </p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                            <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Interest Saved</p>
                            <p className="text-sm font-bold text-emerald-400">₹{(loan.outstandingAmount * 0.12).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                            <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Time Saved</p>
                            <p className="text-sm font-bold text-blue-400">{(loan.tenure * 0.15).toFixed(0)} Months</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Loan Record?</h3>
                        <p className="text-sm text-white/50 mb-6 leading-relaxed">
                            This action will permanently remove this loan from your Rajya record. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-bold border border-white/10"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
