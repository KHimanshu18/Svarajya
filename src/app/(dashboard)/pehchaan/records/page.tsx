"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, CreditCard, FileText, Plane, Car, Vote, MoreHorizontal, Cloud, CloudOff, AlertCircle } from "lucide-react";
import { IdentityStore, DocType, calcSealStrength } from "@/lib/identityStore";
import { SealStrengthRing } from "@/components/identity/SealStrengthRing";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { PageGuide } from "@/components/ui/PageGuide";
import { motion } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const DOC_META: Record<DocType, { label: string; icon: React.ReactNode }> = {
    aadhaar: { label: "Aadhaar", icon: <CreditCard className="w-5 h-5" /> },
    pan: { label: "PAN", icon: <FileText className="w-5 h-5" /> },
    passport: { label: "Passport", icon: <Plane className="w-5 h-5" /> },
    dl: { label: "Driving License", icon: <Car className="w-5 h-5" /> },
    voter: { label: "Voter ID", icon: <Vote className="w-5 h-5" /> },
    other: { label: "Other", icon: <MoreHorizontal className="w-5 h-5" /> },
};

// const DOC_TYPES: DocType[] = ["aadhaar", "pan", "passport", "dl", "voter", "other"]; // unused

export default function IdentityHub() {
    const router = useRouter();
    const toast = useToast();
    const [, setHydrated] = useState(false);
    useEffect(() => { IdentityStore.hydrate().then(() => setHydrated(true)); }, []);
    // Seed contacts from onboarding profile (mobile/email) on first visit
    IdentityStore.seedFromOnboarding();
    const docs = IdentityStore.getDocs();
    const links = IdentityStore.getLinks();
    const coverage = IdentityStore.getCoverage();
    const confidence = IdentityStore.getConfidence();
    const level = IdentityStore.getLevel();
    const [now] = useState(() => Date.now());

    const [isGoogleLinked, setIsGoogleLinked] = useState<boolean | null>(null);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [dbDocuments, setDbDocuments] = useState<any[]>([]);

    const fetchGoogleStatus = async () => {
        try {
            const res = await fetch('/api/auth/google-status');
            if (res.ok) {
                const data = await res.json();
                setIsGoogleLinked(data.linked);
            }
        } catch (e) {
            console.error("Failed to fetch Google status:", e);
        }
    };

    const fetchDocuments = async () => {
        try {
            const response = await fetch('/api/identity');
            if (response.ok) {
                const data = await response.json();
                setDbDocuments(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        }
    };
    useEffect(() => {
        fetchDocuments();
        fetchGoogleStatus();

        // Check for success/error in URL
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('success') === 'Google_Linked') {
            toast("Google Drive linked successfully!", "success");
            // Clear URL params
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    // Refetch documents when page becomes visible (e.g., returning from add page or tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchDocuments();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Map DB documents to display format
    const displayDocs = dbDocuments.map(d => ({
        id: d.id,
        docType: d.idType.toLowerCase() as DocType,
        docNumber: '****' + d.numberMasked,
        expiryDate: d.expiryDate,
        issueDate: d.issuedDate,
        placeOfIssue: d.placeOfIssue,
        vaultFileId: d.vaultFileId,
        verificationStatus: 'not_verified' as const,
    }));

    // Calculate coverage and confidence from DB documents (focus on 5 essential types)
    const essentialTypes: DocType[] = ["aadhaar", "pan", "passport", "dl", "voter"];
    const filledEssential = new Set(
        displayDocs
            .filter(d => essentialTypes.includes(d.docType))
            .map(d => d.docType)
    ).size;

    const dbConfidence = filledEssential * 20;
    const dbCoverage = { filled: filledEssential, total: 5 };

    // Calculate level based on confidence
    const getLevel = (confidence: number) => {
        if (confidence < 20) return "Basic";
        if (confidence < 40) return "Bronze";
        if (confidence < 60) return "Silver";
        if (confidence < 80) return "Gold";
        return "Platinum";
    };

    const dbLevel = getLevel(dbConfidence);

    // Handle document click navigation
    const handleDocClick = (docType: string) => {
        const existingDoc = displayDocs.find(d => d.docType === docType);
        if (existingDoc) {
            router.push(`/pehchaan/records/doc/${existingDoc.id}`);
        } else {
            router.push(`/pehchaan/records/add?type=${docType}`);
        }
    };

    const getExpiryBadge = (docType: DocType) => {
        const typeDocs = displayDocs.filter(d => d.docType === docType);
        for (const doc of typeDocs) {
            if (!doc.expiryDate) continue;
            const days = Math.ceil((new Date(doc.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
            if (days < 30) return { color: "bg-red-500", text: `${days}d` };
            if (days < 180) return { color: "bg-amber-400", text: `${days}d` };
            return { color: "bg-emerald-500", text: "Valid" };
        }
        return null;
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-white">Pehchaan Vault</h1>
                        <p className="text-xs text-white/35 mt-0.5">Store and manage your essential identity documents securely.</p>
                    </div>
                </div>

                {/* Guide Section */}
                <PageGuide
                    title="What is Pehchaan?"
                    description="Store your identity documents securely — Aadhaar, PAN, Passport, and more. Track expiry dates, link contacts, and build your identity confidence score."
                    actions={[{ emoji: "📄", label: "Add documents" }, { emoji: "🔗", label: "Link contacts" }, { emoji: "📅", label: "Track renewals" }]}
                />
                <div className="h-4" />

                {/* Google Drive Linking Banner */}
                {isGoogleLinked === false && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                <CloudOff className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">Link Google Drive</h3>
                                <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">
                                    Secure your documents by saving them directly to your personal Google Drive.
                                    Our zero-server policy ensures only you have access.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/api/auth/link-google'}
                                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Cloud className="w-3.5 h-3.5" />
                                    Link Drive Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isGoogleLinked === true && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-medium">Google Drive Sync Active</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] text-white/30 uppercase tracking-tighter hidden sm:inline">Secure & Sovereign</span>
                            <button
                                onClick={() => setShowUnlinkModal(true)}
                                className="text-[10px] text-red-400/80 hover:text-red-400 transition-colors font-medium"
                            >
                                Unlink
                            </button>
                        </div>
                    </div>
                )}

                {/* Coverage + Confidence */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs text-white/40 uppercase tracking-wider">Identity Coverage</p>
                            <p className="text-white font-semibold mt-0.5">{dbCoverage.filled} of {dbCoverage.total} <span className="text-white/40 font-normal text-xs">essential documents</span></p>
                        </div>
                        <SealStrengthRing percentage={dbConfidence} size={52} label="Avg" />
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${(dbCoverage.filled / dbCoverage.total) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-white/50">Add more to strengthen your identity readiness.</p>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">{dbLevel}</span>
                    </div>
                </div>

                {/* Average Seal Strength bar */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 flex items-center gap-3">
                    <div className="flex-1">
                        <p className="text-xs text-white/40">Average Document Seal Quality</p>
                        <div className="h-1 bg-white/8 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${dbConfidence}%` }} />
                        </div>
                    </div>
                    <span className="text-sm font-bold text-amber-400">{dbConfidence}%</span>
                </div>

                {/* Seal Cabinet */}
                <div className="grid grid-cols-2 gap-3 flex-1">
                    {/* Render core docs */}
                    {["aadhaar", "pan", "passport", "dl", "voter"].map(type => {
                        const meta = DOC_META[type as DocType];
                        const typeDocs = displayDocs.filter(d => d.docType === type);
                        const docCount = typeDocs.length;
                        const expiry = getExpiryBadge(type as DocType);
                        const hasVerified = typeDocs.some(d => d.verificationStatus !== "not_verified");
                        const strength = typeDocs.length > 0 ? calcSealStrength(typeDocs[0] as any, links) : 0;

                        return (
                            <button
                                key={type}
                                onClick={() => handleDocClick(type)}
                                className="bg-white/5 border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 text-left transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-amber-400">{meta.icon}</div>
                                    <div className="flex gap-1">
                                        {expiry && <span className={`w-2 h-2 rounded-full ${expiry.color}`} />}
                                        {hasVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-white">{meta.label}</p>
                                {docCount > 0 ? (
                                    <>
                                        <p className="text-xs text-white/40 mt-0.5">{typeDocs[0].docNumber}</p>
                                        <p className="text-[10px] text-amber-400/70 mt-1">{strength}% Secure</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-white/50 mt-0.5">Not added</p>
                                )}
                            </button>
                        );
                    })}

                    {/* Render dynamically added "Other" documents as separate cards */}
                    {displayDocs.filter(d => d.docType === "other").map(otherDoc => {
                        const strength = 0; // Placeholder
                        const hasVerified = otherDoc.verificationStatus !== "not_verified";

                        return (
                            <button
                                key={otherDoc.id}
                                onClick={() => router.push(`/pehchaan/records/doc/${otherDoc.id}`)}
                                className="bg-white/5 border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 text-left transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-amber-400">{DOC_META["other"].icon}</div>
                                    <div className="flex gap-1">
                                        {hasVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-white truncate">Other</p>
                                <p className="text-xs text-white/40 mt-0.5">{otherDoc.docNumber}</p>
                                <p className="text-[10px] text-amber-400/70 mt-1">{strength}% Secure</p>
                            </button>
                        );
                    })}

                    {/* Render "Add Other" button if no other docs exist, or as an extra block */}
                    <button
                        onClick={() => router.push(`/pehchaan/records/add?type=other`)}
                        className="bg-white/5 border border-white/5 border-dashed hover:border-white/20 rounded-2xl p-4 text-center transition-all flex flex-col items-center justify-center opacity-60 hover:opacity-100"
                    >
                        <div className="text-white/40 mb-2">{DOC_META["other"].icon}</div>
                        <p className="text-sm font-medium text-white/70">Add Custom</p>
                        <p className="text-xs text-white/40 mt-0.5">Document</p>
                    </button>
                </div>

                {/* Navigation buttons */}
                <div className="space-y-3 mt-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => router.push("/pehchaan/records/links")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors">
                            🔗 Manage Links
                        </button>
                        <button onClick={() => router.push("/pehchaan/records/renewals")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors">
                            📅 Renewals
                        </button>
                    </div>
                    <button onClick={() => router.push("/pehchaan/records/settings")} className="w-full text-center text-xs text-white/50 py-2 hover:text-white/70 transition-colors">
                        ⚙️ Vault Settings
                    </button>
                </div>
                {/* YouTube Tutorial */}
                <div className="mt-4">
                    <VideoTutorialPlaceholder youtubeId="qvk4GawSxgE" label="Why PAN, Aadhaar & Passport matter for your finances" />
                </div>

                {/* Primary CTA */}
                <div className="pb-4 pt-4">
                    <button
                        onClick={() => router.push("/pehchaan/records/add")}
                        className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                    >
                        {docs.length === 0 ? "Add First Document" : "Add Another Document"}
                    </button>
                </div>
            </div>

            <ConfirmModal 
                isOpen={showUnlinkModal}
                title="Unlink Google Account"
                message="Are you sure you want to unlink your Google account? You can link it again later."
                onConfirm={async () => {
                    const res = await fetch('/api/auth/unlink-google', { method: 'POST' });
                    if (res.ok) {
                        setShowUnlinkModal(false);
                        window.location.reload();
                    }
                }}
                onCancel={() => setShowUnlinkModal(false)}
            />
        </div>
    );
}
