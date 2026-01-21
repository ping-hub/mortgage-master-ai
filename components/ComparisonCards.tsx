
import React from 'react';
import { FullComparison, PaymentMethod } from '../types';
import { CheckCircle2, TrendingDown } from 'lucide-react';

interface ComparisonCardsProps {
  data: FullComparison;
}

export const ComparisonCards: React.FC<ComparisonCardsProps> = ({ data }) => {
  const formatWan = (val: number) => (val / 10000).toFixed(2);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* EPI Card */}
      <div 
        className="relative bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
      >
        <div className="flex flex-col gap-1 mb-3 text-center">
            <h3 className="text-base font-bold text-gray-800">等额本息</h3>
            <div className="text-xl font-black text-indigo-600">
                ¥{data.epi.monthlyData[0]?.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-400">每月固定还款</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">贷款总额</span>
                <span className="text-xs font-bold text-gray-700">¥{formatWan(data.epi.totalPrincipal)}万</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">支付利息</span>
                <span className="text-xs font-bold text-gray-700">¥{formatWan(data.epi.totalInterest)}万</span>
            </div>
        </div>
      </div>

      {/* EP Card */}
      <div 
        className="relative bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
      >
        <div className="flex flex-col gap-1 mb-3 text-center">
            <h3 className="text-base font-bold text-gray-800">等额本金</h3>
            <div className="text-xl font-black text-slate-800">
                ¥{data.ep.firstMonthPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
             <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <TrendingDown size={10} /> 
                {data.ep.monthlyDecrease && data.ep.monthlyDecrease > 0 
                    ? `递减${data.ep.monthlyDecrease.toFixed(2)}` 
                    : '每月递减'}
            </div>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-2 space-y-1.5 mb-2">
             <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">贷款总额</span>
                <span className="text-xs font-bold text-gray-700">¥{formatWan(data.ep.totalPrincipal)}万</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">支付利息</span>
                <span className="text-xs font-bold text-gray-700">¥{formatWan(data.ep.totalInterest)}万</span>
            </div>
        </div>
        
        {data.savedInterest > 0 && (
          <div className="text-[10px] font-bold text-slate-500 text-center bg-slate-50 py-1 rounded-lg">
            利息少 ¥{formatWan(data.savedInterest)}万
          </div>
        )}
      </div>
    </div>
  );
};
