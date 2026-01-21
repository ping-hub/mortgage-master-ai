import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calculator, PieChart, Banknote, ArrowRight, TrendingDown, Clock, Coins, ChevronRight, CheckCircle2, Info, Sparkles, Calendar, ArrowRightCircle, RefreshCw, X, PiggyBank, Lightbulb, Github, LayoutGrid, ShieldCheck } from 'lucide-react';
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

// --- Year Picker Component (Wheel Style) ---
const YearSheet = ({ isOpen, onClose, value, onSelect }: { isOpen: boolean, onClose: () => void, value: number, onSelect: (val: number) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedValue, setSelectedValue] = useState(value);
    const ITEM_HEIGHT = 50; 
    const CONTAINER_HEIGHT = 250;

    // Sync state when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedValue(value);
            // Wait for render to scroll
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = (value - 1) * ITEM_HEIGHT;
                }
            }, 10);
        }
    }, [isOpen, value]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const year = index + 1;
        if (year >= 1 && year <= 30) {
            if (year !== selectedValue) {
                 setSelectedValue(year);
            }
        }
    };

    const handleConfirm = () => {
        onSelect(selectedValue);
        onClose();
    };

    if (!isOpen) return null;
    
    const years = Array.from({length: 30}, (_, i) => i + 1);
    
    // Padding to center the first and last items
    // (Container Height - Item Height) / 2
    const paddingY = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white rounded-t-[32px] w-full pb-safe shadow-2xl animate-fade-in-up overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Toolbar */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white z-20 relative">
                    <button onClick={onClose} className="text-gray-400 font-medium px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors">取消</button>
                    <h3 className="text-lg font-bold text-slate-800">选择年限</h3>
                    <button onClick={handleConfirm} className="text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">确定</button>
                </div>

                {/* Wheel Picker */}
                <div className="relative w-full bg-white select-none" style={{ height: CONTAINER_HEIGHT }}>
                    
                    {/* Highlight Zone (Center) */}
                    <div 
                        className="absolute left-0 right-0 pointer-events-none z-10 border-t border-b border-indigo-100 bg-indigo-50/30"
                        style={{ 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            height: ITEM_HEIGHT 
                        }}
                    ></div>

                    {/* Gradients for depth */}
                    <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

                    {/* Scrollable List */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="h-full overflow-y-auto snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
                        style={{ paddingBlock: paddingY }}
                    >
                        {years.map(y => (
                            <div
                                key={y}
                                onClick={() => {
                                    if(scrollRef.current) {
                                        scrollRef.current.scrollTo({
                                            top: (y - 1) * ITEM_HEIGHT,
                                            behavior: 'smooth'
                                        });
                                        setSelectedValue(y);
                                    }
                                }}
                                className="flex items-center justify-center snap-center transition-all duration-200 cursor-pointer"
                                style={{ 
                                    height: ITEM_HEIGHT,
                                    opacity: selectedValue === y ? 1 : 0.4,
                                    transform: selectedValue === y ? 'scale(1.1)' : 'scale(0.95)',
                                    fontWeight: selectedValue === y ? 700 : 400,
                                    color: selectedValue === y ? '#4f46e5' : '#94a3b8'
                                }}
                            >
                                <span className="text-2xl">{y}</span>
                                <span className="text-sm ml-1 mt-1 font-medium">年</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for Cell Style Input
const InputCell = ({ label, value, onChange, unit, step, placeholder = "0", actionIcon, onAction, readOnly = false, onClick, useThousandSeparator = false }: any) => {
    // Format helper: adds commas to integer part
    const format = (val: string) => {
        if (!useThousandSeparator) return val;
        if (!val) return '';
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };
    
    // Unformat helper: removes commas
    const unformat = (val: string) => useThousandSeparator ? val.replace(/,/g, '') : val;

    const [localValue, _setLocalValue] = useState(value === 0 ? '' : format(value.toString()));
    const localValueRef = useRef(localValue);

    const setLocalValue = (val: string) => {
        localValueRef.current = val;
        _setLocalValue(val);
    };

    useEffect(() => {
        const numericLocal = parseFloat(unformat(localValue));
        const numericProp = Number(value);

        if (isNaN(numericLocal)) {
             if (localValue === '' && numericProp === 0) return;
             if (localValue === '.' && numericProp === 0) return;
        }

        if (numericLocal === numericProp) return;
        
        setLocalValue(numericProp === 0 ? '' : format(numericProp.toString()));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        
        if (raw === '') {
            setLocalValue('');
            onChange({ ...e, target: { ...e.target, value: '' } });
            return;
        }

        const cleanRaw = unformat(raw);

        // Professional Validation: Digits & Dot only
        if (!/^\d*\.?\d*$/.test(cleanRaw)) return;
        
        // Safety: Prevent excessive length
        if (cleanRaw.replace('.', '').length > 12) return;

        let clean = cleanRaw;
        if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
            clean = clean.replace(/^0+/, '');
            if (clean === '') clean = '0';
        }
        
        setLocalValue(clean); // Show raw number while typing
        onChange({ target: { value: clean } });
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        if (useThousandSeparator) {
            setLocalValue(unformat(localValue));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        onChange({ target: { value: unformat(localValueRef.current) } });
        if (useThousandSeparator) {
            setLocalValue(format(unformat(localValueRef.current)));
        }
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0" onClick={onClick}>
            <label className="text-gray-700 font-medium shrink-0">{label}</label>
            <div className={`flex items-center gap-2 flex-1 justify-end ${readOnly ? 'cursor-pointer' : ''}`}>
                <input 
                    type="text"
                    inputMode={readOnly ? undefined : "decimal"}
                    value={readOnly ? value : localValue} 
                    readOnly={readOnly}
                    onChange={readOnly ? undefined : handleChange}
                    onFocus={readOnly ? undefined : handleFocus}
                    onBlur={readOnly ? undefined : handleBlur}
                    className={`text-right font-bold text-slate-900 bg-transparent outline-none w-full placeholder-gray-300 focus:text-indigo-600 transition-colors text-lg ${readOnly ? 'cursor-pointer pointer-events-none' : ''}`}
                    placeholder={placeholder}
                />
                {actionIcon && (
                    <button onClick={onAction} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded-full transition-colors" title="重置为官方利率">
                        {actionIcon}
                    </button>
                )}
                {unit && <span className="text-gray-400 text-sm font-medium shrink-0">{unit}</span>}
                {readOnly && <ChevronRight size={18} className="text-gray-400 shrink-0 ml-1" />}
            </div>
        </div>
    );
};

// Helper for Bare Input (Smart Cards)
const BareInput = ({ value, onChange, className, readOnly, onClick, onBlur, ...props }: any) => {
    const [localValue, _setLocalValue] = useState(value === 0 ? '' : value.toString());
    const localValueRef = useRef(localValue);
    const timeoutRef = useRef<any>(null);

    const setLocalValue = (val: string) => {
        localValueRef.current = val;
        _setLocalValue(val);
    };

    useEffect(() => {
        const numericLocal = parseFloat(localValue);
        const numericProp = Number(value);
        
        if (isNaN(numericLocal)) {
             if (localValue === '' && numericProp === 0) return;
             if (localValue === '.' && numericProp === 0) return;
        }

        if (numericLocal === numericProp) return;
        setLocalValue(numericProp === 0 ? '' : numericProp.toString());
    }, [value]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        if (raw === '') {
            setLocalValue('');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                 onChange({ target: { value: '' } });
            }, 300);
            return;
        }

        if (!/^\d*\.?\d*$/.test(raw)) return;
        if (raw.replace('.', '').length > 9) return;

        let clean = raw;
        if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
            clean = clean.replace(/^0+/, '');
            if (clean === '') clean = '0';
        }
        
        setLocalValue(clean);
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
             onChange({ target: { value: clean } });
        }, 300);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            onChange({ target: { value: localValueRef.current } });
        }
        if (onBlur) onBlur(e);
    };

    return (
        <input 
            type="text"
            inputMode={readOnly ? undefined : "decimal"}
            value={readOnly ? value : localValue} 
            onChange={readOnly ? undefined : handleChange}
            onClick={onClick}
            onBlur={readOnly ? undefined : handleBlur}
            readOnly={readOnly}
            className={`${className} ${readOnly ? 'cursor-pointer' : ''}`}
            {...props}
        />
    );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'existing' | 'smart' | 'about'>('new');
  
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
  const existingResultsRef = useRef<HTMLDivElement>(null);

  // Tab 2 State (Composite)
  const [existState, setExistState] = useState<ExistingLoanState>({
    type: LoanType.COMMERCIAL,
    commercial: {
        principal: 1000000,
        months: 240,
        rate: 3.50, 
        method: PaymentMethod.EPI
    },
    provident: {
        principal: 500000,
        months: 240,
        rate: 2.60,
        method: PaymentMethod.EPI
    }
  });

  const [prepayAmount, setPrepayAmount] = useState(100000);
  const [prepayTarget, setPrepayTarget] = useState<'commercial' | 'provident'>('commercial');
  const [toolType, setToolType] = useState<'lump' | 'method'>('lump');
  const [lumpStrategy, setLumpStrategy] = useState<'shorten' | 'reduce'>('shorten');
  const [prepayResult, setPrepayResult] = useState<any>(null);
  const [methodResult, setMethodResult] = useState<any>(null);

  // Tab 3 State
  const [smartParams, setSmartParams] = useState<{
      principal: number;
      rate: number;
      years: number;
      annualAmount: number;
      annualMonth: number;
      annualStrategy: 'shorten' | 'reduce';
  }>({
     principal: 100,
     rate: 3.50,
     years: 30,
     annualAmount: 5,
     annualMonth: 1,
     annualStrategy: 'shorten'
  });
  
  // Specific inputs for calculations
  const [targetYearsInput, setTargetYearsInput] = useState(25);
  const [maxInterestInput, setMaxInterestInput] = useState(50);
  const [targetPaymentInput, setTargetPaymentInput] = useState(5000);

  const [smartResult, setSmartResult] = useState<any>({});

  // --- Auto-Clear Results on Interaction ---
  // 1. New Loan Tab: Clear on params change or tab switch
  useEffect(() => {
    setResult(null);
  }, [params, activeTab]);

  // 2. Existing Loan Tab: Clear on state changes
  useEffect(() => {
    setPrepayResult(null);
    setMethodResult(null);
  }, [existState, prepayAmount, prepayTarget, toolType, lumpStrategy, activeTab]);

  // 3. Smart Strategy Tab: Clear on params change
  useEffect(() => {
    setSmartResult({});
  }, [smartParams, targetYearsInput, maxInterestInput, targetPaymentInput, activeTab]);


  // Picker State
  const [yearPicker, setYearPicker] = useState<{
      isOpen: boolean;
      value: number;
      onSelect: (val: number) => void;
  }>({ isOpen: false, value: 30, onSelect: () => {} });

  const openYearPicker = (currentVal: number, onSelect: (val: number) => void) => {
      setYearPicker({
          isOpen: true,
          value: currentVal,
          onSelect
      });
  };

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

  // Effect: Auto-update smart strategy inputs based on baseline data
  useEffect(() => {
      // 1. Target Years: Default to current - 5
      const suggestedYears = Math.max(1, smartParams.years - 5);
      setTargetYearsInput(suggestedYears);

      // 2. Max Interest: Default to nearest lower multiple of 10
      const currentInterestWan = smartBaseData.totalInterest / 10000;
      let suggestedInterest = Math.floor(currentInterestWan / 10) * 10;
      if (suggestedInterest >= currentInterestWan) suggestedInterest -= 10;
      if (suggestedInterest <= 0) suggestedInterest = Math.floor(currentInterestWan * 0.9);
      setMaxInterestInput(Math.max(1, suggestedInterest));

      // 3. Target Payment: Round down current payment
      const currentMonthly = smartBaseData.monthly;
      let suggestedPayment = 0;
      if (currentMonthly > 1000) {
          suggestedPayment = Math.floor(currentMonthly / 1000) * 1000; 
          if (suggestedPayment === 0) suggestedPayment = Math.floor(currentMonthly / 500) * 500;
      } else {
          suggestedPayment = Math.floor(currentMonthly / 100) * 100;
      }
      if (suggestedPayment >= currentMonthly) suggestedPayment = Math.floor(currentMonthly * 0.9);
      
      setTargetPaymentInput(Math.max(100, suggestedPayment));

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
      console.log('Calculating Prepayment:', { existState, prepayAmount, action });
      const res = calculatePrepayment(existState, prepayAmount, action, prepayTarget);
      console.log('Prepayment Result:', res);
      setPrepayResult(res);
      setMethodResult(null); // clear other result
      setTimeout(() => existingResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleMethodChangeCalc = () => {
      const res = calculateMethodChange(existState, prepayTarget);
      setMethodResult(res);
      setPrepayResult(null);
      setTimeout(() => existingResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
      const res = calculateSmartAnnualPrepayment(
          smartParams.principal, 
          smartParams.rate, 
          smartParams.years, 
          smartParams.annualAmount, 
          smartParams.annualMonth, 
          smartParams.annualStrategy
      );
      setSmartResult({ ...smartResult, annual: res });
  };
  
  const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatWan = (val: number) => (val / 10000).toFixed(2);

  const handleAIUpdate = (newParams: Partial<LoanParams>) => {
      setParams(prev => ({ ...prev, ...newParams }));
      setActiveTab('new');
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F5F7FA]">
      <div className="max-w-2xl mx-auto">
        
        {/* Compact Header */}
        <div className="bg-white pb-6 pt-8 px-6 rounded-b-[32px] shadow-sm mb-6">
            <div className="flex justify-between items-start mb-1">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                        <Calculator size={18} />
                    </div>
                    房贷智策
                </h1>
                <button 
                    onClick={() => setActiveTab('about')}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                    <Info size={24} />
                </button>
            </div>
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
                                readOnly={true}
                                onClick={() => openYearPicker(params.commercialYears, (y) => setParams({...params, commercialYears: y}))}
                                unit="年" 
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
                                readOnly={true}
                                onClick={() => openYearPicker(params.providentYears, (y) => setParams({...params, providentYears: y}))}
                                unit="年" 
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

            {/* TAB 2: EXISTING LOAN (Redesigned) */}
            {activeTab === 'existing' && (
                <div className="animate-fade-in space-y-6">
                    {/* 1. Loan Profile Section */}
                    <div>
                        {/* Loan Type Selector (New Loan Style) */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-3">贷款类型</div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { val: LoanType.COMMERCIAL, label: '商业贷款' },
                                    { val: LoanType.PROVIDENT, label: '公积金' },
                                    { val: LoanType.COMBO, label: '组合贷款' },
                                ].map(type => {
                                    const isActive = existState.type === type.val;
                                    return (
                                        <button
                                            key={type.val}
                                            onClick={() => {
                                                setExistState(s => ({...s, type: type.val}));
                                                setPrepayResult(null);
                                                setMethodResult(null);
                                            }}
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

                        {/* Combo Loan Switcher (only for Combo) */}
                        {existState.type === LoanType.COMBO && (
                            <div className="bg-white rounded-2xl p-1.5 flex mb-4 shadow-sm border border-slate-100">
                                <button
                                    onClick={() => { setPrepayTarget('commercial'); setPrepayResult(null); setMethodResult(null); }}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${prepayTarget === 'commercial' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    商业贷款部分
                                </button>
                                <button
                                    onClick={() => { setPrepayTarget('provident'); setPrepayResult(null); setMethodResult(null); }}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${prepayTarget === 'provident' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    公积金部分
                                </button>
                            </div>
                        )}

                        {/* Loan Details Inputs (New Loan Style) */}
                        <div className="bg-white rounded-2xl px-5 py-2 shadow-sm">
                            <InputCell 
                                label="剩余本金" 
                                value={prepayTarget === 'commercial' ? existState.commercial.principal : existState.provident.principal}
                                onChange={(e: any) => {
                                    const val = Number(e.target.value);
                                    setExistState(prev => ({
                                        ...prev,
                                        [prepayTarget]: { ...prev[prepayTarget], principal: val }
                                    }));
                                }}
                                unit="元"
                                placeholder="0"
                                useThousandSeparator={true}
                            />
                            <InputCell 
                                label="剩余期限" 
                                value={prepayTarget === 'commercial' ? existState.commercial.months : existState.provident.months}
                                onChange={(e: any) => {
                                    const val = Number(e.target.value);
                                    setExistState(prev => ({
                                        ...prev,
                                        [prepayTarget]: { ...prev[prepayTarget], months: val }
                                    }));
                                }}
                                unit="月"
                                placeholder="0"
                            />
                            <InputCell 
                                label="当前利率" 
                                value={prepayTarget === 'commercial' ? existState.commercial.rate : existState.provident.rate}
                                onChange={(e: any) => {
                                    const val = Number(e.target.value);
                                    setExistState(prev => ({
                                        ...prev,
                                        [prepayTarget]: { ...prev[prepayTarget], rate: val }
                                    }));
                                }}
                                unit="%"
                                step="0.01"
                                placeholder="0.00"
                            />
                            <div className="flex items-center justify-between py-4">
                                <label className="text-gray-700 font-medium">还款方式</label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setExistState(prev => ({ ...prev, [prepayTarget]: { ...prev[prepayTarget], method: PaymentMethod.EPI } }))}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                                            (prepayTarget === 'commercial' ? existState.commercial.method : existState.provident.method) === PaymentMethod.EPI
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-gray-400'
                                        }`}
                                    >
                                        等额本息
                                    </button>
                                    <button
                                        onClick={() => setExistState(prev => ({ ...prev, [prepayTarget]: { ...prev[prepayTarget], method: PaymentMethod.EP } }))}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                                            (prepayTarget === 'commercial' ? existState.commercial.method : existState.provident.method) === PaymentMethod.EP
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-gray-400'
                                        }`}
                                    >
                                        等额本金
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Action Area */}
                    <div>
                        {/* Tool Switcher */}
                        <div className="bg-slate-100 p-1 rounded-2xl flex mb-6">
                            <button
                                onClick={() => { setToolType('lump'); setPrepayResult(null); setMethodResult(null); }}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${toolType === 'lump' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <PiggyBank size={18} />
                                一次性提前还款
                            </button>
                            <button
                                onClick={() => { setToolType('method'); setPrepayResult(null); setMethodResult(null); }}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${toolType === 'method' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <RefreshCw size={18} />
                                变更还款方式
                            </button>
                        </div>

                        {/* Action Content */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            {toolType === 'lump' ? (
                                <div className="space-y-6 animate-fade-in">
                                    <InputCell 
                                        label="提前还款金额" 
                                        value={prepayAmount} 
                                        onChange={(e: any) => setPrepayAmount(Number(e.target.value))} 
                                        unit="元"
                                        placeholder="0"
                                        useThousandSeparator={true}
                                    />

                                    <div className="pt-2">
                                        <label className="text-gray-700 font-medium mb-3 block">处理方式</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => setLumpStrategy('shorten')}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${lumpStrategy === 'shorten' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`font-bold mb-1 ${lumpStrategy === 'shorten' ? 'text-indigo-700' : 'text-slate-700'}`}>缩短年限</div>
                                                <div className="text-xs text-slate-400">月供不变，最省利息</div>
                                            </button>
                                            <button 
                                                onClick={() => setLumpStrategy('reduce')}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${lumpStrategy === 'reduce' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`font-bold mb-1 ${lumpStrategy === 'reduce' ? 'text-indigo-700' : 'text-slate-700'}`}>减少月供</div>
                                                <div className="text-xs text-slate-400">年限不变，减轻压力</div>
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handlePrepayCalc(lumpStrategy)} 
                                        className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
                                    >
                                        <Calculator size={20} />
                                        开始计算
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in py-4">
                                    <div className="flex items-center justify-between px-4">
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400 mb-2">当前方式</div>
                                            <div className="font-bold text-slate-700 text-lg">
                                                {(prepayTarget === 'commercial' ? existState.commercial.method : existState.provident.method) === PaymentMethod.EPI ? '等额本息' : '等额本金'}
                                            </div>
                                        </div>
                                        <div className="text-indigo-200">
                                            <ArrowRight size={32} />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-indigo-500 mb-2 font-bold">变更后</div>
                                            <div className="font-black text-indigo-600 text-xl">
                                                {(prepayTarget === 'commercial' ? existState.commercial.method : existState.provident.method) === PaymentMethod.EPI ? '等额本金' : '等额本息'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleMethodChangeCalc} 
                                        className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
                                    >
                                        <RefreshCw size={20} />
                                        确认变更并计算
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Result Display (Light Style) */}
                    {(prepayResult || methodResult) && (
                        <div ref={existingResultsRef} className={`bg-white rounded-2xl p-6 shadow-lg border-2 animate-fade-in-up ${(prepayResult || methodResult).savedInterest >= 0 ? 'border-emerald-500 shadow-emerald-50' : 'border-rose-200'}`}>
                            
                            {(prepayResult || methodResult).savedInterest >= 0 && (
                                <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs">
                                    <TrendingDown size={14} /> 优化建议
                                </div>
                            )}

                            <div className="flex items-end justify-between mb-8">
                                <div>
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        {(prepayResult || methodResult).savedInterest >= 0 ? '预计节省利息' : '利息将增加'}
                                    </div>
                                    <div className={`text-4xl font-black ${(prepayResult || methodResult).savedInterest >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <span className="text-2xl mr-1">¥</span>
                                        {(Math.abs((prepayResult || methodResult).savedInterest) / 10000).toFixed(2)}
                                        <span className="text-lg ml-1 text-gray-400 font-bold">万</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                    <span className="text-gray-500 font-medium">变更后月供</span>
                                    <span className="font-bold text-slate-800 text-lg">
                                        ¥{formatMoney((prepayResult || methodResult).newMonthlyPayment)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                    <span className="text-gray-500 font-medium">剩余还款期</span>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        {((prepayResult || methodResult).newTermMonths / 12).toFixed(1)} 年
                                        {prepayResult && prepayResult.savedMonths > 0 && (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                                省{(prepayResult.savedMonths / 12).toFixed(1)}年
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">总利息变化</span>
                                    <div className="font-bold text-slate-800">
                                        <span className="line-through text-gray-300 text-sm mr-2">
                                            {((prepayResult || methodResult).oldTotalInterest / 10000).toFixed(2)}
                                        </span>
                                        <span>
                                            {((prepayResult || methodResult).newTotalInterest / 10000).toFixed(2)}万
                                        </span>
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
                            <li>• <strong>缩短年限</strong>：计算需要提前还多少钱，才能将剩余年限缩短至目标年限（月供不变）。</li>
                            <li>• <strong>利息控制</strong>：计算需要提前还多少钱，才能将剩余利息控制在预算内。</li>
                            <li>• <strong>降低月供</strong>：适合觉得当前月供压力大，想通过一次性还款来减压的人群。</li>
                            <li>• <strong>固定年冲</strong>：适合每年有固定结余，希望通过定期还款加速减债的人群。</li>
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
                                    <span className="font-bold text-base tracking-wide">已有贷款数据</span>
                                </div>
                                <div className="text-xs bg-white/20 px-2 py-1 rounded-lg">实时参考</div>
                            </div>
                            
                            {/* Input Fields */}
                            <div className="space-y-5">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-sm font-medium text-white/80">剩余本金</span>
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
                                    <span className="text-sm font-medium text-white/80">剩余年限</span>
                                    <div className="flex items-baseline gap-1 items-center cursor-pointer" onClick={() => openYearPicker(smartParams.years, (y) => setSmartParams({...smartParams, years: y}))}>
                                       <BareInput 
                                           readOnly={true}
                                           value={smartParams.years} 
                                           className="bg-transparent text-right font-black text-2xl w-24 outline-none placeholder-white/30 focus:border-b-2 border-white/50 transition-all pointer-events-none" 
                                       />
                                       <span className="text-sm font-medium">年</span>
                                       <ChevronRight size={16} className="text-white/70 ml-1"/>
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
                                    <div className="text-xs text-white/60 mb-1">剩余总利息</div>
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
                                 
                                 <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between relative cursor-pointer" onClick={() => openYearPicker(targetYearsInput, (y) => { setTargetYearsInput(y); handleSmartYears(y); })}>
                                     <label className="text-sm font-bold text-slate-600">目标年限</label>
                                     <div className="flex items-center gap-2">
                                         <BareInput 
                                             readOnly={true}
                                             value={targetYearsInput} 
                                             className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 font-bold text-indigo-600 outline-none pointer-events-none" 
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
                                     {/* Key Metrics */}
                                     <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm text-center">
                                         <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">需一次性提前还款</div>
                                         <div className="font-black text-rose-500 text-xl">
                                            ¥{(smartResult.years.lumpSum / 10000).toFixed(2)}万
                                         </div>
                                     </div>

                                     {/* Interest Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-indigo-100 pb-3">
                                         <div>
                                             <div className="mb-1">原总利息</div>
                                             <div className="font-bold text-slate-700">¥{(smartResult.years.originalInterest / 10000).toFixed(2)}万</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="mb-1">利息节省</div>
                                             <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{(smartResult.years.savedInterest / 10000).toFixed(2)}万
                                                <TrendingDown size={12}/>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Monthly Payment Note */}
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-slate-500">月供变化</span>
                                         <div className="flex items-center gap-2 font-bold text-slate-700">
                                             <span className="text-emerald-600">月供基本不变</span>
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
                                     {/* Key Metrics */}
                                     <div className="bg-white rounded-lg p-3 border border-rose-100 shadow-sm text-center">
                                         <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">需一次性提前还款</div>
                                         <div className="font-black text-rose-500 text-xl">
                                            ¥{(smartResult.interest.lumpSum / 10000).toFixed(2)}万
                                         </div>
                                     </div>

                                     {/* Interest Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-b border-rose-100 pb-3">
                                         <div>
                                             <div className="mb-1">目标利息</div>
                                             <div className="font-bold text-slate-700">¥{(maxInterestInput).toFixed(2)}万</div>
                                         </div>
                                         <div className="text-right">
                                             <div className="mb-1">实际控制</div>
                                             <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{(smartResult.interest.actualInterest / 10000).toFixed(2)}万
                                             </div>
                                         </div>
                                     </div>

                                      {/* Years Comparison */}
                                      <div className="flex justify-between items-center text-sm">
                                         <span className="text-slate-500">年限缩短至</span>
                                         <div className="flex items-center gap-2 font-bold text-slate-700">
                                             <span className="text-emerald-600">{(smartResult.interest.months/12).toFixed(1)} 年</span>
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
                                         <p className="text-xs text-gray-400">当前月供 {formatMoney(smartBaseData.monthly)} 元，我想降到...</p>
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
                                        {'< '}{formatMoney(smartBaseData.monthly)}元
                                     </div>
                                 </div>
                             </div>
                             
                             {smartResult.payment && (
                                 <div className="bg-emerald-50/50 p-5 animate-fade-in space-y-4">
                                     {/* Key Metrics */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-100 shadow-sm text-center">
                                         <div className="text-xs font-bold text-slate-400 mb-1">需一次性提前还款</div>
                                         <div className="font-black text-rose-500 text-xl mb-1">
                                            ¥{(smartResult.payment.lumpSum / 10000).toFixed(2)}万
                                         </div>
                                         <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                                             一次性投入，月供永久降低
                                         </div>
                                    </div>
                                    
                                     {/* Monthly Payment Comparison */}
                                     <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 border-t border-emerald-100 pt-3">
                                        <div>
                                            <div className="mb-1">原月供</div>
                                            <div className="font-bold text-slate-700">¥{formatMoney(smartBaseData.monthly)}元</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">新月供</div>
                                            <div className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                                                ¥{targetPaymentInput.toFixed(2)}元
                                                <TrendingDown size={12}/>
                                            </div>
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

                                 <div className="bg-gray-100 p-1 rounded-lg flex mb-4">
                                     <button 
                                        onClick={() => {
                                            setSmartParams({...smartParams, annualStrategy: 'shorten'});
                                            setSmartResult((prev: any) => ({ ...prev, annual: undefined }));
                                        }} 
                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${smartParams.annualStrategy === 'shorten' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
                                     >
                                        缩短年限
                                     </button>
                                     <button 
                                        onClick={() => {
                                            setSmartParams({...smartParams, annualStrategy: 'reduce'});
                                            setSmartResult((prev: any) => ({ ...prev, annual: undefined }));
                                        }} 
                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${smartParams.annualStrategy === 'reduce' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
                                     >
                                        降低月供
                                     </button>
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
                                        <div className="flex items-center justify-between gap-1 h-[28px]">
                                            <select 
                                                value={smartParams.annualMonth}
                                                onChange={(e) => setSmartParams({...smartParams, annualMonth: Number(e.target.value)})}
                                                className="w-full bg-transparent font-bold text-blue-600 outline-none appearance-none"
                                            >
                                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                                    <option key={m} value={m}>{m}月</option>
                                                ))}
                                            </select>
                                            <ChevronRight size={16} className="text-slate-400 pointer-events-none"/>
                                        </div>
                                    </div>
                                 </div>
                                 
                                 <button onClick={handleSmartAnnual} className="w-full mt-4 bg-white border border-blue-200 text-blue-600 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
                                    开始计算
                                 </button>
                             </div>
                             
                             {smartResult.annual && (
                                 <div className="bg-blue-50/50 p-5 animate-fade-in space-y-6">
                                     <div className="text-center">
                                        <div className="text-xs text-slate-500 mb-1">累计共节省利息</div>
                                        <div className="text-3xl font-black text-emerald-500">
                                            ¥{(smartResult.annual.savedInterest / 10000).toFixed(2)}万
                                        </div>
                                     </div>

                                     <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                            <span className="text-xs text-gray-400">原贷款额</span>
                                            <span className="text-sm font-bold text-gray-700">¥{(smartParams.principal).toFixed(0)}万</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] text-gray-400 mb-1">总利息变化</div>
                                                <div className="text-xs text-gray-400 line-through">原 ¥{(smartResult.annual.originalInterest / 10000).toFixed(2)}万</div>
                                                <div className="text-sm font-bold text-emerald-600">
                                                    现 ¥{((smartResult.annual.originalInterest - smartResult.annual.savedInterest) / 10000).toFixed(2)}万
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                 <div className="text-[10px] text-gray-400 mb-1">还款时长</div>
                                                 <div className="text-xs text-gray-400">原 {smartParams.years}年</div>
                                                 <div className="text-sm font-bold text-blue-600">
                                                    {smartParams.annualStrategy === 'shorten' ? 
                                                        `缩短 ${(smartResult.annual.savedYears).toFixed(1)} 年` : 
                                                        '保持不变'
                                                    }
                                                 </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                 <PiggyBank size={16} className="text-blue-500"/>
                                                 <div>
                                                     <div className="text-xs font-bold text-slate-700">累计年冲投入</div>
                                                     <div className="text-[10px] text-blue-400">本金额外支出</div>
                                                 </div>
                                             </div>
                                             <div className="text-sm font-black text-blue-600">
                                                ¥{(smartResult.annual.totalPrepaymentAmount / 10000).toFixed(2)}万
                                             </div>
                                        </div>
                                     </div>

                                     {/* Reduce Payment Strategy Specific Info */}
                                     {smartParams.annualStrategy === 'reduce' && (
                                         <div className="text-center text-xs text-slate-500">
                                             期末月供降至 <span className="font-bold text-emerald-600">¥{formatMoney(smartResult.annual.finalMonthly)}</span>
                                         </div>
                                     )}

                                     {/* Smart Tip (Milestone) */}
                                     {smartResult.annual.milestone && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Lightbulb size={48} className="text-amber-500" />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Lightbulb size={16} className="text-amber-500" />
                                                <span className="font-bold text-amber-700 text-sm">策略建议</span>
                                            </div>
                                            <p className="text-xs text-amber-800 leading-relaxed relative z-10">
                                                当在第 <strong className="text-amber-600">{smartResult.annual.milestone.year}</strong> 年时，您的贷款本金将降低至 <strong className="text-amber-600">{(smartResult.annual.milestone.principal / 10000).toFixed(2)}万</strong>。
                                                <br/><br/>
                                                此时系统已自动停止年冲计算（因为剩余本金 &lt; 年冲预算）。
                                                您可以选择一次性还完，或者从第 {smartResult.annual.milestone.year + 1} 年开始，
                                                {smartParams.annualStrategy === 'reduce' ? 
                                                    `每年只需还 ${(smartResult.annual.milestone.monthly * 12).toFixed(0)} 元` : 
                                                    `继续按原月供还款`
                                                }，直至还清！
                                            </p>
                                        </div>
                                     )}
                                 </div>
                             )}
                         </div>

                     </div>
                </div>
            )}

            {/* TAB 4: ABOUT US */}
            {activeTab === 'about' && (
                <div className="animate-fade-in space-y-6">
                   <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
                       <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-200">
                           <Calculator size={40} />
                       </div>
                       <h2 className="text-2xl font-black text-slate-800 mb-2">房贷智策</h2>
                       <p className="text-sm text-gray-500 font-medium mb-8">v2.1.0 · 全网最强房贷计算器</p>
                       
                       <div className="text-left space-y-6">
                           <div className="space-y-2">
                               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                   <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                                   产品介绍
                               </h3>
                               <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                   房贷智策是一款专为购房者打造的智能财务规划工具。不同于传统计算器，我们不仅提供精准的商业、公积金及组合贷计算，更首创了“智能反向推算”引擎，帮助已购房用户制定最优的提前还款省息策略。
                               </p>
                           </div>

                           <div className="space-y-2">
                               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                   <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
                                   核心功能
                               </h3>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="bg-slate-50 p-3 rounded-xl">
                                       <div className="text-indigo-600 mb-2"><LayoutGrid size={20}/></div>
                                       <div className="font-bold text-slate-700 text-xs">全能计算</div>
                                       <div className="text-[10px] text-gray-400">支持LPR/公积金/组合贷</div>
                                   </div>
                                   <div className="bg-slate-50 p-3 rounded-xl">
                                       <div className="text-rose-500 mb-2"><Banknote size={20}/></div>
                                       <div className="font-bold text-slate-700 text-xs">提前还款</div>
                                       <div className="text-[10px] text-gray-400">一键对比省息/减负</div>
                                   </div>
                                   <div className="bg-slate-50 p-3 rounded-xl">
                                       <div className="text-purple-600 mb-2"><Sparkles size={20}/></div>
                                       <div className="font-bold text-slate-700 text-xs">智能反推</div>
                                       <div className="text-[10px] text-gray-400">指定目标反推还款额</div>
                                   </div>
                                   <div className="bg-slate-50 p-3 rounded-xl">
                                       <div className="text-blue-500 mb-2"><Calendar size={20}/></div>
                                       <div className="font-bold text-slate-700 text-xs">年冲策略</div>
                                       <div className="text-[10px] text-gray-400">固定结余加速减债</div>
                                   </div>
                               </div>
                           </div>
                           
                           <div className="space-y-2">
                               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                   <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                                   安全承诺
                               </h3>
                               <div className="flex items-start gap-3 bg-emerald-50 p-3 rounded-xl">
                                    <ShieldCheck className="text-emerald-600 shrink-0" size={20}/>
                                    <p className="text-xs text-emerald-800 leading-relaxed">
                                        我们承诺：本工具所有计算均在本地完成（AI功能除外），不保存、不上传您的任何财务数据，请放心使用。
                                    </p>
                               </div>
                           </div>
                       </div>
                       
                       <div className="mt-8 pt-6 border-t border-gray-100">
                           <a 
                               href="https://github.com/ping-hub/mortgage-master-ai" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center justify-center gap-2 w-full text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                           >
                               <Github size={14} />
                               项目开源地址;
                           </a>
                           <p className="text-[10px] text-gray-300 mt-2">Designed with ❤️ by 房贷智策 Team</p>
                       </div>
                   </div>
                </div>
            )}

            {/* Disclaimer Footer */}
            <div className="mt-12 py-6 text-center">
                <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4 opacity-50"></div>
                <p className="text-[10px] text-gray-400/80 font-medium tracking-wide">
                    免责声明
                </p>
                <p className="text-[10px] text-gray-400/60 mt-1 px-8 leading-normal">
                    本工具提供的计算结果与策略建议仅供参考，<br />
                    实际数据请以银行或公积金中心最终审核为准。
                </p>
            </div>

            <GeminiInput onUpdate={handleAIUpdate} />

            <YearSheet 
                isOpen={yearPicker.isOpen} 
                onClose={() => setYearPicker(prev => ({ ...prev, isOpen: false }))} 
                value={yearPicker.value}
                onSelect={yearPicker.onSelect}
            />

        </div>
      </div>
    </div>
  );
};