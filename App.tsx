import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calculator, PieChart, Banknote, ArrowRight, TrendingDown, Clock, Coins, ChevronRight, CheckCircle2, Info, Sparkles, Calendar, ArrowRightCircle, RefreshCw } from 'lucide-react';
import { LoanParams, LoanType, FullComparison, PaymentMethod, ExistingLoanState } from './types';
import { 
    calculateMortgage, 
    calculatePrepayment, 
    calculateMethodChange,
    calculateSmartTargetYears,
    calculateSmartMaxInterest,
    calculateSmartTargetPayment,
    calculateSmartAnnualPrepayment
} from './utils/mortgageCalculations';
import { ComparisonCards } from './components/ComparisonCards';
import { ResultsChart } from './components/ResultsChart';
import { GeminiInput } from './components/GeminiInput';
import { RepaymentList } from './components/RepaymentList';

// Helper for Cell Style Input - Moved outside App to prevent re-render focus loss
const InputCell = ({ label, value, onChange, unit, type = "number", step, placeholder = "0", actionIcon, onAction }: any) => {
    const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());

    useEffect(() => {
        const numericLocal = parseFloat(localValue);
        const numericProp = Number(value);

        // Avoid overwriting user input if it essentially matches the prop value
        // e.g. User types "1.", prop is 1. Don't overwrite.
        if (numericLocal === numericProp) return;

        // Special case: Prop is 0, Local is empty. Treat as match to keep field empty.
        if (numericProp === 0 && localValue === '') return;

        // Otherwise, parent controlled update (e.g. from AI or calculation reset)
        setLocalValue(numericProp === 0 ? '' : numericProp.toString());
    }, [value, localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;
        
        // UX Fix: Prevent "05", "050" etc. Strip leading zeros unless it's "0." or just "0"
        if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
            raw = raw.replace(/^0+/, '');
            if (raw === '') raw = '0';
        }

        setLocalValue(raw);
        
        // Pass corrected value to parent
        onChange({
            ...e,
            target: {
                ...e.target,
                value: raw
            }
        });
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <label className="text-gray-700 font-medium shrink-0">{label}</label>
            <div className="flex items-center gap-2 flex-1 justify-end">
                <input 
                    type={type}
                    inputMode="decimal"
                    value={localValue} 
                    step={step}
                    onChange={handleChange}
                    className="text-right font-bold text-slate-900 bg-transparent outline-none w-full placeholder-gray-300 focus:text-indigo-600 transition-colors text-lg"
                    placeholder={placeholder}
                />
                {actionIcon && (
                    <button onClick={onAction} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-full transition-colors" title="重置为官方利率">
                        {actionIcon}
                    </button>
                )}
                {unit && <span className="text-gray-400 text-sm font-medium shrink-0">{unit}</span>}
            </div>
        </div>
    );
};

