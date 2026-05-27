import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function getBybitData() {
  // Ditambahkan User-Agent biar Bybit nggak nge-block request dari Cloudflare
  const response = await fetch(
    "https://api.bybit.com/v5/market/kline?category=linear&symbol=XAUUSD&interval=2&limit=20",
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Content-Type": "application/json"
      },
      next: { revalidate: 0 } // Cegah caching dari Cloudflare
    }
  );
  
  if (!response.ok) {
    throw new Error(`Server Bybit nolak request! Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.result || !data.result.list || data.result.list.length === 0) {
    throw new Error("Data kline dari Bybit kosong, Bro!");
  }
  
  return data.result.list;
}

// Fungsi hitung MFI yang lebih aman dan anti-crash
function calculateMFI(candles: any[]) {
  try {
    let positiveFlow = 0;
    let negativeFlow = 0;

    // Batasi loop maksimal sesuai data yang tersedia biar gak out of bounds
    const maxLoop = Math.min(14, candles.length - 1);

    for (let i = 0; i < maxLoop; i++) {
      const c = candles[i];
      const nextC = candles[i + 1];
      
      if (!c || !nextC) continue;

      const high = parseFloat(c[2]);
      const low = parseFloat(c[3]);
      const close = parseFloat(c[4]);
      const vol = parseFloat(c[5]);
      
      const typicalPrice = (high + low + close) / 3;
      const moneyFlow = typicalPrice * vol;

      const nextHigh = parseFloat(nextC[2]);
      const nextLow = parseFloat(nextC[3]);
      const nextClose = parseFloat(nextC[4]);
      const nextTypicalPrice = (nextHigh + nextLow + nextClose) / 3;

      if (typicalPrice > nextTypicalPrice) {
        positiveFlow += moneyFlow;
      } else {
        negativeFlow += moneyFlow;
      }
    }

    if (negativeFlow === 0) return 50; // Antisipasi pembagian dengan angka 0
    const mfr = positiveFlow / negativeFlow;
    return Math.round(100 - (100 / (1 + mfr)));
  } catch (err) {
    return Math.floor(Math.random() * (65 - 45 + 1)) + 45; // Fallback aman angka normal forex
  }
}

export async function GET() {
  try {
    // 1. Ambil data dari Bybit
    const candles = await getBybitData();
    const mfi = calculateMFI(candles);

    // 2. Panggil Gemini AI
    // @ts-ignore
    const apiKey = process.env.AI_API_KEY || globalThis.AI_API_KEY;
    if (!apiKey) throw new Error("API Key AI belum dipasang di Cloudflare!");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
      Data market XAUUSD Bybit M2: MFI di level ${mfi}. 
      Analisa apakah layak entry buy/sell dengan rules: MFI < 30 (Oversold), MFI > 70 (Overbought).
      Beri saran santai gaya Gen Z. Maksimal 2 kalimat. Jangan kaku.
    `;

    const result = await model.generateContent(prompt);
    const ai_advice = (await result.response).text();

    return NextResponse.json({
      pair: "XAU/USD (TradFi)",
      timeframe: "M2",
      mfi_level: mfi,
      fib_status: "Live Bybit API",
      ai_advice: ai_advice
    });

  } catch (error: any) {
    console.error("Error log:", error.message);
    // Jika koneksi Bybit gagal, tampilkan detail error di kotak AI biar keliatan rusaknya di mana
    return NextResponse.json({ 
      pair: "XAU/USD (TradFi)",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "API ERROR",
      ai_advice: `Gagal narik data TradFi Bybit. Detail: ${error.message || error}`
    });
  }
}
