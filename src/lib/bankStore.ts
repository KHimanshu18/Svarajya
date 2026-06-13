import { ExpenseStore } from "./expenseStore";
import { IncomeStore } from "./incomeStore";

export type AccountType = "savings" | "salary" | "current" | "joint" | "od";
export type AccountStatus = "active" | "dormant" | "closed";
export type BalanceUpdateSource = "manual" | "import";

// V1 encryption mechanism (re-uses basic logic from credentialStore if needed, or placeholder string)
export type EncryptedSecret = string;

export type BankAccount = {
    isPrimary?: boolean;
    id: string;
    bankName: string;              // HDFC, SBI
    accountType: AccountType;
    nickname?: string;             // "Home Savings"
    accountLast4: string;          // required

    // optional encrypted full number (Master Passphrase vault)
    accountNumberEncrypted?: EncryptedSecret;

    status: AccountStatus;

    openingBalance: number;
    latestBalance: number;
    latestBalanceAsOf: string;     // ISO date

    creditedIncomeSourceIds?: string[]; // optional future mapping to income sources
    paidExpenseAccountTag?: boolean;    // for quick UI

    linkedIdentityDocIds?: string[];    // optional: Module 2 doc ids
    linkedPortalIds?: string[];         // optional: Module 3 portal ids

    auditTrail: Array<{
        id: string;
        prevBalance: number;
        newBalance: number;
        delta: number;
        asOfDate: string;            // User's stated date of balance
        recordedAt: string;          // Actual system timestamp of entry
        note?: string;
        source: BalanceUpdateSource;
        createdAt: string;           // ISO datetime
    }>;

    createdAt: string;
    updatedAt: string;
};

export type CashWallet = {
    cashInHand: number;       // total cash
    emergencyCash: number;    // part of cash reserved
    pettyCash: number;        // daily spend pool
    updatedAt: string;
};

export type LiquiditySettings = {
    idleThresholdAmount: number;         // ₹
    emergencyFundTargetMonths: number;   // default 3 or 6
    lowEmergencyFundAlertMonths: number; // default 3
};

// ——————— Store Initialization ———————

const _accounts: BankAccount[] = [];
let _cash: CashWallet = { cashInHand: 0, emergencyCash: 0, pettyCash: 0, updatedAt: "" };
let _settings: LiquiditySettings = {
    idleThresholdAmount: 150000,
    emergencyFundTargetMonths: 6,
    lowEmergencyFundAlertMonths: 3,
};
let _initialized = false;

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ——————— Mock Data Seeding ———————
function seedDefaults() {
    if (_initialized) return;
    _initialized = true;

    // We can pre-seed realistic data for demo purposes
    if (_accounts.length === 0) {
        const today = new Date().toISOString().split("T")[0];
        const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

        _accounts.push({
            id: genId(),
            bankName: "HDFC Bank",
            accountType: "salary",
            accountLast4: "1234",
            isPrimary: true,
            status: "active",
            openingBalance: 50000,
            latestBalance: 85000,
            latestBalanceAsOf: today,
            auditTrail: [{
                id: genId(),
                prevBalance: 50000,
                newBalance: 85000,
                delta: 35000,
                asOfDate: today,
                recordedAt: new Date().toISOString(),
                source: "manual",
                createdAt: new Date().toISOString()
            }],
            createdAt: lastWeek,
            updatedAt: new Date().toISOString()
        });

        _cash = {
            cashInHand: 25000,
            emergencyCash: 20000,
            pettyCash: 5000,
            updatedAt: today
        };
    }
}

// ——————— Public Operations ———————

