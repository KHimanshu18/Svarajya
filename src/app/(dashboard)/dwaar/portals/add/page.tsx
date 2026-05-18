"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import {
    CredentialStore, PORTAL_CATEGORIES, PortalCategory, PasswordStorageMode, TwoFAStatus,
    CATEGORY_TUTORIALS, TAX_SUBCATEGORIES, UTILITY_SUBCATEGORIES, DEMAT_SUBCATEGORIES, INDIAN_BANKS,
    TwoFAType
} from "@/lib/credentialStore";
import { IdentityStore } from "@/lib/identityStore";
import { OnboardingStore } from "@/lib/onboardingStore";
import { MasterPassphraseModal } from "@/components/credentials/MasterPassphraseModal";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { validateControlledEmail, validateIndianMobile } from "@/lib/contactValidation";

export default function AddPortalPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Step 1 — Category & Platform
    const [platformName, setPlatformName] = useState("");
    const [category, setCategory] = useState<PortalCategory | "">("");
    const [subcategory, setSubcategory] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [appLink, setAppLink] = useState("");

    // Seed contacts
    const [contacts, setContacts] = useState(IdentityStore.getContacts());
    const mobiles = contacts.filter(c => c.type === "mobile");
    const emails = contacts.filter(c => c.type === "email");

    // Step 2 — Credentials & Category-specific
    const [loginId, setLoginId] = useState("");
    const [registeredMobileId, setRegisteredMobileId] = useState("");
    const [registeredEmailId, setRegisteredEmailId] = useState("");
    const [registrationDate, setRegistrationDate] = useState("");

    // Family members
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    const [linkedFamilyId, setLinkedFamilyId] = useState("");

    const [newMobile, setNewMobile] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [passwordMode, setPasswordMode] = useState<PasswordStorageMode>("not_stored");
    const [rawPassword, setRawPassword] = useState("");
    const [twoFA, setTwoFA] = useState<TwoFAStatus>("unknown");
    const [twoFAType, setTwoFAType] = useState<TwoFAType>("unknown");

    const [notes, setNotes] = useState("");

    // Bank-specific
    const [bankName, setBankName] = useState("");
    // Tax-specific
    const [linkedBusinessEntity, setLinkedBusinessEntity] = useState("");
    const [linkedCA, setLinkedCA] = useState("");
    // Insurance-specific
    const [nomineeAwareness, setNomineeAwareness] = useState(false);
    // Subscription-specific
    const [renewalDate, setRenewalDate] = useState("");
    const [linkedAutoDebitBank, setLinkedAutoDebitBank] = useState("");
    // Other-specific
    const [customServiceName, setCustomServiceName] = useState("");
    const [rechargeDate, setRechargeDate] = useState("");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time" | "custom" | "">("")
    const [paymentAssignee, setPaymentAssignee] = useState("");

    // UI state
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [savedHealthScore, setSavedHealthScore] = useState(0);
    const [showPassModal, setShowPassModal] = useState<"create" | "unlock" | null>(null);

    // Initial load and sync
    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetch('/api/profile', { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                const profile = json.data;
                if (!profile) return;

                // Seed IdentityStore with these profile fields so it becomes source of truth
                // Initialize seenValues with whatever is already in IdentityStore
                const seenValues = new Set<string>(
                    IdentityStore.getContacts().map(c => c.value.toLowerCase())
                );
                
                const addIfUnique = (type: "mobile" | "email", value: string | null | undefined, label: string) => {
                    if (!value) return;
                    const val = value.trim().toLowerCase();
                    if (seenValues.has(val)) return;
                    
                    try {
                        IdentityStore.addContact(type, val, label);
                        seenValues.add(val);
                    } catch (e) {
                        // If IdentityStore already has it from a previous visit/session
                        seenValues.add(val);
                    }
                };

                addIfUnique("mobile", profile.phone, "Phone");
                addIfUnique("email", profile.email, "Email");
                addIfUnique("mobile", profile.primaryMobile, "Primary Mobile");
                addIfUnique("mobile", profile.secondaryMobile, "Secondary Mobile");
                addIfUnique("email", profile.primaryEmail, "Primary Email");
                addIfUnique("email", profile.recoveryEmail, "Recovery Email");

                const currentContacts = IdentityStore.getContacts();
                setContacts(currentContacts);

                const m = currentContacts.filter(c => c.type === "mobile");
                const e = currentContacts.filter(c => c.type === "email");
                if (m.length > 0) setRegisteredMobileId(m[0].id);
                if (e.length > 0) setRegisteredEmailId(e[0].id);

                // Filter family members: accessLevel is 'write' OR 'EXECUTOR' AND NOT child
                const allMembers = profile.familyMembers || [];
                const filteredMembers = allMembers.filter((f: any) => 
                    (f.accessLevel === "write" || f.accessLevel === "EXECUTOR") && 
                    !f.relation.toLowerCase().includes("child")
                );
                setFamilyMembers(filteredMembers);
                // Removed auto-selection: setLinkedFamilyId(filteredMembers[0].id);
            } catch (err) {
                console.error("Failed to load profile for Kunji:", err);
            }
        };
        loadData();
    }, []);

    const handleAddMobile = () => {
        const result = validateIndianMobile(newMobile);
        if (!result.valid) {
            setError(result.message || "Enter a valid mobile number.");
            return;
        }

        try {
            const cp = IdentityStore.addContact("mobile", result.normalized);
            setRegisteredMobileId(cp.id);
            setNewMobile("");
            setError("");
            setContacts(IdentityStore.getContacts());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not add mobile contact.");
        }
    };

    const handleAddEmail = () => {
        const result = validateControlledEmail(newEmail);
        if (!result.valid) {
            setError(result.message || "Enter a valid email.");
            return;
        }

        try {
            const cp = IdentityStore.addContact("email", result.normalized);
            setRegisteredEmailId(cp.id);
            setNewEmail("");
            setError("");
            setContacts(IdentityStore.getContacts());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not add email contact.");
        }
    };

    const tutorial = category ? CATEGORY_TUTORIALS[category] : null;

    const existingPortals = CredentialStore.getPortals();
    const duplicateUrl = websiteUrl.trim() && existingPortals.find(p => p.websiteUrl === websiteUrl.trim());
    const duplicateBank = bankName && existingPortals.find(p => p.category === "bank" && p.bankName === bankName);

    // Step 1 validation
    const handleStep1Next = () => {
        if (!platformName.trim()) { setError("Platform name is required."); return; }
        if (!category) { setError("Please select a category."); return; }
        if (websiteUrl.trim()) {
            // Basic URL syntax check
            const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
            if (!urlPattern.test(websiteUrl.trim())) {
                setError("Please enter a valid Website URL.");
                return;
            }
        }
        if (category === "other" && !customServiceName.trim()) { setError("Custom service name is required for 'Other' category."); return; }
        setError("");
        setStep(2);
    };

    // Step 2 save
    const handleSave = async () => {
        if (!loginId.trim()) { setError("Login ID is required."); return; }

        if (registrationDate && renewalDate) {
            if (new Date(renewalDate) < new Date(registrationDate)) {
                setError("Renewal date cannot be before registration date.");
                return;
            }
        }

        if (passwordMode === "encrypted") {
            if (!CredentialStore.isVaultCreated()) { setShowPassModal("create"); return; }
            if (!CredentialStore.isVaultUnlocked()) { setShowPassModal("unlock"); return; }
        }

        let encryptedPassword = undefined;
        if (passwordMode === "encrypted" && rawPassword) {
            const { encryptString } = await import("@/lib/crypto");
            const result = await encryptString(rawPassword, "session-key-" + Date.now());
            encryptedPassword = {
                version: 1 as const,
                alg: "AES-GCM" as const,
                kdf: "PBKDF2" as const,
                iterations: result.iterations,
                saltB64: result.saltB64,
                ivB64: result.ivB64,
                cipherTextB64: result.cipherTextB64,
                createdAt: new Date().toISOString(),
            };
        }

        const savedPortal = CredentialStore.addPortal({
            platformName: platformName.trim(),
            category: category as PortalCategory,
            subcategory: subcategory || undefined,
            websiteUrl: websiteUrl.trim() || undefined,
            appLink: appLink.trim() || undefined,
            loginId: loginId.trim(),
            registeredMobileId: registeredMobileId || undefined,
            registeredEmailId: registeredEmailId || undefined,
            registrationDate: registrationDate || undefined,
            linkedFamilyMemberId: linkedFamilyId || undefined,
            passwordStorageMode: passwordMode,
            encryptedPassword,
            twoFAStatus: twoFA,
            twoFAType: twoFAType,
            notes: notes.trim() || undefined,
            lastReviewedDate: new Date().toISOString().split("T")[0],
            // Category-specific
            bankName: bankName || undefined,
            linkedBusinessEntity: linkedBusinessEntity.trim() || undefined,
            linkedCA: linkedCA.trim() || undefined,
            nomineeAwareness: category === "insurance" ? nomineeAwareness : undefined,
            renewalDate: renewalDate || undefined,
            linkedAutoDebitBank: linkedAutoDebitBank.trim() || undefined,
            // Other-specific
            customServiceName: category === "other" ? customServiceName.trim() || undefined : undefined,
            rechargeDate: (category === "other" || category === "subscription" || category === "utility") ? rechargeDate || undefined : undefined,
            billingCycle: (category === "other" || category === "subscription" || category === "utility") ? (billingCycle || undefined) : undefined,
            paymentAssignee: (category === "other" || category === "subscription" || category === "utility") ? paymentAssignee.trim() || undefined : undefined,
        });



        const deps = {
            contactPointExists: (id: string) => !!IdentityStore.getContact(id),
            familyMemberExists: () => true,
        };
        const health = CredentialStore.getCredentialHealth(deps);
        setSavedHealthScore(health.overall);
        setSaved(true);
    };

    // Post-save insights
    const getPostSaveInsights = () => {
        const insights: { type: "success" | "warning"; message: string }[] = [];
        const portals = CredentialStore.getPortals();
        const catCount = portals.filter(p => p.category === category).length;

        if (category === "bank") {
            insights.push({ type: "success", message: `${catCount} bank portal${catCount > 1 ? "s" : ""} mapped.` });
            if (!linkedFamilyId) insights.push({ type: "warning", message: "No executor assigned. In an emergency, nobody can access this portal." });
        } else if (category === "tax") {
            insights.push({ type: "success", message: "Tax compliance gate strengthened." });
            if (!linkedCA) insights.push({ type: "warning", message: "No CA/Accountant linked. Consider adding your chartered accountant for governance." });
        } else if (category === "insurance") {
            insights.push({ type: "success", message: "Insurance portal secured." });
            if (!nomineeAwareness) insights.push({ type: "warning", message: "Nominee may not be aware of this portal. Share access details for claim readiness." });
        } else if (category === "demat" || category === "investment") {
            insights.push({ type: "success", message: "Investment gate secured." });
        } else if (category === "subscription") {
            insights.push({ type: "success", message: "Subscription portal tracked." });
            if (!renewalDate) insights.push({ type: "warning", message: "No renewal date set. You may miss an auto-renewal charge." });
        } else if (category === "utility") {
            insights.push({ type: "success", message: "Utility portal organized." });
        }

        return insights;
    };

    // ——— Success Screen ———
    if (saved) {
        const insights = getPostSaveInsights();
        return (
            <div className="flex flex-col min-h-screen p-6 pb-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-400/6 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col min-h-screen items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Portal Added Successfully</h2>
                    <p className="text-sm text-white/50 mb-1">Credential Health: <span className="text-amber-400 font-semibold">{savedHealthScore}%</span></p>

                    {/* Post-save insights */}
                    {insights.length > 0 && (
                        <div className="w-full max-w-sm space-y-2 mt-4 mb-6">
                            {insights.map((ins, i) => (
                                <div key={i} className={`flex items-start gap-2 rounded-xl p-3 text-xs ${ins.type === "warning"
                                    ? "bg-amber-400/10 border border-amber-400/20 text-amber-400"
                                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                    }`}>
                                    {ins.type === "warning" ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                                    <span>{ins.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="w-full max-w-sm space-y-3">
                        <button onClick={() => router.push("/dwaar/portals")}
                            className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm">
                            View Vault
                        </button>
                        <button onClick={() => { setSaved(false); setStep(1); setPlatformName(""); setCategory(""); setSubcategory(""); setLoginId(""); setError(""); }}
                            className="w-full bg-white/8 border border-white/15 text-white/70 py-3 rounded-xl text-sm">
                            Add Another Portal
                        </button>
                        <button onClick={() => router.push("/dwaar/portals")}
                            className="w-full text-center text-xs text-white/40 py-2">
                            Back to Kunji Vault
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-2">
                    <button onClick={() => step === 2 ? setStep(1) : router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Add a Portal</h1>
                        <p className="text-xs text-white/35 mt-0.5">
                            {step === 1 ? "Choose category and name the portal." : "Enter credentials and details."}
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex gap-2 mt-4 mb-4">
                    <div className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-amber-400" : "bg-white/10"}`} />
                    <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-amber-400" : "bg-white/10"}`} />
                </div>

                {/* Category-specific micro-tutorial — shown after category selection */}
                {tutorial && (
                    <div className="mb-4 space-y-3">
                        <div className="bg-[var(--color-rajya-accent)]/8 border border-[var(--color-rajya-accent)]/20 rounded-xl p-3">
                            <p className="text-xs text-[var(--color-rajya-muted)]">
                                💡 <strong className="text-[var(--color-rajya-text)]">{tutorial.title}</strong> — {tutorial.message}
                            </p>
                        </div>
                        <VideoTutorialPlaceholder youtubeId={tutorial.youtubeId} label={tutorial.title + " — tutorial"} />
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mb-4">
                        <span className="text-xs text-red-400">⚠ {error}</span>
                    </div>
                )}

                {/* ——— STEP 1: Category & Platform ——— */}
                {step === 1 && (
                    <div className="flex-1 space-y-5">
                        {/* Category picker */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Category *</label>
                            <div className="flex flex-wrap gap-2">
                                {PORTAL_CATEGORIES.map(c => (
                                    <button key={c.id} onClick={() => { setCategory(c.id); setSubcategory(""); setError(""); }}
                                        className={`px-3 py-2 rounded-xl border text-xs transition-all ${category === c.id
                                            ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                            : "bg-white/5 border-white/10 text-white/40 hover:border-white/25"}`}>
                                        {c.emoji} {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subcategory — Tax */}
                        {category === "tax" && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Portal Type *</label>
                                <div className="flex flex-wrap gap-2">
                                    {TAX_SUBCATEGORIES.map(s => (
                                        <button key={s.id} onClick={() => setSubcategory(s.id)}
                                            className={`px-3 py-2 rounded-lg border text-xs transition-all ${subcategory === s.id
                                                ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                                : "bg-white/5 border-white/10 text-white/40"}`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subcategory — Utility */}
                        {(category === "utility" || category === "subscription") && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {UTILITY_SUBCATEGORIES.map(s => (
                                        <button key={s.id} onClick={() => setSubcategory(s.id)}
                                            className={`px-3 py-2 rounded-lg border text-xs transition-all ${subcategory === s.id
                                                ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                                : "bg-white/5 border-white/10 text-white/40"}`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subcategory — Demat */}
                        {category === "demat" && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Platform Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {DEMAT_SUBCATEGORIES.map(s => (
                                        <button key={s.id} onClick={() => setSubcategory(s.id)}
                                            className={`px-3 py-2 rounded-lg border text-xs transition-all ${subcategory === s.id
                                                ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                                : "bg-white/5 border-white/10 text-white/40"}`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Platform name */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Platform Name *</label>
                            <input type="text"
                                placeholder={category === "bank" ? "e.g. HDFC Netbanking" : category === "tax" ? "e.g. Income Tax e-Filing" : category === "demat" ? "e.g. Zerodha, Groww" : category === "insurance" ? "e.g. LIC Portal" : "Enter platform name"}
                                value={platformName}
                                onChange={e => { setPlatformName(e.target.value); setError(""); }}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                        </div>

                        {/* Custom Service Name — other-specific, shown in Step 1 */}
                        {category === "other" && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Custom Service Name <span className="text-amber-400">*</span></label>
                                <input type="text" placeholder="e.g. Airtel Recharge, Society Maintenance, Gym"
                                    value={customServiceName}
                                    onChange={e => { setCustomServiceName(e.target.value); setError(""); }}
                                    className="w-full bg-white/6 border border-amber-400/30 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                                <p className="text-[10px] text-white/25">A unique label to identify this service in your vault.</p>
                            </div>
                        )}

                        {/* Bank name — bank-specific */}
                        {category === "bank" && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Bank Name</label>
                                <select value={bankName} onChange={e => setBankName(e.target.value)}
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                    <option value="">Select bank...</option>
                                    {INDIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                {duplicateBank && (
                                    <p className="text-[10px] text-amber-400">⚠ You already have a portal saved for {bankName}.</p>
                                )}
                            </div>
                        )}

                        {/* Website & App link */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Website URL</label>
                            <input type="url" placeholder="https://" value={websiteUrl}
                                onChange={e => setWebsiteUrl(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                            {duplicateUrl && (
                                <p className="text-[10px] text-amber-400">⚠ A portal with this URL already exists in your vault.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40">App Link <span className="text-white/20">(optional)</span></label>
                            <input type="text" placeholder="App name or link" value={appLink}
                                onChange={e => setAppLink(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                        </div>

                        <div className="pt-4">
                            <button onClick={handleStep1Next}
                                className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* ——— STEP 2: Credentials & Category-Specific ——— */}
                {step === 2 && (
                    <div className="flex-1 space-y-4">
                        {/* Login ID */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">
                                Login ID * <span className="text-white/20">
                                    {category === "tax" && subcategory === "gst" ? "(GSTIN-based)" : category === "tax" ? "(PAN-based)" : category === "bank" ? "(Customer ID / User ID)" : ""}
                                </span>
                            </label>
                            <input type="text"
                                placeholder={category === "tax" ? "e.g. ABCDE1234F" : category === "bank" ? "e.g. Customer ID" : "Enter username or email"}
                                value={loginId}
                                onChange={e => { setLoginId(e.target.value); setError(""); }}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                        </div>

                        {/* Registered Mobile */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Registered Mobile</label>
                            <select value={registeredMobileId === "add_new" ? "add_new" : registeredMobileId} onChange={e => setRegisteredMobileId(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                <option value="">Select mobile</option>
                                {mobiles.map(c => <option key={c.id} value={c.id}>{c.value}</option>)}
                                <option value="add_new">+ Add New Mobile</option>
                            </select>
                            {registeredMobileId === "add_new" && (
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Enter new mobile" value={newMobile} onChange={e => { setNewMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                                        inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
                                        className="flex-1 bg-white/6 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                                    <button type="button" onClick={handleAddMobile}
                                        className="bg-amber-400/20 text-amber-400 px-3 py-2 rounded-xl text-sm border border-amber-400/40">Add</button>
                                </div>
                            )}
                        </div>

                        {/* Registered Email */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Registered Email</label>
                            <select value={registeredEmailId === "add_new" ? "add_new" : registeredEmailId} onChange={e => setRegisteredEmailId(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                <option value="">Select email</option>
                                {emails.map(c => <option key={c.id} value={c.id}>{c.value}</option>)}
                                <option value="add_new">+ Add New Email</option>
                            </select>
                            {registeredEmailId === "add_new" && (
                                <div className="flex gap-2">
                                    <input type="email" placeholder="Enter new email" value={newEmail} onChange={e => { setNewEmail(e.target.value.trim().toLowerCase()); setError(""); }}
                                        className="flex-1 bg-white/6 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                                    <button type="button" onClick={handleAddEmail}
                                        className="bg-amber-400/20 text-amber-400 px-3 py-2 rounded-xl text-sm border border-amber-400/40">Add</button>
                                </div>
                            )}
                        </div>

                        {/* Registration Date */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Registration Date <span className="text-white/20">(optional)</span></label>
                            <input type="date" value={registrationDate}
                                onChange={e => setRegistrationDate(e.target.value)}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                        </div>

                        {/* 2FA Type (General) */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">2FA Type</label>
                            <div className="flex gap-2 flex-wrap">
                                {(["otp", "token", "biometric", "none"] as TwoFAType[]).map(t => (
                                    <button key={t} onClick={() => { setTwoFAType(t); setTwoFA(t === "none" ? "disabled" : "enabled"); }}
                                        className={`px-3 py-2 rounded-lg border text-xs transition-all ${twoFAType === t
                                            ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                            : "bg-white/5 border-white/10 text-white/40"}`}>
                                        {t === "otp" ? "OTP" : t === "token" ? "Token" : t === "biometric" ? "Biometric" : "None"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ——— BANK-specific fields ——— */}
                        {category === "bank" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked Bank Account <span className="text-white/20">(Module 6)</span></label>
                                    <p className="text-[10px] text-white/25">Bank account linking will be available after Module 6 setup.</p>
                                </div>
                            </>
                        )}

                        {/* ——— TAX-specific fields ——— */}
                        {category === "tax" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked Business Entity <span className="text-white/20">(if applicable)</span></label>
                                    <input type="text" placeholder="e.g. ABC Trading Pvt Ltd" value={linkedBusinessEntity}
                                        onChange={e => setLinkedBusinessEntity(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked CA / Accountant <span className="text-white/20">(optional)</span></label>
                                    <input type="text" placeholder="e.g. CA Ramesh Kumar" value={linkedCA}
                                        onChange={e => setLinkedCA(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                                </div>
                            </>
                        )}

                        {/* ——— INSURANCE-specific fields ——— */}
                        {category === "insurance" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked Policy <span className="text-white/20">(Module 8)</span></label>
                                    <p className="text-[10px] text-white/25">Policy linking will be available after Module 8 setup.</p>
                                </div>
                                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div>
                                        <p className="text-sm text-white">Nominee Aware?</p>
                                        <p className="text-[10px] text-white/30">Does the nominee know about this portal access?</p>
                                    </div>
                                    <button onClick={() => setNomineeAwareness(!nomineeAwareness)}
                                        className={`w-12 h-7 rounded-full border transition-colors flex items-center px-0.5 ${nomineeAwareness ? "bg-emerald-500 border-emerald-500" : "bg-white/10 border-white/20"}`}>
                                        <div className={`w-6 h-6 rounded-full bg-white transition-transform ${nomineeAwareness ? "translate-x-5" : "translate-x-0"}`} />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ——— DEMAT/INVESTMENT-specific fields ——— */}
                        {(category === "demat" || category === "investment") && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">Linked Investment Account <span className="text-white/20">(Module 7)</span></label>
                                <p className="text-[10px] text-white/25">Investment linking will be available after Module 7 setup.</p>
                            </div>
                        )}

                        {/* ——— SUBSCRIPTION/UTILITY-specific fields ——— */}
                        {(category === "subscription" || category === "utility") && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Renewal Date <span className="text-white/20">(next billing)</span></label>
                                    <input type="date" value={renewalDate}
                                        onChange={e => setRenewalDate(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked Auto-Debit Bank <span className="text-white/20">(optional)</span></label>
                                    <input type="text" placeholder="e.g. HDFC Salary Account" value={linkedAutoDebitBank}
                                        onChange={e => setLinkedAutoDebitBank(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                                </div>
                            </>
                        )}

                        {/* ——— OTHER-specific fields ——— */}
                        {category === "other" && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Recharge / Payment Due Date</label>
                                    <input type="date" value={rechargeDate}
                                        onChange={e => setRechargeDate(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Renewal Date <span className="text-white/20">(next billing)</span></label>
                                    <input type="date" value={renewalDate}
                                        onChange={e => setRenewalDate(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/60" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Billing Cycle</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(["monthly", "quarterly", "half_yearly", "yearly", "one_time", "custom"] as const).map(c => (
                                            <button key={c} onClick={() => setBillingCycle(c)}
                                                className={`px-3 py-2 rounded-lg border text-xs transition-all ${billingCycle === c
                                                    ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                                    : "bg-white/5 border-white/10 text-white/40"}`}>
                                                {c === "monthly" ? "Monthly" : c === "quarterly" ? "Quarterly" : c === "half_yearly" ? "Half Yearly" : c === "yearly" ? "Yearly" : c === "one_time" ? "One-Time" : "Custom"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Payment Assignee <span className="text-white/20">(who pays?)</span></label>
                                    <select value={paymentAssignee} onChange={e => setPaymentAssignee(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="">Self</option>
                                        {familyMembers.map(f => (
                                            <option key={f.id} value={f.name}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40">Linked Auto-Debit Bank <span className="text-white/20">(optional)</span></label>
                                    <input type="text" placeholder="e.g. HDFC Salary Account" value={linkedAutoDebitBank}
                                        onChange={e => setLinkedAutoDebitBank(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                                </div>
                            </>
                        )}

                        {/* Password strategy — shown for ALL categories */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Password Strategy *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPasswordMode("not_stored")}
                                    className={`px-3 py-3 rounded-xl border text-xs transition-all ${passwordMode === "not_stored"
                                        ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                        : "bg-white/5 border-white/10 text-white/40"}`}>
                                    🔒 Not Stored
                                    <span className="block text-[10px] mt-0.5 opacity-60">(Recommended)</span>
                                </button>
                                <button onClick={() => setPasswordMode("encrypted")}
                                    className={`px-3 py-3 rounded-xl border text-xs transition-all ${passwordMode === "encrypted"
                                        ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                        : "bg-white/5 border-white/10 text-white/40"}`}>
                                    🔐 Store Encrypted
                                    <span className="block text-[10px] mt-0.5 opacity-60">In Vault</span>
                                </button>
                            </div>
                            {passwordMode === "not_stored" && (
                                <p className="text-[10px] text-white/25 italic">Remember to store your password securely elsewhere.</p>
                            )}
                            {passwordMode === "encrypted" && (
                                <input type="password" placeholder="••••••••" value={rawPassword}
                                    onChange={e => setRawPassword(e.target.value)}
                                    className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                            )}
                        </div>

                        {/* 2FA — shown for non-bank (bank has its own 2FA type picker) */}
                        {category !== "bank" && (
                            <div className="space-y-2">
                                <label className="text-xs text-white/40">2FA Enabled</label>
                                <div className="flex gap-2">
                                    {(["enabled", "disabled", "unknown"] as TwoFAStatus[]).map(val => (
                                        <button key={val} onClick={() => setTwoFA(val)}
                                            className={`flex-1 px-2 py-2.5 rounded-xl border text-xs transition-all ${twoFA === val
                                                ? "bg-amber-400/15 border-amber-400 text-amber-400"
                                                : "bg-white/5 border-white/10 text-white/40"}`}>
                                            {val === "enabled" ? "Yes" : val === "disabled" ? "No" : "Not Sure"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Linked Family Member */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Linked Family Member <span className="text-white/20">(Executor)</span></label>
                            {familyMembers.length === 0 ? (
                                <p className="text-xs text-amber-400 bg-amber-400/10 p-3 rounded-xl border border-amber-400/20">
                                    No eligible family members. Add an adult with Executor access in Family Management
                                </p>
                            ) : (
                                <>
                                    <select value={linkedFamilyId} onChange={e => setLinkedFamilyId(e.target.value)}
                                        className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="">Select family member</option>
                                        {familyMembers.map(f => {
                                            const baseRelation = f.relation.split(' ')[0].toLowerCase();
                                            return (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            );
                                        })}
                                        <option value="add_new">+ Add valid Executor</option>
                                    </select>
                                    {linkedFamilyId === "add_new" && (
                                        <p className="text-[10px] text-amber-400">
                                            Please go to <button onClick={() => router.push("/foundation/family")} className="underline font-bold">Foundation &gt; Family</button> to add a valid Executor (cannot be a child).
                                        </p>
                                    )}
                                </>
                            )}
                            <p className="text-[10px] text-white/20">Only non-child members with Executor access appear here.</p>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Notes <span className="text-white/20">(optional)</span></label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes"
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 resize-none" />
                        </div>

                        <div className="pt-2 pb-4">
                            <button onClick={handleSave}
                                className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors">
                                Save Portal
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showPassModal && (
                <MasterPassphraseModal mode={showPassModal} onClose={() => setShowPassModal(null)} onUnlocked={handleSave} />
            )}
        </div>
    );
}
