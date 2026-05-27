"use client";

import { useEffect, useState } from "react";

interface MarketData {
  pair: string;
  timeframe: string;
  mfi_level: number;
  fib_status: string;
  atr_value: number;
  ai_advice: string;
}

export default function Dashboard() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // State khusus buat tombol Refresh

  // Fungsi buat narik data dari API
  const fetchMarketData = async () => {
    try {
      const res = await fetch("/api/market-status");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Gagal ambil data trading:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false); // Matiin efek muter di tombol kalau udah kelar
    }
  };

  // Narik data otomatis CUMA 1 KALI pas web pertama kali dibuka
  useEffect(() => {
    fetchMarketData();
  }, []);

  // Fungsi yang dipanggil pas tombol Refresh dipencet
  const handleRefresh = () => {
    setIsRefreshing(true); // Nyalain efek muter
    fetchMarketData();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d111c] text-white">
        <p className="animate-pulse text-sm font-semibold tracking-wider">LOADING DATA SULTAN...</p>
      </div>
    );
  }

  // Cek apakah sinyal siap entry berdasarkan rule lo
  const isBuy = data?.fib_status.includes("UPTREND") && (data?.mfi_level ?? 0) <= 30;
  const isSell = data?.fib_status.includes("DOWNTREND") && (data?.mfi_level ?? 0) >= 70;
  const readyToGas = isBuy || isSell;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090e] p-4 text-white font-sans">
      {/* Container Utama */}
      <div className="w-full max-w-md rounded-3xl bg-[#0f1322] p-6 shadow-2xl border border-gray-800/40">
        
        {/* Header: Pair & Status Dot */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-800/60">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-100 flex items-center gap-1">
              {data?.pair || "XAUUSD+"}
            </h1>
            <span className="mt-1.5 inline-block rounded-md bg-[#1b223c] px-2.5 py-1 text-xs font-semibold text-[#7285de]">
              TF: {data?.timeframe || "M2"}
            </span>
          </div>
          {/* Status Dot Pulsing Hijau */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#162325]">
            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-[#00ffaa] opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00ffaa]"></span>
          </div>
        </div>

        {/* Grid Tiga Kolom: MFI, ATR, RULES */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {/* Box MFI */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#131a30] p-4 text-center">
            <span className="text-xs font-bold tracking-wider text-gray-500">MFI</span>
            <span className="mt-2 text-2xl font-black text-[#00b0ff]">
              {data?.mfi_level ?? 0}
            </span>
          </div>

          {/* Box ATR */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#131a30] p-4 text-center border border-emerald-500/10">
            <span className="text-xs font-bold tracking-wider text-gray-500">ATR</span>
            <span className="mt-2 text-2xl font-black text-[#00ffaa]">
              {data?.atr_value !== undefined ? Number(data.atr_value).toFixed(2) : "0.00"}
            </span>
          </div>

          {/* Box RULES */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#131a30] p-4 text-center">
            <span className="text-xs font-bold tracking-wider text-gray-500">RULES</span>
            <span className="mt-2 text-[10px] font-extrabold text-[#ffb300] leading-tight">
              {data?.fib_status.includes("UPTREND") ? "EMA 9 > 20 (UP)" : 
               data?.fib_status.includes("DOWNTREND") ? "EMA 9 < 20 (DOWN)" : "KONSOLIDASI"}
            </span>
          </div>
        </div>

        {/* Bubble AI Asisten (Llama 70B) */}
        <div className="relative mt-6 rounded-2xl bg-[#181931] p-5 border border-[#3c3066]/30">
          <span className="absolute -top-3 left-4 rounded-lg bg-[#5352f3] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md">
            AI ASISTEN (70B)
          </span>
          <p className="text-sm leading-relaxed text-gray-300 font-medium">
            {data?.ai_advice || "Lagi mantau pergerakan market dulu, tunggu sinyal mantap ya bro..."}
          </p>
        </div>

        {/* Button Action Dynamic */}
        <button
          disabled={!readyToGas}
          className={`mt-6 w-full rounded-2xl py-4 text-center text-base font-black uppercase tracking-wider transition-all duration-300 ${
            readyToGas
              ? "bg-[#00ffaa] text-[#07090e] shadow-[0_0_20px_rgba(0,255,170,0.4)] hover:scale-[1.02]"
              : "bg-gradient-to-r from-teal-500 to-emerald-500 text-[#07090e] opacity-90 cursor-not-allowed"
          }`}
        >
          {isBuy ? "GAS ENTRY BUY! 🚀" : isSell ? "GAS ENTRY SELL! 🔥" : "STAND BY ENTRY! ⏱️"}
        </button>

        {/* ========================================= */}
        {/* TOMBOL REFRESH MANUAL + KETERANGAN */}
        {/* ========================================= */}
        <div className="mt-7 flex flex-col items-center pb-2">
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 rounded-full bg-[#1b223c] px-6 py-3 text-sm font-bold text-gray-200 transition-all hover:bg-[#252e50] active:scale-95 disabled:opacity-50 border border-gray-700/50"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            {isRefreshing ? "Narik Data..." : "Refresh Data Manual"}
          </button>
          <span className="mt-3 text-center text-[10px] font-medium tracking-wide text-gray-500">
            *Klik tombol di atas buat narik angka terbaru<br/>& update nasehat AI
          </span>
        </div>

      </div>
    </div>
  );
}
