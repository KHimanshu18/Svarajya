"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Landmark, CreditCard, Calendar, Info, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { NotificationStore } from "@/lib/stores/notificationStore";
import { Vault, VaultFile } from "@/lib/vault";

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
    const [existingVaultFiles, setExistingVaultFiles] = useState<VaultFile[]>([]);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentModalMode, setDocumentModalMode] = useState<'select' | 'upload'>('select');
    const [selectedVaultFileId, setSelectedVaultFileId] = useState<string | null>(null);
    const [documentSaveLoading, setDocumentSaveLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        linkedPropertyId: "",
        documentId: null as string | null,
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
                        linkedPropertyId: l.linkedPropertyId || "",
                        documentId: l.documentId || null,
                    });
                    const files = await Vault.getFiles("loans");
                    setExistingVaultFiles(files);
                    setSelectedVaultFileId(l.documentId || null);
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

    const handleLinkDocument = async (file?: VaultFile) => {
        const selectedFile = file || existingVaultFiles.find((item) => item.id === selectedVaultFileId);
        if (!selectedFile) return;

        setDocumentSaveLoading(true);
        try {
            const docRes = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docType: 'LOAN',
                    linkedEntityId: id,
                    fileName: selectedFile.name,
                    cloudId: selectedFile.cloudId || null,
                }),
            });

            if (!docRes.ok) {
                const err = await docRes.json();
                throw new Error(err.error || 'Unable to save document metadata');
            }

            const updateRes = await fetch(`/api/loans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: selectedFile.cloudId || selectedFile.id }),
            });

            if (!updateRes.ok) {
                const err = await updateRes.json();
                throw new Error(err.error || 'Unable to update loan record');
            }

            const finalId = selectedFile.cloudId || selectedFile.id;
            setFormData((prev) => ({ ...prev, documentId: finalId }));
            setSelectedVaultFileId(finalId);
            setShowDocumentModal(false);
            setExistingVaultFiles(await Vault.getFiles('loans'));
            NotificationStore.push({
                type: 'action',
                title: 'Document Linked',
                message: 'The loan document has been linked to your Loans vault.',
                link: `/rin/loans/${id}`,
            });
            toast('Document linked successfully!', 'success');
        } catch (err: any) {
            toast(err?.message || 'Unable to link document', 'error');
        } finally {
            setDocumentSaveLoading(false);
        }
    };

    const handleUploadNewFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadingFileName(file.name);

        try {
            const { localId } = await Vault.saveFile('loans', file, undefined, true);
            const newFile = await Vault.getFile(localId);
            const files = await Vault.getFiles('loans');
            setExistingVaultFiles(files);

            if (newFile) {
                setSelectedVaultFileId(newFile.id);
                await handleLinkDocument(newFile);
            }
        } catch (err: any) {
            toast(err?.message || 'Unable to upload document to vault', 'error');
        } finally {
            setIsUploading(false);
            setUploadingFileName(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = { ...formData };
            if (!payload.documentId) {
                delete payload.documentId;
            }
            const res = await fetch(`/api/loans/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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

                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-white/40 font-bold">Loan Document</p>
                            <p className="text-[11px] text-white/50">Attach a loan document from the Loans vault.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDocumentModal(true)}
                            className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-semibold rounded-2xl bg-amber-500 text-slate-950"
                        >
                            {formData.documentId ? 'Change' : 'Add Document'}
                        </button>
                    </div>
                    {formData.documentId ? (
                        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                            <p className="text-sm text-white font-medium">Linked document selected</p>
                            <p className="text-xs text-white/40 mt-1">File ID: {formData.documentId}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-white/50">No loan document attached yet.</p>
                    )}
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

            {showDocumentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDocumentModal(false)} />
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-2xl w-full"
                    >
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Loan Document Vault</h3>
                                <p className="text-sm text-white/50">Select an existing file or upload a new document into your Loans vault.</p>
                            </div>
                            <button
                                onClick={() => setShowDocumentModal(false)}
                                className="text-white/50 hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setDocumentModalMode('select')}
                                className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${documentModalMode === 'select' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                            >
                                Select Existing
                            </button>
                            <button
                                onClick={() => setDocumentModalMode('upload')}
                                className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${documentModalMode === 'upload' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                            >
                                Upload New
                            </button>
                        </div>
                        {documentModalMode === 'select' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-2">
                                {existingVaultFiles.length > 0 ? existingVaultFiles.map((file) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        onClick={() => setSelectedVaultFileId(file.id)}
                                        className={`p-4 rounded-3xl border text-left transition-all ${selectedVaultFileId === file.id ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                    >
                                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                        <p className="text-[10px] text-white/40 mt-1">{new Date(file.createdAt).toLocaleDateString('en-IN')}</p>
                                    </button>
                                )) : (
                                    <div className="col-span-full p-4 rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-white/50">
                                        No files found in the Loans vault. Upload a document to Loans and it will be linked automatically.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-white/70">
                                    <p className="text-sm font-medium text-white mb-2">Upload a new document directly to the Loans vault.</p>
                                    <p className="text-xs text-white/40">After upload, the file will be automatically selected and linked to this loan.</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 text-sm font-semibold"
                                    >
                                        {isUploading ? `Uploading ${uploadingFileName || 'file'}...` : 'Choose File'}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={handleUploadNewFile}
                                    />
                                    {isUploading && (
                                        <p className="text-xs text-white/40">Uploading {uploadingFileName || 'document'} to Loans vault...</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="mt-6 flex flex-wrap gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDocumentModal(false)}
                                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            {documentModalMode === 'select' && (
                                <button
                                    type="button"
                                    onClick={() => handleLinkDocument()}
                                    disabled={!selectedVaultFileId || documentSaveLoading || isUploading}
                                    className="px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-50"
                                >
                                    {documentSaveLoading ? 'Linking...' : 'Link Document'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

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
