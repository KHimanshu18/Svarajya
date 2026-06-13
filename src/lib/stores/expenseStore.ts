// Module 5: Expense Store — Vyaya Mandal
// In-memory data layer for expense entries, categories, subscriptions, budgets, and analytics.
// Follows same pattern as incomeStore.ts.

import { IncomeStore, formatRupee } from "./incomeStore";
export { formatRupee };

// ——— Types ———

export type PaymentMode = "cash" | "upi" | "debit_card" | "credit_card" | "bank_transfer" | "wallet";
export type ExpenseFrequency = "monthly" | "quarterly" | "annual";

export const PAYMENT_MODES: { id: PaymentMode; label: string; emoji: string }[] = [
    { id: "cash", label: "Cash", emoji: "💵" },
    { id: "upi", label: "UPI", emoji: "📱" },
    { id: "debit_card", label: "Debit Card", emoji: "💳" },
    { id: "credit_card", label: "Credit Card", emoji: "💳" },
    { id: "bank_transfer", label: "Bank Transfer", emoji: "🏦" },
    { id: "wallet", label: "Wallet", emoji: "👛" },
];

// ——— Preset Expense Categories ———

export interface ExpenseCategoryDef {
    id: string;
    name: string;
    emoji: string;
    active: boolean;
    budgetAmount: number;        // 0 = no budget set
    alertThreshold: number;      // 0.0–1.0, default 0.8
    isCustom: boolean;
}

export const PRESET_CATEGORIES: Omit<ExpenseCategoryDef, "active" | "budgetAmount" | "alertThreshold" | "isCustom">[] = [
    { id: "household", name: "Household", emoji: "🏠" },
    { id: "food", name: "Food & Dining", emoji: "🍽️" },
    { id: "rent_emi", name: "Rent / EMI", emoji: "🏢" },
    { id: "utilities", name: "Utilities", emoji: "💡" },
    { id: "education", name: "Education", emoji: "📚" },
    { id: "medical", name: "Medical", emoji: "🏥" },
    { id: "travel", name: "Travel", emoji: "🚗" },
    { id: "insurance", name: "Insurance Premium", emoji: "🛡️" },
    { id: "entertainment", name: "Entertainment", emoji: "🎬" },
    { id: "subscriptions", name: "Subscriptions", emoji: "📦" },
    { id: "miscellaneous", name: "Miscellaneous", emoji: "📋" },
    { id: "other", name: "Other", emoji: "📎" },
];

// ——— Expense Entry ———

export interface ExpenseEntry {
    id: string;
    date: string;                // YYYY-MM-DD
    amount: number;
    categoryId: string;          // links to ExpenseCategoryDef.id
    paymentMode: PaymentMode;
    recurring: boolean;
    recurringFrequency?: ExpenseFrequency;
    description?: string;
    linkedFamilyMemberId?: string;
    paidFromAccountId?: string;  // Module 6 link
    createdAt: number;
    updatedAt: number;
}

// ——— Subscription ———

export interface Subscription {
    id: string;
    name: string;
    categoryId: string;
    amount: number;
    renewalDate?: string;         // YYYY-MM-DD
    autoDebitBank?: string;
    lastUsedDate?: string;        // YYYY-MM-DD
    createdAt: number;
    updatedAt: number;
}

// ——— In-memory storage ———

let _categories: ExpenseCategoryDef[] = PRESET_CATEGORIES.map(c => ({
    ...c,
    active: true,
    budgetAmount: 0,
    alertThreshold: 0.8,
    isCustom: false,
}));

let _entries: ExpenseEntry[] = [];
let _subscriptions: Subscription[] = [];

function genId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ——— Helpers ———

function getCurrentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getEntryMonth(entry: ExpenseEntry): string {
    return entry.date.substring(0, 7); // YYYY-MM
}

function toMonthlyAmount(entry: ExpenseEntry): number {
    if (!entry.recurring) return entry.amount;
    switch (entry.recurringFrequency) {
        case "monthly": return entry.amount;
        case "quarterly": return entry.amount / 3;
        case "annual": return entry.amount / 12;
        default: return entry.amount;
    }
}

// ——— Store ———

