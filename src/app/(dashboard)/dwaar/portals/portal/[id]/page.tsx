"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
    ArrowLeft, Trash2, ShieldCheck, AlertTriangle, Eye, EyeOff, X, CheckCircle2 
} from "lucide-react";
import { CredentialStore, PORTAL_CATEGORIES, PortalRecord, TwoFAStatus, TwoFAType } from "@/lib/credentialStore";
import { IdentityStore } from "@/lib/identityStore";
import { MasterPassphraseModal } from "@/components/credentials/MasterPassphraseModal";

export default function PortalDetailPage() {
    const router = useRouter();
    const params = useParams();
    const portalId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [portal, setPortal] = useState<PortalRecord | undefined>(undefined);
    const [editing, setEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPassModal, setShowPassModal] = useState<"create" | "unlock" | "reset" | null>(null);
    const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    // Executor assignment state
    const [showExecutorModal, setShowExecutorModal] = useState(false);
    const [selectedExecutorId, setSelectedExecutorId] = useState("");

    // Edit fields
    const [platformName, setPlatformName] = useState("");
    const [loginId, setLoginId] = useState("");
    const [twoFA, setTwoFA] = useState<TwoFAStatus>("unknown");
    const [twoFAType, setTwoFAType] = useState<TwoFAType>("unknown");
    const [notes, setNotes] = useState("");
    const [nomineeAwareness, setNomineeAwareness] = useState(true);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            await CredentialStore.hydrate();
            const p = CredentialStore.getPortalById(portalId);
            if (p) {
                setPortal(p);
                setPlatformName(p.platformName);
                setLoginId(p.loginId);
                setTwoFA(p.twoFAStatus || "unknown");
                setTwoFAType(p.twoFAType || "unknown");
                setNotes(p.notes || "");
                setNomineeAwareness(p.nomineeAwareness !== undefined ? p.nomineeAwareness : true);
            }

            // Fetch family members from profile API
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const profile = await res.json();
                    const allMembers = profile.data?.familyMembers || [];
                    console.log("All family members from API:", allMembers);
                    const filtered = allMembers.filter((m: any) =>
                        (m.accessLevel === "write" || m.accessLevel === "EXECUTOR") &&
                        !m.relation.toLowerCase().includes("child")

                    );
                    console.log("Filtered family members:", filtered);
                    setFamilyMembers(filtered);
                }
            } catch (err) {
                console.error("Failed to load family members:", err);
            }

            setLoading(false);
        };
        init();
    }, [portalId]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen p-6 items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/40 text-sm">Syncing Vault...</p>
                </div>
            </div>
        );
    }

    if (!portal) {
        return (
            <div className="flex flex-col min-h-screen p-6 items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <p className="relative z-10 text-white/40">Portal not found.</p>
                <button onClick={() => router.push("/dwaar/portals")} className="relative z-10 text-amber-400 text-sm mt-3">Back to Kunji Vault</button>
            </div>
        );
    }

    const catMeta = PORTAL_CATEGORIES.find(c => c.id === portal.category);
    const linkedMobile = portal.registeredMobile || null;
    const linkedEmail = portal.registeredEmail || null;
    const linkedExecutor = familyMembers.find(m => m.id === portal.linkedFamilyMemberId);

    // Health score
    const deps = {
        contactPointExists: (id: string) => !!IdentityStore.getContact(id),
        familyMemberExists: () => true,
    };
    const health = CredentialStore.getCredentialHealth(deps);
    const portalHealth = health.perPortal[portalId] || 0;
    const healthColor = portalHealth >= 70 ? "text-emerald-400" : portalHealth >= 40 ? "text-amber-400" : "text-red-400";

    // Emergency readiness
    const readiness = CredentialStore.getEmergencyReadiness(deps);
    const isReady = readiness[portalId];

    const handleSaveEdit = async () => {
        try {
            const updated = CredentialStore.updatePortal(portalId, {
                platformName: platformName.trim(),
                loginId: loginId.trim(),
                twoFAStatus: twoFA as PortalRecord["twoFAStatus"],
                twoFAType: twoFAType as PortalRecord["twoFAType"],
                notes: notes.trim() || undefined,
                nomineeAwareness: portal.category === "insurance" ? nomineeAwareness : portal.nomineeAwareness,
                lastReviewedDate: new Date().toISOString().split("T")[0],
            });

            // Sync with backend
            await fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: portalId,
                    portalName: updated.platformName,
                    loginId: updated.loginId,
                    twoFAStatus: updated.twoFAStatus,
                    twoFAType: updated.twoFAType,
                    nomineeAwareness: updated.nomineeAwareness,
                    linkedMemberId: updated.linkedFamilyMemberId,
                })
            });

            setEditing(false);
            setToast({ message: "Changes saved successfully", type: "success" });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            setToast({ message: "Failed to save changes", type: "error" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleRevealPassword = () => {
        if (!CredentialStore.isVaultCreated()) return;
        if (!CredentialStore.isVaultUnlocked()) {
            setShowPassModal("unlock");
            return;
        }
        // In V1, show a placeholder since real decryption requires the passphrase key
        setRevealedPassword("••• Encrypted (unlock required for real decryption) •••");
        setShowPassword(true);
    };

    const handleRemoveExecutor = async () => {
        try {
            // Update local store
            CredentialStore.updatePortal(portalId, {
                linkedFamilyMemberId: undefined
            });

            // Sync with backend - use null to clear the field in DB
            const res = await fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: portalId, 
                    linkedMemberId: null,
                    portalName: portal?.platformName,
                    portalType: portal?.category
                })
            });

            if (!res.ok) throw new Error("API failed");

            // Update local component state
            if (portal) setPortal({ ...portal, linkedFamilyMemberId: undefined });
            setShowRemoveModal(false);
            setToast({ message: "Executor removed successfully", type: "success" });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error("Failed to remove executor:", err);
            setToast({ message: "Failed to remove executor", type: "error" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleAssignExecutor = async () => {
        if (!selectedExecutorId) return;
        
        try {
            CredentialStore.updatePortal(portalId, {
                linkedFamilyMemberId: selectedExecutorId
            });

            const res = await fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: portalId, 
                    linkedMemberId: selectedExecutorId,
                    portalName: portal?.platformName,
                    portalType: portal?.category
                })
            });

            if (!res.ok) throw new Error("API failed");

            // Refresh state
            const p = CredentialStore.getPortalById(portalId);
            if (p) setPortal(p);
            
            setShowExecutorModal(false);
            setToast({ message: "Executor assigned successfully", type: "success" });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            setToast({ message: "Failed to assign executor", type: "error" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleDeletePortal = async () => {
        try {
            const res = await fetch(`/api/credentials/${portalId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("Delete failed");

            CredentialStore.deletePortal(portalId);
            router.push("/dwaar/portals");
        } catch (err) {
            setToast({ message: "Failed to delete portal", type: "error" });
            setTimeout(() => setToast(null), 3000);
            setShowDeleteModal(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between pt-8 mb-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/dwaar/portals")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <div>
                            <p className="text-[10px] text-amber-400/60 uppercase tracking-wider">{catMeta?.emoji} {catMeta?.label}</p>
                            <h1 className="text-lg font-semibold text-white truncate">
                                {portal.customServiceName ? `${portal.platformName} — ${portal.customServiceName}` : portal.platformName}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${healthColor}`}>{portalHealth}%</span>
                        {isReady && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                </div>

                {toast && (
                    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl transition-all animate-in slide-in-from-top duration-300 ${
                        toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    }`}>
                        {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                )}

                <div className="flex-1 space-y-4">
                    {/* Login Details */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Login Details</p>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-xs text-white/40">Login ID</span>
                                {editing
                                    ? <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)}
                                        className="bg-white/6 border border-white/15 rounded-lg px-2 py-1 text-xs text-white text-right w-40 focus:outline-none" />
                                    : <span className="text-xs text-white">{CredentialStore.maskLoginId(portal.loginId)}</span>}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-white/40">Registered Mobile</span>
                                <span className="text-xs text-white/70">{linkedMobile || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-white/40">Registered Email</span>
                                <span className="text-xs text-white/70">{linkedEmail || "—"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-white/40">2FA</span>
                                {editing ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-1">
                                            {(["enabled", "disabled", "unknown"] as const).map(v => (
                                                <button key={v} onClick={() => { setTwoFA(v); if (v !== "enabled") setTwoFAType("unknown"); }}
                                                    className={`text-[10px] px-2 py-1 rounded-lg border ${twoFA === v ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/10 text-white/30"}`}>
                                                    {v === "enabled" ? "Yes" : v === "disabled" ? "No" : "?"}
                                                </button>
                                            ))}
                                        </div>
                                        {twoFA === "enabled" && (
                                            <div className="flex gap-1">
                                                {(["otp", "token", "biometric", "none"] as const).map(t => (
                                                    <button key={t} onClick={() => setTwoFAType(t as TwoFAType)}
                                                        className={`text-[10px] px-2 py-1 rounded-lg border ${twoFAType === t ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/10 text-white/30"}`}>
                                                        {t === "otp" ? "OTP" : t === "token" ? "Token" : t === "biometric" ? "Biometric" : "None"}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs ${portal.twoFAStatus?.toLowerCase() === "enabled" ? "text-emerald-400" : "text-white/40"}`}>
                                            {portal.twoFAStatus?.toLowerCase() === "enabled" ? "Enabled" : portal.twoFAStatus?.toLowerCase() === "disabled" ? "Disabled" : "Unknown"}
                                        </span>
                                        {portal.twoFAStatus?.toLowerCase() === "enabled" && portal.twoFAType && portal.twoFAType !== "unknown" && (
                                            <span className="text-[10px] text-emerald-400/70">
                                                {portal.twoFAType === "otp" ? "OTP" : portal.twoFAType === "token" ? "Token" : portal.twoFAType === "biometric" ? "Biometric" : "None"}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Insurance Awareness */}
                    {portal.category === "insurance" && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Nominee Awareness</p>
                                    <p className="text-xs text-white/70 mt-1">
                                        {editing ? "Is the nominee aware?" : (portal.nomineeAwareness ? "✔ Nominee is aware" : "⚠ Nominee not aware")}
                                    </p>
                                </div>
                                {editing && (
                                    <button onClick={() => setNomineeAwareness(!nomineeAwareness)}
                                        className={`w-10 h-6 rounded-full border transition-colors flex items-center px-0.5 ${nomineeAwareness ? "bg-emerald-500 border-emerald-500" : "bg-white/10 border-white/20"}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${nomineeAwareness ? "translate-x-4" : "translate-x-0"}`} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Service Details — shown for Other / Subscription / Utility */}
                    {(portal.category === "other" || portal.category === "subscription" || portal.category === "utility") && (
                        portal.customServiceName || portal.billingCycle || portal.rechargeDate || portal.renewalDate || portal.paymentAssignee || portal.linkedAutoDebitBank
                    ) && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">Service Details</p>
                                <div className="space-y-2">
                                    {portal.customServiceName && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Service Name</span>
                                            <span className="text-xs text-white">{portal.customServiceName}</span>
                                        </div>
                                    )}
                                    {portal.billingCycle && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Billing Cycle</span>
                                            <span className="text-xs text-sky-400 capitalize">{portal.billingCycle.replace("_", " ")}</span>
                                        </div>
                                    )}
                                    {portal.rechargeDate && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Next Recharge / Due</span>
                                            <span className="text-xs text-orange-400">{portal.rechargeDate}</span>
                                        </div>
                                    )}
                                    {portal.renewalDate && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Next Renewal</span>
                                            <span className="text-xs text-amber-400">{portal.renewalDate}</span>
                                        </div>
                                    )}
                                    {portal.paymentAssignee && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Payment Assignee</span>
                                            <span className="text-xs text-violet-400">{portal.paymentAssignee}</span>
                                        </div>
                                    )}
                                    {portal.linkedAutoDebitBank && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-white/40">Auto-Debit Bank</span>
                                            <span className="text-xs text-white/70">{portal.linkedAutoDebitBank}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Password Strategy */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Password Strategy</p>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/70">
                                {portal.passwordStorageMode === "encrypted" ? "🔐 Stored Encrypted" : "🔒 Not Stored"}
                            </span>
                            {portal.passwordStorageMode === "encrypted" && (
                                <button onClick={handleRevealPassword} className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/30">
                                    {showPassword ? <EyeOff className="w-3 h-3 inline mr-1" /> : <Eye className="w-3 h-3 inline mr-1" />}
                                    {showPassword ? "Hide" : "Reveal Password"}
                                </button>
                            )}
                        </div>
                        {showPassword && revealedPassword && (
                            <p className="text-xs text-white/50 bg-black/30 rounded-lg px-3 py-2 font-mono">{revealedPassword}</p>
                        )}
                        {portal.passwordStorageMode === "not_stored" && (
                            <p className="text-[10px] text-white/20 italic">Remember to store your password securely elsewhere.</p>
                        )}
                    </div>

                    {/* Shared Authority (Executor) */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider">Shared Authority</p>
                            {!portal.linkedFamilyMemberId && (
                                <button onClick={() => {
                                    setSelectedExecutorId("");
                                    setShowExecutorModal(true);
                                }} className="text-[10px] text-amber-400">
                                    + Assign Executor
                                </button>
                            )}
                        </div>
                        {linkedExecutor ? (
                            <div className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                                <div>
                                    <p className="text-xs text-white">{linkedExecutor.name}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{linkedExecutor.relation}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">
                                        Executor
                                    </span>
                                    <button onClick={() => setShowRemoveModal(true)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-white/20 italic">No executor assigned. Assign to improve emergency readiness.</p>
                        )}
                    </div>

                    {/* Notes */}
                    {editing ? (
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none resize-none" />
                        </div>
                    ) : portal.notes ? (
                        <div className="bg-white/3 rounded-xl p-3">
                            <p className="text-[10px] text-white/30 mb-1">Notes</p>
                            <p className="text-xs text-white/50">{portal.notes}</p>
                        </div>
                    ) : null}

                    {/* Emergency readiness status */}
                    <div className={`rounded-xl p-3 flex items-center gap-2 ${isReady ? "bg-emerald-400/5 border border-emerald-400/20" : "bg-amber-400/5 border border-amber-400/20"}`}>
                        {isReady
                            ? <><ShieldCheck className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400">✔ Emergency Ready</span></>
                            : <><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs text-amber-400/70">⚠ Not fully emergency ready</span></>}
                    </div>

                    {/* Last reviewed */}
                    {portal.lastReviewedDate && (
                        <p className="text-[10px] text-white/20 text-center">Last reviewed: {portal.lastReviewedDate}</p>
                    )}
                </div>

                {/* CTAs */}
                <div className="pb-4 pt-4 space-y-3">
                    {editing ? (
                        <button onClick={handleSaveEdit} className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm">Save Changes</button>
                    ) : (
                        <button onClick={() => setEditing(true)} className="w-full bg-white/8 border border-white/15 text-white/70 py-4 rounded-xl text-sm">Edit Details</button>
                    )}
                    <button onClick={() => setShowDeleteModal(true)} className="w-full text-center text-xs text-red-400/50 hover:text-red-400 py-2 transition-colors">
                        🗑️ Delete this portal
                    </button>
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <Trash2 className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <h2 className="text-white font-semibold text-center mb-1">Delete Portal?</h2>
                        <p className="text-xs text-white/35 text-center mb-4">Are you sure you want to delete this portal? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50">Cancel</button>
                            <button onClick={handleDeletePortal}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Executor Confirmation */}
            {showRemoveModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowRemoveModal(false)}>
                    <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-6 h-6 text-red-500" />
                        </div>
                        <h2 className="text-white font-semibold text-center mb-1">Remove Executor?</h2>
                        <p className="text-xs text-white/35 text-center mb-6">
                            Are you sure you want to remove <span className="text-white font-medium">{linkedExecutor?.name}</span> as executor for this portal?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRemoveModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50">Cancel</button>
                            <button onClick={handleRemoveExecutor} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Executor Assignment Modal */}
            {showExecutorModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowExecutorModal(false)}>
                    <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-semibold mb-4">Assign Executor</h2>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-white/40">Select Family Member</label>
                                <select value={selectedExecutorId} onChange={e => setSelectedExecutorId(e.target.value)}
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                    <option value="">Select a member</option>
                                    {familyMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.relation.split(' ')[0].toLowerCase()})</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-white/20 italic mt-2">
                                An executor will have access to this portal in case of emergencies as per system rules.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowExecutorModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50">Cancel</button>
                            <button onClick={handleAssignExecutor} className="flex-1 py-3 rounded-xl bg-amber-400 text-black text-sm font-semibold">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showPassModal && (
                <MasterPassphraseModal mode={showPassModal} onClose={() => setShowPassModal(null)} />
            )}
        </div>
    );
}
