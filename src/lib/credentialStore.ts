// Module 3: Credential Store — in-memory data layer for portal records,
// credential health scoring, and insights.
// Uses dependency injection for cross-module integration (Module 1 Family, Module 2 Identity).

export type PortalCategory =
    | "bank" | "tax" | "insurance" | "investment" | "loan"
    | "utility" | "subscription" | "demat" | "other";

// Subcategories per category
export type TaxSubcategory = "income_tax" | "gst" | "mca" | "din" | "other";
export type UtilitySubcategory = "ott" | "electricity" | "gas" | "telecom" | "saas" | "gym" | "other";
export type DematSubcategory = "demat" | "mutual_fund" | "combined";
export type TwoFAType = "otp" | "token" | "biometric" | "none" | "unknown";

export type PasswordStorageMode = "encrypted" | "not_stored";
export type TwoFAStatus = "enabled" | "disabled" | "unknown";

export interface EncryptedSecret {
    version: 1;
    alg: "AES-GCM";
    kdf: "PBKDF2";
    iterations: number;
    saltB64: string;
    ivB64: string;
    cipherTextB64: string;
    createdAt: string;
    updatedAt?: string;
}

export interface PortalRecord {
    id: string;
    platformName: string;
    category: PortalCategory;
    subcategory?: string;              // Tax/Utility/Demat subcategory
    websiteUrl?: string;
    appLink?: string;
    loginId: string;
    registeredMobileId?: string;       // ContactPoint.id from Module 2
    registeredEmailId?: string;        // ContactPoint.id from Module 2
    registeredMobile?: string;         // Plain value from DB
    registeredEmail?: string;          // Plain value from DB
    registrationDate?: string;
    linkedFamilyMemberId?: string;     // FamilyMember.id from Module 1
    linkedId?: string;                 // Cross-module record ID (bank account, policy, loan, tax portal, investment)
    passwordStorageMode: PasswordStorageMode;
    encryptedPassword?: EncryptedSecret;
    twoFAStatus?: TwoFAStatus;
    twoFAType?: TwoFAType;            // OTP / Token / Biometric / None
    notes?: string;
    lastReviewedDate?: string;
    // Bank-specific
    bankName?: string;                 // e.g. "HDFC Bank", "SBI"
    // Tax-specific
    linkedBusinessEntity?: string;     // Business name for GST/MCA
    linkedCA?: string;                 // Chartered Accountant name
    // Insurance-specific
    nomineeAwareness?: boolean;        // Does nominee know about access?
    // Subscription-specific
    renewalDate?: string;              // Next renewal date
    linkedAutoDebitBank?: string;      // Bank account for auto-debit
    // "Other" category-specific
    customServiceName?: string;        // e.g. "Airtel Recharge", "Society Maintenance"
    rechargeDate?: string;             // Next recharge/payment due date
    billingCycle?: "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time" | "custom";
    paymentAssignee?: string;          // Who pays for this? (family member name)
    createdAt: string;
    updatedAt: string;
}

// ——— Category metadata ———
export const PORTAL_CATEGORIES: { id: PortalCategory; label: string; emoji: string }[] = [
    { id: "bank", label: "Bank", emoji: "🏦" },
    { id: "tax", label: "Tax / GST", emoji: "🧾" },
    { id: "insurance", label: "Insurance", emoji: "🛡️" },
    { id: "investment", label: "Investment", emoji: "📈" },
    { id: "loan", label: "Loan", emoji: "💰" },
    { id: "utility", label: "Utility", emoji: "⚡" },
    { id: "subscription", label: "Subscription", emoji: "📦" },
    { id: "demat", label: "Demat / MF", emoji: "📊" },
    { id: "other", label: "Other", emoji: "🗂️" },
];

