'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, FileText, ShieldCheck, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';

const PageGuide = dynamic(() => import('@/components/ui/PageGuide').then(mod => mod.PageGuide), { ssr: false });
const VideoTutorialPlaceholder = dynamic(() => import('@/components/ui/VideoTutorialPlaceholder').then(mod => mod.VideoTutorialPlaceholder), { ssr: false });

type KarSummary = {
  taxCount: number;
  gstCount: number;
  dinCount: number;
  nextGstDue?: string | null;
  nextDinExpiry?: string | null;
};

type InsightCard = {
  id: string;
  title: string;
  description: string;
  action: string;
};

export default function KarPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<KarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Primer modal state (Submodule 11A)
  const [showPrimer, setShowPrimer] = useState(false);
  const [primerStep, setPrimerStep] = useState(0);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState({ income_type: '', gst_registered: '', has_din: '', advance_tax_applicable: '' });
  const primerItems = ['ITR', 'GST', 'DIN KYC', 'Advance Tax'];
  // Insights (Submodule 11E) - load derived intelligence (no DB changes)
  const [insights, setInsights] = useState<InsightCard[] | null>(null);
  useEffect(() => {
    async function loadInsights() {
      try {
        const res = await fetch('/api/kar/insights', { cache: 'no-store' });
        if (!res.ok) throw new Error('No insights');
        const body = await res.json();
        setInsights(body.data || null);
      } catch {
        // fallback: derive from available summary
        setInsights([
          { id: '80c', title: 'Potential 80C Deduction Unclaimed', description: 'Eligible investments found but not yet marked for 80C.', action: '/modules/investments' },
          { id: '80d', title: 'Potential 80D Deduction Unclaimed', description: 'Medical insurance premiums found. Consider adding health insurance details.', action: '/modules/insurance' },
          { id: '24b', title: 'Home Loan Interest Benefit', description: 'Home loan interest payments detected. Claim under Section 24(b).', action: '/modules/loans' },
        ]);
      }
    }
    loadInsights();
  }, []);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch('/api/kar/summary', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error?.message || 'Unable to load compliance summary');
        }

        setSummary(data.data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to load tax compliance data');
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  const nextGstDue = summary?.nextGstDue ? new Date(summary.nextGstDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No GST deadline loaded';
  const nextDinExpiry = summary?.nextDinExpiry ? new Date(summary.nextDinExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No DIN expiry loaded';

  // Show primer modal if not watched
  useEffect(() => {
    try {
      const watched = localStorage.getItem('kar_primer_watched');
      if (!watched) setShowPrimer(true);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      {/* Primer modal (11A) */}
      {showPrimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="max-w-3xl w-full rounded-2xl bg-slate-900/95 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Tax Awareness Primer</h3>
                <p className="mt-2 text-sm text-white/60">A short 3-5 minute primer before you begin Module 11.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowPrimer(false); localStorage.setItem('kar_primer_watched', '1'); }} className="text-sm px-3 py-2 bg-white/5 rounded-md">Skip</button>
                <button onClick={() => { setShowPrimer(false); localStorage.setItem('kar_primer_watched', '1'); }} className="text-sm px-3 py-2 bg-amber-400 text-black rounded-md">Mark as watched</button>
              </div>
            </div>

            {primerStep < 3 ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-slate-800/60 p-4">
                  {primerStep === 0 && (
                    <>
                      <h4 className="font-semibold text-white">Tax liability vs penalty</h4>
                      <p className="text-sm text-white/60 mt-2">Tax liability is what you owe; penalty accrues when you fail to meet obligations on time. Penalties compound costs and damage credibility.</p>
                    </>
                  )}
                  {primerStep === 1 && (
                    <>
                      <h4 className="font-semibold text-white">Why documentation matters</h4>
                      <p className="text-sm text-white/60 mt-2">Clear records make filings simple, reduce audit risk, and protect you during disputes.</p>
                    </>
                  )}
                  {primerStep === 2 && (
                    <>
                      <h4 className="font-semibold text-white">Importance of due dates</h4>
                      <p className="text-sm text-white/60 mt-2">Missing due dates leads to penalties and compliance gaps. Plan ahead and use calendar-driven reminders.</p>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">Step {primerStep + 1} of 3</div>
                  <div className="flex gap-2">
                    {primerStep > 0 && <button onClick={() => setPrimerStep(primerStep - 1)} className="px-3 py-2 bg-white/5 rounded-md">Back</button>}
                    <button onClick={() => setPrimerStep(primerStep + 1)} className="px-3 py-2 bg-amber-400 text-black rounded-md">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <h4 className="text-white font-semibold">Game: Due Date Chessboard</h4>
                <p className="text-sm text-white/60">Drag the compliance pieces onto the calendar squares. When all placed, answer a short quiz.</p>

                <div className="mt-4 grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx} className="h-20 rounded-md border border-white/10 bg-white/5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                      const item = e.dataTransfer.getData('text');
                      if (item) setPlacements(prev => ({ ...prev, ['day-' + idx]: item }));
                    }}>
                      <div className="p-2 text-xs text-white/60">Day {idx + 1}</div>
                      <div className="p-2 text-sm text-amber-300">{placements['day-' + idx]}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-3 items-center">
                  {primerItems.map((it) => (
                    <div key={it} draggable onDragStart={(e) => e.dataTransfer.setData('text', it)} className="px-3 py-2 rounded-md bg-white/5 border border-white/10 cursor-grab">
                      {it}
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t pt-4 space-y-3">
                  <h5 className="text-white font-semibold">Quick quiz</h5>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={quizAnswers.income_type} onChange={(e) => setQuizAnswers(q => ({ ...q, income_type: e.target.value }))} className="p-2 rounded-md bg-white/5">
                      <option value="">Are you salaried?</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select value={quizAnswers.gst_registered} onChange={(e) => setQuizAnswers(q => ({ ...q, gst_registered: e.target.value }))} className="p-2 rounded-md bg-white/5">
                      <option value="">Do you file GST?</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select value={quizAnswers.has_din} onChange={(e) => setQuizAnswers(q => ({ ...q, has_din: e.target.value }))} className="p-2 rounded-md bg-white/5">
                      <option value="">Are you a company director?</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select value={quizAnswers.advance_tax_applicable} onChange={(e) => setQuizAnswers(q => ({ ...q, advance_tax_applicable: e.target.value }))} className="p-2 rounded-md bg-white/5">
                      <option value="">Do you pay advance tax?</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={async () => {
                      try { localStorage.setItem('kar_primer_answers', JSON.stringify(quizAnswers)); localStorage.setItem('kar_primer_watched', '1'); setShowPrimer(false); }
                      catch { setShowPrimer(false); }
                    }} className="px-4 py-2 bg-amber-400 text-black rounded-md">Save answers</button>
                    <button onClick={() => { setShowPrimer(false); localStorage.setItem('kar_primer_watched', '1'); }} className="px-4 py-2 bg-white/5 rounded-md">Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col">
        <div className="flex items-center gap-3 pt-8 mb-6">
          <button onClick={() => router.push('/rajya')} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <PageGuide
            title="Kar (Taxes)"
            description="Track ITR, GST and DIN records with compliance-ready documents and deadlines. Keep tax governance documented like a well-run Rajya."
            actions={[{ emoji: '📝', label: 'Tax' }, { emoji: '📄', label: 'Compliance' }]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 flex-1 relative z-10">
          <section className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Tax registry</p>
                  <h2 className="text-sm font-medium text-[var(--color-rajya-text)] mt-1">Manage your compliance records</h2>
                </div>
                <button onClick={() => router.push('/kar')} className="text-sm text-black font-semibold bg-amber-400 px-3 py-2 rounded-full shrink-0 uppercase tracking-wide hover:bg-amber-500 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Open Kar
                </button>
              </div>
            </div>

            <div className="space-y-4 pr-2">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-[var(--color-rajya-muted)]">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  Loading compliance data...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-200">
                  {error}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--color-rajya-muted)]">ITR records</p>
                          <h3 className="mt-1 text-lg font-semibold text-[var(--color-rajya-text)]">
                            {summary?.taxCount ?? 0} {(summary?.taxCount ?? 0) === 1 ? 'filing' : 'filings'} tracked
                          </h3>
                          <p className="mt-3 text-sm text-[var(--color-rajya-muted)]">Keep your annual tax return details organised and easily accessible.</p>
                        </div>
                      </div>
                      <button onClick={() => router.push('/kar/itr')} className="rounded-full bg-amber-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-500">
                        View ITR
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-rajya-muted)]">GST registrations</p>
                          <h3 className="mt-1 text-lg font-semibold text-[var(--color-rajya-text)]">{summary?.gstCount ?? 0} records</h3>
                          <p className="mt-3 text-sm text-[var(--color-rajya-muted)]">Track your GSTIN, filing frequency and return deadlines. Next due: {nextGstDue}.</p>
                        </div>
                      </div>
                      <button onClick={() => router.push('/kar/gst')} className="rounded-full bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/15">
                        View GST
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-rajya-muted)]">DIN records</p>
                          <h3 className="mt-1 text-lg font-semibold text-[var(--color-rajya-text)]">{summary?.dinCount ?? 0} records</h3>
                          <p className="mt-3 text-sm text-[var(--color-rajya-muted)]">Manage director IDs, MCA deadlines and DSC expiry notifications. Next expiry: {nextDinExpiry}.</p>
                        </div>
                      </div>
                      <button onClick={() => router.push('/kar/din')} className="rounded-full bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15">
                        View DIN
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="sticky top-6 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800/80 text-amber-300 border border-amber-400/20"><Layers className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-rajya-text)]">Kar workflow</h4>
                </div>
              </div>

              <ul className="mt-3 text-sm text-[var(--color-rajya-muted)] space-y-2">
                <li>Record every ITR filing, GST registration and DIN number.</li>
                <li>Track due dates and compliance milestones in one place.</li>
                <li>Keep supporting tax documents secure and ready for review.</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-[var(--color-rajya-muted)]">Compliance records</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-rajya-text)]">{(summary?.taxCount ?? 0) + (summary?.gstCount ?? 0) + (summary?.dinCount ?? 0)}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs uppercase text-white/40">Learn</p>
              <div className="mt-3">
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="Module 11 tax compliance guide" />
              </div>
            </div>

            {/* Submodule 11E - Tax Insights (awareness only) */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-xs uppercase text-white/40">💡 Tax Insights</p>
              <p className="mt-2 text-sm text-white/60">This is an awareness tool. Consult your tax advisor for advice.</p>
              <div className="mt-3 space-y-3">
                {insights?.map((card) => (
                  <div key={card.id} className="rounded-2xl bg-slate-900/60 p-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{card.title}</p>
                      <p className="mt-1 text-sm text-white/60">{card.description}</p>
                    </div>
                    <div>
                      <button onClick={() => router.push(card.action)} className="px-3 py-2 bg-amber-400 text-black rounded-md">Open</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