// Helper for Bare Input (Smart Cards) that handles "0" state correctly
const BareInput = ({ value, onChange, className, type = "number", ...props }: any) => {
    const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());

    useEffect(() => {
        const numericLocal = parseFloat(localValue);
        const numericProp = Number(value);

        if (numericLocal === numericProp) return;
        if (numericProp === 0 && localValue === '') return;

        setLocalValue(numericProp === 0 ? '' : numericProp.toString());
    }, [value, localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;
        
        if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
            raw = raw.replace(/^0+/, '');
            if (raw === '') raw = '0';
        }

        setLocalValue(raw);
        e.target.value = raw;
        onChange(e);
    };

    return (
        <input 
            type={type}
            value={localValue} 
            onChange={handleChange}
            className={className}
            {...props}
        />
    );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'existing' | 'smart'>('new');
  
  // Tab 1 State
  const [params, setParams] = useState<LoanParams>({
    type: LoanType.COMMERCIAL,
    commercialAmount: 100,
    commercialRate: 3.50, 
    commercialYears: 30,
    providentAmount: 80,
    providentRate: 2.60, 
    providentYears: 30,
  });
  const [result, setResult] = useState<FullComparison | null>(null);
  const [calculating, setCalculating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Tab 2 State (Composite)
  const [existState, setExistState] = useState<ExistingLoanState>({
    type: LoanType.COMMERCIAL,
    commercial: {
        principal: 100,
        months: 240,
        rate: 3.50, 
        method: PaymentMethod.EPI
    },
    provident: {
        principal: 50,
        months: 240,
        rate: 2.60,
        method: PaymentMethod.EPI
    }
  });

  const [prepayAmount, setPrepayAmount] = useState(10);
  const [prepayTarget, setPrepayTarget] = useState<'commercial' | 'provident'>('commercial');
  const [prepayResult, setPrepayResult] = useState<any>(null);
  const [methodResult, setMethodResult] = useState<any>(null);

  // Tab 3 State
  const [smartParams, setSmartParams] = useState({
     principal: 100,
     rate: 3.50,
     years: 30,
     annualAmount: 5,
     annualMonth: 1
  });
  
  // Specific inputs for calculations
  const [targetYearsInput, setTargetYearsInput] = useState(25);
  const [maxInterestInput, setMaxInterestInput] = useState(50);
  const [targetPaymentInput, setTargetPaymentInput] = useState(5000);

  const [smartResult, setSmartResult] = useState<any>({});

  // Memoize base data for Smart Strategy comparison
  const smartBaseData = useMemo(() => {
     // Quick calc for base comparison (assuming Commercial EPI for simplicity)
     const res = calculateMortgage({
        type: LoanType.COMMERCIAL,
        commercialAmount: smartParams.principal,
        commercialRate: smartParams.rate,
        commercialYears: smartParams.years,
        providentAmount: 0,
        providentRate: 0,
        providentYears: 0
     });
     return {
        monthly: res.epi.monthlyData[0]?.payment || 0,
        totalInterest: res.epi.totalInterest,
        totalPayment: res.epi.totalPayment
     };
  }, [smartParams.principal, smartParams.rate, smartParams.years]);

  // Effect: Auto-update smart strategy inputs based on baseline data to provide "humanized" defaults
  useEffect(() => {
      // 1. Target Years: Default to current - 5 (or 5 if too short)
      const suggestedYears = Math.max(1, smartParams.years - 5);
      setTargetYearsInput(suggestedYears);

      // 2. Max Interest: Default to nearest lower multiple of 10
      const currentInterestWan = smartBaseData.totalInterest / 10000;
      let suggestedInterest = Math.floor(currentInterestWan / 10) * 10;
      // If rounding didn't lower it (e.g. exactly 60.0), step down by 10
      if (suggestedInterest >= currentInterestWan) {
          suggestedInterest -= 10;
      }
      // If it falls too low (e.g. < 0), use a safer 90% fallback
      if (suggestedInterest <= 0) {
          suggestedInterest = Math.floor(currentInterestWan * 0.9);
      }
      setMaxInterestInput(Math.max(1, suggestedInterest));

      // 3. Target Payment: Round down current payment to nearest 500 or 1000
      const currentMonthly = smartBaseData.monthly;
      let suggestedPayment = 0;
      if (currentMonthly > 1000) {
          // e.g. 4297 -> 4000
          suggestedPayment = Math.floor(currentMonthly / 1000) * 1000; 
          if (suggestedPayment === 0) suggestedPayment = Math.floor(currentMonthly / 500) * 500;
      } else {
          suggestedPayment = Math.floor(currentMonthly / 100) * 100;
      }
      // Ensure it's non-zero and less than current
      if (suggestedPayment >= currentMonthly) suggestedPayment = Math.floor(currentMonthly * 0.9);
      
      setTargetPaymentInput(Math.max(100, suggestedPayment));

      // Reset results when base data changes
      setSmartResult({});
  }, [smartBaseData, smartParams.years]);


  // Core Calculation Wrapper
  const performCalculation = (currentParams: LoanParams) => {
    setCalculating(true);
    setTimeout(() => {
      const res = calculateMortgage(currentParams);
      setResult(res);
      setCalculating(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 400);
  };

  const handleCalculate = () => performCalculation(params);

  const handleNewLoanTypeSwitch = (newType: LoanType) => {
    if (params.type === newType) return;
    setParams(prev => ({ ...prev, type: newType }));
    setResult(null);
  };

  const handlePrepayCalc = (action: 'shorten' | 'reduce') => {
      const res = calculatePrepayment(existState, prepayAmount, action, prepayTarget);
      setPrepayResult(res);
      setMethodResult(null); // clear other result
  };

  const handleMethodChangeCalc = () => {
      const res = calculateMethodChange(existState, prepayTarget);
      setMethodResult(res);
      setPrepayResult(null);
  };

  // Smart Strategy Handlers
  const handleSmartYears = (targetYears: number) => {
      const res = calculateSmartTargetYears(smartParams.principal, smartParams.rate, smartParams.years, targetYears);
      setSmartResult({ ...smartResult, years: res });
  };
  const handleSmartInterest = (maxInterest: number) => {
      const res = calculateSmartMaxInterest(smartParams.principal, smartParams.rate, smartParams.years, maxInterest);
      setSmartResult({ ...smartResult, interest: res });
  };
  const handleSmartPayment = (targetPayment: number) => {
      const res = calculateSmartTargetPayment(smartParams.principal, smartParams.rate, smartParams.years, targetPayment);
      setSmartResult({ ...smartResult, payment: res });
  };
  const handleSmartAnnual = () => {
      const res = calculateSmartAnnualPrepayment(smartParams.principal, smartParams.rate, smartParams.years, smartParams.annualAmount, smartParams.annualMonth);
      setSmartResult({ ...smartResult, annual: res });
  };
  
  const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleAIUpdate = (newParams: Partial<LoanParams>) => {
      setParams(prev => ({ ...prev, ...newParams }));
      setActiveTab('new');
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F5F7FA]">
      <div className="max-w-2xl mx-auto">
        
        {/* Compact Header */}
        <div className="bg-white pb-6 pt-8 px-6 rounded-b-[32px] shadow-sm mb-6">
            <h1 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Calculator size={18} />
                </div>
                房贷精算师
            </h1>
            <p className="text-gray-400 text-xs font-medium pl-10">AI智能规划 · 提前还款 · 省息策略</p>
            
            {/* Segmented Control Tabs */}
            <div className="mt-6 bg-gray-100 p-1 rounded-xl flex">
                {[
                  { id: 'new', label: '新贷款' },
                  { id: 'existing', label: '提前还款' },
                  { id: 'smart', label: '智能策略' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>
        </div>

        <div className="px-4">
            
            {/* TAB 1: NEW LOAN */}
            {activeTab === 'new' && (
                <div className="animate-fade-in space-y-6">
                    {/* Loan Type Selector */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-3">贷款类型</div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { val: LoanType.COMMERCIAL, label: '商业贷款' },
                                { val: LoanType.PROVIDENT, label: '公积金' },
                                { val: LoanType.COMBO, label: '组合贷款' },
                            ].map(type => {
                                const isActive = params.type === type.val;
                                return (
                                    <button
                                        key={type.val}
                                        onClick={() => handleNewLoanTypeSwitch(type.val)}
                                        className={`
                                            relative flex items-center justify-center py-3.5 rounded-xl text-sm font-bold transition-all duration-200
                                            ${isActive 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-y-[-2px]' 
                                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                                            }
                                        `}
                                    >
                                        {type.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* New Loan Guide Text */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-700 leading-relaxed shadow-sm">
                        <div className="flex items-center gap-2 font-bold mb-2 text-blue-800">
                            <Info size={14} /> 填写指南
                        </div>
                        <ul className="space-y-1.5 opacity-90">
                            <li>• <strong>贷款金额</strong>：填写入账本金（不含首付），单位为万元。</li>
                            <li>• <strong>参考利率</strong>：LPR报价 3.50%，公积金 2.60% (5年以上)。</li>
                            <li>• <strong>贷款年限</strong>：最长通常为 30 年，组合贷两部分年限可以不同。</li>
                        </ul>
                    </div>

                    {/* Commercial Inputs */}
                    {(params.type === LoanType.COMMERCIAL || params.type === LoanType.COMBO) && (
                        <div className="bg-white rounded-2xl px-5 py-2 shadow-sm">
                             {params.type === LoanType.COMBO && <div className="py-3 text-xs font-bold text-indigo-600 border-b border-indigo-50 uppercase">主贷 (商贷部分)</div>}
                             <InputCell 
                                label="商贷金额" 
                                value={params.commercialAmount} 
                                onChange={(e: any) => setParams({...params, commercialAmount: Number(e.target.value)})} 
                                unit="万元" 
                                placeholder="请输入"
                            />
                             <InputCell 
                                label="商贷利率" 
                                value={params.commercialRate} 
                                step="0.01"
                                onChange={(e: any) => setParams({...params, commercialRate: Number(e.target.value)})} 
                                unit="%" 
                                placeholder="例: 3.50"
                             />
                             <InputCell 
                                label="商贷年限" 
                                value={params.commercialYears} 
                                onChange={(e: any) => setParams({...params, commercialYears: Number(e.target.value)})} 
                                unit="年" 
                                placeholder="例: 30"
                             />
                        </div>
                    )}

                    {/* Provident Inputs */}
                    {(params.type === LoanType.PROVIDENT || params.type === LoanType.COMBO) && (
                        <div className="bg-white rounded-2xl px-5 py-2 shadow-sm">
                            {params.type === LoanType.COMBO && <div className="py-3 text-xs font-bold text-orange-600 border-b border-orange-50 uppercase">辅贷 (公积金部分)</div>}
                             <InputCell 
                                label="公积金金额" 
                                value={params.providentAmount} 
                                onChange={(e: any) => setParams({...params, providentAmount: Number(e.target.value)})} 
                                unit="万元" 
                                placeholder="请输入"
                             />
                             <InputCell 
                                label="公积金利率" 
                                value={params.providentRate} 
                                step="0.01"
                                onChange={(e: any) => setParams({...params, providentRate: Number(e.target.value)})} 
                                unit="%" 
                                placeholder="例: 2.60"
                             />
                             <InputCell 
                                label="公积金年限" 
                                value={params.providentYears} 
                                onChange={(e: any) => setParams({...params, providentYears: Number(e.target.value)})} 
                                unit="年" 
                                placeholder="例: 30"
                             />
                        </div>
                    )}
                    
                    {/* Calculate Button */}
                    <button 
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {calculating ? '计算中...' : '开始计算'}
                        {!calculating && <ArrowRight size={20} />}
                    </button>
                    
                    {/* Results Area */}
                    {result && (
                        <div ref={resultsRef} className="animate-fade-in-up space-y-6 pt-4">
                             <div className="flex items-center gap-2 px-1">
                                <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                                <h2 className="text-lg font-bold text-slate-800">计算结果</h2>
                             </div>
                             
                             <ComparisonCards data={result} />
                             <ResultsChart data={result} />
                             <RepaymentList data={result} loanType={params.type} />
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: EXISTING / PREPAY */}
            {activeTab === 'existing' && (
                <div className="animate-fade-in space-y-6">
                    {/* Existing Loan Config */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-3">当前贷款类型</div>
                        <div className="flex gap-2">
                             {[
                                { val: LoanType.COMMERCIAL, label: '商贷' },
                                { val: LoanType.PROVIDENT, label: '公积金' },
                                { val: LoanType.COMBO, label: '组合贷' },
                            ].map(t => (
                                <button
                                    key={t.val}
                                    onClick={() => {
                                        setExistState(s => ({...s, type: t.val}));
                                        setPrepayResult(null);
                                        setMethodResult(null);
                                    }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${existState.type === t.val ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-500'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Guide Text */}
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-700 leading-relaxed shadow-sm">
                        <div className="flex items-center gap-2 font-bold mb-2 text-indigo-800">
                            <Info size={14} /> 参数填写指南
                        </div>
                        <ul className="space-y-1.5 opacity-90">
                            <li>• <strong>剩余本金</strong>：请查询银行APP“当前剩余未还本金”（非原始贷款额）。</li>
                            <li>• <strong>剩余期数</strong>：即剩余还款月数（如剩余20年则填240）。</li>
                            <li>• <strong>当前利率</strong>：请输入当前的实际执行利率（LPR+基点）。</li>
                            <li>• <strong>还款方式</strong>：当前正在使用的还款方式（等额本息/等额本金）。</li>
                        </ul>
                    </div>

                    {/* Inputs */}
                    <div className="bg-white rounded-2xl px-5 py-2 shadow-sm">
                        {/* Commercial Inputs */}
                        {(existState.type === LoanType.COMMERCIAL || existState.type === LoanType.COMBO) && (
                            <>
                                {existState.type === LoanType.COMBO && <div className="py-3 text-xs font-bold text-indigo-600 border-b border-indigo-50 uppercase">商贷部分</div>}
                                <InputCell label="剩余本金" value={existState.commercial.principal} onChange={(e: any) => setExistState({...existState, commercial: {...existState.commercial, principal: Number(e.target.value)}})} unit="万元" />
                                <InputCell label="剩余期数" value={existState.commercial.months} onChange={(e: any) => setExistState({...existState, commercial: {...existState.commercial, months: Number(e.target.value)}})} unit="月" />
                                <InputCell label="当前利率" value={existState.commercial.rate} onChange={(e: any) => setExistState({...existState, commercial: {...existState.commercial, rate: Number(e.target.value)}})} unit="%" />
                                <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                                    <span className="text-gray-700 font-medium">还款方式</span>
                                    <select 
                                        value={existState.commercial.method} 
                                        onChange={e => setExistState({...existState, commercial: {...existState.commercial, method: e.target.value as PaymentMethod}})}
                                        className="text-right font-bold text-slate-900 bg-transparent outline-none dir-rtl"
                                    >
                                        <option value={PaymentMethod.EPI}>等额本息</option>
                                        <option value={PaymentMethod.EP}>等额本金</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Provident Inputs */}
                        {(existState.type === LoanType.PROVIDENT || existState.type === LoanType.COMBO) && (
                             <>
                                {existState.type === LoanType.COMBO && <div className="py-3 text-xs font-bold text-orange-600 border-b border-orange-50 mt-4 uppercase">公积金部分</div>}
                                <InputCell label="剩余本金" value={existState.provident.principal} onChange={(e: any) => setExistState({...existState, provident: {...existState.provident, principal: Number(e.target.value)}})} unit="万元" />
                                <InputCell label="剩余期数" value={existState.provident.months} onChange={(e: any) => setExistState({...existState, provident: {...existState.provident, months: Number(e.target.value)}})} unit="月" />
                                <InputCell label="当前利率" value={existState.provident.rate} onChange={(e: any) => setExistState({...existState, provident: {...existState.provident, rate: Number(e.target.value)}})} unit="%" />
                                <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                                    <span className="text-gray-700 font-medium">还款方式</span>
                                    <select 
                                        value={existState.provident.method} 
                                        onChange={e => setExistState({...existState, provident: {...existState.provident, method: e.target.value as PaymentMethod}})}
                                        className="text-right font-bold text-slate-900 bg-transparent outline-none dir-rtl"
                                    >
                                        <option value={PaymentMethod.EPI}>等额本息</option>
                                        <option value={PaymentMethod.EP}>等额本金</option>
                                    </select>
                                </div>
                             </>
                        )}
                    </div>

                    {/* Action Cards */}
                    <div className="space-y-4">
                         {/* Card 1: Lump Sum */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><Banknote size={18}/></div>
                                <h3 className="font-bold text-slate-800">一次性提前还本</h3>
                            </div>
                            
                            {existState.type === LoanType.COMBO && (
                                <div className="bg-gray-50 p-1 rounded-lg flex mb-4">
                                     <button onClick={() => setPrepayTarget('commercial')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${prepayTarget === 'commercial' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>优先还商贷</button>
                                     <button onClick={() => setPrepayTarget('provident')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${prepayTarget === 'provident' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>优先还公积金</button>
                                </div>
                            )}

                            <InputCell label="还款金额" value={prepayAmount} onChange={(e:any) => setPrepayAmount(Number(e.target.value))} unit="万元" />
                            
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button onClick={() => handlePrepayCalc('shorten')} className="bg-rose-500 active:bg-rose-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200">
                                    缩短年限 (省息)
                                </button>
                                <button onClick={() => handlePrepayCalc('reduce')} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm">
                                    减少月供 (减压)
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Method Change */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500"><TrendingDown size={18}/></div>
                                <h3 className="font-bold text-slate-800">变更还款方式</h3>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl mb-4 text-sm">
                                <span className="font-bold text-slate-500">
                                    {((existState.type === LoanType.COMBO || existState.type === LoanType.COMMERCIAL) && prepayTarget === 'commercial') ? 
                                        (existState.commercial.method === PaymentMethod.EPI ? '等额本息' : '等额本金') : 
                                        (existState.provident.method === PaymentMethod.EPI ? '等额本息' : '等额本金')
                                    }
                                </span>
                                <ArrowRight size={16} className="text-gray-300"/>
                                <span className="font-bold text-indigo-600">
                                     {((existState.type === LoanType.COMBO || existState.type === LoanType.COMMERCIAL) && prepayTarget === 'commercial') ? 
                                        (existState.commercial.method === PaymentMethod.EPI ? '等额本金' : '等额本息') : 
                                        (existState.provident.method === PaymentMethod.EPI ? '等额本金' : '等额本息')
                                    }
                                </span>
                            </div>
                            <button onClick={handleMethodChangeCalc} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200">
                                立即试算变更
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    {(prepayResult || methodResult) && (
                        <div className="animate-fade-in-up mt-6">
                            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="text-center text-gray-400 text-xs mb-6 uppercase tracking-widest">
                                         {prepayResult ? '提前还款试算结果' : '还款方式变更结果'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">新月供 (合计)</div>
                                            <div className="text-2xl font-black text-emerald-400">
                                                ¥{formatMoney((prepayResult || methodResult).newMonthlyPayment)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">
                                                {(prepayResult || methodResult).savedInterest >= 0 ? '总利息节省' : '总利息增加'}
                                            </div>
                                            <div className={`text-2xl font-black ${(prepayResult || methodResult).savedInterest >= 0 ? 'text-rose-400' : 'text-rose-500'}`}>
                                                ¥{(Math.abs((prepayResult || methodResult).savedInterest) / 10000).toFixed(2)}万
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
                                        <span className="text-xs text-gray-300">
                                            {(prepayResult || methodResult).target === 'commercial' ? '商贷' : '公积金'}剩余年限
                                        </span>
                                        <span className="font-bold text-blue-300">{((prepayResult || methodResult).newTermMonths / 12).toFixed(1)}年</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: SMART STRATEGY */}
            {activeTab === 'smart' && (
                <div className="animate-fade-in space-y-6">
                     {/* Guide Text */}
                     <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-xs text-purple-700 leading-relaxed shadow-sm">
                        <div className="flex items-center gap-2 font-bold mb-2 text-purple-800">
                            <Sparkles size={14} /> 智能反向推算引擎
                        </div>
                        <p className="mb-2 opacity-90">不确定该怎么还款最划算？只需输入目标（如“想在20年内还清”或“月供想降到5000”），系统自动为您反推最佳方案。</p>
                        <ul className="space-y-1.5 opacity-90">
                            <li>• <strong>缩短年限</strong>：适合想早点还清、减少总利息的人群。</li>
                            <li>• <strong>利息控制</strong>：适合对总利息支出有严格预算的人群。</li>
                            <li>• <strong>降低月供</strong>：适合觉得当前月供压力大，想通过一次性还款来减压的人群。</li>
                            <li>• <strong>固定年冲</strong>：适合每年有固定奖金/结余，想定期加速还款的人群。</li>
                        </ul>
                     </div>

                     {/* Base Data Card */}
                     <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                         <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full -ml-12 -mb-12 blur-xl"></div>
                         
                         <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6 opacity-90">
                                <div className="flex items-center gap-2">
                                    <PieChart size={20} />
                                    <span className="font-bold text-base tracking-wide">基础贷款数据</span>
                                </div>
                                <div className="text-xs bg-white/20 px-2 py-1 rounded-lg">实时参考</div>
                            </div>
                            
                            {/* Input Fields */}
                            <div className="space-y-5">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-sm font-medium text-white/80">贷款本金</span>
                                    <div className="flex items-baseline gap-1">
                                       <BareInput 
                                           inputMode="decimal"
                                           value={smartParams.principal} 
                                           onChange={(e: any) => setSmartParams({...smartParams, principal: Number(e.target.value)})} 
                                           className="bg-transparent text-right font-black text-2xl w-24 outline-none placeholder-white/30 focus:border-b-2 border-white/50 transition-all" 
                                       />
                                       <span className="text-sm font-medium">万</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-sm font-medium text-white/80">年利率</span>
                                    <div className="flex items-baseline gap-1">
                                       <BareInput 
                                           inputMode="decimal"
                                           step="0.01" 
                                           value={smartParams.rate} 
                                           onChange={(e: any) => setSmartParams({...smartParams, rate: Number(e.target.value)})} 
                                           className="bg-transparent text-right font-black text-2xl w-24 outline-none placeholder-white/30 focus:border-b-2 border-white/50 transition-all" 
                                       />
                                       <span className="text-sm font-medium">%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-white/80">贷款年限</span>
                                    <div className="flex items-baseline gap-1">
                                       <BareInput 
                                           inputMode="decimal"
                                           value={smartParams.years} 
                                           onChange={(e: any) => setSmartParams({...smartParams, years: Number(e.target.value)})} 
                                           className="bg-transparent text-right font-black text-2xl w-24 outline-none placeholder-white/30 focus:border-b-2 border-white/50 transition-all" 
                                       />
                                       <span className="text-sm font-medium">年</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Live Base Calculation Display */}
                            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-white/60 mb-1">当前参考月供</div>
                                    <div className="text-lg font-bold">¥{formatMoney(smartBaseData.monthly)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-white/60 mb-1">当前总利息</div>
                                    <div className="text-lg font-bold">¥{(smartBaseData.totalInterest / 10000).toFixed(2)}万</div>
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Strategy Cards Grid */}
                     <div className="grid gap-5">
                         
                         {/* Card 1: Shorten Years */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-5 border-b border-slate-50">
                                 <div className="flex items-center gap-2 mb-4">
                                     <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                         <Clock size={20} />
                                     </div>
                                     <div>
                                         <h3 className="font-bold text-slate-800">缩短年限</h3>
                                         <p className="text-xs text-gray-400">
                                             当前 {smartParams.years} 年，我想缩短到...
                                         </p>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between relative">
                                     <label className="text-sm font-bold text-slate-600">目标年限</label>
                                     <div className="flex items-center gap-2">
                                         <BareInput 
                                             inputMode="decimal"
                                             max={smartParams.years - 1}
                                             value={targetYearsInput} 
                                             onChange={(e: any) => setTargetYearsInput(Number(e.target.value))}
                                             onBlur={(e: any) => handleSmartYears(Number(e.target.value))} 
                                             className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100" 
                                         />
                                         <span className="text-sm font-bold text-slate-400">年</span>
                                     </div>
                                     <div className="absolute -bottom-4 right-0 text-[10px] text-gray-400">
                                         {'< '}{smartParams.years}年
                                     </div>
                                 </div>
                             </div>
                             
                             {smartResult.years && (
                                 <div className="bg-indigo-50/50 p-5 animate-fade-in space-y-4">
                                     {/* Interest Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-indigo-100 pb-3">
                                         <div>
                                             <div className="mb-1">原总利息</div>
                                             <div className="font-bold text-slate-700">¥{(smartResult.years.originalInterest / 10000).toFixed(2)}万</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="mb-1">新总利息</div>
                                             <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{((smartResult.years.originalInterest - smartResult.years.savedInterest) / 10000).toFixed(2)}万
                                                <TrendingDown size={12}/>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Monthly Payment Comparison */}
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-slate-500">月供变化</span>
                                         <div className="flex items-center gap-2 font-bold text-slate-700">
                                             ¥{formatMoney(smartBaseData.monthly)}
                                             <ArrowRight size={14} className="text-indigo-300"/>
                                             <span className="text-indigo-600">¥{formatMoney(smartBaseData.monthly + smartResult.years.extraMonthly)}</span>
                                         </div>
                                     </div>
                                     
                                     {/* Key Metrics */}
                                     <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">投入</span>
                                             <span className="font-bold text-rose-500">
                                                +¥{formatMoney(smartResult.years.extraMonthly)}<span className="text-xs text-rose-300 font-normal">/月</span>
                                             </span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">回报</span>
                                             <span className="font-bold text-emerald-600">
                                                省息 ¥{(smartResult.years.savedInterest / 10000).toFixed(2)}万
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Card 2: Max Interest */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-5 border-b border-slate-50">
                                 <div className="flex items-center gap-2 mb-4">
                                     <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
                                         <Coins size={20} />
                                     </div>
                                     <div>
                                         <h3 className="font-bold text-slate-800">利息控制</h3>
                                         <p className="text-xs text-gray-400">当前利息 {(smartBaseData.totalInterest / 10000).toFixed(2)} 万，我想控制在...</p>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between relative">
                                     <label className="text-sm font-bold text-slate-600">利息上限</label>
                                     <div className="flex items-center gap-2">
                                         <BareInput 
                                             inputMode="decimal"
                                             max={(smartBaseData.totalInterest/10000) - 1}
                                             value={maxInterestInput}
                                             onChange={(e: any) => setMaxInterestInput(Number(e.target.value))}
                                             onBlur={(e: any) => handleSmartInterest(Number(e.target.value))} 
                                             className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 font-bold text-rose-500 outline-none focus:ring-2 focus:ring-rose-100" 
                                         />
                                         <span className="text-sm font-bold text-slate-400">万</span>
                                     </div>
                                     <div className="absolute -bottom-4 right-0 text-[10px] text-gray-400">
                                         {'< '}{(smartBaseData.totalInterest/10000).toFixed(0)}万
                                     </div>
                                 </div>
                             </div>
                             
                             {smartResult.interest && (
                                 <div className="bg-rose-50/50 p-5 animate-fade-in space-y-4">
                                     {/* Interest Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-rose-100 pb-3">
                                         <div>
                                             <div className="mb-1">原总利息</div>
                                             <div className="font-bold text-slate-700">¥{(smartResult.interest.originalInterest / 10000).toFixed(2)}万</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="mb-1">新总利息</div>
                                             <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{(smartResult.interest.actualInterest / 10000).toFixed(2)}万
                                                <TrendingDown size={12}/>
                                             </div>
                                         </div>
                                     </div>

                                      {/* Years Comparison */}
                                      <div className="flex justify-between items-center text-sm">
                                         <span className="text-slate-500">还款年限</span>
                                         <div className="flex items-center gap-2 font-bold text-slate-700">
                                             {smartParams.years}年 
                                             <ArrowRight size={14} className="text-rose-300"/>
                                             <span className="text-emerald-600">{Math.ceil(smartResult.interest.months/12)}年</span>
                                         </div>
                                      </div>
                                      
                                     {/* Key Metrics */}
                                     <div className="bg-white rounded-lg p-3 border border-rose-100 shadow-sm">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">新月供</span>
                                             <span className="font-bold text-rose-500">
                                                ¥{formatMoney(smartResult.interest.newMonthly)}
                                             </span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">缩短</span>
                                             <span className="font-bold text-emerald-600">
                                                 {(smartParams.years - smartResult.interest.months/12).toFixed(1)} 年
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Card 3: Target Payment */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-5 border-b border-slate-50">
                                 <div className="flex items-center gap-2 mb-4">
                                     <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
                                         <TrendingDown size={20} />
                                     </div>
                                     <div>
                                         <h3 className="font-bold text-slate-800">降低月供</h3>
                                         <p className="text-xs text-gray-400">当前月供 {formatMoney(smartBaseData.monthly)}，我想降到...</p>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between relative">
                                     <label className="text-sm font-bold text-slate-600">期望月供</label>
                                     <div className="flex items-center gap-2">
                                         <BareInput 
                                             inputMode="decimal"
                                             max={Math.round(smartBaseData.monthly) - 1}
                                             value={targetPaymentInput}
                                             onChange={(e: any) => setTargetPaymentInput(Number(e.target.value))}
                                             onBlur={(e: any) => handleSmartPayment(Number(e.target.value))} 
                                             className="w-20 text-center bg-white border border-slate-200 rounded-lg py-1.5 font-bold text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-100" 
                                         />
                                         <span className="text-sm font-bold text-slate-400">元</span>
                                     </div>
                                     <div className="absolute -bottom-4 right-0 text-[10px] text-gray-400">
                                         {'< '}{formatMoney(smartBaseData.monthly)}
                                     </div>
                                 </div>
                             </div>
                             
                             {smartResult.payment && (
                                 <div className="bg-emerald-50/50 p-5 animate-fade-in space-y-4">
                                     {/* Monthly Payment Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-emerald-100 pb-3">
                                        <div>
                                            <div className="mb-1">原月供</div>
                                            <div className="font-bold text-slate-700">¥{formatMoney(smartBaseData.monthly)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">新月供</div>
                                            <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{targetPaymentInput.toFixed(2)}
                                                <TrendingDown size={12}/>
                                            </div>
                                        </div>
                                    </div>

                                     {/* Key Metrics */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-100 shadow-sm text-center">
                                         <div className="text-xs font-bold text-slate-400 mb-1">需一次性还本</div>
                                         <div className="font-black text-rose-500 text-xl mb-1">
                                            ¥{(smartResult.payment.lumpSum / 10000).toFixed(2)}万
                                         </div>
                                         <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                                             一次性投入，月供永久降低
                                         </div>
                                    </div>
                                 </div>
                             )}
                         </div>

                         {/* Card 4: Annual Prepayment */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-5 border-b border-slate-50">
                                 <div className="flex items-center gap-2 mb-4">
                                     <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                                         <Calendar size={20} />
                                     </div>
                                     <div>
                                         <h3 className="font-bold text-slate-800">固定年冲</h3>
                                         <p className="text-xs text-gray-400">每年有结余？试试定期加速还款</p>
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <label className="text-xs font-bold text-slate-500 block mb-1">每年多还</label>
                                        <div className="flex items-center gap-1">
                                            <BareInput 
                                                inputMode="decimal"
                                                value={smartParams.annualAmount}
                                                onChange={(e: any) => setSmartParams({...smartParams, annualAmount: Number(e.target.value)})}
                                                className="w-full bg-transparent font-bold text-blue-600 outline-none text-lg" 
                                            />
                                            <span className="text-xs font-bold text-slate-400">万</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <label className="text-xs font-bold text-slate-500 block mb-1">还款月份</label>
                                        <div className="flex items-center gap-1">
                                            <select 
                                                value={smartParams.annualMonth}
                                                onChange={(e) => setSmartParams({...smartParams, annualMonth: Number(e.target.value)})}
                                                className="w-full bg-transparent font-bold text-blue-600 outline-none text-lg appearance-none" 
                                            >
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i+1} value={i+1}>{i+1}月</option>
                                                ))}
                                            </select>
                                            <ChevronRight size={14} className="text-slate-400"/>
                                        </div>
                                    </div>
                                 </div>

                                 <button 
                                    onClick={handleSmartAnnual}
                                    className="w-full mt-4 bg-white border border-blue-200 text-blue-600 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
                                 >
                                    开始计算
                                 </button>
                             </div>
                             
                             {smartResult.annual && (
                                 <div className="bg-blue-50/50 p-5 animate-fade-in space-y-4">
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-blue-100 pb-3">
                                         <div>
                                             <div className="mb-1">原总利息</div>
                                             <div className="font-bold text-slate-700">¥{(smartResult.annual.originalInterest / 10000).toFixed(2)}万</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="mb-1">新总利息</div>
                                             <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{((smartResult.annual.originalInterest - smartResult.annual.savedInterest) / 10000).toFixed(2)}万
                                                <TrendingDown size={12}/>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     {/* Key Metrics */}
                                     <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">总利息节省</span>
                                             <span className="font-bold text-emerald-600">
                                                ¥{(smartResult.annual.savedInterest / 10000).toFixed(2)}万
                                             </span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">还款期缩短</span>
                                             <span className="font-bold text-emerald-600">
                                                {smartResult.annual.savedYears.toFixed(1)} 年
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            )}
        </div>
      </div>
      <GeminiInput onUpdate={handleAIUpdate} />
    </div>
  );
};