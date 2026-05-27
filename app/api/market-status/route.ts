import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  return context.env?.MARKET_DATA || process.env.MARKET_DATA || (globalThis as any).MARKET_DATA;
}

// JALUR 1: POST (Dapur utama penerima data MT5 & Pemicu Telegram)
export async function POST(req: Request) {
  try {
    const kv = getKVNamespace(req);
    if (!kv) return NextResponse.json({ success: false, error: "KV Kosong" }, { status: 500 });

    // Ambil env variabel untuk Telegram dan Groq
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

    const mfi = body.mfi_level !== undefined ? Number(body.mfi_level) : 0;
    const status_trend = body.fib_status || "Menunggu Data EMA...";
    const pair = body.pair || "XAUUSD+";

    // 1. Ambil data lama di KV buat cek status sinyal sebelumnya (Anti-Spam)
    const rawOldData = await kv.get("latest_xau_m2");
    let oldSignal = "WAIT";
    if (rawOldData) {
      try {
        const oldObj = JSON.parse(rawOldData);
        oldSignal = oldObj.last_signal || "WAIT";
      } catch(e){}
    }

    // 2. Tentukan status sinyal saat ini berdasarkan rumus dewa lo
    let currentSignal = "WAIT";
    let signalType = "";

    if (status_trend.includes("UPTREND") && mfi <= 30) {
      currentSignal = "GAS_BUY";
      signalType = "🚀 ENTRY BUY 🚀";
    } else if (status_trend.includes("DOWNTREND") && mfi >= 70) {
      currentSignal = "GAS_SELL";
      signalType = "🔥 ENTRY SELL 🔥";
    }

    // 3. JIKA ADA SINYAL VALID DAN BARU (Belum pernah dikirim sebelumnya) -> TERBANGKAN TELEGRAM!
    if (currentSignal !== "WAIT" && currentSignal !== oldSignal && tgToken && tgChatId && groqKey) {
      
      // Minta Groq bikin teks seruan instan
      const promptText = `
        Kamu adalah asisten trading Gen Z Jakarta. Beri tahu user kalau ada sinyal ${signalType} di pair ${pair} M2 karena MFI berada di level ${mfi} dan trend ${status_trend}. 
        Buat kalimat seruan heboh, singkat (1 kalimat), pakai bahasa tongkrongan (gas, bro, cuan, dsb). Jangan kaku!
      `;

      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.8,
            max_tokens: 80
          })
        });
        
        const groqJson = await groqResponse.json();
        const ai_text = groqJson.choices[0]?.message?.content || `Sinyal ${signalType} Valid, Bro!`;

        // Kirim pesan ke bot Telegram lo
        const messageText = `⚠️ *SULTAN ALERTS* ⚠️\n\n🎯 *Sinyal:* ${signalType}\n📈 *Pair:* ${pair} (M2)\n📊 *MFI:* ${mfi}\n🏁 *Trend:* ${status_trend}\n\n💬 *Kata AI:* _${ai_text}_`;
        
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: messageText,
            parse_mode: "Markdown"
          })
        });
      } catch (err) {}
    }

    // 4. Simpan data terbaru beserta state sinyalnya ke KV
    await kv.put("latest_xau_m2", JSON.stringify({
      pair: pair,
      timeframe: "M2",
      mfi_level: mfi,
      fib_status: status_trend,
      last_signal: currentSignal, // Disimpan buat patokan anti-spam di next request
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, signal: currentSignal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// JALUR 2: GET (Tetap berfungsi nampilin data kalau lo iseng buka Web via HP)
export async function GET(req: Request) {
  try {
    const groqKey = process.env.GROQ_API_KEY || (globalThis as any).GROQ_API_KEY;
    if (!groqKey) throw new Error("API Key GROQ kosong");

    const kv = getKVNamespace(req);
    let marketData = { pair: "XAUUSD+", timeframe: "M2", mfi_level: 0, fib_status: "Menunggu Data EMA..." };

    if (kv) {
      const rawData = await kv.get("latest_xau_m2");
      if (rawData) marketData = JSON.parse(rawData);
    }

    const promptText = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z Jakarta. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe M2, MFI di level ${marketData.mfi_level}, status trend: ${marketData.fib_status}. 
      Aturan trading user: BUY jika UPTREND & MFI < 30. SELL jika DOWNTREND & MFI > 70. Selain itu Wait and see.
      Beri saran singkat (maksimal 2 kalimat pendek) pake bahasa tongkrongan. Jangan kaku.
    `;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.7,
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
      ai_advice: ai_advice
    });
  } catch (error: any) {
    return NextResponse.json({ pair: "XAUUSD+", timeframe: "M2", mfi_level: 0, fib_status: "ERROR", ai_advice: `Error: ${error.message}` });
  }
}
