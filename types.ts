
export enum LoanType {
  COMMERCIAL = 'commercial',
  PROVIDENT = 'provident',
  COMBO = 'combo',
}

export enum PaymentMethod {
  EPI = 'equal_principal_interest', // 等额本息
  EP = 'equal_principal', // 等额本金
}

export interface LoanParams {
  type: LoanType;
  commercialAmount: number; // 万元
  commercialRate: number; // %
  commercialYears: number;
  providentAmount: number; // 万元
  providentRate: number; // %
  providentYears: number;
}

export interface MonthlyData {
  month: number;
  payment: number; // 月供
  principal: number; // 本金
  interest: number; // 利息
  remainingPrincipal: number; // 剩余本金
  commercialPayment?: number;
  providentPayment?: number;
}

export interface CalculationResult {
  monthlyData: MonthlyData[];
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  firstMonthPayment: number;
  lastMonthPayment: number;
  monthlyDecrease?: number;
}

export interface FullComparison {
  epi: CalculationResult;
  ep: CalculationResult;
  recommendation: PaymentMethod;
  savedInterest: number;
}

// Prepayment / Existing Loan Types
export interface ExistingLoanPart {
  principal: number; // Remaining Principal in Wan
  months: number; // Remaining Months
  rate: number; // Annual Rate %
  method: PaymentMethod;
}

export interface ExistingLoanState {
  type: LoanType;
  commercial: ExistingLoanPart;
  provident: ExistingLoanPart;
}

export interface PrepaymentResult {
  actionType: 'shorten' | 'reduce' | 'changeMethod';
  newMonthlyPayment: number; // Total combined payment
  newTermMonths: number; // New term of the modified part
  savedInterest: number; // Total saved interest (combined)
  savedMonths: number; // Saved months of the modified part
  oldTotalInterest: number;
  newTotalInterest: number;
  firstMonthPayment?: number;
  target: 'commercial' | 'provident';
}

// Smart Strategy Types
export interface SmartResult {
  type: 'years' | 'interest' | 'payment' | 'annual';
  value?: number; // The calculated result (e.g. extra monthly payment, or lump sum needed)
  description?: string;
  originalValue?: number;
  savedInterest?: number;
  
  // Specific fields for strategies
  extraMonthly?: number;
  newMonthly?: number;
  lumpSum?: number;
  months?: number;
  actualInterest?: number;
  originalInterest?: number;
  
  // Annual Strategy
  savedYears?: number;
  newYears?: number;
  finalMonthly?: number;
  strategy?: 'shorten' | 'reduce';
  totalPrepaymentAmount?: number; // Total amount paid via annual prepayments
  
  // Milestone for low principal advice
  milestone?: {
      year: number;
      principal: number; // Yuan
      monthly: number;   // Yuan
  };
}