export const BankStore = {
    // Basic CRUD
    getAccounts(): BankAccount[] {
        seedDefaults();
        return [..._accounts];
    },

    getAccount(id: string): BankAccount | undefined {
        seedDefaults();
        return _accounts.find(a => a.id === id);
    },

    addAccount(data: Omit<BankAccount, "id" | "createdAt" | "updatedAt" | "auditTrail"> & { asOfDate: string }): BankAccount {
        seedDefaults();
        const now = new Date().toISOString();
        const newAccount: BankAccount = {
            ...data,
            id: genId(),
            createdAt: now,
            updatedAt: now,
            auditTrail: [
                {
                    id: genId(),
                    prevBalance: 0,
                    newBalance: data.latestBalance,
                    delta: data.latestBalance,
                    asOfDate: data.asOfDate,
                    recordedAt: now,
                    source: "manual",
                    note: "Initial Opening Balance",
                    createdAt: now,
                }
            ]
        };
        _accounts.unshift(newAccount);
        return newAccount;
    },

    updateBalance(id: string, newBalance: number, asOfDate: string, note?: string, source: BalanceUpdateSource = "manual"): BankAccount | null {
        seedDefaults();
        const idx = _accounts.findIndex(a => a.id === id);
        if (idx === -1) return null;

        const acc = _accounts[idx];
        const delta = newBalance - acc.latestBalance;
        const now = new Date().toISOString();

        acc.auditTrail.unshift({
            id: genId(),
            prevBalance: acc.latestBalance,
            newBalance,
            delta,
            asOfDate,
            recordedAt: now,
            note,
            source,
            createdAt: now,
        });

        acc.latestBalance = newBalance;
        acc.latestBalanceAsOf = asOfDate;
        acc.updatedAt = now;
        return acc;
    },

    updateAccountDetails(id: string, data: Partial<Omit<BankAccount, "id" | "auditTrail" | "createdAt" | "latestBalance" | "openingBalance">>): BankAccount | null {
        seedDefaults();
        const idx = _accounts.findIndex(a => a.id === id);
        if (idx === -1) return null;
        _accounts[idx] = { ..._accounts[idx], ...data, updatedAt: new Date().toISOString() };
        return _accounts[idx];
    },

    // Duplicate Checking
    checkDuplicate(bankName: string, type: AccountType, last4: string, nickname?: string): { exact: boolean; possible: boolean } {
        seedDefaults();
        const nBank = bankName.toLowerCase().trim();
        const nNick = nickname?.toLowerCase().trim();

        let exact = false;
        let possible = false;

        for (const acc of _accounts) {
            const sameBank = acc.bankName.toLowerCase().trim() === nBank;
            const sameType = acc.accountType === type;
            const sameLast4 = acc.accountLast4 === last4;
            const sameNick = nNick && acc.nickname?.toLowerCase().trim() === nNick;

            if ((sameBank && sameType && sameLast4) || sameNick) {
                exact = true;
            }
            if (!exact && sameLast4) {
                possible = true;
            }
        }
        return { exact, possible };
    },

    // Cash Wallet
    getCashWallet(): CashWallet {
        seedDefaults();
        return { ..._cash };
    },

    updateCashWallet(data: Partial<CashWallet>): CashWallet {
        seedDefaults();
        _cash = { ..._cash, ...data, updatedAt: new Date().toISOString() };
        return { ..._cash };
    },

    // Settings
    getSettings(): LiquiditySettings {
        seedDefaults();
        return { ..._settings };
    },

    updateSettings(data: Partial<LiquiditySettings>) {
        seedDefaults();
        _settings = { ..._settings, ...data };
    },

    // ——————— Derived Analytics ———————

    getTotalLiquidAssets(): number {
        seedDefaults();
        const activeBankBalance = _accounts
            .filter(a => a.status === "active")
            .reduce((sum, a) => sum + a.latestBalance, 0);
        return activeBankBalance + _cash.cashInHand;
    },

    getCashFlowMetrics() {
        // Module 4 & 5 integration
        const inflow = IncomeStore.getMonthlyNetIncome();
        const outflow = ExpenseStore.getMonthlyTotal();
        return {
            inflow,
            outflow,
            surplus: inflow - outflow
        };
    },

    getLiquidityHealth() {
        seedDefaults();
        const outflow = ExpenseStore.getMonthlyTotal();
        const totalLiquidity = this.getTotalLiquidAssets();

        // EF = (EmergencyCash + active bank balances) / MonthlyExpenses
        const activeBankBalance = _accounts
            .filter(a => a.status === "active")
            .reduce((sum, a) => sum + a.latestBalance, 0);

        const emergencyPool = activeBankBalance + _cash.emergencyCash;

        const emergencyFundMonths = outflow > 0 ? (emergencyPool / outflow) : 0;
        const liquidityRatio = outflow > 0 ? (totalLiquidity / outflow) : 0;

        let efStatus: "critical" | "low" | "ok" | "strong" = "critical";
        if (emergencyFundMonths >= _settings.emergencyFundTargetMonths) efStatus = "strong";
        else if (emergencyFundMonths >= _settings.lowEmergencyFundAlertMonths) efStatus = "ok";
        else if (emergencyFundMonths >= 1) efStatus = "low";

        // Score 0-100 logic (V1 Refinement Weights: EF 50, Recency 20, Idle 15, Config 15)
        let score = 0;
        score += Math.min(emergencyFundMonths / _settings.emergencyFundTargetMonths, 1) * 50;

        const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

        // Recency (20)
        if (_accounts.length > 0) {
            const allUpToDate = _accounts.every(a => new Date(a.latestBalanceAsOf) >= thirtyDaysAgo);
            const someOutdated = _accounts.some(a => new Date(a.latestBalanceAsOf) < sixtyDaysAgo);
            score += allUpToDate ? 20 : (someOutdated ? 0 : 10);
        }

        // Configuration / Cash Wallet (15)
        score += (_cash.emergencyCash > 0 || _cash.pettyCash > 0) ? 15 : 0;

        // Idle Optimization (15)
        // If EF is met and no idle accounts, full points. If EF not met, full points (since priority is building EF).
        const isEFMet = emergencyFundMonths >= _settings.emergencyFundTargetMonths;

        let idleAccounts: (BankAccount & { excessIdle: number })[] = [];

        if (isEFMet) {
            idleAccounts = _accounts
                .filter(a => a.status === "active")
                .map(a => ({
                    ...a,
                    excessIdle: a.latestBalance - (outflow * _settings.emergencyFundTargetMonths)
                }))
                .filter(a => a.excessIdle > _settings.idleThresholdAmount);

            score += idleAccounts.length === 0 ? 15 : 0;
        } else {
            score += 15; // Not punished for idle if building EF
        }

        return {
            emergencyFundMonths,
            liquidityRatio,
            efStatus,
            score: Math.round(score),
            idleAccounts,
            outflowIsZero: outflow === 0
        };
    },

    // UI Formatting Helper
    maskAccountNumber(last4: string): string {
        return `•••• •••• •••• ${last4}`;
    }
};