// ——— Category-specific micro-tutorials ———
export const CATEGORY_TUTORIALS: Record<PortalCategory, { title: string; message: string; youtubeId: string }> = {
    bank: { title: "Bank Portal Security", message: "Your savings, current & joint accounts all have digital access. Securing these portals is the first line of defense.", youtubeId: "7dbmNkrANws" },
    tax: { title: "Tax Compliance Gate", message: "Compliance failure invites penalties. Record your Income Tax, GST, MCA and DIN portals for complete governance.", youtubeId: "7dbmNkrANws" },
    insurance: { title: "Insurance Portal Access", message: "If a policy exists but the portal is inaccessible, claims may be delayed. Map every insurance portal.", youtubeId: "7dbmNkrANws" },
    investment: { title: "Investment Portal Safety", message: "Investments are silent until login fails. Ensure every investment platform is mapped and secured.", youtubeId: "7dbmNkrANws" },
    demat: { title: "Demat & MF Platforms", message: "Investments are silent until login fails. Map your Zerodha, Groww, CAMS and other platforms here.", youtubeId: "7dbmNkrANws" },
    loan: { title: "Loan Portal Tracking", message: "Track your loan portals to ensure timely payments and avoid default penalties.", youtubeId: "7dbmNkrANws" },
    utility: { title: "Utility Portal Management", message: "Small leaks begin with forgotten logins. Organize your electricity, gas, telecom and other utility portals.", youtubeId: "7dbmNkrANws" },
    subscription: { title: "Subscription Tracking", message: "Small leaks begin with forgotten logins. Map every subscription to detect hidden charges and avoid auto-renewals.", youtubeId: "7dbmNkrANws" },
    other: { title: "Portal Access", message: "Every portal you record strengthens your digital governance.", youtubeId: "7dbmNkrANws" },
};

// ——— Subcategory metadata ———
export const TAX_SUBCATEGORIES: { id: TaxSubcategory; label: string }[] = [
    { id: "income_tax", label: "Income Tax" },
    { id: "gst", label: "GST" },
    { id: "mca", label: "MCA" },
    { id: "din", label: "DIN" },
    { id: "other", label: "Other" },
];

export const UTILITY_SUBCATEGORIES: { id: UtilitySubcategory; label: string }[] = [
    { id: "ott", label: "OTT" },
    { id: "electricity", label: "Electricity" },
    { id: "gas", label: "Gas" },
    { id: "telecom", label: "Telecom" },
    { id: "saas", label: "SaaS" },
    { id: "gym", label: "Gym / Fitness" },
    { id: "other", label: "Other" },
];

export const DEMAT_SUBCATEGORIES: { id: DematSubcategory; label: string }[] = [
    { id: "demat", label: "Demat" },
    { id: "mutual_fund", label: "Mutual Fund" },
    { id: "combined", label: "Combined" },
];

export const INDIAN_BANKS = [
    "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra",
    "Bank of Baroda", "Punjab National Bank", "Canara Bank", "Union Bank",
    "Indian Bank", "Bank of India", "Central Bank", "IDBI Bank",
    "Yes Bank", "IndusInd Bank", "Federal Bank", "RBL Bank",
    "IDFC First Bank", "Bandhan Bank", "Other",
];

// ——— Cross-module deps interface ———
export interface CrossModuleDeps {
    contactPointExists: (id: string) => boolean;
    familyMemberExists: (id: string) => boolean;
    now?: Date;
}

// ——— In-memory storage ———
let _portals: PortalRecord[] = [];

// Master passphrase verification blob (encrypted "VERIFY" string)
let _masterVerifyBlob: EncryptedSecret | null = null;
let _vaultUnlockedUntil: number = 0; // timestamp
let _lockDurationMs: number = 5 * 60 * 1000; // 5 min default

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function now(): string {
    return new Date().toISOString();
}

