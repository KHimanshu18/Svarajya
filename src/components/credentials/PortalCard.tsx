"use client";

import { useRouter } from "next/navigation";
import { CredentialStore, PortalRecord, PORTAL_CATEGORIES } from "@/lib/credentialStore";

interface PortalCardProps {
    portal: PortalRecord;
    healthScore?: number;
    emergencyReady?: boolean;
    nowMs?: number;
}

export function PortalCard({ portal, healthScore, emergencyReady, nowMs }: PortalCardProps) {
    const router = useRouter();
    const catMeta = PORTAL_CATEGORIES.find(c => c.id === portal.category);
    const hasExecutor = !!portal.linkedFamilyMemberId;
    const maskedLogin = CredentialStore.maskLoginId(portal.loginId);

    // Last reviewed text
    const renderTime = nowMs || 0;
    let reviewedText = "Not reviewed";
    if (portal.lastReviewedDate && renderTime) {
        const days = Math.floor((renderTime - new Date(portal.lastReviewedDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) reviewedText = "Reviewed today";
        else if (days < 30) reviewedText = `${days}d ago`;
        else if (days < 365) reviewedText = `${Math.floor(days / 30)} months ago`;
        else reviewedText = `${Math.floor(days / 365)}+ years ago`;
    }

    return (
        <button
            onClick={() => router.push(`/dwaar/portals/portal/${portal.id}`)}
            className="w-full text-left bg-white/5 border border-white/10 hover:border-amber-400/30 rounded-xl p-4 transition-all"
        >
            <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{catMeta?.emoji || "📎"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white truncate">
                            {portal.customServiceName ? `${portal.platformName} — ${portal.customServiceName}` : portal.platformName}
                        </p>
                        {healthScore !== undefined && (
                            <span className={`text-[10px] font-semibold ${healthScore >= 70 ? "text-emerald-400" : healthScore >= 40 ? "text-amber-400" : "text-red-400"}`}>
                                {healthScore}%
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">Login: {maskedLogin}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {portal.twoFAStatus === "enabled" && (
                            <span className="text-[10px] text-emerald-400/70 bg-emerald-400/10 px-2 py-0.5 rounded-full">2FA ✓</span>
                        )}
                        {hasExecutor && (
                            <span className="text-[10px] text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-full">Executor Assigned</span>
                        )}
                        {emergencyReady && (
                            <span className="text-[10px] text-emerald-400/70">✔ Emergency Ready</span>
                        )}
                        {portal.billingCycle && (
                            <span className="text-[10px] text-sky-400/70 bg-sky-400/10 px-2 py-0.5 rounded-full capitalize">{portal.billingCycle.replace("_", " ")}</span>
                        )}
                        {portal.rechargeDate && (
                            <span className="text-[10px] text-orange-400/70 bg-orange-400/10 px-2 py-0.5 rounded-full">Due: {portal.rechargeDate}</span>
                        )}
                        {portal.paymentAssignee && (
                            <span className="text-[10px] text-violet-400/70 bg-violet-400/10 px-2 py-0.5 rounded-full">Paid by: {portal.paymentAssignee}</span>
                        )}
                        <span className="text-[10px] text-white/20">{reviewedText}</span>
                    </div>
                </div>
            </div>
        </button>
    );
}
