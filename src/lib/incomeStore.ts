// Module 4: Income Store — Treasury Mandal
// In-memory data layer for income records, analytics, and disposable income.
// Follows same pattern as identityStore.ts and credentialStore.ts.

// ——— Types ———
export type IncomeType = "salary" | "business" | "freelance" | "rental" | "interest"
    | "dividend" | "capital_gain" | "pension" | "other";

export type Frequency = "monthly" | "quarterly" | "annual" | "one_time";
export type RiskLevel = "low" | "medium" | "high";
export type RecordStatus = "draft" | "finalized";

export interface IncomeRecord {
    id: string;
    status: RecordStatus;        // draft = autosaved, finalized = explicitly saved
    incomeType: IncomeType;
    sourceName: string;
    frequency: Frequency;
    grossIncome: number;
    deductions: number;          // default 0
    netIncome: number;           // derived: gross - deductions
    allocationMonths?: number;   // only for one_time: spread across N months
    tdsAmount?: number;          // optional, default 0
    creditedAccountId?: string;  // link to Module 6 (add later, non-blocking)
    linkedFamilyMemberId?: string;
    notes?: string;
    historicalIncome?: number;   // 4B: previous year
    expectedGrowthPct?: number;  // 4B: user estimate
    riskLevel: RiskLevel;        // 4B: self-declared
    lastReviewedAt?: number;     // timestamp of last review
    createdAt: number;
    updatedAt: number;
}

// ——— Income type metadata ———
export const INCOME_TYPES: { id: IncomeType; label: string; emoji: string }[] = [
    { id: "salary", label: "Salary", emoji: "💼" },
    { id: "business", label: "Business", emoji: "🏢" },
    { id: "freelance", label: "Freelance", emoji: "💻" },
    { id: "rental", label: "Rental", emoji: "🏠" },
    { id: "interest", label: "Interest", emoji: "🏦" },
    { id: "dividend", label: "Dividend", emoji: "📈" },
    { id: "capital_gain", label: "Capital Gain", emoji: "📊" },
    { id: "pension", label: "Pension", emoji: "🧓" },
    { id: "other", label: "Other", emoji: "📋" },
];

export const FREQUENCIES: { id: Frequency; label: string }[] = [
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "annual", label: "Annual" },
    { id: "one_time", label: "One-time" },
];

// ——— Maturity milestones ———
export interface TreasuryMilestone {
    id: string;
    label: string;
    description: string;
    unlocked: boolean;
}

// ——— In-memory storage ———
let _records: IncomeRecord[] = [];

