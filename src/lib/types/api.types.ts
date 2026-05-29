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

export interface TaxRecordResponse {
  id: string;
  assessmentYear: string;
  financialYear: string;
  filingType?: string | null;
  status: string;
  grossIncome?: number | null;
  taxableIncome?: number | null;
  taxPaid?: number | null;
  taxDue?: number | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GstRecordResponse {
  id: string;
  gstin: string;
  businessName?: string | null;
  registrationType?: string | null;
  filingFrequency?: string | null;
  lastFilingDate?: string | null;
  nextDueDate?: string | null;
  status: string;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DinRecordResponse {
  id: string;
  dinNumber: string;
  companyName?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: string;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KarSummaryResponse {
  taxCount: number;
  gstCount: number;
  dinCount: number;
  nextGstDue?: string | null;
  nextDinExpiry?: string | null;
}

export interface CreateTaxRecordRequest {
  assessmentYear: string;
  financialYear: string;
  filingType?: string;
  status?: string;
  grossIncome?: number;
  taxableIncome?: number;
  taxPaid?: number;
  taxDue?: number;
  documentUrl?: string;
  notes?: string;
}

export interface CreateGstRecordRequest {
  gstin: string;
  businessName?: string;
  registrationType?: string;
  filingFrequency?: string;
  lastFilingDate?: string;
  nextDueDate?: string;
  status?: string;
  documentUrl?: string;
  notes?: string;
}

export interface CreateDinRecordRequest {
  dinNumber: string;
  companyName?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: string;
  documentUrl?: string;
  notes?: string;
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
  familyMemberId?: string | null;
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
  familyMemberId?: string;
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
  familyMemberId?: string;
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
  riskLevel?: string | null;
  expectedGrowthPct?: number | null;
  historicalIncome?: any | null;
  notes?: string | null;
  allocationMonths?: number | null;
  tdsAmount?: number | null;
  description?: string | null;
  isPrimary: boolean;
  familyMemberId?: string | null;
  lastReviewedAt?: string | null;
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
  riskLevel?: string;
  expectedGrowthPct?: number;
  historicalIncome?: any;
  notes?: string;
  allocationMonths?: number;
  tdsAmount?: number;
  description?: string;
  isPrimary?: boolean;
  familyMemberId?: string;
  lastReviewedAt?: string | number;
}

export interface UpdateIncomeRequest {
  type?: string;
  source?: string;
  frequency?: string;
  amountGross?: number;
  deductions?: number;
  amountNet?: number;
  creditedAccountId?: string;
  riskLevel?: string;
  expectedGrowthPct?: number;
  historicalIncome?: any;
  notes?: string;
  allocationMonths?: number;
  tdsAmount?: number;
  description?: string;
  isPrimary?: boolean;
  familyMemberId?: string;
  lastReviewedAt?: string | number;
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

// ============================================================================
// INSURANCE POLICIES
// ============================================================================

export interface InsurancePolicyResponse {
  id: string;
  userId: string;
  type: string;
  policyNumber: string;
  insurerName?: string | null;
  sumAssured: number;
  premium: number;
  premiumFrequency: string;
  dueDate: string;
  maturityDate?: string | null;
  nomineeId?: string | null;
  agentContact?: string | null;
  status: string;
  documentId?: string | null;
  reminderId?: string | null;
  createdAt: string;
  updatedAt: string;
  coverage?: {
    id: string;
    memberId: string;
    member: {
      id: string;
      name: string;
      relation: string;
    };
  }[];
}

export interface CreateInsuranceRequest {
  type: string;
  policyNumber: string;
  insurerName?: string;
  sumAssured: number;
  premium: number;
  premiumFrequency?: string;
  dueDate: string;
  maturityDate?: string;
  nomineeId?: string;
  agentContact?: string;
  status?: string;
  coveredMemberIds?: string[];
}

export interface UpdateInsuranceRequest extends Partial<CreateInsuranceRequest> {}
