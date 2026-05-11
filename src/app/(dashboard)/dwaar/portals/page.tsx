"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Unlock, Key } from "lucide-react";
import { CredentialStore, PORTAL_CATEGORIES } from "@/lib/credentialStore";
import { IdentityStore } from "@/lib/identityStore";
import { KeyStabilityMeter } from "@/components/credentials/KeyStabilityMeter";
import { PortalCard } from "@/components/credentials/PortalCard";
import { MasterPassphraseModal } from "@/components/credentials/MasterPassphraseModal";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { PageGuide } from "@/components/ui/PageGuide";

function crossDeps() {
    return {
        contactPointExists: (id: string) => !!IdentityStore.getContact(id),
        familyMemberExists: () => true,
        now: new Date(),
    };
}

export default function KeyChamberHub() {
    const router = useRouter();
    const [portals, setPortals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [renderTime] = useState(() => Date.now());

    useEffect(() => {
        const fetchPortals = async () => {
            try {
                // We also call hydrate to ensure the store is in sync for health scores
                await CredentialStore.hydrate();
                const fresh = CredentialStore.getPortals();
                setPortals(fresh);
            } catch (err) {
                console.error("Failed to load portals:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPortals();
    }, []);

    const deps = crossDeps();
    const health = CredentialStore.getCredentialHealth(deps);
    const readiness = CredentialStore.getEmergencyReadiness(deps);
    const insights = CredentialStore.getInsights(deps);
    const milestones = CredentialStore.getMilestones();
    const unlockedMilestones = milestones.filter(m => m.unlocked);

    const [showPassModal, setShowPassModal] = useState<"create" | "unlock" | null>(null);

    const grouped: Record<string, any[]> = {};
    for (const portal of portals) {
        if (!grouped[portal.category]) grouped[portal.category] = [];
        grouped[portal.category].push(portal);
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">

                {/* Header */}
                <div className="flex items-center justify-between pt-8 mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Kunji Vault</h1>
                            <p className="text-xs text-white/50 mt-0.5">Your credential and access management vault.</p>
                        </div>
                    </div>
                    <button onClick={() => {
                        if (CredentialStore.isVaultCreated()) {
                            if (CredentialStore.isVaultUnlocked()) CredentialStore.lockVault();
                            else setShowPassModal("unlock");
                        }
                    }} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        {CredentialStore.isVaultUnlocked()
                            ? <Unlock className="w-4 h-4 text-emerald-400" />
                            : <Lock className="w-4 h-4 text-white/40" />}
                    </button>
                </div>

                {/* Section Guide */}
                <PageGuide
                    title="What is Kunji?"
                    description="Organize your login credentials — bank portals, tax sites, insurance, investments, and more. Record who has access, track 2FA, and prepare for emergencies."
                    actions={[{ emoji: "🔑", label: "Add portals" }, { emoji: "🛡️", label: "Assign access" }, { emoji: "📊", label: "Track health" }]}
                />
                <div className="h-4" />

                {/* Key Stability Meter */}
                <KeyStabilityMeter score={portals.length > 0 ? health.overall : 0} />

                {/* Category Chips */}
                {portals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {PORTAL_CATEGORIES.filter(c => (insights.byCategory[c.id] || 0) > 0).map(c => (
                            <span key={c.id} className="text-[10px] bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/60">
                                {c.emoji} {c.label} ({insights.byCategory[c.id]})
                            </span>
                        ))}
                    </div>
                )}

                {/* Milestones */}
                {unlockedMilestones.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {unlockedMilestones.map(m => (
                            <span key={m.id} className="text-[10px] bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1 text-amber-400/70">
                                🏆 {m.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Insights */}
                {portals.length > 0 && (
                    <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-3.5 space-y-1.5">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">System Insights</p>
                        <p className="text-xs text-white/50">📊 {insights.totalPortals} active portal{insights.totalPortals > 1 ? "s" : ""} recorded</p>
                        {insights.portalsWithNoExecutor > 0 && (
                            <p className="text-xs text-amber-400/70">⚠ {insights.portalsWithNoExecutor} portal{insights.portalsWithNoExecutor > 1 ? "s have" : " has"} no executor assigned</p>
                        )}
                        {insights.portalsMissingAccess > 0 && (
                            <p className="text-xs text-amber-400/70">⚠ {insights.portalsMissingAccess} portal{insights.portalsMissingAccess > 1 ? "s have" : " has"} no access assigned at all</p>
                        )}
                        {insights.portalsNotReviewed > 0 && (
                            <p className="text-xs text-red-400/70">⚠ {insights.portalsNotReviewed} portal{insights.portalsNotReviewed > 1 ? "s" : ""} not reviewed in over 1 year</p>
                        )}
                        {insights.insuranceMissingAwareness > 0 && (
                            <p className="text-xs text-amber-400/70">🛡️ {insights.insuranceMissingAwareness} insurance portal{insights.insuranceMissingAwareness > 1 ? "s" : ""} lacking nominee awareness</p>
                        )}
                    </div>
                )}

                {/* Cross-module warnings */}
                {portals.length > 0 && (() => {
                    const warnings: { emoji: string; message: string }[] = [];
                    const taxPortals = portals.filter(p => p.category === "tax");
                    const insurancePortals = portals.filter(p => p.category === "insurance");
                    const subPortals = portals.filter(p => p.category === "subscription");
                    const bankPortals = portals.filter(p => p.category === "bank");

                    if (taxPortals.length === 0) warnings.push({ emoji: "🧾", message: "Compliance Gate Incomplete — no tax portals added." });
                    if (insurancePortals.some(p => !p.nomineeAwareness)) warnings.push({ emoji: "🛡️", message: "Insurance portal exists without nominee awareness flagged." });
                    if (subPortals.some(p => !p.renewalDate)) warnings.push({ emoji: "📦", message: "Subscription exists without renewal date — risk of missed charges." });
                    if (bankPortals.some(p => !p.linkedFamilyMemberId)) warnings.push({ emoji: "🏦", message: "Bank portal has no executor assigned for emergencies." });

                    if (warnings.length === 0) return null;
                    return (
                        <div className="mt-3 space-y-1.5">
                            {warnings.map((w, i) => (
                                <div key={i} className="bg-amber-400/8 border border-amber-400/15 rounded-xl p-2.5 flex items-start gap-2">
                                    <span className="text-xs">{w.emoji}</span>
                                    <p className="text-[10px] text-amber-400/70">{w.message}</p>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Portal List */}
                <div className="flex-1 mt-5 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs text-white/40">Opening your vault...</p>
                        </div>
                    ) : portals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Key className="w-10 h-10 text-white/10 mb-3" />
                            <p className="text-sm text-white/50 mb-1 font-medium">No Portals Added Yet</p>
                            <p className="text-xs text-white/40 text-center mb-5">Start organizing your digital access for clarity and emergency readiness.</p>
                            <button onClick={() => router.push("/dwaar/portals/add")}
                                className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl text-sm">
                                Add First Portal
                            </button>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([catId, catPortals]) => {
                            const catMeta = PORTAL_CATEGORIES.find(c => c.id === catId);
                            return (
                                <div key={catId} className="space-y-2">
                                    <p className="text-xs text-amber-400/60 uppercase tracking-wider">{catMeta?.emoji} {catMeta?.label}</p>
                                    {catPortals.map(portal => (
                                        <PortalCard
                                            key={portal.id}
                                            portal={portal}
                                            healthScore={health.perPortal[portal.id]}
                                            emergencyReady={readiness[portal.id]}
                                            nowMs={renderTime}
                                        />
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Nav buttons */}
                <div className="space-y-3 mt-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => router.push("/dwaar/portals/access")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors">
                            🛡️ Manage Access
                        </button>
                        <button onClick={() => router.push("/pehchaan/records")} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/50 hover:border-white/25 transition-colors">
                            🪪 Pehchaan Vault
                        </button>
                    </div>
                </div>

                {/* YouTube Tutorial */}
                <div className="mt-4">
                    <VideoTutorialPlaceholder youtubeId="7dbmNkrANws" label="Password security & digital safety essentials" />
                </div>

                {/* Primary CTA */}
                {portals.length > 0 && (
                    <div className="pb-4 pt-4">
                        <button onClick={() => router.push("/dwaar/portals/add")}
                            className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors">
                            Add New Portal
                        </button>
                    </div>
                )}
            </div>

            {showPassModal && (
                <MasterPassphraseModal mode={showPassModal} onClose={() => setShowPassModal(null)} />
            )}
        </div>
    );
}
