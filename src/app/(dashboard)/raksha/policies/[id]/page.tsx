"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Shield, ArrowLeft, Edit2, Trash2,
    Calendar, Building2, User, CreditCard,
    Clock, CheckCircle2, AlertTriangle,
    FileText, Phone, Download
} from "lucide-react";
import { motion } from "framer-motion";
import { useRakshaStore } from "@/lib/stores/rakshaStore";
import { NotificationStore } from "@/lib/stores/notificationStore";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Vault, VaultFile } from "@/lib/vault";
import { formatRupee } from "@/lib/incomeStore";
import { FileUploader } from "@/components/vault/FileUploader";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const { deletePolicy } = useRakshaStore();

    const [policy, setPolicy] = useState<any>(null);
    const [nomineeName, setNomineeName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [annualIncome, setAnnualIncome] = useState<number>(0);
    const [existingVaultFiles, setExistingVaultFiles] = useState<VaultFile[]>([]);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentModalMode, setDocumentModalMode] = useState<'select' | 'upload'>('select');
    const [selectedVaultFileId, setSelectedVaultFileId] = useState<string | null>(null);
    const [linkedVaultFile, setLinkedVaultFile] = useState<VaultFile | null>(null);
    const [linkedDocumentMeta, setLinkedDocumentMeta] = useState<any | null>(null);
    const [documentSaveLoading, setDocumentSaveLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
    const [showRemoveDocumentConfirm, setShowRemoveDocumentConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await fetch(`/api/insurance/${id}`);
                const result = await res.json();
                if (result.data) {
                    setPolicy(result.data);
                    
                    // Fetch nominee name separately
                    if (result.data.nomineeId) {
                        const famRes = await fetch('/api/family');
                        const famResult = await famRes.json();
                        if (famResult.data) {
                            const nominee = famResult.data.find((m: any) => m.id === result.data.nomineeId);
                            if (nominee) setNomineeName(nominee.name);
                        }
                    }
                }

                // Fetch income for underinsurance check
                const incRes = await fetch('/api/income');
                const incResult = await incRes.json();
                if (incResult.data) {
                    const totalIncome = incResult.data.reduce((sum: number, inc: any) => sum + (inc.amountNet * (inc.frequency === 'MONTHLY' ? 12 : 1)), 0);
                    setAnnualIncome(totalIncome);
                }

            } catch (err) {
                console.error("Failed to fetch policy details");
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, [id]);

    useEffect(() => {
        Vault.getFiles("insurance").then(files => {
            setExistingVaultFiles(files);
        });
    }, []);

    useEffect(() => {
        if (!policy?.documentId) {
            setLinkedVaultFile(null);
            setLinkedDocumentMeta(null);
            return;
        }

        Vault.getFile(policy.documentId).then(file => {
            if (file) setLinkedVaultFile(file);
            else setLinkedVaultFile(null);
        });

        const fetchLinkedDocMeta = async () => {
            try {
                const res = await fetch(`/api/documents?linkedEntityId=${id}`);
                if (!res.ok) return;
                const json = await res.json();
                const docs = json.data || [];
                const insuranceDoc = docs.find((doc: any) => doc.docType === 'INSURANCE');
                setLinkedDocumentMeta(insuranceDoc || null);
            } catch (err) {
                console.error('Failed to load linked document metadata', err);
            }
        };

        fetchLinkedDocMeta();
    }, [policy?.documentId, id]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/insurance/${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.data?.success) {
                deletePolicy(id);
                NotificationStore.push({
                    type: 'warning',
                    title: 'Shield Abandoned',
                    message: `Policy ${policy.policyNumber} has been removed from your kingdom.`,
                });
                router.push('/raksha/policies');
            }
        } catch (err) {
            NotificationStore.push({
                type: 'warning',
                title: 'Operation Failed',
                message: "The shield could not be abandoned at this time.",
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleLinkDocument = async (fileParam?: VaultFile) => {
        const file = fileParam || existingVaultFiles.find((item) => item.id === selectedVaultFileId);
        if (!file) return;

        if (!selectedVaultFileId) {
            setSelectedVaultFileId(file.id);
        }

        setDocumentSaveLoading(true);
        try {
            const docRes = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docType: 'INSURANCE',
                    linkedEntityId: id,
                    fileName: file.name,
                    cloudId: file.cloudId || null,
                }),
            });

            if (!docRes.ok) {
                const err = await docRes.json();
                throw new Error(err.error || 'Unable to save document metadata');
            }

            const updateRes = await fetch(`/api/insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: file.cloudId ?? file.id }),
            });

            if (!updateRes.ok) {
                const err = await updateRes.json();
                throw new Error(err.error || 'Unable to update policy document');
            }

            const docJson = await docRes.json();
            const updateJson = await updateRes.json();
            setPolicy(updateJson.data);
            setLinkedVaultFile(file);
            setLinkedDocumentMeta(docJson.data);
            setShowDocumentModal(false);
            setExistingVaultFiles(await Vault.getFiles('insurance'));
            NotificationStore.push({
                type: 'action',
                title: 'Document Linked',
                message: 'The policy document has been linked to your Insurance vault.',
                link: `/raksha/policies/${id}`,
            });
        } catch (err: any) {
            NotificationStore.push({
                type: 'warning',
                title: 'Unable to Link Document',
                message: err.message || 'Something went wrong while linking the file.',
            });
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
            // 1. Save locally to OPFS + indexedDB and backup to Google Drive
            console.log("CALLING VAULT SAVEFILE");
            const { localId, cloudId } = await Vault.saveFile(
                'insurance',
                file,
                [],
                true
            );

            console.log("CLOUD ID RETURNED =", cloudId);

            console.log("LOCAL ID:", localId);
            console.log("CLOUD ID RETURNED:", cloudId);

            const newFile = await Vault.getFile(localId);

            console.log("NEW FILE FROM VAULT:", newFile);
            
            if (newFile && cloudId) {newFile.cloudId = cloudId;
            }
            const files = await Vault.getFiles('insurance');
            setExistingVaultFiles(files);

            // 3. Link the vault file (which now may contain cloudId) to the policy
            if (newFile) {
                setSelectedVaultFileId(newFile.id);
                await handleLinkDocument(newFile);
            }
        } catch (err: any) {
            NotificationStore.push({
                type: 'warning',
                title: 'Upload Failed',
                message: err?.message || 'Unable to upload the document to Vault.',
            });
        } finally {
            setIsUploading(false);
            setUploadingFileName(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveDocument = async () => {
        setDocumentSaveLoading(true);
        try {
            const res = await fetch(`/api/insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: null }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Unable to unlink document');
            }

            const json = await res.json();
            setPolicy(json.data);
            setLinkedVaultFile(null);
            setLinkedDocumentMeta(null);
            setShowRemoveDocumentConfirm(false);
            NotificationStore.push({
                type: 'info',
                title: 'Document Unlinked',
                message: 'The policy document has been removed.',
            });
        } catch (err: any) {
            NotificationStore.push({
                type: 'warning',
                title: 'Unable to Remove Document',
                message: err.message || 'Could not unlink the file at this time.',
            });
        } finally {
            setDocumentSaveLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950">
                <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl text-white font-display mb-2">Shield Not Found</h2>
                <p className="text-white/40 mb-8 text-sm">The records of this shield have been lost in time.</p>
                <button onClick={() => router.push('/raksha/policies')} className="text-amber-500 font-bold uppercase tracking-widest text-xs">Return to Raksha</button>
            </div>
        );
    }

    const isLapsed = new Date(policy.dueDate) < new Date();
    const isExpiringSoon = !isLapsed && (new Date(policy.dueDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000);

    // Underinsurance Check
    let recommendation = 0;
    let isUnderinsured = false;
    if (policy.type === 'LIFE' || policy.type === 'TERM') {
        recommendation = annualIncome * 10;
        isUnderinsured = annualIncome > 0 && policy.sumAssured < recommendation;
    } else if (policy.type === 'HEALTH') {
        recommendation = 500000; // 5 Lakhs min
        isUnderinsured = policy.sumAssured < recommendation;
    }

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24 lg:p-10">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/60" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-display text-white">{policy.insurerName}</h1>
                            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{policy.type} • {policy.policyNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/raksha/policies/${id}/edit`)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Alerts */}
                    <div className="lg:col-span-3 space-y-4">
                        {isExpiringSoon && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <Clock className="w-6 h-6 text-amber-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Renewal Warning</h4>
                                    <p className="text-xs text-white/60">This shield expires in less than 30 days. Plan your renewal to maintain protection.</p>
                                </div>
                            </div>
                        )}
                        {isUnderinsured && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider">Underinsurance Alert</h4>
                                    <p className="text-xs text-white/60">
                                        Your cover is lower than the recommended ₹{formatRupee(recommendation)}. 
                                        Consider reinforcing this shield.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Left Column: Key Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <Shield className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${isLapsed ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                        }`}>
                                        {isLapsed ? "Lapsed" : "Active"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold">Sum Assured</p>
                                        <p className="text-3xl font-display text-white">{formatRupee(policy.sumAssured)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold">Annual Premium</p>
                                        <p className="text-3xl font-display text-amber-500">{formatRupee(policy.premium)}</p>
                                        <p className="text-[10px] text-white/20 uppercase tracking-wider mt-1">{policy.premiumFrequency} PAYMENT</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Covered Members */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Protected Souls
                            </h3>
                            {policy.coverage && policy.coverage.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {policy.coverage.map((c: any) => (
                                        <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/60">
                                                {c.member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{c.member.name}</p>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider">{c.member.relation}</p>
                                            </div>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/20 italic">No specific members linked to this shield.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Schedule & Details */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Renewal Timeline
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/30">Next Due Date</span>
                                    <span className="text-sm text-white font-medium">
                                        {new Date(policy.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${isLapsed ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: isLapsed ? '100%' : '60%' }} />
                                </div>
                                {policy.maturityDate && (
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-xs text-white/30">Maturity Date</span>
                                        <span className="text-sm text-white font-medium">
                                            {new Date(policy.maturityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Support & Nominee
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Primary Nominee</p>
                                    <p className="text-sm text-white">{nomineeName || 'Not assigned'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Agent / Contact</p>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <Phone className="w-3 h-3 text-white/30" />
                                        {policy.agentContact || 'None listed'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Policy Document
                                    </h3>
                                    <p className="text-[10px] text-white/50">Link a file from your Insurance vault for quick access.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedVaultFileId(policy.documentId || null);
                                        setShowDocumentModal(true);
                                    }}
                                    className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold"
                                >
                                    {policy.documentId ? 'Replace' : 'Link Document'}
                                </button>
                            </div>

                            {policy.documentId ? (
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
                                                if (!policy.documentId) return;
                                                const isGoogleDriveId = !policy.documentId.startsWith('http') && policy.documentId.length > 20 && !policy.documentId.startsWith('opfs');
                                                if (isGoogleDriveId) {
                                                    window.open(`https://drive.google.com/file/d/${policy.documentId}/view`, '_blank', 'noopener,noreferrer');
                                                } else {
                                                    const url = await Vault.getPreviewUrl(policy.documentId);
                                                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedVaultFileId(policy.documentId);
                                                setShowDocumentModal(true);
                                            }}
                                            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold"
                                        >
                                            Replace
                                        </button>
                                        <button
                                            onClick={() => setShowRemoveDocumentConfirm(true)}
                                            className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-semibold"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-white/60">No document attached.</p>
                                    <button
                                        onClick={() => {
                                            setSelectedVaultFileId(null);
                                            setShowDocumentModal(true);
                                        }}
                                        className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 text-sm font-semibold"
                                    >
                                        Add Document
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                                <h3 className="text-lg font-semibold text-white">Select Insurance Vault File</h3>
                                <p className="text-sm text-white/50">Pick a file from your Insurance vault to link with this policy.</p>
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
                                {existingVaultFiles.length > 0 ? existingVaultFiles.map(file => (
                                    <button
                                        key={file.id}
                                        onClick={() => setSelectedVaultFileId(file.id)}
                                        className={`p-4 rounded-3xl border text-left transition-all ${selectedVaultFileId === file.id ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                    >
                                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                        <p className="text-[10px] text-white/40 mt-1">{new Date(file.createdAt).toLocaleDateString('en-IN')}</p>
                                    </button>
                                )) : (
                                    <div className="col-span-full p-4 rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-white/50">
                                        No files found in the Insurance vault. Upload a document to Insurance and it will be linked automatically.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                                <FileUploader
                                    folder="insurance"
                                    storageType="googledrive"
                                    onUploaded={async (fileId) => {
                                        setSelectedVaultFileId(fileId);
                                        const newFile = await Vault.getFile(fileId);
                                        if (newFile) {
                                            const files = await Vault.getFiles('insurance');
                                            setExistingVaultFiles(files);
                                            handleLinkDocument(newFile);
                                        }
                                    }}
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    maxSizeMB={2}
                                    showFamilyMemberSelector={true}
                                />
                            </div>
                        )}
                        <div className="mt-6 flex flex-wrap gap-3 justify-end">
                            <button
                                onClick={() => setShowDocumentModal(false)}
                                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            {documentModalMode === 'select' && (
                                <button
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

            <ConfirmModal
                isOpen={showRemoveDocumentConfirm}
                title="Remove Linked Document"
                message="This will unlink the selected policy document from this insurance record."
                onCancel={() => setShowRemoveDocumentConfirm(false)}
                onConfirm={handleRemoveDocument}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
                    >
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl text-white font-display mb-2">Abandon this Shield?</h3>
                        <p className="text-white/40 text-sm mb-8">This action will remove the protection records from your kingdom forever. It cannot be undone.</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                            >
                                Stay Protected
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {deleting ? <Clock className="w-4 h-4 animate-spin" /> : "Abandon"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
