// Module 2: Identity Store — in-memory data layer for identity documents, contacts, and links.
// Mirrors OnboardingStore pattern. Will be replaced by Supabase in production.

import { OnboardingStore } from "./onboardingStore";
import { validateControlledEmail, validateIndianMobile } from "./contactValidation";

export type DocType = "aadhaar" | "pan" | "passport" | "dl" | "voter" | "other";

export interface ContactPoint {
    id: string;
    type: "mobile" | "email";
    value: string;
    label?: string; // e.g. "Primary", "Work"
    createdAt: number;
}

export interface IdentityDoc {
    id: string;
    docType: DocType;
    docNumber: string;           // raw
    normalizedDocNumber: string; // uppercase, stripped
    nameOnDoc: string;
    customDocName?: string;      // Used when docType is "other"
    // Stage 2 (deep mode) fields — all optional
    dobOnDoc?: string;
    expiryDate?: string;
    issueDate?: string;
    placeOfIssue?: string;
    linkedMobileId?: string;     // ContactPoint ID
    linkedEmailId?: string;      // ContactPoint ID
    notes?: string;
    vaultFileId?: string;        // Vault file reference
    storageMode: "local" | "folder" | "cloud";
    // Verification
    verificationStatus: "not_verified" | "self" | "govt" | "ca" | "agent" | "family";
    verifiedDate?: string;
    verifiedBy?: string;
    // Meta
    createdAt: number;
    updatedAt: number;
}

export interface LinkMapping {
    id: string;
    docId: string;
    serviceType: "bank" | "tax" | "insurance" | "investment" | "utility" | "other";
    serviceName: string;
    contactPointId: string; // which mobile/email
    confidence: "low" | "medium" | "confirmed";
    createdAt: number;
}

export interface RenewalReminder {
    id: string;
    docId: string;
    daysBefore: number; // 90, 60, 30, 7, or custom
    createdAt: number;
}

// ——————— Normalize ———————
/**
 * INTERN NOTE: Crucial for "Local-First" data integrity. 
 * Prevents "1234 5678" and "12345678" from being treated as different records.
 */
function normalizeDocNumber(raw: string): string {
    return raw.replace(/[\s\-\.]/g, "").toUpperCase();
}

// Docs that are typically linked to services (bank, tax, insurance, etc.)
const LINKABLE_DOCS: DocType[] = ["aadhaar", "pan", "passport"];

export function isLinkableDoc(docType: DocType): boolean {
    return LINKABLE_DOCS.includes(docType);
}

// ——————— Seal Strength ———————
/**
 * DYNAMIC SEAL STRENGTH (INTERNSHIP TASK)
 * For linkable docs (Aadhaar/PAN/Passport): 5 dimensions × 20 = 100
 * For non-linkable docs (DL/Voter/Other): 4 dimensions × 25 = 100 (no link penalty)
 */
export function calcSealStrength(doc: IdentityDoc, links: LinkMapping[]): number {
    const linkable = isLinkableDoc(doc.docType);
    const weight = linkable ? 20 : 25; 
    let score = 0;

    if (doc.docNumber) score += weight;                                   // basic doc added
    if (doc.vaultFileId) score += weight;                                 // file uploaded
    if (doc.expiryDate || doc.issueDate || doc.placeOfIssue) score += weight; // deep details
    
    if (linkable) {
        const docLinks = links.filter(l => l.docId === doc.id);
        if (docLinks.length > 0) score += weight;                         // at least 1 link
    }
    
    if (doc.verificationStatus !== "not_verified") score += weight;       // verified

    return Math.min(score, 100);
}

