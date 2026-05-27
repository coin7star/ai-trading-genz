import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Fungsi bantuan buat nyari gudang KV di Cloudflare Pages (Edge / Worker)
function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  
  return (
    context.env?.MARKET_DATA || 
    // @ts-ignore
    process.env.MARKET_DATA || 
    // @ts-ignore
    globalThis.MARKET_DATA ||
    // @ts-ignore
    globalThis.__STATIC_CONTENT
  );
}

// JALUR 1: POST (Menerima setoran data dari MT5 Laptop lo)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kv = getKVNamespace(req);
    
    if (!kv) {
      return NextResponse.json({ 
        success: false, 
        error: "Gudang KV MARKET_DATA tidak terdeteksi di runtime Cloudflare!" 
      }, { status: 500 });
    }

    // Paksa simpan data ke slot 'latest_xau_m2'
    await kv.put("latest_xau_m2", JSON.stringify({
      pair: body.pair || "XAU/USD+",
      timeframe: body.timeframe || "M2",
      mfi_level: Number(body.mfi_level) || 0,
      fib_status: body.fib_status || "Waiting 1.618",
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, message: "Data sukses disimpan di KV!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// JALUR 2: GET (Nampilin data ke layar HP lo)
export async function GET(req: Request) {
  try {
    // @ts-ignore
    const apiKey = process.env.AI_API_KEY || globalThis.AI_API_KEY;
    if (!apiKey) throw new Error("API Key AI belum dipasang!");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const kv = getKVNamespace(req);
    
    // Data default jika gagal atau kosong
    let marketData = {
      pair: "XAU/USD+ (TradFi)",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "Menunggu Data MT5..."
    };

    if (kv) {
      const rawData = await kv.get("latest_xau_m2");
      if (rawData) {
        marketData = JSON.parse(rawData);
      }
    } else {
      return NextResponse.json({
        pair: "CONFIG_ERROR",
        timeframe: "M2",
        mfi_level: 0,
        fib_status: "KV_NOT_FOUND",
        ai_advice: "Binding KV terdeteksi kosong, bro! Cek lagi tab Settings Cloudflare lo."
      });
    }

    const prompt = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe ${marketData.timeframe}, MFI di level ${marketData.mfi_level}, status Fibonacci ${marketData.fib_status}. 
      
      Aturan trading user: 
      1. Jangan entry sebelum harga menyentuh area 1.618.
      2. MFI di bawah 30 adalah Oversold (siap buy), di atas 70 adalah Overbought (siap sell).
      
      Beri tahu user secara singkat apakah boleh entry atau harus sabar berdasarkan level MFI asli yang tertulis. 
      Gunakan bahasa tongkrongan Jakarta (bro, gas, fomo, nyangkut, dsb). Maksimal 2 kalimat pendek. Jangan kaku.
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
      pair: "XAU/USD+ (TradFi)",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "ERROR",
      ai_advice: `Konslet nih! Detail Error: ${error.message || error}` 
    });
  }
}
