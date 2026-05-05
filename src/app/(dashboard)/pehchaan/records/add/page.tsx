"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, Info, Lock, ExternalLink, CloudOff, AlertCircle } from "lucide-react";
import { IdentityStore, DocType } from "@/lib/identityStore";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { FileUploader } from "@/components/vault/FileUploader";
import { DocumentValidator } from "@/lib/documentValidation";

/**
 * PEHCHAAN: ADD DOCUMENT MODULE
 * Handles visual masking, Aadhaar-specific formatting, and name mismatch logic.
 * Fetches existing documents from /api/identity on mount.
 */

const DOC_TYPES: { id: DocType; label: string }[] = [
    { id: "aadhaar", label: "Aadhaar" },
    { id: "pan", label: "PAN" },
    { id: "passport", label: "Passport" },
    { id: "dl", label: "Driving License" },
    { id: "voter", label: "Voter ID" },
    { id: "other", label: "Other" },
];
const NO_EXPIRY_TYPES: DocType[] = ["aadhaar", "pan", "voter"];
interface ApiIdentityRecord {
    id: string;
    idType: string;
    numberMasked: string;
    expiryDate: string | null;
    issuedDate: string | null;
    createdAt: string;
    updatedAt: string;
}

function AddDocumentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedType = searchParams.get("type") as DocType | null;

    // DB records fetched on load
    const [dbDocs, setDbDocs] = useState<ApiIdentityRecord[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);

    // Form State
    const [docType, setDocType] = useState<DocType>(preselectedType || "pan");
    const [customDocName, setCustomDocName] = useState("");
    const [docNumber, setDocNumber] = useState("");
    const [nameOnDoc, setNameOnDoc] = useState("");
    const [revealed, setRevealed] = useState(false);
    const [vaultFileId, setVaultFileId] = useState<string | null>(null);
    const [issuedDate, setIssuedDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [placeOfIssue, setPlaceOfIssue] = useState("");
    const [dobOnDoc, setDobOnDoc] = useState("");

    // UI/UX State
    const [error, setError] = useState("");
    const [mismatchReason, setMismatchReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState<{ id: string; strength: number; coverage: any } | null>(null);
    const [isGoogleLinked, setIsGoogleLinked] = useState<boolean | null>(null);

    // Date Validation State
    const [issueDateError, setIssueDateError] = useState("");
    const [expiryDateError, setExpiryDateError] = useState("");
    const [expiryWarning, setExpiryWarning] = useState("");

    const userDob = OnboardingStore.get().dob;

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
            } else if (userDob && issue < new Date(userDob)) {
                setIssueDateError("Issue date cannot be before your date of birth");
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

    /**
     * Fetch all identity records from the database on mount.
     * This is the source of truth for which doc types already exist.
     */
    useEffect(() => {
        const fetchDocs = async () => {
            try {
                // Fetch linking status
                const statusRes = await fetch('/api/auth/google-status');
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setIsGoogleLinked(statusData.linked);
                }

                const res = await fetch("/api/identity");
                if (res.ok) {
                    const json = await res.json();
                    const records: ApiIdentityRecord[] = json.data || [];
                    setDbDocs(records);

                    // If a preselected type is already submitted, redirect immediately
                    if (preselectedType) {
                        const match = records.find(
                            (r) => r.idType.toLowerCase() === preselectedType.toLowerCase()
                        );
                        if (match) {
                            router.replace(`/pehchaan/records/doc/${match.id}`);
                            return;
                        }
                    }
                }
            } catch (e) {
                console.error("[AddDocument] Failed to load identity records:", e);
            } finally {
                setIsLoadingDocs(false);
            }
        };
        fetchDocs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Helper: find a DB record for a given DocType.
     */
    const getDbRecord = (type: DocType): ApiIdentityRecord | undefined =>
        dbDocs.find((r) => r.idType.toLowerCase() === type.toLowerCase());

    const activeDbRecord = getDbRecord(docType);
    const isViewingExisting = !!activeDbRecord;

    const profileName = OnboardingStore.get().fullName || "";

    // Normalize names: trim, lowercase, collapse multiple spaces
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

    const isNameMismatched =
        profileName.trim().length > 0 &&
        nameOnDoc.trim().length > 0 &&
        normalize(nameOnDoc) !== normalize(profileName);

    /**
     * Handles Aadhaar spacing (0000 0000 0000) and general uppercase transformation
     */
    const handleNumberChange = (val: string) => {
        setError("");
        if (docType === "aadhaar") {
            const digits = val.replace(/\D/g, "");
            if (digits.length <= 12) {
                const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                setDocNumber(formatted);
            }
        } else {
            setDocNumber(val.toUpperCase());
        }
    };

    /**
     * When user selects a doc type:
     * - If already submitted → redirect to its detail page.
     * - Otherwise → clear form and switch type.
     */
    const handleSelectType = (type: DocType) => {
        const existing = getDbRecord(type);
        if (existing) {
            router.push(`/pehchaan/records/doc/${existing.id}`);
            return;
        }
        setDocType(type);
        setDocNumber("");
        setIssuedDate("");
        setExpiryDate("");
        setPlaceOfIssue("");
        setDobOnDoc("");
        setNameOnDoc("");
        setMismatchReason("");
        setError("");
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("type", type);
        router.replace(newUrl.pathname + newUrl.search);
    };

    /**
     * Persists the document to the Local-First Identity Store + DB
     */
    const handleSave = async () => {
        setError("");
        setIsSaving(true);
        const cleanNumber = docNumber.replace(/\s/g, "");

        // 1. Structural Validation
        if (!docType) { setError("Please select a document type."); setIsSaving(false); return; }
        if (docType === "aadhaar" && cleanNumber.length !== 12) {
            setError("Aadhaar must be exactly 12 digits.");
            setIsSaving(false);
            return;
        }
        if (docType === "other" && !customDocName.trim()) { setError("Please provide a name for this custom document."); setIsSaving(false); return; }
        if (!cleanNumber.trim()) { setError("Document number is required."); setIsSaving(false); return; }
        if (!nameOnDoc.trim()) { setError("Please enter the name exactly as printed."); setIsSaving(false); return; }
        if (isNameMismatched && !mismatchReason.trim()) { setError("A reason for the name mismatch is required for the audit trail."); setIsSaving(false); return; }
        if (!vaultFileId) { setError("Please upload a document file to proceed."); setIsSaving(false); return; }

        // 2. Pattern Validation (Checksum/Regex)
        const valResult = DocumentValidator.validateByType(docType, cleanNumber);
        if (valResult.status === "invalid") {
            setError(valResult.message);
            setIsSaving(false);
            return;
        }

        // 2.1 Date Validation
        if (!validateDates()) {
            setError("Please fix date validation errors.");
            setIsSaving(false);
            return;
        }

        try {
            // 3. API Call - Primary save method
            const numberMasked = cleanNumber.slice(-4); // Last 4 digits
            const apiPayload = {
                idType: docType.toUpperCase(),
                numberMasked,
                issuedDate: issuedDate || null,
                expiryDate: NO_EXPIRY_TYPES.includes(docType) ? null : (expiryDate || null),
                placeOfIssue: placeOfIssue || null,
                dobOnDoc: dobOnDoc || null,
                nameOnDoc: nameOnDoc.trim(),
                vaultFileId,
            };

            const apiResponse = await fetch("/api/identity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                const isDuplicate = typeof errorData.error === 'string' &&
                    (errorData.error.toLowerCase().includes("duplicate") ||
                        errorData.error.toLowerCase().includes("already exists"));

                if (apiResponse.status === 409 || isDuplicate) {
                    setError("This document type already exists in your vault.");
                    setIsSaving(false);
                    return;
                }
                throw new Error(errorData.error || "Failed to save document to database");
            }

            const apiResult = await apiResponse.json();

            // 4. Store Injection - Backward compatibility
            const doc = IdentityStore.addDoc({
                docType,
                customDocName: docType === "other" ? customDocName.trim() : undefined,
                docNumber: cleanNumber,
                nameOnDoc: nameOnDoc.trim(),
                vaultFileId: vaultFileId || undefined,
                notes: mismatchReason ? `Audit Note: Name mismatch corrected via user input. Reason: ${mismatchReason}` : undefined,
            });

            // Artificial delay for high-fidelity feel
            setTimeout(() => {
                setSaved({
                    id: apiResult.data?.id || doc.id,
                    strength: doc.vaultFileId ? 45 : 25,
                    coverage: IdentityStore.getCoverage(),
                });
                setIsSaving(false);
            }, 800);

        } catch (e: any) {
            console.error("Save error details:", e);

            let errorMessage = "An error occurred during secure persistence.";

            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            } else {
                try {
                    // Safe stringify for complex objects
                    errorMessage = JSON.stringify(e);
                } catch (err) {
                    errorMessage = "A complex system error occurred.";
                }
            }

            // User-friendly conversion for known issues
            const lowMsg = errorMessage.toLowerCase();
            if (lowMsg.includes("duplicate") || lowMsg.includes("already exists") || lowMsg.includes("unique constraint") || lowMsg.includes("409")) {
                errorMessage = "This document type already exists in your Sva-Rajya Vault.";
            } else if (lowMsg.includes("auth") || lowMsg.includes("unauthorized") || lowMsg.includes("401")) {
                errorMessage = "Authentication session expired. Please log in again.";
            } else if (errorMessage === "[object Object]") {
                errorMessage = "A secure database error occurred (Object format error).";
            }

            setError(errorMessage);
            setIsSaving(false);
        }
    };

    const maskedValue = docNumber && !revealed
        ? IdentityStore.maskDocNumber(docNumber, docType)
        : docNumber;

    // Loading state
    if (isLoadingDocs) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Success state
    if (saved) {
        return (
            <div className="flex flex-col min-h-screen p-6 items-center justify-center bg-slate-950 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/5 via-transparent to-transparent opacity-50" />

                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 15 }}
                    className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center mb-6 relative z-10">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </motion.div>

                <h1 className="text-2xl font-bold text-white relative z-10">Identity Seal Secured</h1>
                <p className="text-white/40 mt-3 max-w-[280px] relative z-10">
                    Your <span className="text-white font-medium uppercase">{docType}</span> has been encrypted and added to your Pehchaan Vault.
                </p>

                <div className="mt-10 w-full max-w-sm space-y-4 relative z-10">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                        <span className="text-xs text-white/50">Seal Strength</span>
                        <span className="text-amber-400 font-bold">{saved.strength}%</span>
                    </div>

                    <button onClick={() => router.push(`/pehchaan/records/doc/${saved.id}`)} className="w-full bg-amber-400 hover:bg-amber-500 text-black font-bold py-4 rounded-xl transition-all active:scale-95">
                        Enhance This Seal
                    </button>
                    <button onClick={() => router.push("/pehchaan/records")} className="w-full text-white/30 hover:text-white/60 py-2 text-sm transition-colors">
                        Return to Dashboard
                    </button>
                </div>
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
                    <h1 className="text-xl font-bold tracking-tight">Add Document</h1>
                    <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold">Secure Pehchaan Layer</p>
                </div>
            </header>

            <div className="flex-1 space-y-8 max-w-md mx-auto w-full">
                {/* Type Selection */}
                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> Select Identity Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DOC_TYPES.map((dt) => {
                            const dbRecord = getDbRecord(dt.id);
                            const isSubmitted = !!dbRecord;
                            const isActive = docType === dt.id && !isSubmitted;
                            return (
                                <button
                                    key={dt.id}
                                    onClick={() => handleSelectType(dt.id)}
                                    className={`px-5 py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5
                                        ${isSubmitted
                                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                                            : isActive
                                                ? "bg-amber-400/10 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(201,162,39,0.1)]"
                                                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                                        }`}
                                >
                                    {dt.label}
                                    {isSubmitted && <span className="text-emerald-400">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed">
                        Documents marked <span className="text-emerald-400">✓</span> are already in your vault. Click to view them.
                    </p>
                </section>

                {/* Read-only view for already-submitted doc type */}
                <AnimatePresence mode="wait">
                    {isViewingExisting ? (
                        <motion.div
                            key="existing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Banner */}
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                                <Lock className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] font-semibold text-emerald-300 mb-0.5">Document Already Secured</p>
                                    <p className="text-[10px] text-white/40 leading-relaxed">
                                        This document type is already in your Pehchaan Vault. View the full record to make changes.
                                    </p>
                                </div>
                            </div>

                            {/* Read-only fields */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Document Type</label>
                                    <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white/60 text-sm font-medium uppercase tracking-wide flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-white/20" />
                                        {activeDbRecord?.idType}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Masked Number (Last 4)</label>
                                    <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white/60 text-sm font-mono flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-white/20" />
                                        • {activeDbRecord?.numberMasked}
                                    </div>
                                </div>

                                {activeDbRecord?.issuedDate && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Issued Date</label>
                                        <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white/60 text-sm flex items-center gap-2">
                                            <Lock className="w-3.5 h-3.5 text-white/20" />
                                            {new Date(activeDbRecord.issuedDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}

                                {activeDbRecord?.expiryDate && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Expiry Date</label>
                                        <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white/60 text-sm flex items-center gap-2">
                                            <Lock className="w-3.5 h-3.5 text-white/20" />
                                            {new Date(activeDbRecord.expiryDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* View full record CTA */}
                            <button
                                onClick={() => router.push(`/pehchaan/records/doc/${activeDbRecord!.id}`)}
                                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Full Record
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="new-form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Custom name for "other" */}
                            <AnimatePresence>
                                {docType === "other" && (
                                    <motion.section
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Document Name</label>
                                        <input
                                            type="text"
                                            value={customDocName}
                                            onChange={(e) => setCustomDocName(e.target.value)}
                                            placeholder="e.g., Birth Certificate, Ration Card"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/10 outline-none focus:border-amber-400/40 transition-all"
                                        />
                                    </motion.section>
                                )}
                            </AnimatePresence>

                            {/* Number Input */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Document Number</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={revealed ? docNumber : maskedValue}
                                        onChange={(e) => handleNumberChange(e.target.value)}
                                        onFocus={() => setRevealed(true)}
                                        onBlur={() => setRevealed(false)}
                                        placeholder={docType === "aadhaar" ? "0000 0000 0000" : "Enter identification number"}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white placeholder-white/10 outline-none focus:border-amber-400/40 transition-all group-hover:border-white/20"
                                    />
                                    <button type="button" onClick={() => setRevealed(!revealed)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                        {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </section>

                            {/* New Fields */}
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
                                {!["aadhaar", "pan", "voter"].includes(docType) && (
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

                            {/* Upload Section */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Official Digital Scan</label>
                                {isGoogleLinked === false ? (
                                    <div className="p-6 border-2 border-dashed border-blue-500/20 rounded-2xl bg-blue-500/5 text-center">
                                        <CloudOff className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                                        <p className="text-sm text-white font-medium">Link Google Drive First</p>
                                        <p className="text-xs text-white/40 mt-1 mb-4">Identity documents are stored securely in your own Google Drive.</p>
                                        <button
                                            onClick={() => window.location.href = '/api/auth/link-google'}
                                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all"
                                        >
                                            Link Google Account
                                        </button>
                                    </div>
                                ) : (
                                    <FileUploader
                                        folder="identity"
                                        storageType="googledrive"
                                        label="Upload PDF or Image"
                                        onUploaded={(id) => setVaultFileId(id)}
                                        accept=".pdf,.png,.jpg,.jpeg"
                                    />
                                )}
                            </section>

                            {/* Name Mapping */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Full Name (on Document)</label>
                                <input
                                    type="text"
                                    value={nameOnDoc}
                                    onChange={(e) => setNameOnDoc(e.target.value)}
                                    placeholder="Exactly as printed"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-400/40 transition-all"
                                />

                                <AnimatePresence>
                                    {isNameMismatched && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <Info className="w-4 h-4 text-amber-400 mt-0.5" />
                                                <p className="text-[11px] text-amber-200/70 leading-relaxed">The name provided differs from your Foundation Profile. Please provide a reason (e.g., Initials, Marriage) for our record integrity.</p>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Reason for mismatch..."
                                                value={mismatchReason}
                                                onChange={(e) => setMismatchReason(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-amber-400/30"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>

                            {error && (
                                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {error}
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer CTA — only shown for new documents */}
            {!isViewingExisting && (
                <footer className="mt-auto pt-10 sticky bottom-0 bg-slate-950/80 backdrop-blur-md pb-6">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !vaultFileId || !!issueDateError || !!expiryDateError}
                        className="w-full bg-amber-400 disabled:opacity-50 disabled:grayscale text-slate-950 font-bold py-5 rounded-2xl shadow-[0_10px_30px_rgba(201,162,39,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                Encrypting Seal...
                            </>
                        ) : (
                            "Verify & Secure Seal"
                        )}
                    </button>
                </footer>
            )}
        </div>
    );
}

export default function AddDocument() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
            <AddDocumentForm />
        </Suspense>
    );
}
