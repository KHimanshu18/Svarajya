"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, CheckCircle2, Handshake, Users, Shield, BookOpen, Sparkles } from "lucide-react";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { useToast } from "@/components/providers/ToastProvider";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

interface SuccessionAsset {
  id: string;
  title: string;
  type: string;
  nominee: boolean;
  value?: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  dob?: string | null;
  nomineeEligible?: boolean;
}

const slides = [
  {
    title: 'When the king falls',
    description: 'When the king falls, the kingdom must not collapse. Build a succession map before the throne changes hands.',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    title: 'Nominee mapping',
    description: 'Assign your assets to trusted family members to avoid legal confusion and preserve continuity.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: 'The executor',
    description: 'Select an executor, witnesses, and emergency protocols to ensure your wishes are honored.',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    title: 'Emergency access',
    description: 'Prepare rapid access pathways for your inner circle when the kingdom is most vulnerable.',
    icon: <Sparkles className="w-5 h-5" />,
  },
];

const assetTypeLabel = (type: string) => {
  switch (type) {
    case 'insurance': return 'Insurance Policy';
    case 'investment': return 'Investment';
    case 'property': return 'Property';
    case 'asset_inventory': return 'Asset';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export default function SuccessionTutorial() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState<SuccessionAsset[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [draggingAsset, setDraggingAsset] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCompleted(localStorage.getItem('succession_tutorial_completed') === '1');
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [assetsRes, familyRes] = await Promise.all([
          fetch('/api/succession/assets', { cache: 'no-store' }),
          fetch('/api/family', { cache: 'no-store' }),
        ]);
        const assetsJson = await assetsRes.json();
        const familyJson = await familyRes.json();

        setAssets(Array.isArray(assetsJson?.data) ? assetsJson.data : assetsJson || []);
        setFamily(Array.isArray(familyJson?.data) ? familyJson.data : familyJson || []);
      } catch (err) {
        console.error('Failed to load tutorial data', err);
        toast('Unable to load succession assets or family members.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [toast]);

  const isReadyToSave = Object.keys(assignments).length > 0;
  const assignedCount = Object.values(assignments).filter(Boolean).length;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, assetId: string) => {
    event.dataTransfer.setData('application/asset-id', assetId);
    setDraggingAsset(assetId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, memberId: string) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData('application/asset-id');
    if (assetId) {
      setAssignments(prev => ({ ...prev, [assetId]: memberId }));
      setDraggingAsset(null);
    }
  };

  const handleSave = async () => {
    if (!isReadyToSave) {
      toast('Assign at least one asset before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payloads = Object.entries(assignments).map(([assetId, familyId]) => ({
        assetId,
        assetType: assets.find(asset => asset.id === assetId)?.type || 'asset_inventory',
        nomineeId: familyId,
        nomineeName: family.find(member => member.id === familyId)?.name || 'Nominee',
        relationship: family.find(member => member.id === familyId)?.relation || 'Nominee',
        sharePercentage: 100,
      }));

      for (const payload of payloads) {
        const response = await fetch('/api/succession/nominees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (!response.ok) {
          if (json?.error?.code === 'DUPLICATE_ENTRY') {
            continue;
          }
          throw new Error(json?.error?.message || 'Failed to save assignment');
        }
      }

      localStorage.setItem('succession_tutorial_completed', '1');
      setCompleted(true);
      toast('Succession map saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save succession tutorial', err);
      toast(err instanceof Error ? err.message : 'Unable to save succession map.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkWatched = () => {
    localStorage.setItem('succession_tutorial_completed', '1');
    setCompleted(true);
    toast('Marked tutorial as watched.', 'success');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 mx-auto flex max-w-6xl w-full flex-col gap-6">

        {/* Header row */}
        <div className="flex items-center gap-3 pt-8 mb-6">
          <button
            onClick={() => router.push('/succession')}
            className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex-1">
            <PageGuide
              title="Succession Tutorial"
              description="Learn the flow map, assign heirs to assets, and lock your succession plan."
              actions={[{ emoji: '🏛️', label: 'Tutorial' }]}
            />
          </div>
        </div>

        {/* Page hero */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-600/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-purple-200">
                <Handshake className="w-4 h-4" /> Uttaradhikar Sabha
              </div>
              <h1 className="mt-3 text-xl font-semibold text-white">Succession Tutorial</h1>
              <p className="mt-2 max-w-2xl text-xs text-white/70">
                When the king falls, the kingdom must not collapse. Learn the flow map, assign heirs to assets, and lock your succession plan.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row items-start sm:items-center shrink-0">
              <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80">
                {completed ? 'Completed' : `${step + 1} of ${slides.length} steps`}
              </div>
              <button
                onClick={handleMarkWatched}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Mark as watched
              </button>
            </div>
          </div>
        </div>

        {/* Awareness + video */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Awareness module</p>
                <h2 className="mt-2 text-sm font-semibold text-white">{slides[step].title}</h2>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/60">
                Step {step + 1}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-500 text-white">
                {slides[step].icon}
              </div>
              <p className="text-xs leading-relaxed text-white/70">{slides[step].description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="inline-block mr-2 w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setStep(s => Math.min(slides.length - 1, s + 1))}
                disabled={step === slides.length - 1}
                className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ArrowRight className="inline-block ml-2 w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="Uttaradhikar Sabha overview" />
          </div>
        </section>

        {/* Inheritance Flow Map */}
        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Inheritance Flow Map</p>
              <h2 className="mt-2 text-sm font-semibold text-white">Drag your assets to trusted heirs</h2>
              <p className="mt-2 text-xs text-white/70">Drop each asset onto a family member to begin nominee mapping. Save the map to register the succession plan.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 shrink-0">
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70 text-center">Assets {assets.length}</div>
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70 text-center">Members {family.length}</div>
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70 text-center">Assigned {assignedCount}</div>
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70 text-center">Status {completed ? 'Ready' : 'Draft'}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Assets column */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">Loading assets…</div>
              ) : assets.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">No assets found. Sync your modules to start mapping.</div>
              ) : (
                assets.map(asset => {
                  const assignedId = assignments[asset.id];
                  const assignedMember = family.find(member => member.id === assignedId);
                  return (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={e => handleDragStart(e, asset.id)}
                      className={`rounded-3xl border px-4 py-4 transition cursor-grab active:cursor-grabbing ${draggingAsset === asset.id ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/40">{assetTypeLabel(asset.type)}</p>
                          <h3 className="mt-1 text-sm font-semibold text-white">{asset.title}</h3>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold shrink-0 ${asset.nominee ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                          {asset.nominee ? 'Nominated' : 'Open'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">Value: ₹{(asset.value ?? 0).toLocaleString('en-IN')}</div>
                      <div className="mt-3 rounded-2xl bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                        <span className="font-medium">Assigned to: </span>
                        {assignedMember ? assignedMember.name : 'Drag asset to a member →'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Family drop zones */}
            <div className="space-y-3">
              {family.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">No family members found. Add a family member first.</div>
              ) : (
                family.map(member => (
                  <div
                    key={member.id}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, member.id)}
                    className="group rounded-3xl border border-white/10 bg-slate-900/80 p-4 transition hover:border-white/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{member.name}</h3>
                        <p className="text-xs text-white/60">{member.relation || 'Family member'}</p>
                      </div>
                      <div className="rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/50">Drop here</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {Object.entries(assignments)
                        .filter(([, familyId]) => familyId === member.id)
                        .map(([assetId]) => {
                          const asset = assets.find(item => item.id === assetId);
                          return asset ? (
                            <div key={asset.id} className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/80">
                              {asset.title}
                            </div>
                          ) : null;
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/60">Save your inheritance flow map to create a living nominee blueprint.</p>
            <button
              onClick={handleSave}
              disabled={!isReadyToSave || isSaving}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Succession Map'}
            </button>
          </div>

          {completed && (
            <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Tutorial completed — your succession map is locked in.
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}