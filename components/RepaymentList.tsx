
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { FullComparison, LoanType, PaymentMethod } from '../types';
import { generateRepaymentCSV } from '../utils/csvExport';

interface RepaymentListProps {
  data: FullComparison;
  loanType: LoanType;
}

export const RepaymentList: React.FC<RepaymentListProps> = ({ data, loanType }) => {
  // Requirement: Default to EPI (Equal Principal & Interest) regardless of recommendation
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.EPI);

  const activeData = method === PaymentMethod.EPI ? data.epi : data.ep;
  const isCombo = loanType === LoanType.COMBO;

  const handleExport = () => {
    const csvContent = generateRepaymentCSV(data, loanType, method);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const methodName = method === PaymentMethod.EPI ? '等额本息' : '等额本金';
    link.setAttribute('href', url);
    link.setAttribute('download', `房贷还款计划_${methodName}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 text-sm">还款计划</h3>
            <button 
                onClick={handleExport}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors"
            >
                <Download size={12} />
                导出Excel
            </button>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-lg flex text-xs">
          <button
            onClick={() => setMethod(PaymentMethod.EPI)}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              method === PaymentMethod.EPI 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-400'
            }`}
          >
            本息
          </button>
          <button
            onClick={() => setMethod(PaymentMethod.EP)}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              method === PaymentMethod.EP 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-400'
            }`}
          >
            本金
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-400 font-medium sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">期数</th>
              <th className="px-4 py-3">月供</th>
              {isCombo && <th className="px-4 py-3">商贷</th>}
              {isCombo && <th className="px-4 py-3">公积金</th>}
              <th className="px-4 py-3">本金</th>
              <th className="px-4 py-3">利息</th>
              <th className="px-4 py-3">剩余本金 (元)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activeData.monthlyData.map((row) => (
              <tr key={row.month}>
                <td className="px-4 py-3 text-slate-500">{row.month}</td>
                <td className="px-4 py-3 font-bold text-slate-900">¥{row.payment.toFixed(2)}</td>
                {isCombo && (
                  <td className="px-4 py-3 text-indigo-500">¥{row.commercialPayment?.toFixed(2) || '0.00'}</td>
                )}
                {isCombo && (
                  <td className="px-4 py-3 text-orange-500">¥{row.providentPayment?.toFixed(2) || '0.00'}</td>
                )}
                <td className="px-4 py-3 text-slate-500">¥{row.principal.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">¥{row.interest.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-400">¥{row.remainingPrincipal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
