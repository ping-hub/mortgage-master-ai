import React, { useState } from 'react';
import { Sparkles, Send, X, Loader2, AlertCircle } from 'lucide-react';
import { LoanParams } from '../types';

interface GeminiInputProps {
  onUpdate: (params: Partial<LoanParams>) => void;
}

export const GeminiInput: React.FC<GeminiInputProps> = ({ onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '请求失败');
      }

      if (result.data) {
        // 直接把后端解析好的数据传给父组件
        onUpdate(result.data);
        
        // 成功后关闭弹窗、清空输入
        setIsOpen(false);
        setPrompt('');
      }
    } catch (e: any) {
      console.error("AI 调用失败:", e);
      setError("AI 解析失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
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
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-500 mb-4 text-sm">
              试着说："组合贷，商贷200万30年，公积金80万" 或 "150万商贷，利率3.2"
            </p>

            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full h-32 bg-slate-50 border rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-gray-700 ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}
              placeholder="在此输入..."
            />

            {error && (
              <div className="mt-3 text-red-500 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg animate-fade-in">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button 
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {loading ? '解析中...' : '开始解析'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};