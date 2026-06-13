import type { AccountType, BankAccount, CashWallet, LiquiditySettings } from "@/lib/bankStore";

export type BankFlowMetrics = {
    inflow: number;
    outflow: number;
    surplus: number;
};

export type BankHealthMetrics = {
    emergencyFundMonths: number;
    liquidityRatio: number;
    efStatus: "critical" | "low" | "ok" | "strong";
    score: number;
    idleAccounts: Array<BankAccount & { excessIdle: number }>;
    outflowIsZero: boolean;
};

export type BankSummary = {
    accounts: BankAccount[];
    cashWallet: CashWallet;
    settings: LiquiditySettings;
    metrics: {
        totalLiquid: number;
        flow: BankFlowMetrics;
        health: BankHealthMetrics;
    };
};

type SaveAccountInput = {
    id?: string;
    bankName: string;
    accountType: AccountType;
    accountNumber?: string;  // Optional - not required by PRD
    accountLast4: string;
    nickname?: string;
    //adding joint account holder details
    holders?: {
        jointHolderId?: string | null;
        linkedIdentityId?: string | null;
    };
    openingBalance: number;
    currentBalance: number;
    latestBalanceAsOf: string;
    status?: "ACTIVE" | "DORMANT" | "CLOSED" | "active" | "dormant" | "closed";
    isPrimary?: boolean;
    notes?: string;
};

async function readJson<T>(response: Response): Promise<T> {
    const payload = await response.json();
    if (!response.ok) {
        const message = payload?.error || "Request failed";
        throw new Error(message);
    }
    if (payload && payload.success !== undefined && 'data' in payload) {
        return payload.data as T;
    }
    return payload as T;
}

export async function fetchBankSummary(): Promise<BankSummary> {
    const response = await fetch("/api/bank", { cache: "no-store" });
    return readJson<BankSummary>(response);
}

export async function saveBankAccount(input: SaveAccountInput): Promise<BankAccount> {
    const response = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            entity: "account",
            ...input,
        }),
    });
    return readJson<BankAccount>(response);
}

export async function saveCashWallet(input: Pick<CashWallet, "cashInHand" | "emergencyCash" | "pettyCash">): Promise<CashWallet> {
    const response = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            entity: "cashWallet",
            ...input,
        }),
    });
    return readJson<CashWallet>(response);
}

export async function saveLiquiditySettings(input: LiquiditySettings): Promise<LiquiditySettings> {
    const response = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            entity: "settings",
            ...input,
        }),
    });
    return readJson<LiquiditySettings>(response);
}

export function checkDuplicateAccounts(accounts: BankAccount[], bankName: string, type: AccountType, last4: string, nickname?: string) {
    if (!accounts || !Array.isArray(accounts)) return { exact: false, possible: false };

    const normalizedBank = bankName.toLowerCase().trim();
    const normalizedNickname = nickname?.toLowerCase().trim();

    let exact = false;
    let possible = false;

    for (const account of accounts) {
        const sameBank = account.bankName.toLowerCase().trim() === normalizedBank;
        const sameType = account.accountType === type;
        const sameLast4 = account.accountLast4 === last4;
        const sameNickname = normalizedNickname && account.nickname?.toLowerCase().trim() === normalizedNickname;

        if ((sameBank && sameType && sameLast4) || sameNickname) {
            exact = true;
        }
        if (!exact && sameLast4) {
            possible = true;
        }
    }

    return { exact, possible };
}

export function maskAccountNumber(last4: string) {
    return `•••• •••• •••• ${last4}`;
}