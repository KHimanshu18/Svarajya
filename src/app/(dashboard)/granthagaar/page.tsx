"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    User, Users, GraduationCap, Shield, CreditCard, Home, FileText, MoreHorizontal, ArrowLeft, Upload
} from "lucide-react";
import { Vault, VaultFolder } from "@/lib/services/documentService";
import { FileUploader } from "@/components/vault/FileUploader";
import { PageGuide } from "@/components/shared/PageGuide";
import { VideoTutorialPlaceholder } from "@/components/tutorials/TutorialCard";

type FolderConfig = {
    id: VaultFolder;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
};

const FOLDERS: FolderConfig[] = [
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" />, color: "text-amber-400", description: "Your photo & ID" },
    { id: "family", label: "Family", icon: <Users className="w-5 h-5" />, color: "text-purple-400", description: "Family photos & documents" },
    { id: "education", label: "Education", icon: <GraduationCap className="w-5 h-5" />, color: "text-blue-400", description: "Degrees & certificates" },
    { id: "insurance", label: "Insurance", icon: <Shield className="w-5 h-5" />, color: "text-emerald-400", description: "Policy documents" },
    { id: "identity", label: "Identity", icon: <CreditCard className="w-5 h-5" />, color: "text-red-400", description: "Aadhaar, PAN, Passport" },
    { id: "loans", label: "Loans", icon: <FileText className="w-5 h-5" />, color: "text-orange-400", description: "Loan agreements & NOCs" },
    { id: "property", label: "Property", icon: <Home className="w-5 h-5" />, color: "text-cyan-400", description: "Deeds & agreements" },
    { id: "other", label: "Other", icon: <MoreHorizontal className="w-5 h-5" />, color: "text-white/40", description: "Miscellaneous documents" },
];

export default function VaultPage() {
    const router = useRouter();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [activeFolder, setActiveFolder] = useState<VaultFolder | null>(null);
    const [folderFiles, setFolderFiles] = useState<Array<{ id: string; name: string; type: string; createdAt: number }>>([]);

    useEffect(() => {
        Vault.getFolderCounts().then(setCounts);
    }, []);

    const openFolder = async (folder: VaultFolder) => {
        setActiveFolder(folder);
        const files = await Vault.getFiles(folder);
        setFolderFiles(files.map(f => ({ id: f.id, name: f.name, type: f.type, createdAt: f.createdAt })));
    };

    const handleUploaded = async () => {
        // Refresh counts and folder view
        const newCounts = await Vault.getFolderCounts();
        setCounts(newCounts);
        if (activeFolder) {
            const files = await Vault.getFiles(activeFolder);
            setFolderFiles(files.map(f => ({ id: f.id, name: f.name, type: f.type, createdAt: f.createdAt })));
        }
    };

    const handleDelete = async (id: string) => {
        await Vault.deleteFile(id);
        handleUploaded();
    };

    const totalFiles = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <div className="flex flex-col min-h-screen relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen p-6">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => activeFolder ? setActiveFolder(null) : router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            {activeFolder ? FOLDERS.find(f => f.id === activeFolder)?.label : "Nidhi Vault"}
                        </h1>
                        <p className="text-xs text-white/35 mt-0.5">
                            {activeFolder ? FOLDERS.find(f => f.id === activeFolder)?.description : `${totalFiles} file${totalFiles !== 1 ? "s" : ""} â€¢ Stored locally`}
                        </p>
                    </div>
                </div>

                {/* YouTube Tutorial */}
                <div className="mt-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">ðŸŽ“ Learn More</p>
                    <VideoTutorialPlaceholder youtubeId="qvk4GawSxgE" label="How to organize financial documents digitally" />
                </div>

                {!activeFolder ? (
                    /* Folder Grid */
                    <>
                        <PageGuide
                            title="Your Secure Document Vault"
                            description="Upload and organize important documents â€” certificates, policies, property deeds, and more. All files stay on your device. Cloud backup is optional."
                            actions={[{ emoji: "ðŸ“", label: "Organize" }, { emoji: "ðŸ“¤", label: "Upload" }, { emoji: "ðŸ”’", label: "Local storage" }]}
                        />
                        <div className="h-4" />

                        <div className="grid grid-cols-2 gap-3">
                            {FOLDERS.map((folder, i) => (
                                <motion.button
                                    key={folder.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => openFolder(folder.id)}
                                    className="bg-white/5 border border-white/10 hover:border-white/25 rounded-2xl p-4 text-left transition-all"
                                >
                                    <div className={`${folder.color} mb-3`}>{folder.icon}</div>
                                    <p className="text-sm font-medium text-white">{folder.label}</p>
                                    <p className="text-xs text-white/35 mt-0.5">{folder.description}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[10px] text-white/25 uppercase tracking-wider">
                                            {counts[folder.id] || 0} file{(counts[folder.id] || 0) !== 1 ? "s" : ""}
                                        </span>
                                        {(counts[folder.id] || 0) > 0 && (
                                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Folder Detail View */
                    <div className="space-y-4">
                        <FileUploader
                            folder={activeFolder}
                            label={`Upload to ${activeFolder}`}
                            onUploaded={handleUploaded}
                            showFamilyMemberSelector={true}
                        />

                        {folderFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-white/35 uppercase tracking-wider">Saved files</p>
                                {folderFiles.map(file => (
                                    <div
                                        key={file.id}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                            {file.type.startsWith("image/") ? (
                                                <User className="w-4 h-4 text-white/40" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-white/40" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{file.name}</p>
                                            <p className="text-[10px] text-white/35">
                                                {new Date(file.createdAt).toLocaleDateString("en-IN")}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDelete(file.id)} className="text-white/25 hover:text-red-400 transition-colors p-1">
                                            âœ•
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {folderFiles.length === 0 && (
                            <div className="text-center py-12 text-white/25">
                                <Upload className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No files yet</p>
                                <p className="text-xs mt-1">Upload your first document above</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
