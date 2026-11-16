import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnitxohnywhzhrfgaxrr.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXR4b2hueXdoemhyZmdheHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjM4NDUsImV4cCI6MjEwMDUzOTg0NX0.hFpV8BzKFtY4sPza7nUk-EIGEsfSYxFcQlX33DpV8G4';

export async function POST(req: NextRequest) {
  try {
    const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!verifyAuthToken(authCookie)) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.tripId) {
      return NextResponse.json({ error: '缺少 tripId 參數' }, { status: 400 });
    }

    const {
      tripId,
      startDate,
      fxRate,
      budgetTwd,
      tripNote,
      foreignCurrency,
      companions,
      timezone,
      title,
      dates,
      badgeText,
      customIcon,
      svgIcon,
      citySchedule,
      isTaiwanTrip,
      accommodations,
      flights,
      coupons,
      climateGuide,
    } = body;

    const iconToSave = customIcon !== undefined ? customIcon : svgIcon;
    const restUrl = `${supabaseUrl}/rest/v1`;
    const headers: Record<string, string> = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 1. 查詢資料庫目前此旅程的現有記錄
    const fetchRes = await fetch(
      `${restUrl}/trip_settings?trip_id=eq.${encodeURIComponent(tripId)}&select=*&limit=1`,
      { headers }
    );

    let existingRow: any = null;
    if (fetchRes.ok) {
      const list = await fetchRes.json();
      existingRow = list?.[0] || null;
    } else {
      console.warn('Fetch trip_settings HTTP error in API:', fetchRes.status);
    }

    const existingNote = existingRow?.trip_note || '';

    // 從現有 trip_note 或傳入之 tripNote 進行安全字串重組
    let baseNote = tripNote !== undefined ? tripNote : existingNote;

    // 移除舊的隱藏標籤，避免重複堆疊
    baseNote = baseNote
      .replace(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/g, '')
      .replace(/<!--CITY_SCHEDULE_START-->[\s\S]*?<!--CITY_SCHEDULE_END-->/g, '')
      .replace(/<!--IS_TAIWAN_START-->[\s\S]*?<!--IS_TAIWAN_END-->/g, '')
      .trim();

    let finalTripNote = baseNote;

    // (A) 自訂圖示 (customIcon)
    if (iconToSave !== undefined) {
      if (iconToSave && iconToSave.trim()) {
        try {
          const encoded = Buffer.from(encodeURIComponent(iconToSave.trim())).toString('base64');
          finalTripNote += `\n<!--CUSTOM_ICON_START-->${encoded}<!--CUSTOM_ICON_END-->`;
        } catch {
          finalTripNote += `\n<!--CUSTOM_ICON_START-->${iconToSave.trim()}<!--CUSTOM_ICON_END-->`;
        }
      }
    } else {
      // 保留原有圖示標籤
      const oldIcon = existingNote.match(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/);
      if (oldIcon) finalTripNote += `\n${oldIcon[0]}`;
    }

    // (B) 城市日程 (citySchedule)
    if (citySchedule !== undefined) {
      if (citySchedule && citySchedule.trim()) {
        try {
          const encoded = Buffer.from(encodeURIComponent(citySchedule.trim())).toString('base64');
          finalTripNote += `\n<!--CITY_SCHEDULE_START-->${encoded}<!--CITY_SCHEDULE_END-->`;
        } catch {
          finalTripNote += `\n<!--CITY_SCHEDULE_START-->${citySchedule.trim()}<!--CITY_SCHEDULE_END-->`;
        }
      }
    } else {
      // 保留原有城市日程標籤
      const oldCity = existingNote.match(/<!--CITY_SCHEDULE_START-->[\s\S]*?<!--CITY_SCHEDULE_END-->/);
      if (oldCity) finalTripNote += `\n${oldCity[0]}`;
    }

    // (C) 台灣行程註記 (isTaiwanTrip)
    if (isTaiwanTrip !== undefined) {
      finalTripNote += `\n<!--IS_TAIWAN_START-->${isTaiwanTrip ? '1' : '0'}<!--IS_TAIWAN_END-->`;
    } else {
      const oldTw = existingNote.match(/<!--IS_TAIWAN_START-->[\s\S]*?<!--IS_TAIWAN_END-->/);
      if (oldTw) finalTripNote += `\n${oldTw[0]}`;
    }

    // (D) 處理 COUPONS, ACCOMMODATIONS, FLIGHTS, CLIMATE_GUIDE 標籤
    const metaPayloads: Record<string, any> = {
      ACCOMMODATIONS: accommodations,
      FLIGHTS: flights,
      COUPONS: coupons,
      CLIMATE_GUIDE: climateGuide,
    };

    for (const [tag, val] of Object.entries(metaPayloads)) {
      const regex = new RegExp(`<!--${tag}_START-->[\\s\\S]*?<!--${tag}_END-->`, 'g');
      // 先從 finalTripNote 移除該標籤（避免重複堆疊）
      finalTripNote = finalTripNote.replace(regex, '').trim();

      if (val !== undefined) {
        // 使用者/客戶端有明確傳入
        const hasContent = Array.isArray(val) ? val.length > 0 : Boolean(val);
        if (hasContent) {
          try {
            const jsonStr = JSON.stringify(val);
            const encoded = Buffer.from(encodeURIComponent(jsonStr)).toString('base64');
            finalTripNote += `\n<!--${tag}_START-->${encoded}<!--${tag}_END-->`;
          } catch (e) {
            console.error(`Failed to encode ${tag}:`, e);
          }
        }
      } else {
        // 未傳入：保留 existingNote 中的既有標籤
        const matchOld = existingNote.match(new RegExp(`<!--${tag}_START-->[\\s\\S]*?<!--${tag}_END-->`));
        if (matchOld) {
          finalTripNote += `\n${matchOld[0]}`;
        }
      }
    }

    finalTripNote = finalTripNote.trim();

    // 2. 構建並更新 trip_settings
    const nowIso = new Date().toISOString();
    const settingsPayload: Record<string, any> = {
      updated_at: nowIso,
      start_date: startDate !== undefined ? startDate : (existingRow?.start_date || ''),
      fx_rate: fxRate !== undefined ? Number(fxRate) : (existingRow?.fx_rate ?? 1),
      budget_twd: budgetTwd !== undefined ? Number(budgetTwd) : (existingRow?.budget_twd ?? 0),
      trip_note: finalTripNote,
      foreign_currency: foreignCurrency !== undefined ? foreignCurrency : (existingRow?.foreign_currency || ''),
      companions: companions !== undefined ? companions : (existingRow?.companions || 'Jo'),
      timezone: timezone !== undefined ? timezone : (existingRow?.timezone || 'Asia/Taipei'),
    };

    let settingsSaveRes: Response;
    if (existingRow) {
      settingsSaveRes = await fetch(
        `${restUrl}/trip_settings?trip_id=eq.${encodeURIComponent(tripId)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(settingsPayload),
        }
      );
    } else {
      settingsSaveRes = await fetch(`${restUrl}/trip_settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trip_id: tripId,
          categories: '[]',
          ...settingsPayload,
        }),
      });
    }

    if (!settingsSaveRes.ok) {
      const errText = await settingsSaveRes.text();
      console.error('Save trip_settings error in API:', settingsSaveRes.status, errText);
      return NextResponse.json({ error: `儲存旅程設定失敗: ${errText}` }, { status: 500 });
    }

    // 3. 同步更新 trips 表（名稱、日期、狀態）
    if (title !== undefined || dates !== undefined || badgeText !== undefined) {
      const tripUpdate: Record<string, any> = {};
      if (title !== undefined) tripUpdate.title = title.trim();
      if (dates !== undefined) tripUpdate.dates = dates.trim();
      if (badgeText !== undefined) tripUpdate.badge_text = badgeText.trim();

      const tripCheckRes = await fetch(
        `${restUrl}/trips?id=eq.${encodeURIComponent(tripId)}&select=id&limit=1`,
        { headers }
      );
      const tripList = tripCheckRes.ok ? await tripCheckRes.json() : [];

      if (tripList && tripList.length > 0) {
        await fetch(`${restUrl}/trips?id=eq.${encodeURIComponent(tripId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(tripUpdate),
        });
      } else {
        await fetch(`${restUrl}/trips`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: tripId,
            title: title || tripId,
            dates: dates || '',
            badge_text: badgeText || '進行中',
            cover_gradient: 'from-slate-800 to-slate-900',
            description: '',
            ...tripUpdate,
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      updatedAt: nowIso,
      tripId,
    });
  } catch (err: any) {
    console.error('trip-settings route exception:', err);
    return NextResponse.json({ error: err?.message || '內部伺服器錯誤' }, { status: 500 });
  }
}
