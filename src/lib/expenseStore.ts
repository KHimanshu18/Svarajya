// Module 5: Expense Store — Vyaya Mandal
// In-memory data layer for expense entries, categories, subscriptions, budgets, and analytics.
// Persisted to Prisma via API.

import { IncomeStore, formatRupee } from "./incomeStore";
export { formatRupee };

// ——— Types ———

export type PaymentMode = "CASH" | "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "WALLET";
export type ExpenseFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

export const PAYMENT_MODES: { id: PaymentMode; label: string; emoji: string }[] = [
    { id: "CASH", label: "Cash", emoji: "💵" },
    { id: "UPI", label: "UPI", emoji: "📱" },
    { id: "DEBIT_CARD", label: "Debit Card", emoji: "💳" },
    { id: "CREDIT_CARD", label: "Credit Card", emoji: "💳" },
    { id: "BANK_TRANSFER", label: "Bank Transfer", emoji: "🏦" },
    { id: "WALLET", label: "Wallet", emoji: "👛" },
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
    { id: "other", name: "Other", emoji: "💭" },
];

// ——— Expense Entry ———

export interface ExpenseEntry {
    id: string;
    date: string;                // YYYY-MM-DD
    amount: number;
    category: string;            // matches Prisma 'category'
    mode: PaymentMode;           // matches Prisma 'mode'
    recurring: boolean;
    frequency?: ExpenseFrequency; // matches Prisma 'frequency'
    description?: string;
    linkedFamilyMemberId?: string;
    accountId?: string;          // matches Prisma 'accountId'
    createdAt: number;
    updatedAt: number;
}

// ——— Subscription ———

export interface Subscription {
    id: string;
    name: string;
    category: string;
    amount: number;
    renewalDate: string;         // YYYY-MM-DD
    lastUsedDate?: string;        // YYYY-MM-DD
    isActive: boolean;
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
let _budgetTotal: number = 0;
let _categoryBudgets: Record<string, number> = {};

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
    switch (entry.frequency) {
        case "MONTHLY": return entry.amount;
        case "QUARTERLY": return entry.amount / 3;
        case "ANNUAL": return entry.amount / 12;
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
        if (cat) {
            cat.budgetAmount = Math.max(0, amount);
            _categoryBudgets[id] = cat.budgetAmount;
            this.syncBudget();
        }
    },

    setCategoryThreshold(id: string, threshold: number): void {
        const cat = _categories.find(c => c.id === id);
        if (cat) cat.alertThreshold = Math.max(0, Math.min(1, threshold));
    },

