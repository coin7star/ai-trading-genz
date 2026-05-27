import { NextResponse } from 'next/server';

export async function GET() {
  // Nanti apiKey ini dipakai buat fetch ke OpenAI/Gemini/Anthropic
  // const apiKey = process.env.AI_API_KEY;

  // Mock data yang sesuai dengan setup rules
  const data = {
    pair: "XAU/USD",
    timeframe: "M2",
    mfi_level: 46,
    fib_status: "Waiting 1.618",
    ai_advice: "Bro, setup M2 belum mateng nih. MFI masih nyangkut di 46 dan harga belum kena area rules 1.618 lo. Santai dulu, jangan maksa masuk ntar malah fly ke arah lain."
  };

  return NextResponse.json(data);
}
