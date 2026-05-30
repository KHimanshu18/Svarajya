"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, ArrowLeft, FileText, Users, ShieldCheck, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

const TABS = [
  {
    id: "tutorial",
    title: "Succession Tutorial",
    description: "Awareness, flow mapping and video guidance for building your successor plan.",
    path: "/succession/tutorial",
    icon: <Handshake className="h-4 w-4" />,
  },
  {
    id: "nominees",
    title: "Nominee Matrix",
    description: "Track mapped nominees, review exposures and keep asset assignments up to date.",
    path: "/succession/nominees",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "will",
    title: "Will & Executor",
    description: "Capture executor details, witnesses and register your will in the vault.",
    path: "/succession/will",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "emergency",
    title: "Emergency Protocol",
    description: "Define urgent access controls, verification flow and backup contacts.",
    path: "/succession/emergency",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    id: "scan",
    title: "Dependency Scan",
    description: "Review legal dependencies, family coverage and estate risk signals.",
    path: "/succession/scan",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
];

export default function SuccessionIndex() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [nomineeCount, setNomineeCount] = useState<number | null>(null);
  const [willExists, setWillExists] = useState<boolean | null>(null);
  const [emergencyReady, setEmergencyReady] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [nomineesRes, willRes, emergencyRes] = await Promise.all([
          fetch('/api/succession/nominees', { cache: 'no-store' }),
          fetch('/api/succession/will', { cache: 'no-store' }),
          fetch('/api/succession/emergency', { cache: 'no-store' }),
        ]);

        const nomineesJson = await nomineesRes.json();
        const willJson = await willRes.json();
        const emergencyJson = await emergencyRes.json();

        setNomineeCount(Array.isArray(nomineesJson?.data) ? nomineesJson.data.length : 0);
        setWillExists(Boolean(willJson?.data?.willExists));
        const emergencyData = emergencyJson?.data;
        if (emergencyData?.otpVerified) {
          setEmergencyReady('Verified');
        } else if (emergencyData) {
          setEmergencyReady('Configured');
        } else {
          setEmergencyReady('Not configured');
        }
      } catch (error) {
        console.error('Succession summary load failed', error);
        setNomineeCount(0);
        setWillExists(false);
        setEmergencyReady('Not configured');
      }
    }

    fetchSummary();
  }, []);

  const activeTabData = useMemo(() => TABS.find(tab => tab.id === activeTab) ?? TABS[0], [activeTab]);

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col">
        <div className="flex items-center gap-3 pt-8 mb-6">
          <button onClick={() => router.push('/rajya')} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <PageGuide
            title="Uttaradhikar Sabha (Succession)"
            description="Nominee mapping, will management and emergency access. Keep your estate plan aligned, visible and actionable from a single control center."
            actions={[{ emoji: '📋', label: 'Succession' }, { emoji: '🔐', label: 'Legacy' }]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 flex-1 relative z-10">
          <section className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wider text-white/40">Succession control panel</p>
                  <h2 className="text-sm font-medium text-[var(--color-rajya-text)] mt-1.5">Manage your estate plan</h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 pr-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Mapped nominees</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-rajya-text)]">{nomineeCount === null ? '—' : nomineeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Will status</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-rajya-text)]">{willExists === null ? '—' : willExists ? 'Exists' : 'Not exists'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Emergency protocol</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-rajya-text)]">{emergencyReady ?? '—'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pr-2 mt-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      activeTab === tab.id
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/6 border border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.title}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    {activeTabData.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-white/40">Selected module</p>
                    <h3 className="mt-1 text-sm font-semibold text-white">{activeTabData.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/70">{activeTabData.description}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={activeTabData.path}
                        className="inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-500"
                      >
                        Open {activeTabData.title}
                      </a>
                      <button
                        onClick={() => router.push(activeTabData.path)}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white hover:bg-white/10"
                      >
                        View in page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}