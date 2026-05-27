import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  return context.env?.MARKET_DATA || process.env.MARKET_DATA || (globalThis as any).MARKET_DATA;
}

// JALUR 1: POST (Dapur utama penerima data MT5)
export async function POST(req: Request) {
  try {
    const kv = getKVNamespace(req);
    if (!kv) return NextResponse.json({ success: false, error: "KV Kosong" }, { status: 500 });

    const groqKey = process.env.GROQ_API_KEY || (globalThis as any).GROQ_API_KEY;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN || (globalThis as any).TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID || (globalThis as any).TELEGRAM_CHAT_ID;

    const textData = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(textData);
    } catch (e) {
      const urlParams = new URLSearchParams(textData);
      body = Object.fromEntries(urlParams.entries());
    }

    // Paksa ambil nama pair asli dari MT5 (apapun namanya, mau XAUUSD atau XAUUSD+)
    const pair = body.pair || "XAUUSD+";
    const timeframe = body.timeframe || "M2";
    const mfi = body.mfi_level !== undefined ? Number(body.mfi_level) : 0;
    const status_trend = body.fib_status || "Konsolidasi";
    
    // Tangkap nilai ATR berupa float murni
    const atr = body.atr_value !== undefined ? parseFloat(body.atr_value) : 0;

    // 1. Ambil data lama di KV buat anti-spam telegram
    const rawOldData = await kv.get("latest_xau_m2");
    let oldSignal = "WAIT";
    if (rawOldData) {
      try {
        const oldObj = JSON.parse(rawOldData);
        oldSignal = oldObj.last_signal || "WAIT";
      } catch(e){}
    }

    // 2. Rumus Dewa lo
    let currentSignal = "WAIT";
    let signalType = "";

    if (status_trend.includes("UPTREND") && mfi <= 30) {
      currentSignal = "GAS_BUY";
      signalType = "🚀 ENTRY BUY 🚀";
    } else if (status_trend.includes("DOWNTREND") && mfi >= 70) {
      currentSignal = "GAS_SELL";
      signalType = "🔥 ENTRY SELL 🔥";
    }

    // 3. TELEGRAM BOT
    if (currentSignal !== "WAIT" && currentSignal !== oldSignal && tgToken && tgChatId && groqKey) {
      const promptText = `Kamu asisten trading Gen Z Jakarta. Panggil user selalu dengan sebutan 'bro' atau 'anaksultan'. Beri tahu ada sinyal ${signalType} di pair ${pair} ${timeframe} karena MFI level ${mfi}, trend ${status_trend}, ATR ${atr}. Beri 1 kalimat seruan tongkrongan heboh, singkat, padat, jangan kaku, jangan panggil kak!`;

      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.1, // Dikunci biar ga plin plan bahsanya
            max_tokens: 80
          })
        });
        
        const groqJson = await groqResponse.json();
        const ai_text = groqJson.choices[0]?.message?.content || `Sinyal ${signalType} Valid, Bro!`;

        const messageText = `⚠️ *SULTAN ALERTS* ⚠️\n\n🎯 *Sinyal:* ${signalType}\n📈 *Pair:* ${pair} (${timeframe})\n📊 *MFI:* ${mfi}\n📉 *ATR:* ${atr}\n🏁 *Trend:* ${status_trend}\n\n💬 *Kata AI:* _${ai_text}_`;
        
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChatId, text: messageText, parse_mode: "Markdown" })
        });
      } catch (err) {}
    }

    // 4. Simpan ke KV
    await kv.put("latest_xau_m2", JSON.stringify({
      pair: pair,
      timeframe: timeframe,
      mfi_level: mfi,
      fib_status: status_trend,
      atr_value: atr,
      last_signal: currentSignal,
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, signal: currentSignal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// JALUR 2: GET (Buka lewat Browser Dashboard)
export async function GET(req: Request) {
  try {
    const groqKey = process.env.GROQ_API_KEY || (globalThis as any).GROQ_API_KEY;
    if (!groqKey) throw new Error("API Key GROQ kosong");

    const kv = getKVNamespace(req);
    let marketData = { pair: "XAUUSD+", timeframe: "M2", mfi_level: 0, fib_status: "Konsolidasi", atr_value: 0 };

    if (kv) {
      const rawData = await kv.get("latest_xau_m2");
      if (rawData) marketData = JSON.parse(rawData);
    }

    // Temperature diatur ke 0.1 dan dikunci instruksinya biar gak manggil "Kak" lagi
    const promptText = `
      Kamu adalah asisten trading santai bergaya anak muda anak tongkrongan Gen Z Jakarta asli. 
      INGAT: SELALU panggil user dengan sebutan 'bro', 'lu', 'lo', atau 'anaksultan'. JANGAN PERNAH panggil 'kak' atau 'kamu', itu terlalu kaku dan dilarang!
      Data market: Pair ${marketData.pair}, TF ${marketData.timeframe}, MFI level ${marketData.mfi_level}, status trend: ${marketData.fib_status}, ATR: ${marketData.atr_value}. 
      Aturan trading: BUY jika UPTREND & MFI < 30. SELL jika DOWNTREND & MFI > 70. Selain itu Wait and see.
      Beri saran singkat (maksimal 2 kalimat pendek) pake bahasa tongkrongan santai lo.
    `;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.1, // Kunci respon biar gak berubah-ubah karakternya
        max_tokens: 100
      })
    });

    const groqJson = await groqResponse.json();
    const ai_advice = groqJson.choices[0]?.message?.content || "Gagal dapet nasehat, Bro.";

    return NextResponse.json({
      pair: marketData.pair,
      timeframe: marketData.timeframe,
      mfi_level: marketData.mfi_level,
      fib_status: marketData.fib_status,
      atr_value: marketData.atr_value,
      ai_advice: ai_advice
    });
  } catch (error: any) {
    return NextResponse.json({ pair: "XAUUSD+", timeframe: "M2", mfi_level: 0, fib_status: "ERROR", atr_value: 0, ai_advice: `Error: ${error.message}` });
  }
}
