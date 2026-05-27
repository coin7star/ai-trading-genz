import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function getKVNamespace(req: Request): any {
  // @ts-ignore
  const context = req.context || req.cloudflare || {};
  return context.env?.MARKET_DATA || process.env.MARKET_DATA || globalThis.MARKET_DATA;
}

export async function POST(req: Request) {
  try {
    const kv = getKVNamespace(req);
    const textData = await req.text();
    
    // Bongkar paksa data dari laptop lo
    const params = new URLSearchParams(textData);
    const mfi = params.get('mfi_level') || "0";
    const pair = params.get('pair') || "XAU/USD+ (TradFi)";
    const fib = params.get('fib_status') || "Menunggu 1.618";

    // Simpan ke KV
    await kv.put("latest_xau_m2", JSON.stringify({
      pair: pair,
      mfi_level: Number(mfi),
      fib_status: fib,
      timestamp: Date.now()
    }));

    return NextResponse.json({ success: true, received_mfi: mfi });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}

export async function GET(req: Request) {
  try {
    const kv = getKVNamespace(req);
    const rawData = await kv.get("latest_xau_m2");
    const data = rawData ? JSON.parse(rawData) : { mfi_level: 0, pair: "XAU/USD+", fib_status: "No Data" };

    // @ts-ignore
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || globalThis.AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Data market: MFI ${data.mfi_level}. Beri saran singkat gaya anak muda Jakarta.`;
    const result = await model.generateContent(prompt);

    return NextResponse.json({
      ...data,
      ai_advice: result.response.text()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
