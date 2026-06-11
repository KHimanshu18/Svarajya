"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function WillManagementPage() {
    const router = useRouter();
    const toast = useToast();

    // Form states
    const [exists, setExists] = useState(false);
    const [location, setLocation] = useState("");
    const [executorName, setExecutorName] = useState("");
    const [executorContact, setExecutorContact] = useState("");
    const [instructions, setInstructions] = useState("");
    const [lastReviewDate, setLastReviewDate] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Fetch current Will details
        fetch("/api/will")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    setExists(res.data.existsFlag || false);
                    setLocation(res.data.location || "");
                    setExecutorName(res.data.executorName || "");
                    setExecutorContact(res.data.executorContact || "");
                    setInstructions(res.data.instructions || "");
                    if (res.data.lastReviewDate) {
                        setLastReviewDate(res.data.lastReviewDate.split("T")[0]);
                    }
                }
            })
            .catch(err => console.error("Error fetching will details:", err));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/will", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    existsFlag: exists,
                    location: exists ? location : "",
                    executorName: exists ? executorName : "",
                    executorContact: exists ? executorContact : "",
                    instructions,
                    lastReviewDate: lastReviewDate || null,
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                toast("Will details updated successfully", "success");
                router.push("/mitra");
            } else {
                toast(result.error?.message || "Failed to save Will details", "error");
            }
        } catch (err) {
            console.error("Save Will error:", err);
            toast("An error occurred. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <div className="max-w-lg mx-auto w-full">
                <header className="pt-8 mb-8 flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Will & Succession planning</h1>
                        <p className="text-xs text-white/35">Define who governs your legacy.</p>
                    </div>
                </header>

                <div className="space-y-6 w-full">
                {/* Does Will Exist Toggle */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div>
                        <p className="text-sm font-semibold text-white">Do you have a legally signed Will?</p>
                        <p className="text-[10px] text-white/30 mt-0.5">Written decree regarding asset division.</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setExists(!exists)}
                        className={`w-12 h-7 rounded-full border transition-colors flex items-center px-0.5 ${exists ? "bg-emerald-500 border-emerald-500" : "bg-white/10 border-white/20"}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${exists ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>

                {exists ? (
                    <div className="space-y-4 animate-in slide-in-from-top-3 duration-250">
                        {/* Physical / Digital Location */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/70">Document Location</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Bank locker 4, Vault ID 109, Lawyer's office" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all" 
                            />
                            <p className="text-[10px] text-white/35 px-1">Ensure a trusted executor knows how to retrieve it in an emergency.</p>
                        </div>

                        {/* Executor Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/70">Executor Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Name of executor" 
                                    value={executorName} 
                                    onChange={e => setExecutorName(e.target.value)}
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/70">Executor Contact</label>
                                <input 
                                    type="text" 
                                    placeholder="Phone or Email" 
                                    value={executorContact} 
                                    onChange={e => setExecutorContact(e.target.value)}
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all" 
                                />
                            </div>
                        </div>

                        {/* Last Review Date */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/70">Last Review/Update Date</label>
                            <input 
                                type="date" 
                                value={lastReviewDate}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={e => setLastReviewDate(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white focus:border-amber-400/50 outline-none transition-all" 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 animate-in fade-in duration-200">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-red-400">Succession at Risk</h4>
                            <p className="text-[10px] text-white/50 leading-relaxed mt-1">
                                Without a designated, legally executed Will, your assets will be frozen and distributed according to personal laws rather than your specific choices. This process can drag on for months.
                            </p>
                        </div>
                    </div>
                )}

                {/* Emergency Instructions */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-white/70">Special/Emergency Instructions</label>
                    <textarea 
                        rows={3} 
                        placeholder="In case of emergency, contact [Name] at [Phone] immediately to retrieve safe keys and credentials..." 
                        value={instructions} 
                        onChange={e => setInstructions(e.target.value)}
                        className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-xs text-white placeholder-white/20 focus:border-amber-400/50 outline-none transition-all resize-none" 
                    />
                    <p className="text-[10px] text-white/30 px-1">Write instructions for your family on who to approach and what initial steps to take.</p>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={`w-full bg-amber-400 text-black font-bold py-4 rounded-xl text-sm shadow-lg shadow-amber-400/10 active:scale-[0.98] transition-all hover:bg-amber-300 ${
                            saving ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        {saving ? "Saving Details..." : "Seal & Protect"}
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
}