    async addCustomCategory(name: string, emoji: string = "📌"): Promise<ExpenseCategoryDef> {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const cat: ExpenseCategoryDef = {
            id, name, emoji, active: true, budgetAmount: 0, alertThreshold: 0.8, isCustom: true,
        };
        _categories.push(cat);

        if (typeof window !== 'undefined') {
            fetch('/api/expense-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, emoji })
            }).then(async res => {
                if (res.ok) {
                    const json = await res.json();
                    const idx = _categories.findIndex(c => c.id === id);
                    if (idx !== -1) _categories[idx].id = json.data.id;
                }
            });
        }
        return cat;
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
            fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: entry.amount,
                    date: entry.date,
                    category: entry.category,
                    mode: entry.mode,
                    isRecurring: entry.recurring,
                    frequency: entry.frequency,
                    description: entry.description,
                    accountId: entry.accountId,
                    linkedFamilyMemberId: entry.linkedFamilyMemberId,
                })
            }).then(async (res) => {
                if (res.ok) {
                    const json = await res.json();
                    const idx = _entries.findIndex(e => e.id === entry.id);
                    if (idx !== -1) _entries[idx].id = json.data.id;
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
            fetch(`/api/expenses/${entry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: entry.amount,
                    date: entry.date,
                    category: entry.category,
                    mode: entry.mode,
                    isRecurring: entry.recurring,
                    frequency: entry.frequency,
                    description: entry.description,
                    accountId: entry.accountId,
                    linkedFamilyMemberId: entry.linkedFamilyMemberId,
                })
            }).catch(e => console.warn('Expense update sync err', e));
        }

        return entry;
    },

    deleteEntry(id: string): boolean {
        const idx = _entries.findIndex(e => e.id === id);
        if (idx === -1) return false;
        const entry = _entries[idx];
        _entries.splice(idx, 1);

        if (typeof window !== 'undefined' && !entry.id.startsWith('exp-')) {
            fetch(`/api/expenses/${entry.id}`, { method: 'DELETE' })
                .catch(e => console.warn('Expense delete sync err', e));
        }
        return true;
    },

    getEntries(): ExpenseEntry[] {
        return [..._entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    getEntry(id: string): ExpenseEntry | undefined {
        return _entries.find(e => e.id === id);
    },

    getEntryCount(): number {
        return _entries.length;
    },

    addSubscription(partial: Omit<Subscription, "id" | "createdAt" | "updatedAt" | "isActive">): Subscription {
        const sub: Subscription = {
            ...partial,
            id: genId(),
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        _subscriptions.push(sub);

        if (typeof window !== 'undefined') {
            // Send only required fields, not the whole sub object
            fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: sub.name,
                    amount: sub.amount,
                    category: sub.category,
                    renewalDate: sub.renewalDate,
                    lastUsedDate: sub.lastUsedDate,
                })
            }).then(async res => {
                if (res.ok) {
                    const json = await res.json();
                    const idx = _subscriptions.findIndex(s => s.id === sub.id);
                    if (idx !== -1) _subscriptions[idx].id = json.data.id;
                }
            }).catch(e => console.warn('Subscription sync err', e));
        }
        return sub;
    },

    deleteSubscription(id: string): boolean {
        const idx = _subscriptions.findIndex(s => s.id === id);
        if (idx === -1) return false;
        const sub = _subscriptions[idx];
        _subscriptions.splice(idx, 1);

        if (typeof window !== 'undefined' && !sub.id.startsWith('exp-')) {
            fetch(`/api/subscriptions/${sub.id}`, { method: 'DELETE' });
        }
        return true;
    },

    getSubscriptions(): Subscription[] {
        return [..._subscriptions].sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime());
    },

    getDormantSubscriptions(): Subscription[] {
        const now = Date.now();
        const d90 = 90 * 24 * 60 * 60 * 1000;
        return _subscriptions.filter(s => {
            if (!s.lastUsedDate) return true;
            return (now - new Date(s.lastUsedDate).getTime()) > d90;
        });
    },

    getAnnualLeakageEstimate(): number {
        const subscriptions = this.getSubscriptions();
        return subscriptions.reduce((total, sub) => {
            const amount = sub.amount || 0;
            const freq = (sub as any).frequency || 'monthly';
            switch (String(freq).toLowerCase()) {
                case 'monthly': return total + (amount * 12);
                case 'quarterly': return total + (amount * 4);
                case 'annual': return total + amount;
                default: return total + (amount * 12);
            }
        }, 0);
    },

    // ——— Budget ———
    setTotalBudget(amount: number) {
        _budgetTotal = amount;
        this.syncBudget();
    },

    getTotalBudget(): number {
        return _budgetTotal;
    },

    async syncBudget() {
        if (typeof window === 'undefined') return;
        fetch('/api/budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalMonthly: _budgetTotal,
                categories: _categoryBudgets
            })
        });
    },

    // ——— Derived Calculations ———

    getMonthlyTotal(): number {
        const month = getCurrentMonth();
        let total = 0;
        for (const e of _entries) {
            if (e.recurring) {
                total += toMonthlyAmount(e);
            } else if (e.date.startsWith(month)) {
                total += e.amount;
            }
        }
        return Math.round(total);
    },

    getCategoryBreakdown(): { categoryId: string; name: string; emoji: string; amount: number; percentage: number }[] {
        const month = getCurrentMonth();
        const totals: Record<string, number> = {};

        for (const e of _entries) {
            const catId = e.category;
            if (e.recurring) {
                totals[catId] = (totals[catId] || 0) + toMonthlyAmount(e);
            } else if (e.date.startsWith(month)) {
                totals[catId] = (totals[catId] || 0) + e.amount;
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

    getExpenseToIncomeRatio(): { ratio: number; label: string; color: string } | null {
        const income = IncomeStore.getMonthlyNetIncome();
        if (income <= 0) return null;
        const expenses = this.getMonthlyTotal();
        const ratio = Math.round((expenses / income) * 100);
        const label = ratio > 80 ? "High" : ratio > 50 ? "Moderate" : "Low";
        const color = ratio > 80 ? "red" : ratio > 50 ? "amber" : "emerald";
        return { ratio, label, color };
    },

    getRecurringVsOneTime(): { recurringPct: number; oneTimePct: number; recurringTotal: number; oneTimeTotal: number } {
        const month = getCurrentMonth();
        let recurring = 0;
        let oneTime = 0;

        for (const e of _entries) {
            if (e.recurring) {
                recurring += toMonthlyAmount(e);
            } else if (e.date.startsWith(month)) {
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

    getBudgetAdherence(): {
        categoryId: string; name: string; emoji: string;
        budget: number; spent: number; adherencePct: number;
        status: "safe" | "near_limit" | "overspent";
    }[] {
        const breakdown = this.getCategoryBreakdown();
        const results: any[] = [];

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

    getBudgetDisciplineScore(): number {
        const adherence = this.getBudgetAdherence();
        if (adherence.length === 0) return 0;
        let score = 0;
        for (const a of adherence) {
            if (a.status === "safe") score += 100;
            else if (a.status === "near_limit") score += 60;
        }
        return Math.round(score / adherence.length);
    },

    getLeakageIndex(): number {
        const dormant = this.getDormantSubscriptions();
        if (_subscriptions.length === 0) return 0;
        const dormantRatio = dormant.length / _subscriptions.length;
        const dormantAmount = dormant.reduce((s, d) => s + d.amount, 0);
        const totalSubAmount = _subscriptions.reduce((s, d) => s + d.amount, 0);
        const amountRatio = totalSubAmount > 0 ? dormantAmount / totalSubAmount : 0;
        return Math.min(100, Math.round((dormantRatio * 60 + amountRatio * 40)));
    },

    getMonthlySubscriptionTotal(): number {
        return _subscriptions.reduce((s, sub) => s + sub.amount, 0);
    },

    getMaturity(): { level: number; milestones: any[] } {
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

    getInsights(): string[] {
        if (_entries.length === 0) return [];
        const insights: string[] = [];
        const breakdown = this.getCategoryBreakdown();
        const dormant = this.getDormantSubscriptions();
        if (breakdown.length > 0) insights.push(`Highest spend: ${breakdown[0].name} (${breakdown[0].percentage}%)`);
        if (dormant.length > 0) insights.push(`${dormant.length} subscription leak${dormant.length > 1 ? "s" : ""}`);
        return insights;
    },

    getAlerts(): { type: "warning" | "danger"; message: string }[] {
        const alerts: any[] = [];
        const ratio = this.getExpenseToIncomeRatio();
        if (ratio && ratio.ratio > 80) alerts.push({ type: "danger", message: "Low surplus risk — expenses exceed 80% of income." });
        const budgets = this.getBudgetAdherence();
        const overspent = budgets.filter(b => b.status === "overspent");
        if (overspent.length > 0) alerts.push({ type: "warning", message: `Budget exceeded in: ${overspent.map(o => o.name).join(", ")}` });
        return alerts;
    },

    getVyayaCompletion(): number {
        return Math.round((this.getMaturity().level / 4) * 100);
    },

    clear(): void {
        _entries = [];
        _subscriptions = [];
        _budgetTotal = 0;
        _categoryBudgets = {};
    },

    async hydrate() {
        if (typeof window === 'undefined') return;
        try {
            // 0. Hydrate Custom Categories
            const catRes = await fetch('/api/expense-categories', { cache: 'no-store' });
            if (catRes.ok) {
                const json = await catRes.json();
                const dbCats = json.data || [];
                dbCats.forEach((c: any) => {
                    if (!_categories.some(ext => ext.id === c.id)) {
                        _categories.push({
                            id: c.id,
                            name: c.name,
                            emoji: c.emoji || "📌",
                            active: c.isActive,
                            budgetAmount: 0,
                            alertThreshold: 0.8,
                            isCustom: true
                        });
                    }
                });
            }

            // 1. Hydrate Expenses
            const expRes = await fetch('/api/expenses', { cache: 'no-store' });
            if (expRes.ok) {
                const json = await expRes.json();
                const dbEntries = json.data || [];
                _entries = dbEntries.map((d: any) => ({
                    id: d.id,
                    date: d.date.split('T')[0],
                    amount: d.amount,
                    category: d.category,
                    mode: d.mode,
                    recurring: d.isRecurring,
                    frequency: d.frequency,
                    description: d.description,
                    accountId: d.accountId,
                    createdAt: new Date(d.createdAt).getTime(),
                    updatedAt: new Date(d.createdAt).getTime(),
                }));
            }

            // 2. Hydrate Subscriptions
            const subRes = await fetch('/api/subscriptions', { cache: 'no-store' });
            if (subRes.ok) {
                const json = await subRes.json();
                _subscriptions = (json.data || []).map((s: any) => ({
                    ...s,
                    renewalDate: s.renewalDate.split('T')[0],
                    lastUsedDate: s.lastUsedDate ? s.lastUsedDate.split('T')[0] : undefined,
                    createdAt: new Date(s.createdAt).getTime(),
                    updatedAt: new Date(s.updatedAt).getTime(),
                }));
            }

            // 3. Hydrate Budget
            const budRes = await fetch('/api/budget', { cache: 'no-store' });
            if (budRes.ok) {
                const json = await budRes.json();
                const b = json.data;
                if (b) {
                    _budgetTotal = b.totalMonthly;
                    _categoryBudgets = b.categories || {};
                    // Apply to categories in-memory
                    _categories.forEach(c => {
                        if (_categoryBudgets[c.id]) c.budgetAmount = _categoryBudgets[c.id];
                    });
                }
            }
        } catch (err) {
            console.warn('Failed to hydrate Vyaya', err);
        }
    },
};
