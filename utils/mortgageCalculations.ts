
import { LoanType, LoanParams, CalculationResult, MonthlyData, PaymentMethod, FullComparison, PrepaymentResult, ExistingLoanState, ExistingLoanPart } from '../types';

// --- Base Calculators ---

const calculateEPI = (principal: number, yearlyRate: number, months: number): CalculationResult => {
  if (principal <= 0 || months <= 0) return createEmptyResult();

  const monthlyRate = yearlyRate / 100 / 12;
  
  if (monthlyRate === 0) {
    const payment = principal / months;
    const data: MonthlyData[] = [];
    let remaining = principal;
    for (let i = 1; i <= months; i++) {
      remaining -= payment;
      data.push({
        month: i,
        payment: payment,
        principal: payment,
        interest: 0,
        remainingPrincipal: Math.max(0, remaining),
      });
    }
    return {
      monthlyData: data,
      totalPayment: principal,
      totalInterest: 0,
      totalPrincipal: principal,
      firstMonthPayment: payment,
      lastMonthPayment: payment,
    };
  }

  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  
  let remaining = principal;
  const data: MonthlyData[] = [];
  let totalInter = 0;

  for (let i = 1; i <= months; i++) {
    const interest = remaining * monthlyRate;
    const principalPaid = payment - interest;
    
    remaining -= principalPaid;

    totalInter += interest;
    data.push({
      month: i,
      payment: payment,
      principal: principalPaid,
      interest: interest,
      remainingPrincipal: Math.max(0, remaining),
    });
  }

  return {
    monthlyData: data,
    totalPayment: principal + totalInter,
    totalInterest: totalInter,
    totalPrincipal: principal,
    firstMonthPayment: payment,
    lastMonthPayment: payment,
  };
};

const calculateEP = (principal: number, yearlyRate: number, months: number): CalculationResult => {
  if (principal <= 0 || months <= 0) return createEmptyResult();

  const monthlyRate = yearlyRate / 100 / 12;
  const monthlyPrincipal = principal / months;
  
  let remaining = principal;
  const data: MonthlyData[] = [];
  let totalInter = 0;
  let totalPay = 0;

  for (let i = 1; i <= months; i++) {
    const interest = remaining * monthlyRate;
    const payment = monthlyPrincipal + interest;
    remaining -= monthlyPrincipal;
    totalInter += interest;
    totalPay += payment;

    data.push({
      month: i,
      payment: payment,
      principal: monthlyPrincipal,
      interest: interest,
      remainingPrincipal: Math.max(0, remaining),
    });
  }

  return {
    monthlyData: data,
    totalPayment: totalPay,
    totalInterest: totalInter,
    totalPrincipal: principal,
    firstMonthPayment: data[0].payment,
    lastMonthPayment: data[data.length - 1].payment,
    monthlyDecrease: data.length > 1 ? data[0].payment - data[1].payment : 0,
  };
};

const createEmptyResult = (): CalculationResult => ({
  monthlyData: [],
  totalPayment: 0,
  totalInterest: 0,
  totalPrincipal: 0,
  firstMonthPayment: 0,
  lastMonthPayment: 0
});

const mergeResults = (res1: CalculationResult, res2: CalculationResult): CalculationResult => {
  const maxMonths = Math.max(res1.monthlyData.length, res2.monthlyData.length);
  const mergedData: MonthlyData[] = [];

  for (let i = 0; i < maxMonths; i++) {
    const d1 = res1.monthlyData[i] || { payment: 0, principal: 0, interest: 0, remainingPrincipal: 0 };
    const d2 = res2.monthlyData[i] || { payment: 0, principal: 0, interest: 0, remainingPrincipal: 0 };
    
    mergedData.push({
      month: i + 1,
      payment: d1.payment + d2.payment,
      principal: d1.principal + d2.principal,
      interest: d1.interest + d2.interest,
      remainingPrincipal: d1.remainingPrincipal + d2.remainingPrincipal,
      commercialPayment: d1.payment,
      providentPayment: d2.payment,
    });
  }

  return {
    monthlyData: mergedData,
    totalPayment: res1.totalPayment + res2.totalPayment,
    totalInterest: res1.totalInterest + res2.totalInterest,
    totalPrincipal: res1.totalPrincipal + res2.totalPrincipal,
    firstMonthPayment: mergedData[0]?.payment || 0,
    lastMonthPayment: mergedData[mergedData.length - 1]?.payment || 0,
    monthlyDecrease: mergedData.length > 1 ? mergedData[0].payment - mergedData[1].payment : 0,
  };
};

// --- Main Calculator ---

