'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Droplets, Wallet, Gem, Landmark, Trash2 } from 'lucide-react';
import { useSampattiStore } from '@/lib/stores/sampattiStore';
import { formatRupee } from "@/lib/stores/incomeStore";

export default function SampattiPage() {
  const router = useRouter();
  
  // Connect to the store logic
  const { assets, getTotalAmount, removeAsset } = useSampattiStore();
  const totalAssets = getTotalAmount();

  // Filter assets for category-specific counts or displays
  const liquidAssets = assets.filter(a => a.category === 'Liquid');
  const investedAssets = assets.filter(a => a.category === 'Invested');
  const fixedAssets = assets.filter(a => a.category === 'Fixed');

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative overflow-hidden bg-slate-950">
      {/* Background Aesthetic - Matching Sva-Rajya dark mode */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex items-center gap-4 pt-8 mb-8">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-amber-300 font-cinzel tracking-tight">Asset Inventory</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">The Reservoir (Sampatti)</p>
          </div>
        </div>

        {/* NAV Card - Dynamic Net Asset Value */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 text-center backdrop-blur-md shadow-2xl">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Net Asset Value (NAV)</p>
          <h2 className="text-4xl font-bold text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            {formatRupee(totalAssets)}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-emerald-400/80 bg-emerald-500/5 py-1 px-3 rounded-full w-fit mx-auto border border-emerald-500/10">
            <Droplets className="w-3 h-3" />
            <span>Reservoir Health: {totalAssets > 0 ? 'Flowing' : 'Empty'}</span>
          </div>
        </div>

        {/* Asset Category Framework */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Wealth Streams</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Liquid Stream - High Flow */}
            <AssetCategoryCard 
              title="Liquid Assets" 
              desc="Cash, Bank & UPI" 
              icon={<Wallet className="w-5 h-5" />} 
              colorClass="emerald"
              count={liquidAssets.length}
              onClick={() => {/* Navigate to add/view liquid */}}
            />

            {/* Growth Stream - Invested Potential */}
            <AssetCategoryCard 
              title="Invested Wealth" 
              desc="Gold, Mutual Funds, Stocks" 
              icon={<Gem className="w-5 h-5" />} 
              colorClass="amber"
              count={investedAssets.length}
              onClick={() => {/* Navigate to add/view invested */}}
            />

            {/* Foundation Stream - Fixed Value */}
            <AssetCategoryCard 
              title="Fixed Assets" 
              desc="Real Estate & Land" 
              icon={<Landmark className="w-5 h-5" />} 
              colorClass="blue"
              count={fixedAssets.length}
              onClick={() => {/* Navigate to add/view fixed */}}
            />
          </div>
        </div>

        {/* Asset List - Showing the most recent entries */}
        {assets.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4 px-1">Recent Inventory</h3>
            <div className="space-y-2">
              {assets.slice(-3).map((asset) => (
                <div key={asset.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div>
                    <p className="text-sm text-white/90">{asset.name}</p>
                    <p className="text-[10px] text-white/40">{asset.category}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold text-amber-200">{formatRupee(asset.amount)}</p>
                    <button onClick={() => removeAsset(asset.id)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artha Chakra Philosophy Quote */}
        <div className="mt-12 p-6 border border-dashed border-white/10 rounded-3xl text-center">
          <p className="text-xs text-white/30 leading-relaxed italic">
            "Wealth is not just what you earn, but the reservoir you protect from unnecessary leaks."
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable UI Component for Asset Categories
function AssetCategoryCard({ title, desc, icon, colorClass, count, onClick }: any) {
  const colorMap: any = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400"
  };

  return (
    <button 
      onClick={onClick}
      className="group w-full bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-white/8 active:scale-[0.98] text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colorMap[colorClass]}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{title}</h4>
            <p className="text-[10px] text-white/40">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{count}</span>}
          <Plus className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
        </div>
      </div>
    </button>
  );
}