import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Fungsi bantuan buat nyari gudang KV
function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  return (
    context.env?.MARKET_DATA || 
    // @ts-ignore
    process.env.MARKET_DATA || 
    // @ts-ignore
    globalThis.MARKET_DATA
  );
}

// JALUR 1: POST (Menerima setoran data dari MT5 Laptop)
export async function POST(req: Request) {
  try {
    const kv = getKVNamespace(req);
    if (!kv) return NextResponse.json({ success: false, error: "KV Kosong" }, { status: 500 });

    const textData = await req.text();
    let body: any = {};
    
    try {
      body = JSON.parse(textData); // Bongkar format JSON murni dari MT5 
    } catch (e) {
      // Fallback cadangan kalau format MT5 berantakan
      const urlParams = new URLSearchParams(textData);
      body = Object.fromEntries(urlParams.entries());
    }

    const mfi = body.mfi_level !== undefined ? Number(body.mfi_level) : 0;
    
    // Variabel fib_status dari MT5 sekarang isinya data EMA (contoh: "EMA 9 > 20 (UPTREND)")
    const status_trend = body.fib_status || "Menunggu Data EMA..."; 

    // Simpan ke Cloudflare KV
    await kv.put("latest_xau_m2", JSON.stringify({
      pair: body.pair || "XAUUSD+ (TradFi)",
      timeframe: body.timeframe || "M2",
      mfi_level: mfi,
      fib_status: status_trend, 
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, message: `Mantap, data EMA & MFI ${mfi} kesimpan!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// JALUR 2: GET (Nampilin data ke layar HP lo)
export async function GET(req: Request) {
  try {
    // @ts-ignore
    const apiKey = process.env.AI_API_KEY || globalThis.AI_API_KEY;
    if (!apiKey) throw new Error("API Key kosong");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const kv = getKVNamespace(req);
    
    // Data default
    let marketData = {
      pair: "XAUUSD+",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "Menunggu Data EMA..."
    };

    if (kv) {
      const rawData = await kv.get("latest_xau_m2");
      if (rawData) {
        marketData = JSON.parse(rawData);
      }
    }

    // OTAK BARU AI: Fokus ke EMA 9 & 20, buang jauh-jauh Fibo!
    const prompt = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe ${marketData.timeframe}, MFI di level ${marketData.mfi_level}, status trend: ${marketData.fib_status}. 
      
      Aturan trading user: 
      1. Saranin ENTRY BUY JIKA trend tertulis UPTREND dan MFI dalam posisi Oversold (di bawah 30).
      2. Saranin ENTRY SELL JIKA trend tertulis DOWNTREND dan MFI dalam posisi Overbought (di atas 70).
      3. Selain dari 2 kondisi di atas, suruh user "Wait and See" dan tahan jempol biar gak fomo.
      
      Beri saran singkat (maksimal 2 kalimat) pakai bahasa tongkrongan Jakarta (bro, gas, fomo, nyangkut, dsb). Jangan pernah sebut kata Fibo atau 1.618 lagi, karena sekarang kita main pake garis EMA!
    `;

    const result = await model.generateContent(prompt);
    const ai_advice = (await result.response).text();

    return NextResponse.json({
      pair: marketData.pair,
      timeframe: marketData.timeframe,
      mfi_level: marketData.mfi_level,
      fib_status: marketData.fib_status,
      ai_advice: ai_advice
    });

  } catch (error: any) {
    return NextResponse.json({ 
      pair: "XAUUSD+",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "ERROR",
      ai_advice: `Konslet nih bro! Error: ${error.message}` 
    });
  }
}
