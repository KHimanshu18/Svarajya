"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, PlusCircle, Trash2, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

interface SuccessionAsset {
  id: string;
  title: string;
  type: string;
  nominee: boolean;
  value?: number;
}

interface SuccessionNominee {
  id: string;
  assetType: string;
  assetId: string;
  nomineeId: string;
  nomineeName: string;
  relationship: string;
  sharePercentage: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
}

const badgeStyle = {
  insurance: "bg-red-500/15 text-red-200 border border-red-500/20",
  default: "bg-amber-500/15 text-amber-200 border border-amber-500/20",
  safe: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/20",
};

const typeName = (type: string) => {
  switch (type) {
    case "insurance": return "Insurance";
    case "investment": return "Investment";
    case "property": return "Property";
    case "asset_inventory": return "Asset";
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export default function NomineesPage() {
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<SuccessionAsset[]>([]);
  const [mappings, setMappings] = useState<SuccessionNominee[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedNomineeId, setSelectedNomineeId] = useState<string>("");
  const [relationship, setRelationship] = useState("");
  const [sharePercentage, setSharePercentage] = useState(100);
  const [editingMapping, setEditingMapping] = useState<SuccessionNominee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuccessionNominee | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, mappingsRes, familyRes] = await Promise.all([
        fetch('/api/succession/assets', { cache: 'no-store' }),
        fetch('/api/succession/nominees', { cache: 'no-store' }),
        fetch('/api/family', { cache: 'no-store' }),
      ]);

      const assetsJson = await assetsRes.json();
      const mappingsJson = await mappingsRes.json();
      const familyJson = await familyRes.json();

      setAssets(Array.isArray(assetsJson?.data) ? assetsJson.data : assetsJson || []);
      setMappings(Array.isArray(mappingsJson?.data) ? mappingsJson.data : mappingsJson || []);
      setFamily(Array.isArray(familyJson?.data) ? familyJson.data : familyJson || []);
    } catch (err) {
      console.error('Failed to load nominee matrix data', err);
      toast('Failed to load nominee data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModalForAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedNomineeId("");
    setRelationship("");
    setSharePercentage(100);
    setEditingMapping(null);
    setModalOpen(true);
  };

  const openModalForEdit = (mapping: SuccessionNominee) => {
    setEditingMapping(mapping);
    setSelectedAssetId(mapping.assetId);
    setSelectedNomineeId(mapping.nomineeId);
    setRelationship(mapping.relationship || "");
    setSharePercentage(mapping.sharePercentage ?? 100);
    setModalOpen(true);
  };

  const selectedAsset = assets.find(asset => asset.id === selectedAssetId);

  const submitMapping = async () => {
    if (!selectedAssetId || !selectedNomineeId) {
      toast('Please choose an asset and a nominee.', 'error');
      return;
    }
    if (sharePercentage < 1 || sharePercentage > 100) {
      toast('Share percentage must be between 1 and 100.', 'error');
      return;
    }

    setSaving(true);
    try {
      const nomineePayload = {
        nomineeId: selectedNomineeId,
        nomineeName: family.find(member => member.id === selectedNomineeId)?.name || '',
        relationship: relationship || family.find(member => member.id === selectedNomineeId)?.relation || 'Nominee',
        sharePercentage,
      };

      const body = editingMapping
        ? nomineePayload
        : {
            assetType: selectedAsset?.type || 'asset_inventory',
            assetId: selectedAssetId,
            ...nomineePayload,
          };

      const response = await fetch(editingMapping ? `/api/succession/nominees/${editingMapping.id}` : '/api/succession/nominees', {
        method: editingMapping ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to save nominee mapping');
      }

      toast(`Nominee ${editingMapping ? 'updated' : 'added'} successfully!`, 'success');
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Save nominee failed', error);
      toast(error instanceof Error ? error.message : 'Failed to save nominee mapping', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/succession/nominees/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to delete nominee mapping');
      }
      toast('Nominee mapping removed successfully', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      console.error('Delete failed', error);
      toast(error instanceof Error ? error.message : 'Failed to remove nominee mapping', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assetStatus = (asset: SuccessionAsset) => {
    if (asset.nominee) return { label: 'Fully nominated', style: badgeStyle.safe };
    if (asset.type === 'insurance') return { label: 'Insurance missing nominee', style: badgeStyle.insurance };
    return { label: 'Review nominee', style: badgeStyle.default };
  };

  const nomineeMap = useMemo(() => {
    return mappings.reduce<Record<string, SuccessionNominee[]>>((acc, mapping) => {
      const key = `${mapping.assetType}::${mapping.assetId}`;
      acc[key] = acc[key] || [];
      acc[key].push(mapping);
      return acc;
    }, {});
  }, [mappings]);

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col">
        {/* Header with back button */}
        <div className="flex items-center gap-3 pt-8 mb-8">
          <button
            onClick={() => router.push('/succession')}
            className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <div className="flex-1">
            <PageGuide
              title="Nominee Mapping Matrix"
              description="Track your asset nominees, review nomination status and keep succession assignments current."
              actions={[{ emoji: '👥', label: 'Nominees' }, { emoji: '📋', label: 'Assets' }]}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-[0.9fr_0.7fr] relative z-10">
          <div className="space-y-5">
            {/* Assets Section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Assets to map</h2>
                  <p className="mt-1 text-xs text-white/60">Badges help you identify unmapped holdings quickly.</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/60 font-medium">{assets.length} total</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {loading ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
                    <div className="text-sm">Loading assets…</div>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
                    <div className="text-sm">No succession assets found yet.</div>
                  </div>
                ) : assets.map(asset => {
                  const status = assetStatus(asset);
                  const mappingKey = `${asset.type}::${asset.id}`;
                  const assignedMappings = nomineeMap[mappingKey] || [];
                  return (
                    <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-wider text-white/40">{typeName(asset.type)}</p>
                          <h3 className="mt-2 text-sm font-semibold text-white">{asset.title}</h3>
                          {asset.type === 'insurance' && status.label === 'Insurance missing nominee' && (
                            <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${status.style}`}>
                              {status.label}
                            </span>
                          )}
                        </div>
                        {!(asset.type === 'insurance' && status.label === 'Insurance missing nominee') && (
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${status.style}`}>
                            {status.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-white/60">Value: <span className="font-medium text-white/80">₹{(asset.value ?? 0).toLocaleString('en-IN')}</span></p>
                      {assignedMappings.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-xl bg-slate-900/50 p-3 border border-white/5">
                          {assignedMappings.map(mapping => (
                            <div key={mapping.id} className="flex items-center justify-between gap-3 text-xs">
                              <div>
                                <p className="text-white/80 font-medium">{mapping.nomineeName}</p>
                                <p className="text-white/40 text-[10px]">{mapping.relationship} • {mapping.sharePercentage}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {assignedMappings.length > 0 ? (
                        <button
                          onClick={() => openModalForEdit(assignedMappings[0])}
                          className="mt-4 w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                        >
                          Edit nominee
                        </button>
                      ) : (
                        <button
                          onClick={() => openModalForAsset(asset.id)}
                          className="mt-4 w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                        >
                          Add nominee
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mappings Section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Active mappings</h2>
              <p className="text-xs text-white/60 mb-6">Edit or remove assignments from your succession registry.</p>

              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
                    <div className="text-sm">Loading mappings…</div>
                  </div>
                ) : mappings.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
                    <div className="text-sm">No nominee mappings created yet.</div>
                  </div>
                ) : mappings.map(mapping => (
                  <div key={mapping.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{mapping.nomineeName}</p>
                        <p className="text-xs text-white/60 mt-1">{mapping.relationship} for {typeName(mapping.assetType)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wide text-white/60 border border-white/10">{mapping.sharePercentage}%</span>
                        <button
                          onClick={() => openModalForEdit(mapping)}
                          className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition border border-white/10"
                        >
                          <Edit3 className="inline-block w-3 h-3 mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(mapping)}
                          className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 transition border border-red-500/20"
                        >
                          <Trash2 className="inline-block w-3 h-3 mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions panel */}
          <div className="h-fit rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick actions</h3>
            <button
              onClick={() => { setModalOpen(true); setEditingMapping(null); setSelectedAssetId(''); setSelectedNomineeId(''); setRelationship(''); setSharePercentage(100); }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              <PlusCircle className="w-4 h-4" /> Add mapping
            </button>

            {/* Stats panel */}
            <div className="mt-6 space-y-3 pt-6 border-t border-white/10">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <p className="text-xs uppercase tracking-wider text-white/40">Total assets</p>
                <p className="text-2xl font-semibold text-amber-400 mt-1">{assets.length}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <p className="text-xs uppercase tracking-wider text-white/40">Mapped</p>
                <p className="text-2xl font-semibold text-emerald-400 mt-1">{mappings.length}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <p className="text-xs uppercase tracking-wider text-white/40">Unmapped</p>
                <p className="text-2xl font-semibold text-red-400 mt-1">{Math.max(0, assets.length - mappings.length)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete nominee mapping"
        message="This action will remove the nominee assignment from the succession registry. Continue?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/10 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">{editingMapping ? 'Edit nominee mapping' : 'Add nominee mapping'}</h2>
                <p className="mt-1 text-xs text-white/60">Complete the details for your succession nominee assignment.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm text-white/70">
                <p className="font-medium mb-2">Asset</p>
                <select
                  value={selectedAssetId}
                  onChange={e => setSelectedAssetId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="">Select asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{typeName(asset.type)} — {asset.title}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-white/70">
                <p className="font-medium mb-2">Nominee</p>
                <select
                  value={selectedNomineeId}
                  onChange={e => setSelectedNomineeId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="">Select nominee</option>
                  {family.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-white/70">
                <p className="font-medium mb-2">Relationship</p>
                <input
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  placeholder="e.g. Spouse, Son, Daughter"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-white/30 hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </label>

              <label className="block text-sm text-white/70">
                <p className="font-medium mb-2">Share percentage</p>
                <input
                  type="number"
                  value={sharePercentage}
                  onChange={e => setSharePercentage(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitMapping}
                disabled={saving}
                className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingMapping ? 'Update mapping' : 'Create mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}