"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AlertTriangle, Users, FileText, ShieldAlert, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

interface SuccessionAsset {
  id: string;
  title: string;
  type: string;
  value?: number;
}

interface SuccessionNominee {
  id: string;
  assetType: string;
  assetId: string;
  nomineeId: string;
  nomineeName: string;
  relationship: string;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  dob?: string | null;
}

interface SuccessionWill {
  id: string;
  willExists: boolean;
  executorName: string;
}

export default function ScanPage() {
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<SuccessionAsset[]>([]);
  const [mappings, setMappings] = useState<SuccessionNominee[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [will, setWill] = useState<SuccessionWill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScanData() {
      setLoading(true);
      try {
        const [assetsRes, mappingsRes, familyRes, willRes] = await Promise.all([
          fetch('/api/succession/assets', { cache: 'no-store' }),
          fetch('/api/succession/nominees', { cache: 'no-store' }),
          fetch('/api/family', { cache: 'no-store' }),
          fetch('/api/succession/will', { cache: 'no-store' }),
        ]);

        const assetsJson = await assetsRes.json();
        const mappingsJson = await mappingsRes.json();
        const familyJson = await familyRes.json();
        const willJson = await willRes.json();

        setAssets(Array.isArray(assetsJson?.data) ? assetsJson.data : assetsJson || []);
        setMappings(Array.isArray(mappingsJson?.data) ? mappingsJson.data : mappingsJson || []);
        setFamily(Array.isArray(familyJson?.data) ? familyJson.data : familyJson || []);
        setWill(willJson?.data || null);
      } catch (error) {
        console.error('Load scan data failed', error);
        toast('Unable to load dependency scan data.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadScanData();
  }, [toast]);

  const totalAssetValue = useMemo(() => assets.reduce((sum, asset) => sum + (asset.value || 0), 0), [assets]);
  const propertyCount = useMemo(() => assets.filter(asset => asset.type === 'property').length, [assets]);
  const childDependents = useMemo(() => family.filter(member => {
    if (!member.dob) return false;
    const age = Math.floor((Date.now() - new Date(member.dob).getTime()) / 31557600000);
    return age < 18;
  }), [family]);

  const spouseMember = useMemo(() => family.find(member => /spouse|husband|wife/i.test(member.relation)), [family]);
  const spouseNominated = useMemo(() => mappings.some(mapping => mapping.nomineeId === spouseMember?.id), [mappings, spouseMember]);

  const issues = useMemo(() => {
    const list: { icon: typeof AlertTriangle; title: string; description: string; level: 'low' | 'medium' | 'high'; action?: { label: string; href: string } }[] = [];

    if (childDependents.length > 0 && family.length > 0) {
      const guardianExists = family.some(member => /parent|guardian|mother|father|grandparent/i.test(member.relation));
      if (!guardianExists) {
        list.push({
          icon: AlertTriangle,
          title: 'Minor dependents without legal guardian',
          description: 'Children under 18 are listed but no guardian or parent is explicitly marked. Confirm their care plan.',
          level: 'high',
          action: { label: 'Review family', href: '/rajya/family' },
        });
      }
    }

    if (spouseMember && !spouseNominated) {
      list.push({
        icon: AlertTriangle,
        title: 'Spouse not nominated for estate assets',
        description: 'A spouse exists in your family tree but is not assigned as nominee for any mapped asset.',
        level: 'medium',
        action: { label: 'Assign nominees', href: '/succession/nominees' },
      });
    }

    if (propertyCount > 1 && !(will?.willExists)) {
      list.push({
        icon: AlertTriangle,
        title: 'Multiple properties without a registered will',
        description: 'More than one property is detected. A will ensures ownership transition is clear.',
        level: 'high',
        action: { label: 'Register will', href: '/rajya/succession/will' },
      });
    }

    if (totalAssetValue > 10000000 && !will?.executorName) {
      list.push({
        icon: AlertTriangle,
        title: 'High-value estate without executor',
        description: 'Total recorded estate value exceeds ₹1 crore but no executor is named in the will.',
        level: 'medium',
        action: { label: 'Set executor', href: '/rajya/succession/will' },
      });
    }

    return list;
  }, [childDependents, family, spouseMember, spouseNominated, propertyCount, totalAssetValue, will]);

  const lineageNodes = useMemo(() => {
    const root = { name: 'You', relation: 'Self', status: 'safe' };
    const nodes = family.map(member => {
      const nominated = mappings.some(mapping => mapping.nomineeId === member.id);
      return {
        id: member.id,
        name: member.name,
        relation: member.relation || 'Family',
        status: nominated ? 'safe' : 'attention',
      };
    });
    return { root, nodes };
  }, [family, mappings]);

  const statusColor = (status: string) =>
    status === 'safe'
      ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-200 border-amber-500/20';

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
              title="Dependency Scan"
              description="Analyze family relationships, nominee coverage and will readiness to uncover legal gaps before succession begins."
              actions={[{ emoji: '🔍', label: 'Scan' }]}
            />
          </div>
        </div>

        {/* Page hero */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Legal dependency & lineage scan</h1>
              <p className="mt-2 max-w-2xl text-xs text-white/70">
                Analyze family relationships, nominee coverage, and will readiness to uncover legal dependencies before succession begins.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70 shrink-0">
              {loading ? 'Scanning…' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} detected`}
            </div>
          </div>
        </div>

        {/* Two-column main layout */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr] items-start">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Estate scan summary</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Total estate value</p>
                  <p className="mt-2 text-xl font-semibold text-white">₹{totalAssetValue.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Properties</p>
                  <p className="mt-2 text-xl font-semibold text-white">{propertyCount}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Family members</p>
                  <p className="mt-2 text-xl font-semibold text-white">{family.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Mapped nominees</p>
                  <p className="mt-2 text-xl font-semibold text-white">{mappings.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Family lineage</h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Root</p>
                  <p className="mt-2 font-semibold text-white">{lineageNodes.root.name}</p>
                </div>
                {lineageNodes.nodes.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-8 text-center">
                    <p className="text-sm text-white/40">No family members found.</p>
                    <p className="text-xs text-white/25 mt-1">Add family members in the Family module to see lineage here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {lineageNodes.nodes.map(member => (
                      <div key={member.id} className={`rounded-3xl border p-4 ${statusColor(member.status)}`}>
                        <p className="text-xs uppercase tracking-[0.24em] text-white/50">{member.relation}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{member.name}</p>
                        <p className="mt-2 text-sm text-white/70">
                          {member.status === 'safe' ? 'Nominated' : 'Review needed'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center gap-3 mb-5">
                <ShieldAlert className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Actionable issues</h2>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                    Scanning…
                  </div>
                ) : issues.length === 0 ? (
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    No critical dependencies detected. Your succession plan appears balanced.
                  </div>
                ) : (
                  issues.map(issue => (
                    <div key={issue.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <issue.icon className={`h-5 w-5 shrink-0 mt-0.5 ${issue.level === 'high' ? 'text-rose-400' : 'text-amber-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-white">{issue.title}</p>
                          <p className="mt-1 text-sm text-white/60">{issue.description}</p>
                        </div>
                      </div>
                      {issue.action && (
                        <a
                          href={issue.action.href}
                          className="mt-4 inline-flex items-center justify-center rounded-2xl bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
                        >
                          {issue.action.label}
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Scan details</h2>
              </div>
              <p className="text-sm text-white/60">
                This scan compares asset, family, and will data to highlight relations that may need confirmation before inheritance is executed.
              </p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}