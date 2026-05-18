'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gavel } from 'lucide-react';

export default function KarPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950">
      <header className="pt-8 mb-8 flex items-center gap-3">
        <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Kar (Taxes)</h1>
          <p className="text-xs text-white/35">The tribute to the greater kingdom.</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
          <Gavel className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Calculating Tribute</h2>
        <p className="text-sm text-white/40 max-w-xs mb-8">
          The taxation module is currently in the legislative phase. Soon you'll be able to optimize your tax liabilities and track filings here.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/30 text-xs font-mono">
          STATUS: UNDER_CONSTRUCTION
        </div>
      </div>
    </div>
  );
}
