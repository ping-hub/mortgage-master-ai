import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FullComparison } from '../types';

interface ResultsChartProps {
  data: FullComparison;
}

export const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {
  const maxMonths = Math.max(data.epi.monthlyData.length, data.ep.monthlyData.length);
  const chartData = [];

  for (let i = 0; i < maxMonths; i+=12) { 
     const epiItem = data.epi.monthlyData[i];
     const epItem = data.ep.monthlyData[i];
     
     chartData.push({
        year: Math.floor(i / 12),
        '等额本息': epiItem ? parseFloat(epiItem.remainingPrincipal.toFixed(0)) : 0,
        '等额本金': epItem ? parseFloat(epItem.remainingPrincipal.toFixed(0)) : 0,
     });
  }

  chartData.push({
      year: Math.ceil(maxMonths / 12),
      '等额本息': 0,
      '等额本金': 0
  })

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 ml-2">剩余本金曲线</h3>
      <div className="h-[250px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{fill: '#94a3b8'}}
              label={{ value: '年', position: 'insideBottomRight', offset: -5, fill: '#cbd5e1', fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{fill: '#94a3b8'}}
              tickFormatter={(value) => `${(value / 10000).toFixed(0)}`} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              formatter={(value: number) => `¥${(value/10000).toFixed(2)}万`}
            />
            <Legend iconType="circle" />
            <Line
              type="monotone"
              dataKey="等额本息"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="等额本金"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};