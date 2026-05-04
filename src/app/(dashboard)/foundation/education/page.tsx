"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BookOpen, ShieldAlert, CheckCircle2, ArrowLeft, Upload, Plus, GraduationCap, Trash2 } from "lucide-react";
import { FileUploader } from "@/components/vault/FileUploader";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { Vault } from "@/lib/vault";
import { useToast } from "@/components/providers/ToastProvider";

interface EducationEntry {
    id?: string;
    degree: string;
    institution: string;
    year: string;
    specialization: string;
    hasLoan: boolean;
    certificateId?: string;
}

const DEGREE_OPTIONS = [
    "10th Standard", "12th Standard", "Diploma",
    "Bachelor's (B.A / B.Sc / B.Com)", "Bachelor's (B.Tech / B.E.)",
    "Bachelor's (BBA / BCA)", "Master's (M.A / M.Sc / M.Com)",
    "Master's (M.Tech / MBA)", "PhD / Doctorate", "Professional (CA / CS / CMA)",
    "Professional (MBBS / MD)", "Professional (LLB / LLM)", "Other",
];

export default function EducationPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<EducationEntry[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [degree, setDegree] = useState("");
    const [institution, setInstitution] = useState("");
    const [year, setYear] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [hasLoan, setHasLoan] = useState(false);
    const [uploadedCerts, setUploadedCerts] = useState<Record<string, string>>({}); // Mapping of entry index/id to certificate URL
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores ID of entry being deleted
    const [isSaving, setIsSaving] = useState(false);
    const [yearError, setYearError] = useState("");
    const toast = useToast();

    useEffect(() => {
        const fetchEducation = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const json = await response.json();
                    const profileData = json?.data;
                    if (profileData?.education && profileData.education.length > 0) {
                        const loadedEntries = profileData.education.map((edu: any) => ({
                            id: edu.id,
                            degree: edu.degree || "",
                            institution: edu.institute || edu.institution || "",
                            year: edu.yearCompleted ? edu.yearCompleted.toString() : "",
                            specialization: edu.specialization || "",
                            hasLoan: !!edu.linkedLoanId,
                            certificateId: edu.certificateUrl || undefined,
                        }));
                        setEntries(loadedEntries);
                        setShowForm(false);
                    } else {
                        setShowForm(true);
                    }
                } else {
                    setShowForm(true);
                }
            } catch (error) {
                console.error("Failed to load education:", error);
                setShowForm(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEducation();
    }, []);

    const handleYearChange = (val: string) => {
        setYear(val);
        setYearError("");
        if (val) {
            const certYear = parseInt(val);
            const currentYear = new Date().getFullYear();
            if (isNaN(certYear) || certYear > currentYear || certYear < 1900) {
                setYearError(`Year must be between 1900 and ${currentYear}`);
            }
        }
    };

    const handleAddEntry = async () => {
        if (!degree || !institution) return;
        if (yearError) return;

        if (year) {
            const certYear = parseInt(year);
            const userDobStr = OnboardingStore.get().dob;
            if (userDobStr) {
                const birthYear = new Date(userDobStr).getFullYear();
                if (certYear <= birthYear) {
                    setYearError("Year must be after your birth year");
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/education', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    degree,
                    institution,
                    year,
                    specialization,
                    hasLoan,
                    certificateId: uploadedCerts["new"]
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save qualification");
            }

            const result = await response.json();
            const savedRecord = result.data;

            const entry: EducationEntry = {
                id: savedRecord.id,
                degree,
                institution,
                year,
                specialization,
                hasLoan,
                certificateId: uploadedCerts["new"]
            };
            setEntries([...entries, entry]);

            // Reset form
            setDegree("");
            setInstitution("");
            setYear("");
            setSpecialization("");
            setHasLoan(false);
            setUploadedCerts(prev => {
                const next = { ...prev };
                delete next["new"];
                return next;
            });
            setYearError("");
            setShowForm(false);
            toast("Qualification saved successfully", "success");
        } catch (error) {
            console.error("Save error:", error);
            toast("Failed to save qualification. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = async (id: string | undefined, index: number) => {
        // If no database ID, it's a local entry not yet saved
        if (!id || id.startsWith('local-')) {
            setEntries(entries.filter((_, i) => i !== index));
            setIsDeleting(null);
            return;
        }

        try {
            const response = await fetch(`/api/education/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to delete");
            }

            setEntries(entries.filter((_, i) => i !== index));
            toast("Qualification removed successfully.", "success");
        } catch (error) {
            console.error("Delete error:", error);
            toast("Failed to delete qualification. Please try again.", "error");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleViewCert = async (certId: string) => {
        const url = await Vault.getPreviewUrl(certId);
        if (url) {
            window.open(url, '_blank');
        } else {
            toast('File not found in your secure local vault.', "error");
        }
    };

    const handleFinish = async () => {
        if (entries.length === 0) {
            toast("Please add at least one qualification", "error");
            return;
        }
        
        toast("Education section completed successfully", "success");
        router.push("/rajya");
    };

    const anyLoan = entries.some(e => e.hasLoan);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen relative p-6">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400 text-center">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/60">Loading your qualifications...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen relative p-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 pt-8 mb-4">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Education & Qualifications</h1>
                    <p className="text-xs text-white/35 mt-0.5">Add your degrees, diplomas & certificates</p>
                </div>
            </div>

            {/* YouTube Tutorial */}
            <div className="mb-4">
                <VideoTutorialPlaceholder youtubeId="KNWL0uda_OA" label="Why education matters for your financial profile" />
            </div>

            {/* Guide */}
            <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3 mb-5">
                <p className="text-xs text-[var(--color-rajya-muted)]">
                    💡 Your education determines earning potential and links to any student loans. Add each degree separately — you can upload certificates too.
                </p>
            </div>

            {/* Existing entries */}
            {entries.length > 0 && (
                <div className="space-y-3 mb-5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Your Qualifications ({entries.length})</p>
                    {entries.map((e, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 relative group">
                            <button
                                onClick={() => setIsDeleting(e.id || `local-${i}`)}
                                className="absolute top-3 right-3 text-white/30 hover:text-red-400 transition-colors"
                                title="Remove qualification"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 mb-1">
                                <GraduationCap className="w-4 h-4 text-[var(--color-rajya-accent)]" />
                                <p className="text-sm font-medium text-[var(--color-rajya-text)] pr-6">{e.degree}</p>
                            </div>
                            <p className="text-xs text-[var(--color-rajya-muted)]">{e.institution}{e.year ? ` • ${e.year}` : ""}</p>
                            {e.specialization && <p className="text-[10px] text-[var(--color-rajya-muted)]/60 mt-0.5">{e.specialization}</p>}
                            {e.certificateId && (
                                <div className="mt-2 flex flex-col gap-1">
                                    <p className="text-[9px] text-white/30 truncate max-w-[200px]">
                                        {e.certificateId.split('/').pop()}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleViewCert(e.certificateId!)}
                                        className="w-fit text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <CheckCircle2 className="w-3 h-3" /> View Certificate
                                    </button>
                                </div>
                            )}
                            {e.hasLoan && (
                                <span className="mt-2 inline-block text-[10px] bg-[var(--color-rajya-danger)]/10 text-[var(--color-rajya-danger)] border border-[var(--color-rajya-danger)]/20 px-2 py-0.5 rounded-full">
                                    ⚠ Education Loan Active
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add form */}
            <AnimatePresence mode="wait">
                {showForm ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 mb-6"
                    >
                        <p className="text-xs text-white/40 uppercase tracking-wider">Add a Qualification</p>

                        {/* Degree picker */}
                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Degree / Certificate *</label>
                            <select
                                value={degree}
                                onChange={e => setDegree(e.target.value)}
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none appearance-none"
                            >
                                <option value="">Select degree...</option>
                                {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Institution */}
                        <div>
                            <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Institution / University *</label>
                            <input
                                type="text"
                                value={institution}
                                onChange={e => setInstitution(e.target.value)}
                                placeholder="e.g. IIT Delhi, Mumbai University"
                                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none placeholder-white/20"
                            />
                        </div>

                        {/* Year & Specialization */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Year</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={e => handleYearChange(e.target.value)}
                                    placeholder="e.g. 2020"
                                    className={`w-full px-3 py-3 bg-white/5 border ${yearError ? "border-red-500/50" : "border-white/10"} rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none placeholder-white/20`}
                                />
                                {yearError && <p className="text-[10px] text-red-400 mt-1">{yearError}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Specialization</label>
                                <input
                                    type="text"
                                    value={specialization}
                                    onChange={e => setSpecialization(e.target.value)}
                                    placeholder="e.g. Computer Science"
                                    className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none placeholder-white/20"
                                />
                            </div>
                        </div>

                        {/* Education loan toggle */}
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                            <div>
                                <p className="text-sm text-[var(--color-rajya-text)]">Education Loan?</p>
                                <p className="text-[10px] text-[var(--color-rajya-muted)]">Is there an active loan for this degree?</p>
                            </div>
                            <button
                                onClick={() => setHasLoan(!hasLoan)}
                                className={`w-12 h-7 rounded-full border transition-colors flex items-center px-0.5 ${hasLoan ? "bg-[var(--color-rajya-danger)] border-[var(--color-rajya-danger)]" : "bg-white/10 border-white/20"}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${hasLoan ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>

                        {/* Certificate upload */}
                        <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Upload className="w-4 h-4 text-[var(--color-rajya-accent)]" />
                                <p className="text-sm font-medium text-[var(--color-rajya-text)]">Upload Certificate (Optional)</p>
                            </div>
                            <p className="text-[10px] text-[var(--color-rajya-muted)] mb-3">Upload your degree/diploma certificate. Saved securely in Nidhi Vault.</p>
                            <FileUploader
                                folder="education"
                                label="Upload certificate"
                                onUploaded={(url) => setUploadedCerts(prev => ({ ...prev, "new": url || "" }))}
                            />
                        </div>

                        {/* Save entry */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleAddEntry}
                                disabled={!degree || !institution || !!yearError || isSaving}
                                className="bg-[var(--color-rajya-accent)] text-black font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
                            >
                                {isSaving ? "Saving..." : "Save Qualification"}
                            </button>
                            {entries.length > 0 && (
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="bg-white/5 border border-white/10 text-[var(--color-rajya-text)] py-3 rounded-xl text-sm"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3 mb-6"
                    >
                        {/* Add another qualification */}
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-[var(--color-rajya-muted)] hover:border-[var(--color-rajya-accent)]/40 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Another Qualification
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loan alert */}
            {anyLoan && (
                <div className="bg-[var(--color-rajya-danger)]/10 border border-[var(--color-rajya-danger)]/30 rounded-xl p-4 flex items-start gap-3 mb-5">
                    <ShieldAlert className="w-5 h-5 text-[var(--color-rajya-danger)] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-[var(--color-rajya-danger)] mb-1">Education Loan Detected</p>
                        <p className="text-xs text-[var(--color-rajya-danger)]/80">
                            This will be tracked in your Rin (Debt) module. Make sure to record EMI details there.
                        </p>
                    </div>
                </div>
            )}

            {/* Finish button */}
            {entries.length > 0 && !showForm && (
                <button
                    onClick={handleFinish}
                    className="w-full bg-[var(--color-rajya-accent)] text-black py-4 rounded-xl font-semibold text-sm mt-auto hover:bg-[var(--color-rajya-accent)]/90 transition-colors"
                >
                    Save & Continue to Dashboard
                </button>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white text-center mb-2">Delete Qualification?</h3>
                            <p className="text-xs text-white/40 text-center mb-6">
                                This action cannot be undone. This qualification will be removed from your profile.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        const entryIndex = entries.findIndex((_, idx) => (`local-${idx}`) === isDeleting || entries[idx].id === isDeleting);
                                        const entry = entries[entryIndex];
                                        handleDeleteEntry(entry?.id, entryIndex);
                                    }}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    onClick={() => setIsDeleting(null)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-3 rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