export const calculateMortgage = (params: LoanParams): FullComparison => {
  const commercialPrincipal = params.commercialAmount * 10000;
  const providentPrincipal = params.providentAmount * 10000;

  // Commercial
  const commEPI = params.type !== LoanType.PROVIDENT 
    ? calculateEPI(commercialPrincipal, params.commercialRate, params.commercialYears * 12) 
    : createEmptyResult();
  const commEP = params.type !== LoanType.PROVIDENT 
    ? calculateEP(commercialPrincipal, params.commercialRate, params.commercialYears * 12) 
    : createEmptyResult();

  // Provident
  const provEPI = params.type !== LoanType.COMMERCIAL 
    ? calculateEPI(providentPrincipal, params.providentRate, params.providentYears * 12) 
    : createEmptyResult();
  const provEP = params.type !== LoanType.COMMERCIAL 
    ? calculateEP(providentPrincipal, params.providentRate, params.providentYears * 12) 
    : createEmptyResult();

  // Merge
  const finalEPI = mergeResults(commEPI, provEPI);
  const finalEP = mergeResults(commEP, provEP);

  const savedInterest = finalEPI.totalInterest - finalEP.totalInterest;
  const recommend = savedInterest > 0 ? PaymentMethod.EP : PaymentMethod.EPI;

  return {
    epi: finalEPI,
    ep: finalEP,
    recommendation: recommend,
    savedInterest: Math.abs(savedInterest),
  };
};

// --- Prepayment Logic (Composite Support) ---

// Helper: Calculate standard schedule for a single loan part
const calculatePartSchedule = (part: ExistingLoanPart): CalculationResult => {
    const principal = part.principal * 10000;
    if (principal <= 0) return createEmptyResult();
    
    return part.method === PaymentMethod.EPI
        ? calculateEPI(principal, part.rate, part.months)
        : calculateEP(principal, part.rate, part.months);
};

// Helper: Calculate single loan prepayment impact (pure logic)
const calculateSinglePrepayment = (
    part: ExistingLoanPart,
    prepayAmountWan: number,
    action: 'shorten' | 'reduce'
): { schedule: CalculationResult, savedMonths: number } => {
    const principal = part.principal * 10000;
    const prepayAmount = prepayAmountWan * 10000;
    const newPrincipal = Math.max(0, principal - prepayAmount);

    let newSchedule: CalculationResult;
    let savedMonths = 0;

    if (action === 'reduce') {
        // Keep months same, reduce monthly payment
        newSchedule = part.method === PaymentMethod.EPI
            ? calculateEPI(newPrincipal, part.rate, part.months)
            : calculateEP(newPrincipal, part.rate, part.months);
    } else {
        // Shorten term
        if (part.method === PaymentMethod.EPI) {
            // EPI: Keep monthly payment same, solve for months
            const r = part.rate / 100 / 12;
            const oldSched = calculatePartSchedule(part);
            const M = oldSched.firstMonthPayment;
            
            if (newPrincipal * r >= M || newPrincipal <= 0) {
                 newSchedule = calculateEPI(newPrincipal, part.rate, part.months); // Fallback
                 if(newPrincipal <= 0) newSchedule = createEmptyResult();
            } else {
                 const n = Math.log(M / (M - newPrincipal * r)) / Math.log(1 + r);
                 const newMonths = Math.max(1, Math.ceil(n));
                 newSchedule = calculateEPI(newPrincipal, part.rate, newMonths);
                 savedMonths = Math.max(0, part.months - newMonths);
            }
        } else {
            // EP: Keep Monthly Principal Same
            const oldMonthlyPrincipal = principal / part.months;
            const newMonths = oldMonthlyPrincipal > 0 ? Math.ceil(newPrincipal / oldMonthlyPrincipal) : 0;
            newSchedule = calculateEP(newPrincipal, part.rate, newMonths);
            savedMonths = Math.max(0, part.months - newMonths);
        }
    }
    return { schedule: newSchedule, savedMonths };
};

