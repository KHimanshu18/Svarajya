"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, GraduationCap, CheckCircle2, FileText, Upload, Users } from "lucide-react";
import { FileUploader } from "@/components/vault/FileUploader";
import { Vault, VaultFile } from "@/lib/vault";

const DEGREE_OPTIONS = [
    "10th Standard", "12th Standard", "Diploma",
    "Bachelor's (B.A / B.Sc / B.Com)", "Bachelor's (B.Tech / B.E.)",
    "Bachelor's (BBA / BCA)", "Master's (M.A / M.Sc / M.Com)",
    "Master's (M.Tech / MBA)", "PhD / Doctorate", "Professional (CA / CS / CMA)",
    "Professional (MBBS / MD)", "Professional (LLB / LLM)", "Other",
];

export default function EditEducation({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [record, setRecord] = useState<any>(null);

    const [degree, setDegree] = useState("");
    const [institution, setInstitution] = useState("");
    const [year, setYear] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [hasLoan, setHasLoan] = useState(false);
    const [certificateId, setCertificateId] = useState<string | null>(null);
    const [familyMemberId, setFamilyMemberId] = useState<string>("");
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);

    const [existingFiles, setExistingFiles] = useState<VaultFile[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<'new' | 'select'>('new');

    useEffect(() => {
        Vault.getFiles("education").then(files => {
            setExistingFiles(files);
        });
        // Fetch family members
        fetch('/api/family')
            .then(res => res.ok ? res.json() : { data: [] })
            .then(json => setFamilyMembers(json.data || []))
            .catch(() => setFamilyMembers([]));
    }, []);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                const res = await fetch(`/api/education/${id}`);
                if (!res.ok) throw new Error("Failed to fetch record");
                const json = await res.json();
                const data = json.data;
                setRecord(data);

                setDegree(data.degree || "");
                setInstitution(data.institute || "");
                setYear(data.yearCompleted?.toString() || "");
                setSpecialization(data.specialization || "");
                setHasLoan(!!data.linkedLoanId);
                setCertificateId(data.certificateUrl || null);
                setFamilyMemberId(data.familyMemberId ?? "");
            } catch (err: any) {
                setError(err.message || "Failed to load record");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecord();
    }, [id]);

    useEffect(() => {
        if (certificateId) {
            Vault.getFile(certificateId).then(file => {
                if (file) {
                    setFileName(file.name);
                } else if (certificateId.length > 20) {
                    setFileName("Google Drive Document");
                } else {
                    setFileName("Attached Certificate");
                }
            });
        }
    }, [certificateId]);

    const handleSave = async () => {
        setError("");
        if (!degree || !institution) {
            setError("Degree and Institution are required.");
            return;
        }

        setIsSaving(true);
        try {
            const apiPayload = {
                degree,
                institution,
                year: year || null,
                specialization,
                hasLoan,
                certificateId,
                familyMemberId: familyMemberId || null,
            };

            const response = await fetch(`/api/education/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update record");
            }

            router.push("/foundation/education");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen relative p-6">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400 text-center">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/60">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <p>Record not found</p>
                <button onClick={() => router.back()} className="text-amber-400 mt-4">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-slate-950">
            <header className="flex items-center gap-4 pt-8 mb-8 relative z-10">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white/70" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Edit Qualification</h1>
                    <p className="text-[10px] text-[var(--color-rajya-accent)]/60 uppercase tracking-[0.2em] font-semibold">{record.degree}</p>
                </div>
            </header>

            <div className="flex-1 space-y-6 max-w-md mx-auto w-full relative z-10">
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

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-[var(--color-rajya-muted)] mb-1 block">Year</label>
                        <input
                            type="number"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            placeholder="e.g. 2020"
                            className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none placeholder-white/20"
                        />
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

                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                    <div>
                        <p className="text-sm text-[var(--color-rajya-text)]">
                            Education Loan?
                        </p>
                        <p className="text-[10px] text-[var(--color-rajya-muted)]">
                            Is there an active loan for this degree?
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setHasLoan(!hasLoan)}
                        className={`w-12 h-7 rounded-full border transition-colors flex items-center px-0.5 ${
                            hasLoan
                                ? "bg-[var(--color-rajya-danger)] border-[var(--color-rajya-danger)]"
                                : "bg-white/10 border-white/20"
                        }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full bg-white transition-transform ${
                                hasLoan ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Certificate Owner */}
                <div className="space-y-2">
                    <label className="text-xs text-[var(--color-rajya-muted)] mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Certificate Belongs To
                    </label>
                    <select
                        value={familyMemberId}
                        onChange={e => setFamilyMemberId(e.target.value)}
                        className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none appearance-none"
                    >
                        <option value="">Myself</option>
                        {familyMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[var(--color-rajya-muted)] uppercase tracking-[0.15em]">Certificate Attachment</label>
                        {existingFiles.length > 0 && (
                            <div className="flex items-center bg-white/5 rounded-lg p-1">
                                <button 
                                    onClick={() => setUploadMode('new')}
                                    className={`text-[10px] px-3 py-1 rounded-md transition-colors ${uploadMode === 'new' ? 'bg-[var(--color-rajya-accent)] text-black font-bold' : 'text-white/50 hover:text-white'}`}
                                >Upload New</button>
                                <button 
                                    onClick={() => setUploadMode('select')}
                                    className={`text-[10px] px-3 py-1 rounded-md transition-colors ${uploadMode === 'select' ? 'bg-[var(--color-rajya-accent)] text-black font-bold' : 'text-white/50 hover:text-white'}`}
                                >Select Vault File</button>
                            </div>
                        )}
                    </div>
                    
                    {uploadMode === 'new' ? (
                        <div className="relative">
                            {certificateId ? (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                                        <span className="text-sm text-white font-medium truncate">{fileName || "Loading..."}</span>
                                    </div>
                                    <button onClick={() => setCertificateId(null)} className="text-xs text-white/40 hover:text-white shrink-0 ml-4">Remove</button>
                                </div>
                            ) : (
                                <FileUploader
                                    folder="education"
                                    storageType="googledrive"
                                    label="Upload certificate"
                                    onUploaded={(id) => setCertificateId(id)}
                                    showFamilyMemberSelector={false}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {existingFiles.map(file => (
                                <button 
                                    key={file.id} 
                                    onClick={() => setCertificateId(file.id)}
                                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${certificateId === file.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                >
                                    <span className="text-xs text-white font-medium truncate w-full">{file.name}</span>
                                    <span className="text-[10px] text-[var(--color-rajya-muted)]">{new Date(file.createdAt).toLocaleDateString()}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {error}
                    </p>
                )}
            </div>

            <footer className="mt-auto pt-10 sticky bottom-0 bg-slate-950/80 backdrop-blur-md pb-6 relative z-10">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-[var(--color-rajya-accent)] text-black font-bold py-4 rounded-xl shadow-[0_10px_30px_rgba(201,162,39,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
