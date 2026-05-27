import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  return context.env?.MARKET_DATA || process.env.MARKET_DATA || globalThis.MARKET_DATA;
}

// JALUR 1: POST (Menerima setoran data dari MT5 Laptop)
export async function POST(req: Request) {
  try {
    const kv = getKVNamespace(req);
    if (!kv) return NextResponse.json({ success: false, error: "KV Kosong" }, { status: 500 });

    const textData = await req.text();
    let body: any = {};
    
    try {
      body = JSON.parse(textData);
    } catch (e) {
      const urlParams = new URLSearchParams(textData);
      body = Object.fromEntries(urlParams.entries());
    }

    const mfi = body.mfi_level !== undefined ? Number(body.mfi_level) : 0;
    const status_trend = body.fib_status || "Menunggu Data EMA..."; 

    await kv.put("latest_xau_m2", JSON.stringify({
      pair: body.pair || "XAUUSD+ (TradFi)",
      timeframe: body.timeframe || "M2",
      mfi_level: mfi,
      fib_status: status_trend, 
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, message: "Data sukses disetor ke KV!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// JALUR 2: GET (Nampilin data ke layar HP lewat mesin GROQ API)
export async function GET(req: Request) {
  try {
    // @ts-ignore
    const groqKey = process.env.GROQ_API_KEY || globalThis.GROQ_API_KEY;
    if (!groqKey) throw new Error("API Key GROQ belum dipasang di Cloudflare!");

    const kv = getKVNamespace(req);
    
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

    // Siapkan instruksi buat Llama di Groq
    const promptText = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z Jakarta. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe M2, MFI di level ${marketData.mfi_level}, status trend: ${marketData.fib_status}. 
      
      Aturan trading user: 
      1. Saranin ENTRY BUY JIKA trend tertulis UPTREND dan MFI dalam posisi Oversold (di bawah 30).
      2. Saranin ENTRY SELL JIKA trend tertulis DOWNTREND dan MFI dalam posisi Overbought (di atas 70).
      3. Selain dari 2 kondisi di atas, suruh user "Wait and See" dan tahan jempol biar gak fomo.
      
      Beri saran singkat (maksimal 2 kalimat pendek) pake bahasa tongkrongan (bro, gas, fomo, nyangkut, dsb). Jangan kaku.
    `;

    // Tembak langsung ke API resmi Groq via native fetch (Format OpenAI)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Model gratisan Groq yang super kilat
        messages: [
          { role: "user", content: promptText }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      throw new Error(`Groq API Error: ${errText}`);
    }

    const groqJson = await groqResponse.json();
    const ai_advice = groqJson.choices[0]?.message?.content || "Gagal dapet nasehat dari Groq, Bro.";

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
      ai_advice: `Groq Konslet: ${error.message}` 
    });
  }
}
