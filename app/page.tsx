'use client';

import { useEffect, useState } from 'react';

interface MarketData {
  pair: string;
  timeframe: string;
  mfi_level: number;
  fib_status: string;
  ai_advice: string;
}

export default function Home() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market-status')
      .then((res) => res.json())
      .then((data) => {
        setMarketData(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black font-sans">
      
      {/* Efek Glow di belakang card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-sm w-full bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/20">
          <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {marketData?.pair || "Menganalisa..."}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-md font-medium border border-indigo-500/30">
                TF: {marketData?.timeframe || "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center h-10 w-10 bg-gray-950/50 rounded-full border border-gray-700/50">
            <div className="h-3 w-3 bg-emerald-400 rounded-full animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
          </div>
        </div>

        {/* Indikator */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800/50 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 font-bold tracking-wider mb-2">MFI</p>
            <p className="text-2xl font-mono text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {marketData?.mfi_level || "0"}
            </p>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800/50 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-gray-500 font-bold tracking-wider mb-2">RULES</p>
            <p className="text-sm font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              {marketData?.fib_status || "-"}
            </p>
          </div>
        </div>

        {/* Chat AI */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 p-5 rounded-2xl relative shadow-inner">
            <div className="absolute -top-3 left-5 bg-indigo-500 text-white px-3 py-0.5 text-[10px] font-black tracking-widest uppercase rounded-full shadow-lg">
              AI Asisten
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                </span>
              ) : (
                marketData?.ai_advice
              )}
            </p>
          </div>
        </div>

        {/* Tombol Eksekusi */}
        <div className="p-6 pt-0">
          <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            GAS ENTRY! 🚀
          </button>
        </div>
      </div>
    </main>
  );
}
