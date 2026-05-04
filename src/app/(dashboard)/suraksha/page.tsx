'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SurakshaPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 pt-8 mb-8">
          <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Raksha (Insurance & Protection)</h1>
            <p className="text-xs text-white/35 mt-0.5">The Shield & Fortress</p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/40 text-sm mt-6">
            🚧 Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
