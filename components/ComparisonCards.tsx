
import React from 'react';
import { FullComparison, PaymentMethod } from '../types';
import { CheckCircle2, TrendingDown } from 'lucide-react';

interface ComparisonCardsProps {
  data: FullComparison;
}

export const ComparisonCards: React.FC<ComparisonCardsProps> = ({ data }) => {
  const isEPRecommended = data.recommendation === PaymentMethod.EP;
  
  const formatWan = (val: number) => (val / 10000).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* EPI Card */}
      <div 
        className={`relative bg-white rounded-2xl p-6 transition-all border-2 ${!isEPRecommended ? 'border-green-500 shadow-md ring-2 ring-green-100' : 'border-transparent shadow-sm'}`}
      >
         {!isEPRecommended && (
          <div className="absolute -top-3 left-6 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
            <CheckCircle2 size={12} /> 推荐
          </div>
        )}
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-bold text-gray-800">等额本息</h3>
                <p className="text-xs text-gray-400">每月固定还款</p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">
                    ¥{data.epi.monthlyData[0]?.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">贷款总额</span>
                <span className="text-sm font-bold text-gray-700">¥{formatWan(data.epi.totalPrincipal)}万</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">支付利息</span>
                <span className="text-sm font-bold text-gray-700">¥{formatWan(data.epi.totalInterest)}万</span>
            </div>
        </div>
      </div>

      {/* EP Card */}
      <div 
        className={`relative bg-white rounded-2xl p-6 transition-all border-2 ${isEPRecommended ? 'border-green-500 shadow-md ring-2 ring-green-100' : 'border-transparent shadow-sm'}`}
      >
        {isEPRecommended && (
          <div className="absolute -top-3 left-6 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
            <CheckCircle2 size={12} /> 推荐
          </div>
        )}
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-bold text-gray-800">等额本金</h3>
                <p className="text-xs text-gray-400">首月最高，逐月递减</p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-black text-slate-800">
                    ¥{data.ep.firstMonthPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1">
                    <TrendingDown size={10} /> 
                    {data.ep.monthlyDecrease && data.ep.monthlyDecrease > 0 
                        ? `每月递减约${data.ep.monthlyDecrease.toFixed(2)}元` 
                        : '每月递减'}
                </div>
            </div>
        </div>
        
        <div className="bg-slate-50 rounded-xl p-3 space-y-2 mb-2">
             <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">贷款总额</span>
                <span className="text-sm font-bold text-gray-700">¥{formatWan(data.ep.totalPrincipal)}万</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">支付利息</span>
                <span className="text-sm font-bold text-gray-700">¥{formatWan(data.ep.totalInterest)}万</span>
            </div>
        </div>
        
        {data.savedInterest > 0 && (
          <div className="text-xs font-bold text-green-600 text-center bg-green-50 py-1.5 rounded-lg">
            比等额本息省 ¥{formatWan(data.savedInterest)}万
          </div>
        )}
      </div>
    </div>
  );
};