// ——————— Store ———————
let _docs: IdentityDoc[] = [];
let _contacts: ContactPoint[] = [];
let _links: LinkMapping[] = [];
let _reminders: RenewalReminder[] = [];
let _storageMode: "local" | "folder" | "cloud" = "local";
let _annualKycDate: string | null = null;

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const IdentityStore = {
    // ——— Docs ———
    addDoc(partial: Omit<IdentityDoc, "id" | "normalizedDocNumber" | "createdAt" | "updatedAt" | "verificationStatus" | "storageMode">): IdentityDoc {
        const norm = normalizeDocNumber(partial.docNumber);
        
        // Ensure no duplicate using doc type AND number
        const existing = _docs.find(d => d.docType === partial.docType && d.normalizedDocNumber === norm);
        if (existing) throw new Error("DUPLICATE");

        const doc: IdentityDoc = {
            id: genId(),
            ...partial,
            normalizedDocNumber: norm,
            storageMode: "local",
            verificationStatus: "self",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        _docs.push(doc);

        // Sync to API — omit client-generated id so API creates new record
        if (typeof window !== 'undefined') {
            const { id: _cid, ...payload } = doc;
            fetch('/api/identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async (res) => {
                if (res.ok) {
                    const saved = await res.json();
                    const idx = _docs.findIndex(d => d.id === doc.id);
                    if (idx !== -1) _docs[idx].id = saved.id;
                }
            }).catch(e => console.warn("Identity sync err", e));
        }

        return doc;
    },

    updateDoc(id: string, partial: Partial<IdentityDoc>): IdentityDoc | null {
        const idx = _docs.findIndex(d => d.id === id);
        if (idx === -1) return null;
        _docs[idx] = { ..._docs[idx], ...partial, updatedAt: Date.now() };
        if (partial.docNumber) {
            _docs[idx].normalizedDocNumber = normalizeDocNumber(partial.docNumber);
        }

        if (typeof window !== 'undefined') {
            fetch('/api/identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(_docs[idx])
            }).catch(e => console.warn("Identity sync err", e));
        }

        return _docs[idx];
    },

    deleteDoc(id: string): void {
        _docs = _docs.filter(d => d.id !== id);
        _links = _links.filter(l => l.docId !== id);
        _reminders = _reminders.filter(r => r.docId !== id);
    },

    getDocs(): IdentityDoc[] { return [..._docs]; },
    getDoc(id: string): IdentityDoc | undefined { return _docs.find(d => d.id === id); },
    getDocsByType(type: DocType): IdentityDoc[] { return _docs.filter(d => d.docType === type); },

    // ——— Contacts ———
    addContact(type: "mobile" | "email", value: string, label?: string): ContactPoint {
        const trimmed = value.trim();
        const normalizedValue = type === "mobile"
            ? validateIndianMobile(trimmed)
            : validateControlledEmail(trimmed);

        if (!normalizedValue.valid) {
            throw new Error(normalizedValue.message || "Invalid contact value");
        }

        const cp: ContactPoint = { id: genId(), type, value: normalizedValue.normalized, label, createdAt: Date.now() };
        _contacts.push(cp);
        return cp;
    },
    getContacts(): ContactPoint[] { return [..._contacts]; },
    getContact(id: string): ContactPoint | undefined { return _contacts.find(c => c.id === id); },

    // ——— Links ———
    addLink(partial: Omit<LinkMapping, "id" | "createdAt">): LinkMapping {
        const link: LinkMapping = { id: genId(), ...partial, createdAt: Date.now() };
        _links.push(link);
        return link;
    },
    getLinks(): LinkMapping[] { return [..._links]; },
    getLinksForDoc(docId: string): LinkMapping[] { return _links.filter(l => l.docId === docId); },
    deleteLink(id: string): void { _links = _links.filter(l => l.id !== id); },

    // ——— Reminders ———
    addReminder(docId: string, daysBefore: number): RenewalReminder {
        const r: RenewalReminder = { id: genId(), docId, daysBefore, createdAt: Date.now() };
        _reminders.push(r);
        return r;
    },
    getReminders(): RenewalReminder[] { return [..._reminders]; },

    // ——— Expiry helpers ———
    getExpiringDocs(withinDays: number): IdentityDoc[] {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + withinDays);
        return _docs.filter(d => {
            if (!d.expiryDate) return false;
            return new Date(d.expiryDate) <= cutoff;
        });
    },

    // ——— Coverage ———
    getCoverage(): { filled: number; total: number } {
        const types: DocType[] = ["aadhaar", "pan", "passport", "dl", "voter", "other"];
        const filled = types.filter(t => _docs.some(d => d.docType === t)).length;
        return { filled, total: 6 };
    },

    // ——— Identity Confidence ———
    getConfidence(): number {
        if (_docs.length === 0) return 0;
        const total = _docs.reduce((sum, doc) => sum + calcSealStrength(doc, _links), 0);
        return Math.round(total / _docs.length);
    },

    // ——— Settings ———
    getStorageMode() { return _storageMode; },
    setStorageMode(mode: "local" | "folder" | "cloud") { _storageMode = mode; },
    getAnnualKycDate() { return _annualKycDate; },
    setAnnualKycDate(date: string | null) { _annualKycDate = date; },

    // ——— Mask helper ———
    /**
     * UPDATED: Aadhaar/PAN specific masking for Indian Fintech compliance.
     * Shows last 4 for Aadhaar and standard pattern for PAN.
     */
    maskDocNumber(raw: string, docType: DocType): string {
        if (!raw || raw.length < 4) return raw;
        const clean = raw.replace(/\s/g, "");

        if (docType === "aadhaar") {
            return "•••• •••• " + clean.slice(-4); // Keep 4 dots for group alignment
        }
        if (docType === "pan") {
            return clean.slice(0, 5) + "••••" + clean.slice(-1);
        }
        return raw.slice(0, 2) + "•".repeat(raw.length - 4) + raw.slice(-2);
    },

    // ——— Identity Level ———
    getLevel(): string {
        const conf = this.getConfidence();
        if (conf >= 80) return "Sovereign Identity";
        if (conf >= 60) return "Strong Recognition";
        if (conf >= 40) return "Growing Identity";
        if (conf >= 20) return "Basic Recognition";
        return "Unrecognised";
    },

    // ——— Seed from onboarding ———
    seedFromOnboarding() {
        const data = OnboardingStore.get();
        // Only seed once — check if contacts already exist from onboarding
        const existing = _contacts.filter(c => c.label === "Primary");
        if (existing.length > 0) return; // already seeded
        if (data.mobile) {
            try {
                this.addContact("mobile", data.mobile, "Primary");
            } catch {
                // Ignore invalid legacy values during bootstrap.
            }
        }
        if (data.email) {
            try {
                this.addContact("email", data.email, "Primary");
            } catch {
                // Ignore invalid legacy values during bootstrap.
            }
        }
    },

    async hydrate() {
        if (typeof window === 'undefined') return;
        try {
            const res = await fetch('/api/identity', { cache: 'no-store' });
            if (!res.ok) return;
            const result = await res.json();
            const dbDocs = result.data || result;
            if (!Array.isArray(dbDocs) || dbDocs.length === 0) return;
            _docs = dbDocs.map((d: Record<string, unknown>) => ({
                ...d,
                dobOnDoc: d.dobOnDoc ? String(d.dobOnDoc).split('T')[0] : undefined,
                expiryDate: d.expiryDate ? String(d.expiryDate).split('T')[0] : undefined,
                issueDate: d.issueDate ? String(d.issueDate).split('T')[0] : undefined,
                createdAt: d.createdAt ? new Date(d.createdAt as string).getTime() : Date.now(),
                updatedAt: d.updatedAt ? new Date(d.updatedAt as string).getTime() : Date.now(),
            })) as IdentityDoc[];
        } catch (err) {
            console.warn("Failed to hydrate identity", err);
        }
    },

    // ——— Reset ———
    reset() {
        _docs = [];
        _contacts = [];
        _links = [];
        _reminders = [];
    },
};