export const ExpenseStore = {

    // ——— Categories ———
    getCategories(): ExpenseCategoryDef[] {
        return [..._categories];
    },

    getActiveCategories(): ExpenseCategoryDef[] {
        return _categories.filter(c => c.active);
    },

    getCategory(id: string): ExpenseCategoryDef | undefined {
        return _categories.find(c => c.id === id);
    },

    toggleCategory(id: string): void {
        const cat = _categories.find(c => c.id === id);
        if (cat) cat.active = !cat.active;
    },

    setCategoryBudget(id: string, amount: number): void {
        const cat = _categories.find(c => c.id === id);
        if (cat) cat.budgetAmount = Math.max(0, amount);
    },

    setCategoryThreshold(id: string, threshold: number): void {
        const cat = _categories.find(c => c.id === id);
        if (cat) cat.alertThreshold = Math.max(0, Math.min(1, threshold));
    },

    addCustomCategory(name: string, emoji: string = "📌"): ExpenseCategoryDef {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const cat: ExpenseCategoryDef = {
            id, name, emoji, active: true, budgetAmount: 0, alertThreshold: 0.8, isCustom: true,
        };
        _categories.push(cat);
        return cat;
    },

    deleteCustomCategory(id: string): boolean {
        const idx = _categories.findIndex(c => c.id === id && c.isCustom);
        if (idx === -1) return false;
        _categories.splice(idx, 1);
        return true;
    },

    // ——— Expense Entries ———
    addEntry(partial: Omit<ExpenseEntry, "id" | "createdAt" | "updatedAt">): ExpenseEntry {
        const entry: ExpenseEntry = {
            ...partial,
            id: genId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        _entries.push(entry);

        if (typeof window !== 'undefined') {
            const { id: _cid, ...rest } = entry;
            fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: rest.amount,
                    date: rest.date,
                    category: rest.categoryId,
                    mode: rest.paymentMode,
                    isRecurring: rest.recurring,
                    frequency: rest.recurringFrequency,
                    description: rest.description,
                    linkedFamilyMemberId: rest.linkedFamilyMemberId,
                    accountId: rest.paidFromAccountId,
                })
            }).then(async (res) => {
                if (res.ok) {
                    const saved = await res.json();
                    const idx = _entries.findIndex(e => e.id === entry.id);
                    if (idx !== -1) _entries[idx].id = saved.id;
                }
            }).catch(e => console.warn('Expense sync err', e));
        }

        return entry;
    },

    updateEntry(id: string, patch: Partial<Omit<ExpenseEntry, "id" | "createdAt">>): ExpenseEntry | null {
        const entry = _entries.find(e => e.id === id);
        if (!entry) return null;
        Object.assign(entry, patch, { updatedAt: Date.now() });

        if (typeof window !== 'undefined' && !entry.id.startsWith('exp-')) {
            fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: entry.id,
                    amount: entry.amount,
                    date: entry.date,
                    category: entry.categoryId,
                    mode: entry.paymentMode,
                    isRecurring: entry.recurring,
                    frequency: entry.recurringFrequency,
                    description: entry.description,
                    linkedFamilyMemberId: entry.linkedFamilyMemberId,
                    accountId: entry.paidFromAccountId,
                })
            }).catch(e => console.warn('Expense sync err', e));
        }

        return entry;
    },

    deleteEntry(id: string): boolean {
        const idx = _entries.findIndex(e => e.id === id);
        if (idx === -1) return false;
        _entries.splice(idx, 1);
        return true;
    },

    getEntries(): ExpenseEntry[] {
        return [..._entries].sort((a, b) => b.createdAt - a.createdAt);
    },

    getEntry(id: string): ExpenseEntry | undefined {
        return _entries.find(e => e.id === id);
    },

    getEntryCount(): number {
        return _entries.length;
    },

    // ——— Subscriptions ———
    addSubscription(partial: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Subscription {
        const sub: Subscription = {
            ...partial,
            id: genId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        _subscriptions.push(sub);
        return sub;
    },

    updateSubscription(id: string, patch: Partial<Omit<Subscription, "id" | "createdAt">>): Subscription | null {
        const sub = _subscriptions.find(s => s.id === id);
        if (!sub) return null;
        Object.assign(sub, patch, { updatedAt: Date.now() });
        return sub;
    },

    deleteSubscription(id: string): boolean {
        const idx = _subscriptions.findIndex(s => s.id === id);
        if (idx === -1) return false;
        _subscriptions.splice(idx, 1);
        return true;
    },

    getSubscriptions(): Subscription[] {
        return [..._subscriptions].sort((a, b) => b.createdAt - a.createdAt);
    },

    getDormantSubscriptions(): Subscription[] {
        const now = Date.now();
        const d90 = 90 * 24 * 60 * 60 * 1000;
        return _subscriptions.filter(s => {
            if (!s.lastUsedDate) return true; // never used = dormant
            return (now - new Date(s.lastUsedDate).getTime()) > d90;
        });
    },

    // ——— Derived Calculations ———

    /** Monthly total expense (current month entries + recurring prorated) */
    getMonthlyTotal(): number {
        const month = getCurrentMonth();
        let total = 0;
        for (const e of _entries) {
            if (e.recurring) {
                total += toMonthlyAmount(e);
            } else if (getEntryMonth(e) === month) {
                total += e.amount;
            }
        }
        return Math.round(total);
    },

    /** Category-wise breakdown for current month */
    getCategoryBreakdown(): { categoryId: string; name: string; emoji: string; amount: number; percentage: number }[] {
        const month = getCurrentMonth();
        const totals: Record<string, number> = {};

        for (const e of _entries) {
            if (e.recurring) {
                totals[e.categoryId] = (totals[e.categoryId] || 0) + toMonthlyAmount(e);
            } else if (getEntryMonth(e) === month) {
                totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
            }
        }

        const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
        return Object.entries(totals)
            .map(([catId, amount]) => {
                const cat = _categories.find(c => c.id === catId);
                return {
                    categoryId: catId,
                    name: cat?.name || catId,
                    emoji: cat?.emoji || "📎",
                    amount: Math.round(amount),
                    percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
                };
            })
            .sort((a, b) => b.amount - a.amount);
    },

    /** Expense-to-income ratio. Returns null if no income data (graceful degradation). */
    getExpenseToIncomeRatio(): { ratio: number; label: string; color: string } | null {
        const income = IncomeStore.getMonthlyNetIncome();
        if (income <= 0) return null; // No income data — degrade gracefully
        const expenses = this.getMonthlyTotal();
        const ratio = Math.round((expenses / income) * 100);
        const label = ratio > 80 ? "High" : ratio > 50 ? "Moderate" : "Low";
        const color = ratio > 80 ? "red" : ratio > 50 ? "amber" : "emerald";
        return { ratio, label, color };
    },

    /** Recurring vs one-time ratio */
    getRecurringVsOneTime(): { recurringPct: number; oneTimePct: number; recurringTotal: number; oneTimeTotal: number } {
        const month = getCurrentMonth();
        let recurring = 0;
        let oneTime = 0;

        for (const e of _entries) {
            if (e.recurring) {
                recurring += toMonthlyAmount(e);
            } else if (getEntryMonth(e) === month) {
                oneTime += e.amount;
            }
        }

        const total = recurring + oneTime;
        return {
            recurringTotal: Math.round(recurring),
            oneTimeTotal: Math.round(oneTime),
            recurringPct: total > 0 ? Math.round((recurring / total) * 100) : 0,
            oneTimePct: total > 0 ? Math.round((oneTime / total) * 100) : 0,
        };
    },

    /** Budget adherence per category */
    getBudgetAdherence(): {
        categoryId: string; name: string; emoji: string;
        budget: number; spent: number; adherencePct: number;
        status: "safe" | "near_limit" | "overspent";
    }[] {
        const breakdown = this.getCategoryBreakdown();
        const results: ReturnType<typeof ExpenseStore.getBudgetAdherence> = [];

        for (const cat of _categories) {
            if (!cat.active || cat.budgetAmount <= 0) continue;
            const catSpend = breakdown.find(b => b.categoryId === cat.id);
            const spent = catSpend?.amount || 0;
            const adherencePct = Math.round((spent / cat.budgetAmount) * 100);
            const status = adherencePct >= 100 ? "overspent" : adherencePct >= (cat.alertThreshold * 100) ? "near_limit" : "safe";
            results.push({
                categoryId: cat.id, name: cat.name, emoji: cat.emoji,
                budget: cat.budgetAmount, spent, adherencePct, status,
            });
        }

        return results.sort((a, b) => b.adherencePct - a.adherencePct);
    },

    /** Budget discipline score (0–100) */
    getBudgetDisciplineScore(): number {
        const adherence = this.getBudgetAdherence();
        if (adherence.length === 0) return 0;

        let score = 0;
        for (const a of adherence) {
            if (a.status === "safe") score += 100;
            else if (a.status === "near_limit") score += 60;
            else score += 0; // overspent
        }
        return Math.round(score / adherence.length);
    },

    /** Leakage index (0–100): higher = more leakage risk */
    getLeakageIndex(): number {
        const dormant = this.getDormantSubscriptions();
        const total = _subscriptions.length;
        if (total === 0) return 0;

        const dormantRatio = dormant.length / total;
        const dormantAmount = dormant.reduce((s, d) => s + d.amount, 0);
        const totalSubAmount = _subscriptions.reduce((s, d) => s + d.amount, 0);
        const amountRatio = totalSubAmount > 0 ? dormantAmount / totalSubAmount : 0;

        // Weighted: 60% count, 40% amount
        return Math.min(100, Math.round((dormantRatio * 60 + amountRatio * 40)));
    },

    /** Monthly subscription total */
    getMonthlySubscriptionTotal(): number {
        return _subscriptions.reduce((s, sub) => s + sub.amount, 0);
    },

    /** Annual leakage estimate (dormant subscriptions × 12) */
    getAnnualLeakageEstimate(): number {
        return this.getDormantSubscriptions().reduce((s, d) => s + d.amount, 0) * 12;
    },

    // ——— Maturity (0–4) ———
    getMaturity(): { level: number; milestones: { id: string; label: string; description: string; unlocked: boolean }[] } {
        const entryCount = _entries.length;
        const budgetsSet = _categories.filter(c => c.budgetAmount > 0).length;
        const discipline = this.getBudgetDisciplineScore();
        const leakage = this.getLeakageIndex();

        const milestones = [
            { id: "initiated", label: "Vyaya Initiated", description: "Add at least 1 expense", unlocked: entryCount >= 1 },
            { id: "structured", label: "Vyaya Structured", description: "5+ expenses and 1+ budget set", unlocked: entryCount >= 5 && budgetsSet >= 1 },
            { id: "disciplined", label: "Vyaya Disciplined", description: "Budget discipline score ≥ 70", unlocked: discipline >= 70 },
            { id: "leak_proof", label: "Leak-Proof", description: "Leakage index ≤ 20 and 3+ budgets", unlocked: leakage <= 20 && budgetsSet >= 3 },
        ];

        return { level: milestones.filter(m => m.unlocked).length, milestones };
    },

    // ——— Quick Insights ———
    getInsights(): string[] {
        if (_entries.length === 0) return [];
        const insights: string[] = [];
        const breakdown = this.getCategoryBreakdown();
        const recurring = this.getRecurringVsOneTime();
        const dormant = this.getDormantSubscriptions();

        if (breakdown.length > 0) {
            insights.push(`Highest spend: ${breakdown[0].name} (${breakdown[0].percentage}%)`);
        }
        if (recurring.recurringTotal > 0) {
            const recurringCount = _entries.filter(e => e.recurring).length;
            insights.push(`${recurringCount} recurring expense${recurringCount > 1 ? "s" : ""} detected`);
        }
        if (dormant.length > 0) {
            insights.push(`${dormant.length} possible subscription leak${dormant.length > 1 ? "s" : ""}`);
        }

        return insights;
    },

    // ——— Alerts ———
    getAlerts(): { type: "warning" | "danger"; message: string }[] {
        const alerts: { type: "warning" | "danger"; message: string }[] = [];

        const ratio = this.getExpenseToIncomeRatio();
        if (ratio && ratio.ratio > 80) {
            alerts.push({ type: "danger", message: "Low surplus risk — expenses exceed 80% of income." });
        }

        const recurring = this.getRecurringVsOneTime();
        if (recurring.recurringPct > 60) {
            alerts.push({ type: "warning", message: "Rigid cost structure — recurring expenses exceed 60%." });
        }

        const budgets = this.getBudgetAdherence();
        const overspent = budgets.filter(b => b.status === "overspent");
        if (overspent.length > 0) {
            alerts.push({ type: "warning", message: `Budget exceeded in: ${overspent.map(o => o.name).join(", ")}` });
        }

        const dormant = this.getDormantSubscriptions();
        if (dormant.length > 0) {
            alerts.push({ type: "warning", message: `${dormant.length} subscription${dormant.length > 1 ? "s" : ""} unused for 90+ days.` });
        }

        return alerts;
    },

    // ——— Dashboard integration ———
    getVyayaCompletion(): number {
        const maturity = this.getMaturity();
        return Math.round((maturity.level / 4) * 100);
    },

    // ——— Reset ———
    clear(): void {
        _categories = PRESET_CATEGORIES.map(c => ({
            ...c, active: true, budgetAmount: 0, alertThreshold: 0.8, isCustom: false,
        }));
        _entries = [];
        _subscriptions = [];
    },

    async hydrate() {
        if (typeof window === 'undefined') return;
        try {
            const res = await fetch('/api/expenses', { cache: 'no-store' });
            if (!res.ok) return;
            const dbEntries = await res.json();
            if (!Array.isArray(dbEntries) || dbEntries.length === 0) return;
            _entries = dbEntries.map((d: Record<string, unknown>) => ({
                id: String(d.id),
                date: d.date ? String(d.date).split('T')[0] : new Date().toISOString().split('T')[0],
                amount: Number(d.amount) || 0,
                categoryId: String(d.category || 'other'),
                paymentMode: String(d.mode || 'upi') as PaymentMode,
                recurring: !!d.isRecurring,
                recurringFrequency: d.frequency ? String(d.frequency) as ExpenseFrequency : undefined,
                description: d.description ? String(d.description) : undefined,
                linkedFamilyMemberId: d.linkedFamilyMemberId ? String(d.linkedFamilyMemberId) : undefined,
                paidFromAccountId: d.accountId ? String(d.accountId) : undefined,
                createdAt: d.createdAt ? new Date(d.createdAt as string).getTime() : Date.now(),
                updatedAt: d.createdAt ? new Date(d.createdAt as string).getTime() : Date.now(),
            })) as ExpenseEntry[];
        } catch (err) {
            console.warn('Failed to hydrate expenses', err);
        }
    },
};