export const calculatePrepayment = (
    state: ExistingLoanState,
    prepayAmountWan: number,
    action: 'shorten' | 'reduce',
    target: 'commercial' | 'provident'
): PrepaymentResult => {
    // 1. Determine active parts
    const hasComm = state.type === LoanType.COMMERCIAL || state.type === LoanType.COMBO;
    const hasProv = state.type === LoanType.PROVIDENT || state.type === LoanType.COMBO;

    // 2. Calculate Base (Old) State
    const commOld = hasComm ? calculatePartSchedule(state.commercial) : createEmptyResult();
    const provOld = hasProv ? calculatePartSchedule(state.provident) : createEmptyResult();
    const totalOldInterest = commOld.totalInterest + provOld.totalInterest;

    // 3. Apply Prepayment to Target
    let commNew = commOld;
    let provNew = provOld;
    let savedMonths = 0;

    // Resolve effective target (If single loan type, force target to that type)
    let effectiveTarget = target;
    if (state.type === LoanType.COMMERCIAL) effectiveTarget = 'commercial';
    if (state.type === LoanType.PROVIDENT) effectiveTarget = 'provident';

    if (effectiveTarget === 'commercial' && hasComm) {
        const res = calculateSinglePrepayment(state.commercial, prepayAmountWan, action);
        commNew = res.schedule;
        savedMonths = res.savedMonths;
    } else if (effectiveTarget === 'provident' && hasProv) {
        const res = calculateSinglePrepayment(state.provident, prepayAmountWan, action);
        provNew = res.schedule;
        savedMonths = res.savedMonths;
    }

    // 4. Merge
    const newTotalInterest = commNew.totalInterest + provNew.totalInterest;
    
    // First month total payment (Current month of new plan)
    // Note: If one loan is shortened to 0, its payment is 0.
    const newFirstMonthPayment = (commNew.firstMonthPayment || 0) + (provNew.firstMonthPayment || 0);

    // New Term Months (of the modified part)
    const newTermMonths = effectiveTarget === 'commercial' ? commNew.monthlyData.length : provNew.monthlyData.length;

    return {
        actionType: action,
        newMonthlyPayment: newFirstMonthPayment,
        newTermMonths: newTermMonths,
        savedInterest: Math.max(0, totalOldInterest - newTotalInterest),
        savedMonths: savedMonths,
        oldTotalInterest: totalOldInterest,
        newTotalInterest: newTotalInterest,
        firstMonthPayment: newFirstMonthPayment,
        target: effectiveTarget
    };
};

export const calculateMethodChange = (
    state: ExistingLoanState, 
    target: 'commercial' | 'provident'
): PrepaymentResult => {
    // 1. Determine active parts
    const hasComm = state.type === LoanType.COMMERCIAL || state.type === LoanType.COMBO;
    const hasProv = state.type === LoanType.PROVIDENT || state.type === LoanType.COMBO;

    // 2. Base
    const commOld = hasComm ? calculatePartSchedule(state.commercial) : createEmptyResult();
    const provOld = hasProv ? calculatePartSchedule(state.provident) : createEmptyResult();
    const totalOldInterest = commOld.totalInterest + provOld.totalInterest;

    // 3. Change Method of Target
    let commNew = commOld;
    let provNew = provOld;

    let effectiveTarget = target;
    if (state.type === LoanType.COMMERCIAL) effectiveTarget = 'commercial';
    if (state.type === LoanType.PROVIDENT) effectiveTarget = 'provident';

    if (effectiveTarget === 'commercial' && hasComm) {
        const part = state.commercial;
        const newMethod = part.method === PaymentMethod.EPI ? PaymentMethod.EP : PaymentMethod.EPI;
        // Recalculate full schedule with new method
        commNew = newMethod === PaymentMethod.EPI 
            ? calculateEPI(part.principal * 10000, part.rate, part.months)
            : calculateEP(part.principal * 10000, part.rate, part.months);
    } else if (effectiveTarget === 'provident' && hasProv) {
        const part = state.provident;
        const newMethod = part.method === PaymentMethod.EPI ? PaymentMethod.EP : PaymentMethod.EPI;
        provNew = newMethod === PaymentMethod.EPI 
            ? calculateEPI(part.principal * 10000, part.rate, part.months)
            : calculateEP(part.principal * 10000, part.rate, part.months);
    }

    const newTotalInterest = commNew.totalInterest + provNew.totalInterest;
    const newFirstMonthPayment = (commNew.firstMonthPayment || 0) + (provNew.firstMonthPayment || 0);

    return {
        actionType: 'changeMethod',
        newMonthlyPayment: newFirstMonthPayment,
        newTermMonths: effectiveTarget === 'commercial' ? state.commercial.months : state.provident.months,
        savedInterest: totalOldInterest - newTotalInterest, // Can be negative
        savedMonths: 0,
        oldTotalInterest: totalOldInterest,
        newTotalInterest: newTotalInterest,
        target: effectiveTarget
    };
};

// --- Smart Strategy Logic ---

