import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function getBybitData() {
  // Ambil data kline XAUUSD M2 dari Bybit API
  const response = await fetch("https://api.bybit.com/v5/market/kline?category=linear&symbol=XAUUSD&interval=2&limit=20");
  const data = await response.json();
  return data.result.list; // Return daftar candle
}

// Fungsi hitung MFI sendiri (karena API cuma kasih data mentah)
function calculateMFI(candles: any[]) {
  let positiveFlow = 0;
  let negativeFlow = 0;

  for (let i = 0; i < 14; i++) {
    const c = candles[i];
    const high = parseFloat(c[2]);
    const low = parseFloat(c[3]);
    const close = parseFloat(c[4]);
    const vol = parseFloat(c[5]);
    const typicalPrice = (high + low + close) / 3;
    const moneyFlow = typicalPrice * vol;

    if (typicalPrice > (parseFloat(candles[i+1][2]) + parseFloat(candles[i+1][3]) + parseFloat(candles[i+1][4]))/3) {
      positiveFlow += moneyFlow;
    } else {
      negativeFlow += moneyFlow;
    }
  }
  const mfr = positiveFlow / negativeFlow;
  return Math.round(100 - (100 / (1 + mfr)));
}

export async function GET() {
  try {
    const candles = await getBybitData();
    const mfi = calculateMFI(candles);

    // @ts-ignore
    const apiKey = process.env.AI_API_KEY || globalThis.AI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
      Data market XAUUSD Bybit M2: MFI di level ${mfi}. 
      Analisa apakah layak entry buy/sell dengan rules: MFI < 30 (Oversold), MFI > 70 (Overbought).
      Beri saran santai gaya Gen Z. Maksimal 2 kalimat.
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
