"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ShieldCheck, Lock, Users } from "lucide-react";
import { DocType } from "@/lib/identityStore";
import { Vault, VaultFile } from "@/lib/vault";
import { FileUploader } from "@/components/vault/FileUploader";

export default function EditDocument({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [docData, setDocData] = useState<any>(null);

    // Form fields
    const [issuedDate, setIssuedDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [placeOfIssue, setPlaceOfIssue] = useState("");
    const [dobOnDoc, setDobOnDoc] = useState("");
    const [nameOnDoc, setNameOnDoc] = useState("");
    const [vaultFileId, setVaultFileId] = useState<string | null>(null);
    const [familyMemberId, setFamilyMemberId] = useState<string>("");
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);

    // Date Validation State
    const [issueDateError, setIssueDateError] = useState("");
    const [expiryDateError, setExpiryDateError] = useState("");
    const [expiryWarning, setExpiryWarning] = useState("");

    // Vault Selection State
    const [existingVaultFiles, setExistingVaultFiles] = useState<VaultFile[]>([]);
    const [uploadMode, setUploadMode] = useState<'new' | 'select'>('new');
    const [isGoogleLinked, setIsGoogleLinked] = useState<boolean | null>(null);

    useEffect(() => {
        Vault.getFiles("identity").then(files => {
            setExistingVaultFiles(files);
        });

        // Check Google link status
        fetch('/api/auth/google-status')
            .then(res => res.ok ? res.json() : { linked: null })
            .then(data => setIsGoogleLinked(data.linked))
            .catch(() => setIsGoogleLinked(null));

        // Fetch family members for dropdown
        fetch('/api/family')
            .then(res => res.ok ? res.json() : { data: [] })
            .then(json => setFamilyMembers(json.data || []))
            .catch(() => setFamilyMembers([]));
    }, []);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch(`/api/identity/${id}`);
                if (!res.ok) throw new Error("Failed to fetch document");
                const json = await res.json();
                const data = json.data;
                setDocData(data);
                
                // pre-fill form
                if (data.issuedDate) setIssuedDate(data.issuedDate.split('T')[0]);
                if (data.expiryDate) setExpiryDate(data.expiryDate.split('T')[0]);
                if (data.placeOfIssue) setPlaceOfIssue(data.placeOfIssue);
                if (data.dobOnDoc) setDobOnDoc(data.dobOnDoc.split('T')[0]);
                if (data.nameOnDoc) setNameOnDoc(data.nameOnDoc);
                if (data.vaultFileId) setVaultFileId(data.vaultFileId);
                // Pre-select existing family member (empty string = Myself)
                setFamilyMemberId(data.familyMemberId ?? "");
            } catch (err: any) {
                setError(err.message || "Failed to load document");
            } finally {
                setIsLoading(false);
            }
        };
        fetchDoc();
    }, [id]);

    useEffect(() => {
        validateDates();
    }, [issuedDate, expiryDate]);

    const validateDates = () => {
        setIssueDateError("");
        setExpiryDateError("");
        setExpiryWarning("");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let valid = true;

        if (issuedDate) {
            const issue = new Date(issuedDate);
            if (issue > today) {
                setIssueDateError("Issue date cannot be in the future");
                valid = false;
            }
        }

        if (expiryDate) {
            const expiry = new Date(expiryDate);
            if (issuedDate) {
                const issue = new Date(issuedDate);
                if (expiry <= issue) {
                    setExpiryDateError("Expiry date must be after issue date");
                    valid = false;
                }
            }

            if (expiry < today) {
                setExpiryWarning("Warning: This document has expired.");
            }
        }

        return valid;
    };

    const handleSave = async () => {
        setError("");
        setIsSaving(true);
        
        if (!nameOnDoc.trim()) {
            setError("Please enter the name exactly as printed.");
            setIsSaving(false);
            return;
        }
        
        if (!validateDates()) {
            setError("Please fix date validation errors.");
            setIsSaving(false);
            return;
        }

        try {
            const apiPayload = {
                issuedDate: issuedDate || null,
                expiryDate: expiryDate || null,
                placeOfIssue: placeOfIssue || null,
                dobOnDoc: dobOnDoc || null,
                nameOnDoc: nameOnDoc.trim(),
                vaultFileId: vaultFileId || null,
                familyMemberId: familyMemberId || null,
            };

            const apiResponse = await fetch(`/api/identity/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || "Failed to update document");
            }

            // Successfully updated
            router.push(`/pehchaan/records`);
        } catch (e: any) {
            console.error("Save error details:", e);
            setError(e.message || "An error occurred while updating the document.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!docData) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-white">
                <p>Document not found</p>
                <button onClick={() => router.back()} className="text-amber-400">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 bg-slate-950 text-white selection:bg-amber-400/30">
            <header className="flex items-center gap-4 pt-8 mb-8">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white/70" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Edit Document</h1>
                    <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold">{docData.idType}</p>
                </div>
            </header>

            <div className="flex-1 space-y-8 max-w-md mx-auto w-full">
                {/* Read-only fields */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Masked Number</label>
                        <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white/60 text-sm font-mono flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-white/20" />
                            **** {docData.numberMasked}
                        </div>
                    </div>
                </div>

                <section className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Issue Date</label>
                        <input
                            type="date"
                            value={issuedDate}
                            onChange={(e) => setIssuedDate(e.target.value)}
                            className={`w-full bg-white/5 border ${issueDateError ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all`}
                        />
                        {issueDateError && <p className="text-[10px] text-red-400 font-medium">{issueDateError}</p>}
                    </div>

                    {!["AADHAAR", "PAN", "VOTER"].includes(docData.idType?.toUpperCase()) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Expiry Date</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className={`w-full bg-white/5 border ${expiryDateError ? 'border-red-500/50' : expiryWarning ? 'border-amber-500/50' : 'border-white/10'} rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all`}
                            />
                            {expiryDateError && <p className="text-[10px] text-red-400 font-medium">{expiryDateError}</p>}
                            {expiryWarning && !expiryDateError && <p className="text-[10px] text-amber-400 font-medium">{expiryWarning}</p>}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Place of Issue</label>
                        <input
                            type="text"
                            value={placeOfIssue}
                            onChange={(e) => setPlaceOfIssue(e.target.value)}
                            placeholder="e.g., Delhi, Mumbai"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/10 outline-none focus:border-amber-400/40 transition-all"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">DOB on Document</label>
                        <input
                            type="date"
                            value={dobOnDoc}
                            onChange={(e) => setDobOnDoc(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all"
                        />
                    </div>
                </section>

                {/* Document Owner */}
                <section className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2">
                        <Users className="w-3 h-3" /> Document Belongs To
                    </label>
                    <select
                        value={familyMemberId}
                        onChange={(e) => setFamilyMemberId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all appearance-none"
                    >
                        <option value="">Myself</option>
                        {familyMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </section>

                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Full Name (on Document)</label>
                    <input
                        type="text"
                        value={nameOnDoc}
                        onChange={(e) => setNameOnDoc(e.target.value)}
                        placeholder="Exactly as printed"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all"
                    />
                </section>

                {/* Upload Section */}
                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Official Digital Scan</label>
                    <FileUploader
                        folder="identity"
                        onUploaded={(fileId) => {
                            setVaultFileId(fileId);
                        }}
                        accept=".pdf,.png,.jpg,.jpeg"
                        maxSizeMB={2}
                        showFamilyMemberSelector={false}
                    />
                </section>

                {error && (
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {error}
                    </p>
                )}
            </div>

            <footer className="mt-auto pt-10 sticky bottom-0 bg-slate-950/80 backdrop-blur-md pb-6">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !!issueDateError || !!expiryDateError}
                    className="w-full bg-amber-400 disabled:opacity-50 disabled:grayscale text-slate-950 font-bold py-5 rounded-2xl shadow-[0_10px_30px_rgba(201,162,39,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            Updating...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" /> Save Changes
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
}