// 1. Target Years -> How much extra monthly?
export const calculateSmartTargetYears = (
    principalWan: number, 
    rate: number, 
    currentYears: number, 
    targetYears: number
) => {
    const principal = principalWan * 10000;
    const currentMonths = currentYears * 12;
    const targetMonths = targetYears * 12;

    const oldSchedule = calculateEPI(principal, rate, currentMonths);
    const newSchedule = calculateEPI(principal, rate, targetMonths);

    return {
        extraMonthly: newSchedule.firstMonthPayment - oldSchedule.firstMonthPayment,
        savedInterest: oldSchedule.totalInterest - newSchedule.totalInterest,
        originalInterest: oldSchedule.totalInterest
    };
};

// 2. Max Interest -> How much extra monthly (Implies shortening term until interest < max)
export const calculateSmartMaxInterest = (
    principalWan: number,
    rate: number,
    currentYears: number,
    maxInterestWan: number
) => {
    const principal = principalWan * 10000;
    const maxInterest = maxInterestWan * 10000;
    const currentMonths = currentYears * 12;

    const minSched = calculateEPI(principal, rate, 1);
    if (minSched.totalInterest > maxInterest) return null; // Impossible

    let low = 1;
    let high = currentMonths;
    let bestMonths = currentMonths;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const sched = calculateEPI(principal, rate, mid);
        if (sched.totalInterest <= maxInterest) {
            bestMonths = mid;
            low = mid + 1;
        } else {
             high = mid - 1;
        }
    }
    
    const finalSched = calculateEPI(principal, rate, bestMonths);
    const originalSched = calculateEPI(principal, rate, currentMonths);

    return {
        newMonthly: finalSched.firstMonthPayment,
        extraMonthly: finalSched.firstMonthPayment - originalSched.firstMonthPayment,
        months: bestMonths,
        actualInterest: finalSched.totalInterest,
        originalInterest: originalSched.totalInterest
    };
};

// 3. Target Monthly Payment -> Lump sum needed
export const calculateSmartTargetPayment = (
    principalWan: number,
    rate: number,
    years: number,
    targetPayment: number
) => {
    const principal = principalWan * 10000;
    const months = years * 12;
    const r = rate / 100 / 12;
    
    const factor = (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months));
    const newPrincipal = targetPayment * factor;
    
    const lumpSum = Math.max(0, principal - newPrincipal);
    
    return {
        lumpSum: lumpSum,
        newPrincipal: newPrincipal
    };
};

// 4. Annual Prepayment -> How much term reduced?
export const calculateSmartAnnualPrepayment = (
  principalWan: number,
  rate: number,
  years: number,
  annualAmountWan: number,
  prepayMonth: number // 1-12
) => {
  const principal = principalWan * 10000;
  const annualPrepay = annualAmountWan * 10000;
  const monthlyRate = rate / 100 / 12;
  const totalMonths = years * 12;

  // 1. Calculate Original Schedule (Standard EPI)
  // We assume 'Shorten Term' strategy: Maintain the original monthly payment amount
  const originalRes = calculateEPI(principal, rate, totalMonths);
  const fixedPayment = originalRes.firstMonthPayment;
  const originalInterest = originalRes.totalInterest;

  // 2. Simulate New Schedule
  let balance = principal;
  let currentMonth = 0;
  let totalInterest = 0;

  // Simulation loop
  while (balance > 10 && currentMonth < totalMonths * 2) { // Buffer for loop safety
    currentMonth++;
    
    // Normal Payment for this month
    const interest = balance * monthlyRate;
    let principalPaid = fixedPayment - interest;
    
    // Payoff check
    if (balance - principalPaid <= 0) {
        // Final payoff (simplify: pay remaining balance)
        totalInterest += interest; 
        balance = 0;
        break;
    }

    balance -= principalPaid;
    totalInterest += interest;

    // Check Annual Prepayment
    // If prepayMonth is 1, it means the 1st month of each year (1, 13, 25...)
    // currentMonth is 1-based index. 
    // Logic: if currentMonth % 12 === prepayMonth % 12?
    // If prepayMonth = 1, currentMonth = 1, 13, 25... -> (1-1)%12 + 1 = 1. Correct.
    // If prepayMonth = 12, currentMonth = 12, 24... -> (12-1)%12 + 1 = 12. Correct.
    
    const monthInYear = (currentMonth - 1) % 12 + 1;
    if (monthInYear === prepayMonth && balance > 0) {
        const actualPrepay = Math.min(balance, annualPrepay);
        balance -= actualPrepay;
    }
    
    if (balance <= 0) break;
  }

  return {
    savedYears: Math.max(0, (totalMonths - currentMonth) / 12),
    newYears: currentMonth / 12,
    savedInterest: Math.max(0, originalInterest - totalInterest),
    originalInterest: originalInterest
  };
};
