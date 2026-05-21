"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Vault, VaultFolder } from "@/lib/vault";
import { CloudDriveSync } from "@/lib/cloudDriveSync";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

interface FileUploaderProps {
    folder: VaultFolder;
    tags?: string[];
    onUploaded?: (id: string, name: string) => void;
    accept?: string; // e.g. "image/*,application/pdf"
    label?: string;
    compact?: boolean;
    storageType?: 'supabase' | 'googledrive' | 'local';
}

export function FileUploader({
    folder,
    tags,
    onUploaded,
    accept = "image/*,application/pdf",
    label = "Upload document",
    compact = false,
    storageType,
}: FileUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState<{ name: string; id: string } | null>(null);
    const [cloudOptIn, setCloudOptIn] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [docName, setDocName] = useState("");
    const [docNotes, setDocNotes] = useState("");
    const [detailsSaved, setDetailsSaved] = useState(false);
    const [savedFileObj, setSavedFileObj] = useState<File | null>(null);
    const [syncingCloud, setSyncingCloud] = useState(false);
    const supabase = createClient();
    const toast = useToast();

    const handleFile = async (file: File) => {
        // 1. Validate File Size (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast("File size exceeds 2MB limit. Please upload a smaller file.", "error");
            return;
        }

        // 2. Validate File Type
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            toast("Only PDF, JPG, and PNG files are allowed", "error");
            return;
        }

        setUploading(true);
        
        // Generate local preview for images
        if (file.type.startsWith("image/")) {
            setPreview(URL.createObjectURL(file));
        }

        try {
            let id: string;

            // 3. Check storage type
            if (storageType === 'googledrive') {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folderName', 'Svarajya_Nidhi');
                
                const uploadRes = await fetch('/api/google-drive/upload', {
                    method: 'POST',
                    body: formData,
                });
                
                const result = await uploadRes.json();
                if (!uploadRes.ok) {
                    if (uploadRes.status === 401 || uploadRes.status === 403) {
                        throw new Error(result.error || "Google Drive authentication expired. Please log out and log back in with Google.");
                    }
                    throw new Error(result.error || "Failed to upload to Google Drive");
                }
                
                id = result.data.fileId;
            } else if (storageType === 'supabase' || (!storageType && (folder === "identity" || folder === "education"))) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Authentication required for remote storage.");

                    const fileExt = file.name.split(".").pop();
                    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from(folder) // "identity" or "education" bucket
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage
                        .from(folder)
                        .getPublicUrl(filePath);
                    
                    id = urlData.publicUrl;
                } catch (supaErr) {
                    console.warn("Supabase upload failed, falling back to local OPFS:", supaErr);
                    toast("Cloud upload failed. Saving securely to your device's local vault instead.", "warning");
                    id = await Vault.saveFile(folder, file, tags);
                }
            } else {
                // Fallback to Local Vault (IndexedDB + OPFS)
                id = await Vault.saveFile(folder, file, tags);
            }

            setUploaded({ name: file.name, id });
            setDocName(file.name);
            setSavedFileObj(file);
            onUploaded?.(id, file.name);
        } catch (err: any) {
            console.error("Upload failed:", err);
            const isNetworkError = !window.navigator.onLine || err.message?.includes('network') || err.message?.includes('fetch');
            if (isNetworkError) {
                toast("Network error. Check your connection and try again.", "error");
            } else if (err.message) {
                toast(err.message, "error");
            } else {
                toast("Failed to upload. Please try again.", "error");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleSaveDetails = async () => {
        if (!uploaded) return;
        // Only update local metadata if it's a local file (id starts with opfs or is internal)
        if (!uploaded.id.startsWith("http")) {
            await Vault.updateFile(uploaded.id, { name: docName, notes: docNotes });
        }
        setDetailsSaved(true);
        onUploaded?.(uploaded.id, docName);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleCloudToggle = async () => {
        const newVal = !cloudOptIn;
        setCloudOptIn(newVal);

        if (newVal && savedFileObj) {
            setSyncingCloud(true);
            try {
                const formData = new FormData();
                formData.append('file', savedFileObj);
                formData.append('folderName', 'Svarajya_Nidhi');
                formData.append('fileName', docName || savedFileObj.name);

                const uploadRes = await fetch('/api/google-drive/upload', {
                    method: 'POST',
                    body: formData,
                });

                const result = await uploadRes.json();

                if (!uploadRes.ok) {
                    toast(result.error || "Failed to upload to Google Drive.", "error");
                    setCloudOptIn(false);
                } else {
                    toast("Backed up securely to Google Drive!", "success");
                    if (uploaded) {
                        setUploaded(prev => prev ? { ...prev, id: result.data.fileId } : null);
                    }
                }
            } catch (err) {
                console.error("Cloud toggle error:", err);
                toast("Error connecting to Google Drive backup service.", "error");
                setCloudOptIn(false);
            }
            setSyncingCloud(false);
        }
    };

    if (compact && !uploaded) {
        return (
            <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-lg px-3 py-2 hover:border-white/25 transition-colors"
            >
                <Upload className="w-3.5 h-3.5" /> Add photo
                <input ref={inputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
            </button>
        );
    }

    return (
        <div className="space-y-3">
            {!uploaded ? (
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${dragging
                        ? "border-amber-400/60 bg-amber-400/8"
                        : "border-white/15 bg-white/4 hover:border-white/30 hover:bg-white/6"
                        }`}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-white/40">Saving locally...</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-white/40" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-white/60">{label}</p>
                                <p className="text-xs text-white/30 mt-0.5">Tap to browse or drag & drop</p>
                                <p className="text-[10px] text-white/20 mt-1">Images & PDFs • Stored on this device</p>
                            </div>
                        </>
                    )}
                    <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4"
                >
                    <div className="flex items-start gap-3">
                        {preview ? (
                            // blob: URL from URL.createObjectURL — cannot be optimized by next/image
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white/40" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{uploaded.name}</p>
                            <p className="text-xs text-emerald-400 mt-0.5">✓ Saved to device</p>
                        </div>
                        <button onClick={() => { setUploaded(null); setPreview(null); }} className="text-white/30 hover:text-white/60">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {!detailsSaved ? (
                        <div className="mt-4 pt-3 border-t border-emerald-500/20 space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-white/50 uppercase">Document Name</label>
                                <input type="text" value={docName} onChange={e => setDocName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-white/50 uppercase">Notes (Optional)</label>
                                <textarea value={docNotes} onChange={e => setDocNotes(e.target.value)} rows={2} placeholder="e.g. Policy number, expiry..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 resize-none" />
                            </div>
                            <button onClick={handleSaveDetails}
                                className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium py-2 rounded-lg text-sm transition-colors hover:bg-emerald-500/30">
                                Save Details
                            </button>
                        </div>
                    ) : (
                        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center gap-2">
                            <p className="text-xs text-emerald-400/80">Details saved successfully.</p>
                        </div>
                    )}

                    {/* Cloud opt-in */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
                        <div className="flex items-center gap-2">
                            {syncingCloud ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" /> : cloudOptIn ? <Cloud className="w-3.5 h-3.5 text-blue-400" /> : <CloudOff className="w-3.5 h-3.5 text-white/25" />}
                            <span className="text-xs text-white/40">{syncingCloud ? "Syncing..." : cloudOptIn ? "Synced to Google Drive" : "Also store in cloud"}</span>
                        </div>
                        <button
                            onClick={handleCloudToggle}
                            disabled={syncingCloud}
                            className={`w-8 h-5 rounded-full transition-colors disabled:opacity-50 ${cloudOptIn ? "bg-blue-500" : "bg-white/15"}`}
                        >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${cloudOptIn ? "translate-x-3" : ""}`} />
                        </button>
                    </div>
                    {!cloudOptIn && (
                        <p className="text-[10px] text-blue-400/60 mt-1">
                            Cloud sync is currently disabled to ensure 100% zero-knowledge privacy. Your file remains safely inside your device&apos;s OPFS Local Vault, accessible only by you.
                        </p>
                    )}
                </motion.div>
            )}
        </div>
    );
}
