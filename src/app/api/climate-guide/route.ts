import { NextRequest, NextResponse } from 'next/server';

interface ClimateGuideResult {
  tempMin: number;
  tempMax: number;
  headline: string;
  advice: string;
  generatedAt: number;
}

export async function POST(req: NextRequest) {
  try {
    const { city, dates, month } = await req.json();

    if (!city || typeof city !== 'string') {
      return NextResponse.json(
        { success: false, error: '請提供有效的目的地城市' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '未設定 GEMINI_API_KEY 環境變數' },
        { status: 500 }
      );
    }

    const timeContext = dates ? `dates: ${dates}` : month ? `month: ${month}` : 'travel period';
    const prompt = `Use Google Search to find the official historical climate averages (from Japan Meteorological Agency JMA, NOAA, or official meteorological services) for the city of "${city.trim()}" during ${timeContext}.
Return ONLY a single JSON code block with the following fields:
- tempMin (number, average daily low temperature in Celsius rounded to integer, e.g. 10)
- tempMax (number, average daily high temperature in Celsius rounded to integer, e.g. 18)
- headline (string, ultra-concise climate characteristic in Traditional Chinese, max 12 characters, e.g. "涼爽乾燥 · 早晚溫差大" or "溫暖舒適 · 偶有短暫陣雨")
- advice (string, 1 to 2 concise sentences of clothing and packing advice in Traditional Chinese, e.g. "建議洋蔥式穿搭，早晚需防風薄羽絨或厚外套。降雨機率低，攜帶輕便折傘即可。")

No explanation, no markdown text outside the json block.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini Climate API error:', res.status, errText);
      return NextResponse.json(
        { success: false, error: `Gemini API 請求失敗 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 擷取 JSON 區塊
    const jsonMatch =
      candidateText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      candidateText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Gemini Climate raw response without JSON:', candidateText);
      return NextResponse.json(
        { success: false, error: '無法解析 AI 氣候資料' },
        { status: 502 }
      );
    }

    const jsonString = jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0].trim();
    const parsed = JSON.parse(jsonString);

    const result: ClimateGuideResult = {
      tempMin: typeof parsed.tempMin === 'number' ? parsed.tempMin : 12,
      tempMax: typeof parsed.tempMax === 'number' ? parsed.tempMax : 20,
      headline: (parsed.headline || '溫和氣候').trim(),
      advice: (parsed.advice || '建議攜帶輕便外套與保暖衣物。').trim(),
      generatedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Climate Guide API exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
