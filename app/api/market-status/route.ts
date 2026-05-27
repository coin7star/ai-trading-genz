import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Jalur alternatif: Cek process.env atau scope global Cloudflare (globalThis)
    // @ts-ignore
    const apiKey = process.env.AI_API_KEY || globalThis.AI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Kunci rahasia AI_API_KEY kagak kebaca di runtime Cloudflare, Bro!");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const marketData = {
      pair: "XAU/USD",
      timeframe: "M2",
      mfi_level: Math.floor(Math.random() * (80 - 20 + 1)) + 20, 
      fib_status: "Waiting 1.618"
    };

    const prompt = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe ${marketData.timeframe}, MFI di level ${marketData.mfi_level}, status Fibonacci ${marketData.fib_status}. 
      
      Aturan trading user: 
      1. Jangan entry sebelum harga menyentuh area 1.618.
      2. MFI di atas 70 berarti Overbought (rawan turun), di bawah 30 berarti Oversold (rawan naik).
      
      Beri tahu user secara singkat apakah boleh entry atau harus sabar. 
      Gunakan bahasa tongkrongan Jakarta (bro, gas, fomo, nyangkut, dsb). Maksimal 2 kalimat pendek. Jangan kaku.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const ai_advice = response.text();

    return NextResponse.json({
      pair: marketData.pair,
      timeframe: marketData.timeframe,
      mfi_level: marketData.mfi_level,
      fib_status: marketData.fib_status,
      ai_advice: ai_advice
    });

  } catch (error: any) {
    console.error("Error log:", error);
    // Kita tembak error aslinya ke layar biar ketahuan biang keroknya!
    return NextResponse.json({ 
      pair: "XAU/USD",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "ERROR",
      ai_advice: `Konslet nih! Detail Error: ${error?.message || error || "Unknown Error"}` 
    });
  }
}