// ——— Per-portal health score ———
function calcPortalHealth(
    portal: PortalRecord,
    deps: CrossModuleDeps
): number {
    const today = deps.now || new Date();
    let score = 0;

    // +20: Has login ID
    if (portal.loginId) score += 20;

    // +20: Has registered contact that exists
    const hasMobile = portal.registeredMobileId && deps.contactPointExists(portal.registeredMobileId);
    const hasEmail = portal.registeredEmailId && deps.contactPointExists(portal.registeredEmailId);
    if (hasMobile || hasEmail) score += 20;

    // +20: Password strategy defined
    if (portal.passwordStorageMode === "not_stored") {
        score += 20;
    } else if (portal.passwordStorageMode === "encrypted" && portal.encryptedPassword) {
        score += 20;
    }

    // +20: Has linked family member (executor)
    if (portal.linkedFamilyMemberId) score += 20;

    // +20: Reviewed within 365 days
    if (portal.lastReviewedDate) {
        const reviewed = new Date(portal.lastReviewedDate);
        const daysSince = (today.getTime() - reviewed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 365) score += 20;
    }

    return Math.min(score, 100);
}

// ——— Emergency readiness per portal ———
function isEmergencyReady(
    portal: PortalRecord,
    deps: CrossModuleDeps
): boolean {
    const hasExecutor = !!portal.linkedFamilyMemberId;
    const hasPasswordStrategy = portal.passwordStorageMode !== undefined;
    const hasContact = (portal.registeredMobileId && deps.contactPointExists(portal.registeredMobileId)) ||
        (portal.registeredEmailId && deps.contactPointExists(portal.registeredEmailId));
    return hasExecutor && hasPasswordStrategy && !!hasContact;
}

