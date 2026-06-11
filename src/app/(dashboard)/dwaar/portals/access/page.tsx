"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, AlertTriangle, Users } from "lucide-react";
import { CredentialStore } from "@/lib/credentialStore";
import { IdentityStore } from "@/lib/identityStore";


export default function AccessOverviewPage() {
    const router = useRouter();
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await CredentialStore.hydrate();
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const profile = await res.json();
                    setFamilyMembers(profile.data?.familyMembers || []);
                }
            } catch (err) {
                console.error("Failed to load family members:", err);
            }
            setLoading(false);
        };
        init();
    }, []);

    const portals = CredentialStore.getPortals();

    // Group executor assignments by family member
    const groupedByMember: Record<string, { executor: number }> = {};
    for (const p of portals) {
        if (p.linkedFamilyMemberId) {
            if (!groupedByMember[p.linkedFamilyMemberId]) {
                groupedByMember[p.linkedFamilyMemberId] = { executor: 0 };
            }
            groupedByMember[p.linkedFamilyMemberId].executor++;
        }
    }

    // Flags
    const portalsWithNoExecutor = portals.filter(p => !p.linkedFamilyMemberId);

    // Emergency readiness
    const deps = {
        contactPointExists: (id: string) => !!IdentityStore.getContact(id),
        familyMemberExists: () => true,
    };
    const readiness = CredentialStore.getEmergencyReadiness(deps);
    const readyCount = Object.values(readiness).filter(Boolean).length;
    const readinessPercent = portals.length > 0 ? Math.round((readyCount / portals.length) * 100) : 0;
    const readinessLabel = readinessPercent >= 80 ? "High" : readinessPercent >= 40 ? "Medium" : "Low";
    const readinessColor = readinessPercent >= 80 ? "text-emerald-400" : readinessPercent >= 40 ? "text-amber-400" : "text-red-400";

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen p-6 items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin relative z-10" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.push("/dwaar/portals")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Access Control Overview</h1>
                        <p className="text-xs text-white/35 mt-0.5">Executor assignments and emergency readiness.</p>
                    </div>
                </div>

                {/* Emergency Readiness */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Emergency Readiness</span>
                        <span className={`text-sm font-semibold ${readinessColor}`}>{readinessLabel} ({readinessPercent}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                        <div className={`h-full rounded-full transition-all duration-700 ${readinessPercent >= 80 ? "bg-emerald-400" : readinessPercent >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${readinessPercent}%` }} />
                    </div>
                </div>

                {/* Family Member Cards */}
                <div className="flex-1 space-y-4">
                    {Object.keys(groupedByMember).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Users className="w-10 h-10 text-white/10 mb-3" />
                            <p className="text-sm text-white/30 mb-1">No executors assigned yet</p>
                            <p className="text-xs text-white/20 text-center mb-5">Open a portal and assign an executor to improve readiness.</p>
                        </div>
                    ) : (
                        Object.entries(groupedByMember).map(([memberId, counts]) => {
                            const member = familyMembers.find(m => m.id === memberId);
                            return (
                                <div key={memberId} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-medium text-white">{member?.name || "Unknown Member"}</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-wider">{member?.relation || "Family"}</p>
                                        </div>
                                        <ShieldCheck className={`w-4 h-4 text-emerald-400`} />
                                    </div>
                                    <div className="bg-amber-400/5 rounded-lg px-4 py-3 border border-amber-400/10">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-white/60">Executor for</p>
                                            <p className="text-sm font-semibold text-amber-400">{counts.executor} Portal{counts.executor > 1 ? "s" : ""}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Flags */}
                    {portalsWithNoExecutor.length > 0 && (
                        <div className="bg-white/3 border border-white/8 rounded-xl p-3.5 space-y-2 mt-4">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Flags</p>
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-400/70">{portalsWithNoExecutor.length} portal{portalsWithNoExecutor.length > 1 ? "s have" : " has"} no executor assigned</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CTA */}
                {portalsWithNoExecutor.length > 0 && (
                    <div className="pb-4 pt-4">
                        <button onClick={() => {
                            const first = portalsWithNoExecutor[0];
                            if (first) router.push(`/dwaar/portals/portal/${first.id}`);
                        }}
                            className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors">
                            Review Unassigned Portals
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
