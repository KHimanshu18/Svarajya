/**
 * API Type Definitions
 * Aligned with Prisma schema models
 */

// ============================================================================
// Standard Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// USER & PROFILE
// ============================================================================

export interface UserResponse {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  dob?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  occupationType?: string | null;
  employerCompany?: string | null;
  profileType: string;
  status: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  isFirstLogin: boolean;
  isMobileVerified?: boolean;
  mobile?: string | null;
  primaryMobile?: string | null;
  secondaryMobile?: string | null;
  primaryEmail?: string | null;
  recoveryEmail?: string | null;
  familyMembers?: any[];
  education?: any[];
}

export interface CreateProfileRequest {
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  occupationType?: string;
  employerCompany?: string;
  language?: string;
  profileType?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  occupationType?: string;
  employerCompany?: string;
  language?: string;
}

// ============================================================================
// FAMILY MEMBERS
// ============================================================================

export interface FamilyMemberResponse {
  id: string;
  userId: string;
  name: string;
  relation: string;
  dob?: string | null;
  isDependent: boolean;
  nomineeEligible: boolean;
  accessLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyMemberRequest {
  name: string;
  relation: string;
  dob?: string;
  isDependent?: boolean;
  nomineeEligible?: boolean;
  accessLevel?: string;
}

export interface UpdateFamilyMemberRequest {
  name?: string;
  relation?: string;
  dob?: string;
  isDependent?: boolean;
  nomineeEligible?: boolean;
  accessLevel?: string;
}

// ============================================================================
// IDENTITY RECORDS
// ============================================================================

export interface IdentityRecordResponse {
  id: string;
  userId: string;
  idType: string;
  numberMasked: string;
  expiryDate?: string | null;
  issuedDate?: string | null;
  placeOfIssue?: string | null;
  dobOnDoc?: string | null;
  nameOnDoc?: string | null;
  vaultFileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdentityRecordRequest {
  idType: string;
  numberMasked: string;
  numberFull?: string;
  expiryDate?: string;
  issuedDate?: string;
  placeOfIssue?: string;
  dobOnDoc?: string;
  nameOnDoc?: string;
  vaultFileId?: string;
}

export interface UpdateIdentityRecordRequest {
  idType?: string;
  numberMasked?: string;
  expiryDate?: string;
  issuedDate?: string;
  placeOfIssue?: string;
  dobOnDoc?: string;
  nameOnDoc?: string;
  vaultFileId?: string;
}

// ============================================================================
// CREDENTIAL RECORDS
// ============================================================================

export interface CredentialRecordResponse {
  id: string;
  userId: string;
  portalType: string;
  portalName: string;
  portalUrl?: string | null;
  loginId?: string | null;
  registeredEmail?: string | null;
  registeredMobile?: string | null;
  storageMode: string;
  linkedMemberId?: string | null;
  registrationDate?: string | null;
  twoFAStatus?: string | null;
  twoFAType?: string | null;
  nomineeAwareness?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialRecordRequest {
  portalType: string;
  portalName: string;
  portalUrl?: string;
  loginId?: string;
  registeredEmail?: string;
  registeredMobile?: string;
  storageMode?: string;
  password?: string;
  linkedMemberId?: string;
  registrationDate?: string;
  twoFAStatus?: string;
  twoFAType?: string;
  nomineeAwareness?: boolean;
}

export interface UpdateCredentialRecordRequest {
  portalName?: string;
  portalUrl?: string;
  loginId?: string;
  registeredEmail?: string;
  registeredMobile?: string;
  password?: string;
  linkedMemberId?: string;
  registrationDate?: string;
  twoFAStatus?: string;
  twoFAType?: string;
}

// ============================================================================
// INCOME STREAMS
// ============================================================================

export interface IncomeStreamResponse {
  id: string;
  userId: string;
  type: string;
  source?: string | null;
  frequency: string;
  amountGross: number;
  deductions: number;
  amountNet: number;
  creditedAccountId?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  type: string;
  source?: string;
  frequency?: string;
  amountGross: number;
  deductions?: number;
  amountNet: number;
  creditedAccountId?: string;
  isPrimary?: boolean;
  amount?: number; // Legacy support
  date?: string; // Legacy support
  isRecurring?: boolean; // Legacy support
  accountId?: string; // Legacy support
  description?: string; // Legacy support
}

export interface UpdateIncomeRequest {
  type?: string;
  source?: string;
  frequency?: string;
  amountGross?: number;
  deductions?: number;
  amountNet?: number;
  creditedAccountId?: string;
  isPrimary?: boolean;
}

// ============================================================================
// EXPENSE ENTRIES
// ============================================================================

export interface ExpenseEntryResponse {
  id: string;
  userId: string;
  date: string;
  amount: number;
  category: string;
  mode?: string | null;
  accountId?: string | null;
  description?: string | null;
  isRecurring: boolean;
  createdAt: string;
}

export interface CreateExpenseRequest {
  date: string;
  amount: number;
  category: string;
  mode?: string;
  accountId?: string;
  description?: string;
  isRecurring?: boolean;
  categoryId?: string; // Legacy support
  paymentMode?: string; // Legacy support
  linkedFamilyMemberId?: string; // Legacy support
  paidFromAccountId?: string; // Legacy support
}

export interface UpdateExpenseRequest {
  date?: string;
  amount?: number;
  category?: string;
  mode?: string;
  accountId?: string;
  description?: string;
  isRecurring?: boolean;
}

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export interface BankAccountResponse {
  id: string;
  userId: string;
  bankName: string;
  accountType: string;
  accountLast4: string;
  nickname?: string | null;
  status: string;
  openingBalance: number;
  latestBalance: number;
  latestBalanceAsOf: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountRequest {
  bankName: string;
  accountType: string;
  accountLast4: string;
  nickname?: string;
  status?: string;
  openingBalance: number;
  latestBalance: number;
  latestBalanceAsOf: string;
}

export interface UpdateBankAccountRequest {
  bankName?: string;
  accountType?: string;
  status?: string;
  nickname?: string;
  latestBalance?: number;
  latestBalanceAsOf?: string;
}
