"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, ShieldAlert, ShieldCheck, Plus, Trash2, Search, X, Check, Landmark, Percent, FileText } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface NomineeMapping {
  id: string;
  assetRef: string;
  assetType: string;
  nomineeId: string;
  sharePercent: number;
  proofDocLinked: boolean;
  confirmed: boolean;
  nominee: {
    id: string;
    name: string;
    relation: string;
  };
}

interface Asset {
  id: string;
  name: string;
  type: 'INSURANCE' | 'BANK' | 'PROPERTY' | 'INVESTMENT';
  value: number;
  details: string;
  nominees: NomineeMapping[];
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  nomineeEligible: boolean;
}

export default function AssetNomineeDashboard() {
    const router = useRouter();
    const toast = useToast();

    // Data states
    const [assets, setAssets] = useState<Asset[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTab, setFilterTab] = useState<"ALL" | "VULNERABLE" | "NOMINATED">("ALL");

    // Modal state for assigning nominee
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedNomineeId, setSelectedNomineeId] = useState("");
    const [sharePercent, setSharePercent] = useState("100");
    const [saving, setSaving] = useState(false);

    // Modal state for deletion confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [mappingToDelete, setMappingToDelete] = useState<NomineeMapping | null>(null);

    const fetchData = async () => {
        try {
            const [assetsRes, familyRes] = await Promise.all([
                fetch("/api/nominee/assets"),
                fetch("/api/family")
            ]);

            const assetsJson = await assetsRes.json();
            const familyJson = await familyRes.json();

            if (assetsJson.success) setAssets(assetsJson.data || []);
            if (familyJson.success) setFamilyMembers(familyJson.data || []);
        } catch (error) {
            console.error("Error loading nominee assets:", error);
            toast("Failed to load assets data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtered Assets
    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             asset.details.toLowerCase().includes(searchQuery.toLowerCase());
        
        const hasNominees = asset.nominees.length > 0;
        const matchesTab = filterTab === "ALL" || 
                           (filterTab === "VULNERABLE" && !hasNominees) || 
                           (filterTab === "NOMINATED" && hasNominees);

        return matchesSearch && matchesTab;
    });

    const eligibleNominees = familyMembers.filter(member => member.nomineeEligible);

    // Open Assign Modal
    const handleOpenAssignModal = (asset: Asset) => {
        setSelectedAsset(asset);
        setSelectedNomineeId(eligibleNominees[0]?.id || "");
        setSharePercent("100");
        setAssignModalOpen(true);
    };

    // Save Nominee Assignment
    const handleSaveAssignment = async () => {
        if (!selectedAsset || !selectedNomineeId) return;
        const pct = parseFloat(sharePercent);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
            toast("Share percentage must be between 1 and 100", "error");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/nominee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetRef: selectedAsset.id,
                    assetType: selectedAsset.type,
                    nomineeId: selectedNomineeId,
                    sharePercent: pct,
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                toast("Nominee assigned successfully!", "success");
                setAssignModalOpen(false);
                fetchData();
            } else {
                toast(result.error?.message || "Failed to assign nominee", "error");
            }
        } catch (err) {
            console.error(err);
            toast("Failed to save assignment", "error");
        } finally {
            setSaving(false);
        }
    };

    // Trigger Delete Mapping
    const handleTriggerDelete = (mapping: NomineeMapping) => {
        setMappingToDelete(mapping);
        setDeleteModalOpen(true);
    };

    // Confirm Delete Mapping
    const handleConfirmDelete = async () => {
        if (!mappingToDelete) return;

        try {
            const res = await fetch(`/api/nominee/${mappingToDelete.id}`, {
                method: "DELETE",
            });

            const result = await res.json();
            if (res.ok && result.success) {
                toast("Nominee mapping removed successfully", "success");
                setDeleteModalOpen(false);
                setMappingToDelete(null);
                fetchData();
            } else {
                toast(result.error?.message || "Failed to remove nominee mapping", "error");
            }
        } catch (err) {
            console.error(err);
            toast("Failed to remove mapping", "error");
        }
    };

    // Statistics
    const totalCount = assets.length;
    const vulnerableCount = assets.filter(a => a.nominees.length === 0).length;
    const nominatedCount = totalCount - vulnerableCount;

    // Helper format rupee
    const formatRupee = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50">Loading asset ledger...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 text-white select-none">
            <header className="pt-8 mb-6 flex items-center gap-3">
                <button onClick={() => router.push("/mitra")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold">Nomination Matrix</h1>
                    <p className="text-xs text-white/35">Verify nominees across all assets.</p>
                </div>
            </header>

            {/* Gap Analysis Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Total Assets</span>
                    <span className="text-lg font-bold text-white mt-1">{totalCount}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Protected</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1">{nominatedCount}</span>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Vulnerable</span>
                    <span className="text-lg font-bold text-red-400 mt-1">{vulnerableCount}</span>
                </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="space-y-4 mb-6">
                <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                    <button 
                        onClick={() => setFilterTab("ALL")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === "ALL" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterTab("VULNERABLE")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === "VULNERABLE" ? "bg-red-500/10 text-red-400" : "text-white/40 hover:text-white"}`}
                    >
                        Vulnerable ({vulnerableCount})
                    </button>
                    <button 
                        onClick={() => setFilterTab("NOMINATED")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === "NOMINATED" ? "bg-emerald-500/10 text-emerald-400" : "text-white/40 hover:text-white"}`}
                    >
                        Protected
                    </button>
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 text-white/30 absolute left-4 top-3.5" />
                    <input 
                        type="text" 
                        placeholder="Search by asset name or details..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" 
                    />
                </div>
            </div>

            {/* Assets List */}
            <div className="space-y-3">
                {filteredAssets.length === 0 ? (
                    <div className="text-center py-12 bg-white/3 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-white/20 text-xs">No assets found matching this filter.</p>
                    </div>
                ) : (
                    filteredAssets.map(asset => {
                        const isProtected = asset.nominees.length > 0;
                        return (
                            <div key={asset.id} className={`bg-white/5 border rounded-2xl p-4 relative overflow-hidden transition-all ${isProtected ? "border-white/10" : "border-red-500/20"}`}>
                                {/* Background vulnerable glow */}
                                {!isProtected && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/3 rounded-full blur-2xl pointer-events-none" />}
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                                            asset.type === "INSURANCE" ? "bg-orange-500/20 text-orange-400" :
                                            asset.type === "BANK" ? "bg-blue-500/20 text-blue-400" :
                                            asset.type === "PROPERTY" ? "bg-emerald-500/20 text-emerald-400" :
                                            "bg-violet-500/20 text-violet-400"
                                        }`}>
                                            {asset.type}
                                        </span>
                                        <h3 className="text-sm font-semibold text-white mt-1.5">{asset.name}</h3>
                                        <p className="text-[10px] text-white/40 mt-0.5">{asset.details}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{formatRupee(asset.value)}</p>
                                        <p className="text-[8px] text-white/30 uppercase mt-0.5 font-semibold">Asset Value</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-3 border-t border-white/5 mt-3">
                                    <span className="text-[8px] uppercase tracking-wider font-bold text-white/30">Nominees & Share</span>
                                    
                                    {isProtected ? (
                                        <div className="flex flex-wrap gap-2">
                                            {asset.nominees.map(m => (
                                                <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] text-white/80 animate-in fade-in duration-200">
                                                    <span className="font-semibold text-amber-400">{m.nominee.name}</span>
                                                    <span className="text-white/40">({m.sharePercent}%)</span>
                                                    <button 
                                                        onClick={() => handleTriggerDelete(m)}
                                                        className="p-0.5 hover:text-red-400 transition-colors shrink-0 ml-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => handleOpenAssignModal(asset)}
                                                className="h-7 w-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/15 hover:border-amber-400/30 transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-white/60" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                                            <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1.5">
                                                <ShieldAlert className="w-3.5 h-3.5" /> No Nominee Declared
                                            </span>
                                            <button 
                                                onClick={() => handleOpenAssignModal(asset)}
                                                className="bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-red-600 transition-colors"
                                            >
                                                Assign Nominee
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 1. Assign Nominee Modal */}
            {assignModalOpen && selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <header className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-md font-bold text-white">Assign Nominee</h3>
                                <p className="text-[10px] text-white/40 mt-0.5">{selectedAsset.name}</p>
                            </div>
                            <button 
                                onClick={() => setAssignModalOpen(false)}
                                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10"
                            >
                                <X className="w-4 h-4 text-white/50" />
                            </button>
                        </header>

                        {eligibleNominees.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-xs text-white/45">No eligible family members found.</p>
                                <button 
                                    onClick={() => router.push("/family")}
                                    className="text-xs text-amber-400 underline mt-2"
                                >
                                    Add members to your family tree
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Select Family Member</label>
                                    <select 
                                        value={selectedNomineeId} 
                                        onChange={e => setSelectedNomineeId(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:border-amber-400/30 transition-all appearance-none"
                                    >
                                        {eligibleNominees.map(m => (
                                            <option key={m.id} value={m.id} className="bg-slate-950 text-white">
                                                {m.name} ({m.relation})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Share Percentage</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            placeholder="100" 
                                            value={sharePercent} 
                                            onChange={e => setSharePercent(e.target.value)}
                                            className="w-full bg-white/6 border border-white/15 rounded-xl pl-4 pr-10 py-3.5 text-xs text-white outline-none focus:border-amber-400/30 transition-all" 
                                        />
                                        <Percent className="w-3.5 h-3.5 text-white/35 absolute right-4 top-4" />
                                    </div>
                                    <p className="text-[9px] text-white/30 px-1">Typically 100% unless splitting between multiple beneficiaries.</p>
                                </div>

                                <button 
                                    onClick={handleSaveAssignment}
                                    disabled={saving}
                                    className={`w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider transition-all mt-2 active:scale-98 ${
                                        saving ? "opacity-50" : ""
                                    }`}
                                >
                                    {saving ? "Mapping Nominee..." : "Confirm Nomination"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. Custom Delete Confirmation Modal */}
            {deleteModalOpen && mappingToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4 border border-red-500/25">
                            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-2">Remove Nomination?</h3>
                        <p className="text-xs text-white/50 mb-6 leading-relaxed">
                            Are you sure you want to cancel the nomination of <strong className="text-white">{mappingToDelete.nominee.name}</strong>? The asset will mark as vulnerable.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setDeleteModalOpen(false); setMappingToDelete(null); }}
                                className="flex-1 py-3.5 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
