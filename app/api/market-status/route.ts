import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Paksa Next.js jalanin API ini secara dinamis (nggak di-cache)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ngambil API Key rahasia dari Cloudflare
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key Gemini belum dipasang Bro!");
    }

    // Inisialisasi Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // MOCK DATA: Anggap aja ini data live yang ketarik dari Meta5
    const marketData = {
      pair: "XAU/USD",
      timeframe: "M2",
      mfi_level: Math.floor(Math.random() * (80 - 20 + 1)) + 20, // Bikin MFI gerak random 20-80
      fib_status: "Waiting 1.618"
    };

    // PROMPT RAHASIA: Ngajarin AI cara ngomong ke kamu
    const prompt = `
      Kamu adalah asisten trading santai bergaya anak muda Gen Z. 
      Data market saat ini: Pair ${marketData.pair}, Timeframe ${marketData.timeframe}, MFI di level ${marketData.mfi_level}, status Fibonacci ${marketData.fib_status}. 
      
      Aturan trading user: 
      1. Jangan entry sebelum harga menyentuh area 1.618.
      2. MFI di atas 70 berarti Overbought (rawan turun), di bawah 30 berarti Oversold (rawan naik).
      
      Beri tahu user secara singkat apakah boleh entry atau harus sabar. 
      Gunakan bahasa tongkrongan Jakarta (bro, gas, fomo, nyangkut, dsb). Maksimal 2 kalimat pendek. Jangan kaku.
    `;

    // Minta Gemini mikir dan balasin prompt-nya
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const ai_advice = response.text();

    // Kirim balasan ke Frontend web kamu
    return NextResponse.json({
      pair: marketData.pair,
      timeframe: marketData.timeframe,
      mfi_level: marketData.mfi_level,
      fib_status: marketData.fib_status,
      ai_advice: ai_advice
    });

  } catch (error) {
    console.error("Error dari Gemini:", error);
    // Kalau API lagi error, ini jawaban daruratnya
    return NextResponse.json({ 
      pair: "XAU/USD",
      timeframe: "M2",
      mfi_level: 0,
      fib_status: "ERROR",
      ai_advice: "Waduh Bro, otak AI gue lagi konslet bentar nih. Coba refresh lagi ya." 
    });
  }
}
