import { NextRequest, NextResponse } from 'next/server';

interface FlightLookupResponse {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  terminal?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { flightNumber, date } = await req.json();

    if (!flightNumber || typeof flightNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: '請輸入有效的班機號碼' },
        { status: 400 }
      );
    }

    const cleanFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '未設定 GEMINI_API_KEY 環境變數' },
        { status: 500 }
      );
    }

    const prompt = `Use Google Search to find current schedule for flight ${cleanFlightNumber}${
      date ? ` on or around date ${date}` : ''
    }.
Return ONLY a single JSON code block with fields:
- airline (string, 航空公司繁體中文名稱，例如 星宇航空、長榮航空、中華航空、國泰航空、日本航空、全日空、阿聯酋航空、聯合航空等)
- flightNumber (string, 班機代號，例如 ${cleanFlightNumber})
- departureAirport (string, 3-letter IATA code，例如 TPE, NRT, LAX, DXB)
- departureCity (string, 繁體中文出發城市名，例如 台北桃園, 東京成田, 洛杉磯, 杜拜)
- departureTime (string, 預定起飛時間，24小時制 HH:mm 格式，例如 08:30)
- arrivalAirport (string, 3-letter IATA code，例如 NRT, TPE, KIX, SFO)
- arrivalCity (string, 繁體中文抵達城市名，例如 東京成田, 台北桃園, 大阪關西, 舊金山)
- arrivalTime (string, 預定抵達時間，24小時制 HH:mm 格式，例如 12:45)
- terminal (string, 出發航廈如 T1, T2，若無則為空字串)
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
      console.error('Gemini API Error:', errText);
      return NextResponse.json(
        { success: false, error: `Gemini API 查詢失敗 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const combinedText = parts.map((p: any) => p.text || '').join('\n');

    // 解析 JSON
    const jsonMatch = combinedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || combinedText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.warn('Gemini response missing JSON block:', combinedText);
      return NextResponse.json(
        { success: false, error: '未能成功解析班機資料' },
        { status: 422 }
      );
    }

    const parsedJson: FlightLookupResponse = JSON.parse(jsonMatch[1]);

    // 格式化 24 小時制時間確保乾淨
    const formatTime = (t?: string) => {
      if (!t) return '';
      const match = t.match(/(\d{1,2}):(\d{2})/);
      if (!match) return t;
      let h = parseInt(match[1], 10);
      const m = match[2];
      if (/pm/i.test(t) && h < 12) h += 12;
      if (/am/i.test(t) && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    };

    const cleanData: FlightLookupResponse = {
      airline: parsedJson.airline || '',
      flightNumber: (parsedJson.flightNumber || cleanFlightNumber).toUpperCase(),
      departureAirport: (parsedJson.departureAirport || '').toUpperCase(),
      departureCity: parsedJson.departureCity || '',
      departureTime: formatTime(parsedJson.departureTime),
      arrivalAirport: (parsedJson.arrivalAirport || '').toUpperCase(),
      arrivalCity: parsedJson.arrivalCity || '',
      arrivalTime: formatTime(parsedJson.arrivalTime),
      terminal: parsedJson.terminal || '',
    };

    return NextResponse.json({ success: true, data: cleanData });
  } catch (error: any) {
    console.error('Flight lookup handler error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