export const CredentialStore = {
    // ——— Portals ———
    addPortal(partial: Omit<PortalRecord, "id" | "createdAt" | "updatedAt">): PortalRecord {
        const portal: PortalRecord = {
            id: genId(),
            ...partial,
            createdAt: now(),
            updatedAt: now(),
        };
        _portals.push(portal);

        if (typeof window !== 'undefined') {
            // Map frontend fields to API fields
            const payload: any = {
                portalName: portal.platformName,
                portalType: portal.category,
                portalUrl: portal.websiteUrl,
                loginId: portal.loginId,
                storageMode: portal.passwordStorageMode,
                password: portal.encryptedPassword,
                linkedMemberId: portal.linkedFamilyMemberId,
                registrationDate: portal.registrationDate,
                twoFAStatus: portal.twoFAStatus,
                twoFAType: portal.twoFAType,
                nomineeAwareness: portal.nomineeAwareness,
                // Cross-module links
                linkedId: portal.linkedId,
            };

            // Resolve contact point IDs to actual values for DB storage
            if (portal.registeredMobileId) {
                const { IdentityStore } = require("./identityStore");
                const cp = IdentityStore.getContact(portal.registeredMobileId);
                if (cp) payload.registeredMobile = cp.value;
            }
            if (portal.registeredEmailId) {
                const { IdentityStore } = require("./identityStore");
                const cp = IdentityStore.getContact(portal.registeredEmailId);
                if (cp) payload.registeredEmail = cp.value;
            }

            fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async (res) => {
                if (res.ok) {
                    const saved = await res.json();
                    const realId = saved.data?.id || saved.id;
                    if (realId) {
                        const idx = _portals.findIndex(p => p.id === portal.id);
                        if (idx !== -1) _portals[idx].id = realId;
                    }
                }
            }).catch(e => console.warn("Credential sync err", e));
        }

        return portal;
    },

    updatePortal(id: string, patch: Partial<Omit<PortalRecord, "id" | "createdAt">>): PortalRecord | null {
        const idx = _portals.findIndex(p => p.id === id);
        if (idx === -1) return null;
        _portals[idx] = { ..._portals[idx], ...patch, updatedAt: now() };

        if (typeof window !== 'undefined') {
            const portal = _portals[idx];
            const payload: any = {
                id: portal.id,
                portalName: portal.platformName,
                portalType: portal.category,
                portalUrl: portal.websiteUrl,
                loginId: portal.loginId,
                storageMode: portal.passwordStorageMode,
                password: portal.encryptedPassword,
                linkedMemberId: portal.linkedFamilyMemberId,
                linkedId: portal.linkedId,
                registrationDate: portal.registrationDate,
                twoFAStatus: portal.twoFAStatus,
                twoFAType: portal.twoFAType,
                nomineeAwareness: portal.nomineeAwareness,
            };

            // Resolve contact point IDs
            if (portal.registeredMobileId) {
                const { IdentityStore } = require("./identityStore");
                const cp = IdentityStore.getContact(portal.registeredMobileId);
                if (cp) payload.registeredMobile = cp.value;
            }
            if (portal.registeredEmailId) {
                const { IdentityStore } = require("./identityStore");
                const cp = IdentityStore.getContact(portal.registeredEmailId);
                if (cp) payload.registeredEmail = cp.value;
            }

            fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.warn("Credential sync err", e));
        }

        return _portals[idx];
    },

    deletePortal(id: string): boolean {
        const before = _portals.length;
        _portals = _portals.filter(p => p.id !== id);

        fetch(`/api/credentials/${id}`, { method: 'DELETE' })
            .catch(e => console.warn("Credential delete err", e));

        return _portals.length < before;
    },

    getPortals(): PortalRecord[] { return [..._portals]; },
    getPortalById(id: string): PortalRecord | undefined { return _portals.find(p => p.id === id); },

    // ——— Credential Health Score ———
    getCredentialHealth(deps: CrossModuleDeps): { overall: number; perPortal: Record<string, number> } {
        if (_portals.length === 0) return { overall: 0, perPortal: {} };
        const perPortal: Record<string, number> = {};
        let total = 0;
        for (const portal of _portals) {
            const score = calcPortalHealth(portal, deps);
            perPortal[portal.id] = score;
            total += score;
        }
        return { overall: Math.round(total / _portals.length), perPortal };
    },

    // ——— Emergency Readiness ———
    getEmergencyReadiness(deps: CrossModuleDeps): Record<string, boolean> {
        const result: Record<string, boolean> = {};
        for (const portal of _portals) {
            result[portal.id] = isEmergencyReady(portal, deps);
        }
        return result;
    },

    // ——— Insights ———
    getInsights(deps: CrossModuleDeps): {
        totalPortals: number;
        byCategory: Record<PortalCategory, number>;
        portalsNotReviewed: number;
        portalsWithNoExecutor: number;
        portalsWithUnknown2FA: number;
        insuranceMissingAwareness: number;
    } {
        const today = deps.now || new Date();
        const byCategory: Record<string, number> = {};
        PORTAL_CATEGORIES.forEach(c => { byCategory[c.id] = 0; });

        let notReviewed = 0;
        let noExecutor = 0;
        let unknown2FA = 0;
        let insuranceMissingAwareness = 0;

        for (const portal of _portals) {
            byCategory[portal.category] = (byCategory[portal.category] || 0) + 1;

            if (!portal.linkedFamilyMemberId) {
                noExecutor++;
            }

            if (!portal.lastReviewedDate) {
                notReviewed++;
            } else {
                const daysSince = (today.getTime() - new Date(portal.lastReviewedDate).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince > 365) notReviewed++;
            }

            if (!portal.twoFAStatus || portal.twoFAStatus === "unknown") unknown2FA++;

            if (portal.category === "insurance" && portal.nomineeAwareness === false) {
                insuranceMissingAwareness++;
            }
        }

        return {
            totalPortals: _portals.length,
            byCategory: byCategory as Record<PortalCategory, number>,
            portalsNotReviewed: notReviewed,
            portalsWithNoExecutor: noExecutor,
            portalsWithUnknown2FA: unknown2FA,
            insuranceMissingAwareness,
        };
    },

    // ——— Milestones ———
    getMilestones(): { id: string; label: string; unlocked: boolean }[] {
        const executorCount = _portals.filter(p => !!p.linkedFamilyMemberId).length;
        const health = _portals.length > 0
            ? this.getCredentialHealth({ contactPointExists: () => true, familyMemberExists: () => true })
            : { overall: 0 };

        return [
            { id: "first_portal", label: "Access Logged", unlocked: _portals.length >= 1 },
            { id: "first_access", label: "Shared Authority", unlocked: executorCount >= 1 },
            { id: "five_portals", label: "Structured Keeper", unlocked: _portals.length >= 5 },
            { id: "stable_chamber", label: "Stable Key Chamber", unlocked: health.overall >= 80 },
        ];
    },

    // ——— Vault lock state ———
    getMasterVerifyBlob(): EncryptedSecret | null { return _masterVerifyBlob; },
    setMasterVerifyBlob(blob: EncryptedSecret) { _masterVerifyBlob = blob; },

    isVaultCreated(): boolean { return _masterVerifyBlob !== null; },

    isVaultUnlocked(): boolean { return Date.now() < _vaultUnlockedUntil; },
    unlockVault() { _vaultUnlockedUntil = Date.now() + _lockDurationMs; },
    lockVault() { _vaultUnlockedUntil = 0; },

    getLockDurationMs(): number { return _lockDurationMs; },
    setLockDurationMs(ms: number) { _lockDurationMs = ms; },

    // ——— Reset vault (deletes all encrypted passwords) ———
    resetVault() {
        _masterVerifyBlob = null;
        _vaultUnlockedUntil = 0;
        for (const portal of _portals) {
            if (portal.passwordStorageMode === "encrypted") {
                portal.encryptedPassword = undefined;
                portal.passwordStorageMode = "not_stored";
            }
        }
    },

    // ——— Mask login ID ———
    maskLoginId(loginId: string): string {
        if (!loginId || loginId.length < 6) return loginId;
        // If email-like, mask middle
        if (loginId.includes("@")) {
            const [user, domain] = loginId.split("@");
            if (user.length <= 4) return user + "****@" + domain;
            return user.slice(0, 4) + "****@" + domain;
        }
        return loginId.slice(0, 4) + "****" + loginId.slice(-2);
    },

    // ——— Full reset ———
    reset() {
        _portals = [];
        _masterVerifyBlob = null;
        _vaultUnlockedUntil = 0;
    },

    async hydrate() {
        if (typeof window === 'undefined') return;
        try {
            // Fetch portals
            const res = await fetch('/api/credentials', { cache: 'no-store' });
            if (!res.ok) return;
            const json = await res.json();
            const dbPortals = json.data || json;
            if (Array.isArray(dbPortals)) {
                    _portals = dbPortals.map((d: any) => ({
                    id: d.id,
                    platformName: d.portalName,
                    category: d.portalType,
                    websiteUrl: d.portalUrl,
                    loginId: d.loginId,
                    passwordStorageMode: d.storageMode,
                    encryptedPassword: d.password,
                    linkedFamilyMemberId: d.linkedMemberId,
                        registeredMobile: d.registeredMobile,
                        registeredEmail: d.registeredEmail,
                    registrationDate: d.registrationDate ? String(d.registrationDate).split('T')[0] : undefined,
                    lastReviewedDate: d.lastReviewedDate ? String(d.lastReviewedDate) : undefined,
                    renewalDate: d.renewalDate ? String(d.renewalDate).split('T')[0] : undefined,
                        // Cross-module links
                        linkedId: d.linkedId || d.linked_id || undefined,
                    createdAt: d.createdAt ? String(d.createdAt) : now(),
                    updatedAt: d.updatedAt ? String(d.updatedAt) : now(),
                    twoFAStatus: d.twoFAStatus || "unknown",
                    twoFAType: d.twoFAType || "none",
                    nomineeAwareness: d.nomineeAwareness !== null && d.nomineeAwareness !== undefined ? d.nomineeAwareness : true,
                })) as PortalRecord[];
            }
        } catch (err) {
            console.warn("Failed to hydrate credentials", err);
        }
    },
};