function genId(): string {
    return `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ——— Indian rupee formatting ———
export function formatRupee(amount: number): string {
    if (amount < 0) return `-₹${formatRupee(-amount).slice(1)}`;
    const str = Math.round(amount).toString();
    if (str.length <= 3) return `₹${str}`;
    // Indian notation: last 3 digits, then groups of 2
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 0) {
        const chunk = remaining.slice(-2);
        result = chunk + "," + result;
        remaining = remaining.slice(0, -2);
    }
    return `₹${result}`;
}

// ——— Normalization helpers ———

/** Get monthly net income for a single record.
 *  one_time is 0 unless allocationMonths is set. */
function toMonthlyNet(r: IncomeRecord): number {
    const net = r.grossIncome - r.deductions;
    switch (r.frequency) {
        case "monthly": return net;
        case "quarterly": return net / 3;
        case "annual": return net / 12;
        case "one_time":
            return r.allocationMonths && r.allocationMonths > 0 ? net / r.allocationMonths : 0;
    }
}

/** Check for duplicates: same sourceName (case insensitive) + frequency */
function isDuplicate(record: Partial<IncomeRecord>, excludeId?: string): boolean {
    return _records.some(r =>
        r.id !== excludeId &&
        r.status === "finalized" &&
        r.sourceName.toLowerCase().trim() === (record.sourceName || "").toLowerCase().trim() &&
        r.frequency === record.frequency
    );
}

// ——— Store ———
export const IncomeStore = {

    // ——— CRUD ———
    addRecord(partial: Omit<IncomeRecord, "id" | "netIncome" | "createdAt" | "updatedAt">): IncomeRecord {
        const rec: IncomeRecord = {
            ...partial,
            id: genId(),
            deductions: partial.deductions || 0,
            netIncome: partial.grossIncome - (partial.deductions || 0),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        _records.push(rec);

        if (typeof window !== 'undefined' && rec.status === 'finalized') {
            const { id: _cid, ...rest } = rec;
            const meta = JSON.stringify({ incomeType: rest.incomeType, deductions: rest.deductions, tdsAmount: rest.tdsAmount, riskLevel: rest.riskLevel, allocationMonths: rest.allocationMonths, expectedGrowthPct: rest.expectedGrowthPct, historicalIncome: rest.historicalIncome, notes: rest.notes });
            fetch('/api/income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: rest.incomeType,
                    source: rest.sourceName,
                    frequency: rest.frequency,
                    amountGross: rest.grossIncome,
                    deductions: rest.deductions,
                    amountNet: rest.grossIncome - (rest.deductions || 0),
                    creditedAccountId: rest.creditedAccountId,
                    description: `META:${meta}`,
                })
            }).then(async (res) => {
                if (res.ok) {
                    const saved = await res.json();
                    const idx = _records.findIndex(r => r.id === rec.id);
                    if (idx !== -1) _records[idx].id = saved.id;
                }
            }).catch(e => console.warn('Income sync err', e));
        }

        return rec;
    },

    updateRecord(id: string, patch: Partial<Omit<IncomeRecord, "id" | "createdAt">>): IncomeRecord | null {
        const rec = _records.find(r => r.id === id);
        if (!rec) return null;
        Object.assign(rec, patch, { updatedAt: Date.now() });
        // Recalculate netIncome if gross or deductions changed
        if (patch.grossIncome !== undefined || patch.deductions !== undefined) {
            rec.netIncome = rec.grossIncome - rec.deductions;
        }
        return rec;
    },

    finalizeRecord(id: string): IncomeRecord | null {
        const rec = this.updateRecord(id, { status: "finalized" });

        if (rec && typeof window !== 'undefined') {
            const meta = JSON.stringify({ incomeType: rec.incomeType, deductions: rec.deductions, tdsAmount: rec.tdsAmount, riskLevel: rec.riskLevel, allocationMonths: rec.allocationMonths, expectedGrowthPct: rec.expectedGrowthPct, historicalIncome: rec.historicalIncome, notes: rec.notes });
            const payload: Record<string, unknown> = {
                type: rec.incomeType,
                source: rec.sourceName,
                frequency: rec.frequency,
                amountGross: rec.grossIncome,
                deductions: rec.deductions,
                amountNet: rec.grossIncome - (rec.deductions || 0),
                creditedAccountId: rec.creditedAccountId,
                description: `META:${meta}`,
            };
            if (rec.id && !rec.id.startsWith('inc-')) payload.id = rec.id;
            fetch('/api/income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async (res) => {
                if (res.ok) {
                    const saved = await res.json();
                    const idx = _records.findIndex(r => r.id === rec.id);
                    if (idx !== -1) _records[idx].id = saved.id;
                }
            }).catch(e => console.warn('Income finalize sync err', e));
        }

        return rec;
    },

    deleteRecord(id: string): boolean {
        const idx = _records.findIndex(r => r.id === id);
        if (idx === -1) return false;
        _records.splice(idx, 1);
        return true;
    },

    getRecords(): IncomeRecord[] {
        return [..._records].filter(r => r.status === "finalized").sort((a, b) => b.createdAt - a.createdAt);
    },

    getAllRecords(): IncomeRecord[] {
        return [..._records].sort((a, b) => b.createdAt - a.createdAt);
    },

    getRecord(id: string): IncomeRecord | undefined {
        return _records.find(r => r.id === id);
    },

    getDraft(): IncomeRecord | undefined {
        return _records.find(r => r.status === "draft");
    },

    clearDraft(): void {
        _records = _records.filter(r => r.status !== "draft");
    },

    checkDuplicate(sourceName: string, frequency: Frequency, excludeId?: string): boolean {
        return isDuplicate({ sourceName, frequency }, excludeId);
    },

    // ——— Income Calculations ———

    /** Total monthly net (recurring only — excludes one_time unless allocated) */
    getMonthlyNetIncome(): number {
        return this.getRecords().reduce((sum, r) => sum + toMonthlyNet(r), 0);
    },

    /** Total annual net (recurring only) */
    getAnnualNetIncome(): number {
        return this.getMonthlyNetIncome() * 12;
    },

    /** Total one-time income (not in monthly) */
    getOneTimeTotal(): number {
        return this.getRecords()
            .filter(r => r.frequency === "one_time" && !r.allocationMonths)
            .reduce((sum, r) => sum + (r.grossIncome - r.deductions), 0);
    },

    /** Per-source contribution as { sourceName, monthlyNet, percentage } */
    getSourceContributions(): { id: string; sourceName: string; incomeType: IncomeType; monthlyNet: number; percentage: number }[] {
        const records = this.getRecords();
        const totalMonthly = this.getMonthlyNetIncome();
        if (totalMonthly === 0) return [];

        return records
            .map(r => ({
                id: r.id,
                sourceName: r.sourceName,
                incomeType: r.incomeType,
                monthlyNet: toMonthlyNet(r),
                percentage: Math.round((toMonthlyNet(r) / totalMonthly) * 100),
            }))
            .filter(c => c.monthlyNet > 0)
            .sort((a, b) => b.monthlyNet - a.monthlyNet);
    },

    /** Dependency ratio: highest monthly net / total. Flag if > 0.70 */
    getDependencyRatio(): { ratio: number; highSourceName: string; flag: boolean } {
        const contribs = this.getSourceContributions();
        if (contribs.length === 0) return { ratio: 0, highSourceName: "", flag: false };
        const top = contribs[0];
        const totalMonthly = this.getMonthlyNetIncome();
        const ratio = totalMonthly > 0 ? top.monthlyNet / totalMonthly : 0;
        return {
            ratio: Math.round(ratio * 100) / 100,
            highSourceName: top.sourceName,
            flag: ratio > 0.70,
        };
    },

    getDependencyLevel(): "low" | "medium" | "high" {
        const { ratio } = this.getDependencyRatio();
        if (ratio > 0.70) return "high";
        if (ratio > 0.50) return "medium";
        return "low";
    },

    /** Diversity score: exact ISI spec — SourceCount(10) + TypeCount(8) + SpreadBalance(7) = max 25 */
    getDiversityScore(): { score: number; sourceCount: number; sourceCountScore: number; uniqueTypes: number; typeScore: number; spreadScore: number } {
        // Only recurring sources (monthly/quarterly/annual)
        const recurring = this.getRecords().filter(r => r.frequency !== "one_time" || (r.allocationMonths && r.allocationMonths > 0));
        const sourceCount = recurring.length;
        const uniqueTypes = new Set(recurring.map(r => r.incomeType)).size;

        // Step A — Source Count Score (Max 10)
        const sourceCountScore = sourceCount >= 4 ? 10 : sourceCount === 3 ? 8 : sourceCount === 2 ? 6 : sourceCount === 1 ? 2 : 0;

        // Step B — Unique Type Score (Max 8)
        const typeScore = uniqueTypes >= 4 ? 8 : uniqueTypes === 3 ? 7 : uniqueTypes === 2 ? 5 : uniqueTypes === 1 ? 2 : 0;

        // Step C — Spread Balance Score (Max 7)
        const contribs = this.getSourceContributions();
        const highest = contribs.length > 0 ? contribs[0].percentage : 0;
        const spreadScore = highest > 80 ? 0 : highest > 70 ? 3 : highest > 60 ? 5 : 7;

        const score = sourceCountScore + typeScore + spreadScore;
        return { score, sourceCount, sourceCountScore, uniqueTypes, typeScore, spreadScore };
    },

    /** Income Strength Index (0–100) — 5-pillar model
     *  Diversification(25) + Dependency(25) + Stability(20) + Growth(15) + Governance(15) */
    getStrengthIndex(): {
        overall: number;
        diversity: number; diversityMax: number;
        dependency: number; dependencyMax: number;
        stability: number; stabilityMax: number;
        growth: number; growthMax: number;
        governance: number; governanceMax: number;
        label: string; color: string;
    } {
        const records = this.getRecords();
        const empty = { overall: 0, diversity: 0, diversityMax: 25, dependency: 0, dependencyMax: 25, stability: 0, stabilityMax: 20, growth: 0, growthMax: 15, governance: 0, governanceMax: 15, label: "Fragile", color: "red" };
        if (records.length === 0) return empty;

        // ——— 1. DIVERSIFICATION (0–25) ———
        const divScore = this.getDiversityScore().score;

        // ——— 2. DEPENDENCY RISK (0–25) ———
        const depRatio = this.getDependencyRatio().ratio;
        const depScore = depRatio > 0.85 ? 0 : depRatio > 0.75 ? 8 : depRatio > 0.65 ? 15 : depRatio > 0.50 ? 20 : 25;

        // ——— 3. STABILITY (0–20) ———
        // Step A — Weighted Risk Level (Max 12)
        const totalMonthly = this.getMonthlyNetIncome();
        const riskNums = { low: 1, medium: 2, high: 3 };
        let avgRisk = 0;
        if (totalMonthly > 0) {
            const recurring = records.filter(r => toMonthlyNet(r) > 0);
            avgRisk = recurring.reduce((s, r) => s + riskNums[r.riskLevel] * (toMonthlyNet(r) / totalMonthly), 0);
        } else {
            avgRisk = records.reduce((s, r) => s + riskNums[r.riskLevel], 0) / records.length;
        }
        const riskScore = avgRisk >= 2.5 ? 4 : avgRisk >= 2.0 ? 8 : avgRisk >= 1.5 ? 10 : 12;

        // Step B — Stability Type Bonus (Max 8)
        const lowRiskRecurring = records.filter(r => r.riskLevel === "low" && r.frequency !== "one_time");
        const typeBonus = lowRiskRecurring.length >= 2 ? 8 : lowRiskRecurring.length >= 1 ? 4 : 0;
        const stabilityScore = riskScore + typeBonus;

        // ——— 4. GROWTH OUTLOOK (0–15) ———
        const withGrowth = records.filter(r => r.expectedGrowthPct !== undefined);
        const growthCoverage = records.length > 0 ? withGrowth.length / records.length : 0;

        // Step A — Growth Visibility (Max 8)
        const visibilityScore = growthCoverage >= 0.5 ? 8 : growthCoverage >= 0.25 ? 5 : withGrowth.length > 0 ? 2 : 0;

        // Step B — Weighted Growth Rate (Max 7)
        let growthRateScore = 0;
        if (withGrowth.length > 0) {
            const weightedGrowth = withGrowth.reduce((s, r) => s + (r.expectedGrowthPct || 0), 0) / withGrowth.length;
            growthRateScore = weightedGrowth < 0 ? 0 : weightedGrowth < 5 ? 3 : weightedGrowth < 10 ? 5 : 7;
        }
        const growthScore = visibilityScore + growthRateScore;

        // ——— 5. RECENCY & GOVERNANCE (0–15) ———
        const now = Date.now();
        const d90 = 90 * 24 * 60 * 60 * 1000;
        const d180 = 180 * 24 * 60 * 60 * 1000;
        const d365 = 365 * 24 * 60 * 60 * 1000;

        // Step A — Review Discipline (Max 10)
        const allReviewed90 = records.every(r => r.lastReviewedAt && (now - r.lastReviewedAt) < d90);
        const allReviewed180 = records.every(r => r.lastReviewedAt && (now - r.lastReviewedAt) < d180);
        const anyStale365 = records.some(r => !r.lastReviewedAt || (now - r.lastReviewedAt) > d365);
        const neverReviewed = records.every(r => !r.lastReviewedAt);
        const reviewScore = neverReviewed ? 0 : anyStale365 ? 3 : allReviewed90 ? 10 : allReviewed180 ? 7 : 5;

        // Step B — Record Completeness (Max 5)
        let completenessTotal = 0;
        for (const r of records) {
            let attrs = 0;
            if (r.riskLevel) attrs++;
            if (r.expectedGrowthPct !== undefined) attrs++;
            if (r.linkedFamilyMemberId) attrs++;
            completenessTotal += attrs;
        }
        const completenessScore = Math.min(5, completenessTotal);
        const governanceScore = reviewScore + completenessScore;

        // ——— FINAL ———
        const overall = divScore + depScore + stabilityScore + growthScore + governanceScore;

        // Score interpretation
        const label = overall >= 91 ? "Resilient" : overall >= 76 ? "Strong" : overall >= 61 ? "Stable" : overall >= 41 ? "Vulnerable" : "Fragile";
        const color = overall >= 91 ? "emerald" : overall >= 76 ? "green" : overall >= 61 ? "yellow-green" : overall >= 41 ? "amber" : "red";

        return {
            overall,
            diversity: divScore, diversityMax: 25,
            dependency: depScore, dependencyMax: 25,
            stability: stabilityScore, stabilityMax: 20,
            growth: growthScore, growthMax: 15,
            governance: governanceScore, governanceMax: 15,
            label, color,
        };
    },

    // ——— Disposable Income ———
    getDisposableIncome(monthlyExpenses: number, monthlyEMI: number): {
        disposable: number;
        bufferRatio: number;
        isNegative: boolean;
    } {
        const monthlyNet = this.getMonthlyNetIncome();
        const disposable = monthlyNet - monthlyExpenses - monthlyEMI;
        const bufferRatio = monthlyExpenses > 0 ? Math.round((disposable / monthlyExpenses) * 100) / 100 : 0;
        return { disposable, bufferRatio, isNegative: disposable < 0 };
    },

    // ——— Treasury Maturity (0–4) ———
    getMaturity(): { level: number; milestones: TreasuryMilestone[] } {
        const records = this.getRecords();
        const depRatio = this.getDependencyRatio();
        const now = Date.now();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const uniqueTypes = new Set(records.map(r => r.incomeType)).size;
        const reviewedRecently = records.filter(r => r.lastReviewedAt && (now - r.lastReviewedAt) < ninetyDays).length;

        const milestones: TreasuryMilestone[] = [
            {
                id: "initiated",
                label: "Treasury Initiated",
                description: "Add at least 1 income source",
                unlocked: records.length >= 1,
            },
            {
                id: "structured",
                label: "Treasury Structured",
                description: "Add 2+ sources or 2+ income types",
                unlocked: records.length >= 2 || uniqueTypes >= 2,
            },
            {
                id: "balanced",
                label: "Treasury Balanced",
                description: "Dependency ratio ≤ 70%",
                unlocked: records.length >= 2 && !depRatio.flag,
            },
            {
                id: "resilient",
                label: "Treasury Resilient",
                description: "3+ sources + reviewed in last 90 days",
                unlocked: records.length >= 3 && reviewedRecently === records.length,
            },
        ];

        const level = milestones.filter(m => m.unlocked).length;
        return { level, milestones };
    },

    // ——— Micro-badges ———
    getBadges(): { id: string; label: string; emoji: string; unlocked: boolean }[] {
        const records = this.getRecords();
        const depRatio = this.getDependencyRatio();
        const hasReviewed = records.some(r => r.lastReviewedAt);

        return [
            { id: "first_king", label: "First King Placed", emoji: "👑", unlocked: records.length >= 1 },
            { id: "second_pillar", label: "Second Pillar Added", emoji: "🏛️", unlocked: records.length >= 2 },
            { id: "dependency_reduced", label: "Dependency Reduced", emoji: "⚖️", unlocked: records.length >= 2 && !depRatio.flag },
            { id: "treasury_reviewed", label: "Treasury Reviewed", emoji: "✅", unlocked: hasReviewed },
        ];
    },

    // ——— Quick Insights (for hub) ———
    getInsights(): string[] {
        const records = this.getRecords();
        if (records.length === 0) return [];

        const insights: string[] = [];
        const dep = this.getDependencyRatio();
        const diversity = this.getDiversityScore();
        const now = Date.now();
        const sixMonths = 180 * 24 * 60 * 60 * 1000;

        insights.push(`${records.length} recurring income source${records.length > 1 ? "s" : ""}`);
        insights.push(`${diversity.uniqueTypes} income type${diversity.uniqueTypes > 1 ? "s" : ""}`);

        if (dep.flag) {
            insights.push(`Top source contributes ${Math.round(dep.ratio * 100)}% (High dependency)`);
        }

        const staleCount = records.filter(r => !r.lastReviewedAt || (now - r.lastReviewedAt) > sixMonths).length;
        if (staleCount > 0) {
            insights.push(`${staleCount} source${staleCount > 1 ? "s" : ""} not reviewed in 6 months`);
        }

        // Last updated
        const latest = Math.max(...records.map(r => r.updatedAt));
        const daysAgo = Math.floor((now - latest) / (24 * 60 * 60 * 1000));
        if (daysAgo > 0) {
            insights.push(`Last updated ${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`);
        } else {
            insights.push("Updated today");
        }

        return insights;
    },

    /** Chaturanga piece mapping: King = highest, others ranked */
    getChaturangaPieces(): { piece: "king" | "rook" | "knight" | "pawn"; sourceName: string; monthlyNet: number; incomeType: IncomeType }[] {
        const contribs = this.getSourceContributions();
        return contribs.map((c, i) => ({
            piece: i === 0 ? "king" as const :
                i <= 2 ? "rook" as const :
                    i <= 4 ? "knight" as const : "pawn" as const,
            sourceName: c.sourceName,
            monthlyNet: c.monthlyNet,
            incomeType: c.incomeType,
        }));
    },

    // ——— Dashboard integration ———
    getKoshCompletion(): number {
        const maturity = this.getMaturity();
        return Math.round((maturity.level / 4) * 100);
    },

    getKoshStatus(): "secure" | "warning" | "critical" {
        const records = this.getRecords();
        if (records.length === 0) return "critical";
        const strength = this.getStrengthIndex().overall;
        if (strength >= 70) return "secure";
        if (strength >= 40) return "warning";
        return "critical";
    },

    // ——— Reset ———
    clear(): void {
        _records = [];
    },

    async hydrate() {
        if (typeof window === 'undefined') return;
        try {
            const res = await fetch('/api/income', { cache: 'no-store' });
            if (!res.ok) return;
            const dbEntries = await res.json();
            if (!Array.isArray(dbEntries) || dbEntries.length === 0) return;
            _records = dbEntries.map((d: Record<string, unknown>) => {
                let incomeType: IncomeType = 'other';
                let deductions = 0;
                let tdsAmount: number | undefined;
                let riskLevel: RiskLevel = 'medium';
                let allocationMonths: number | undefined;
                let expectedGrowthPct: number | undefined;
                let historicalIncome: number | undefined;
                let notes: string | undefined;
                const desc = String(d.description || '');
                if (desc.startsWith('META:')) {
                    try {
                        const meta = JSON.parse(desc.slice(5));
                        incomeType = meta.incomeType || 'other';
                        deductions = meta.deductions || 0;
                        tdsAmount = meta.tdsAmount;
                        riskLevel = meta.riskLevel || 'medium';
                        allocationMonths = meta.allocationMonths;
                        expectedGrowthPct = meta.expectedGrowthPct;
                        historicalIncome = meta.historicalIncome;
                        notes = meta.notes;
                    } catch { /* ignore parse errors */ }
                }
                const gross = Number(d.amount) || 0;
                const freq = (d.isRecurring && d.frequency) ? String(d.frequency) as Frequency : (d.isRecurring ? 'monthly' : 'one_time');
                return {
                    id: String(d.id),
                    status: 'finalized' as RecordStatus,
                    incomeType,
                    sourceName: String(d.source || ''),
                    frequency: freq,
                    grossIncome: gross,
                    deductions,
                    netIncome: gross - deductions,
                    allocationMonths,
                    tdsAmount,
                    riskLevel,
                    expectedGrowthPct,
                    historicalIncome,
                    notes,
                    createdAt: d.createdAt ? new Date(d.createdAt as string).getTime() : Date.now(),
                    updatedAt: d.createdAt ? new Date(d.createdAt as string).getTime() : Date.now(),
                };
            }) as IncomeRecord[];
        } catch (err) {
            console.warn('Failed to hydrate income', err);
        }
    },
};
