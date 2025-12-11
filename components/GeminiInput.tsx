import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { LoanParams, LoanType } from '../types';

interface GeminiInputProps {
  onUpdate: (params: Partial<LoanParams>) => void;
}

export const GeminiInput: React.FC<GeminiInputProps> = ({ onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || !process.env.API_KEY) return;
    
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const systemPrompt = `
        You are a mortgage data extractor. Extract loan details from the user's natural language input into a JSON object.
        Match this interface:
        {
          type: 'commercial' | 'provident' | 'combo',
          commercialAmount: number (in ten thousands/wan),
          commercialRate: number (percentage),
          commercialYears: number,
          providentAmount: number (in ten thousands/wan),
          providentRate: number (percentage),
          providentYears: number
        }
        Defaults:
        - If not specified, commercial rate = 3.5, provident rate = 2.6.
        - If not specified, years = 30.
        - If type is unclear but mentions provident fund, assume 'provident' or 'combo'.
        - If amount is given as "100万", value is 100.
        
        Return ONLY the JSON.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: `${systemPrompt}\n\nUser Input: ${prompt}`,
      });

      const text = response.text;
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        onUpdate(data);
        setIsOpen(false);
        setPrompt('');
      }
    } catch (e) {
      console.error("Gemini Error:", e);
      alert("AI解析失败，请检查API Key或重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2"
      >
        <Sparkles size={24} />
        <span className="font-bold hidden md:inline">AI 智能输入</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-fade-in-up border border-purple-100">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  告诉我你的贷款情况
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
             </div>
             
             <p className="text-gray-500 mb-4 text-sm">
                试着说："组合贷，商贷200万30年，公积金80万" 或 "150万商贷，利率3.2"
             </p>

             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-700"
                placeholder="在此输入..."
             />

             <div className="flex justify-end mt-4">
                <button 
                  onClick={handleSubmit}
                  disabled={loading || !prompt}
                  className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                  开始解析
                </button>
             </div>
             
             {!process.env.API_KEY && (
               <p className="text-red-500 text-xs mt-2 text-center">
                 Demo模式：未检测到API Key，AI功能不可用
               </p>
             )}
          </div>
        </div>
      )}
    </>
  );
};
