import { supabase } from './supabase';
import { AllTripData, ItineraryItem, TodoItem, PackingItem, ExpenseItem, ShoppingItem } from '@/types/trip';
import { TripConfig, TRIPS } from '@/config/trips';

// 預設兩趟旅程範例
const INITIAL_TRIPS: TripConfig[] = [
  {
    id: 'la-2026',
    title: '2026 LA Trip',
    dates: '2026/08',
    coverGradient: 'from-slate-800 to-slate-900',
    badgeText: '進行中',
    apiUrl: 'https://script.google.com/macros/s/AKfycbwuT0HjqVqIpY9fO-zHC9xuG_U6et5AsYE9qkhR8_PqvLG3vTWdxRGERLbeEXzo4iUQ/exec',
    description: '洛杉磯觀光、棒球賽與美食之旅',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'okinawa-2026',
    title: '2026 沖繩之旅',
    dates: '2026/10',
    coverGradient: 'from-teal-700 to-cyan-900',
    badgeText: '籌備中',
    apiUrl: '',
    description: '沖繩自駕、海景與休閒之旅',
    timezone: 'Asia/Tokyo',
  },
];

/** 依據進行狀態 (進行中 ➔ 籌備中 ➔ 已結束) 與旅程日期進行排序 */
export function sortTrips(trips: TripConfig[]): TripConfig[] {
  const getStatusRank = (badge: string) => {
    if (badge.includes('進行中')) return 1;
    if (badge.includes('籌備中')) return 2;
    if (badge.includes('已結束') || badge.includes('完成')) return 3;
    return 4;
  };

  const parseDate = (datesStr?: string) => {
    if (!datesStr) return '9999-99-99';
    const match = datesStr.match(/(\d{4})[./-](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}-01`;
    }
    return datesStr;
  };

  return [...trips].sort((a, b) => {
    const rankA = getStatusRank(a.badgeText || '');
    const rankB = getStatusRank(b.badgeText || '');
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const dateA = parseDate(a.dates);
    const dateB = parseDate(b.dates);
    return dateA.localeCompare(dateB);
  });
}

/** 確保預設旅程在資料庫中存在 */
export async function ensureInitialTripsExist(): Promise<TripConfig[]> {
  try {
    const { data: existing, error } = await supabase.from('trips').select('*');
    if (error) {
      console.warn('Supabase trips fetch error:', error);
      return sortTrips(INITIAL_TRIPS);
    }
    if (!existing || existing.length === 0) {
      // 種子資料寫入
      for (const trip of INITIAL_TRIPS) {
        await supabase.from('trips').insert({
          id: trip.id,
          title: trip.title,
          dates: trip.dates,
          cover_gradient: trip.coverGradient,
          badge_text: trip.badgeText,
          description: trip.description,
        });
      }
      return sortTrips(INITIAL_TRIPS);
    }
    const formatted = existing.map((row) => ({
      id: row.id,
      title: row.title,
      dates: row.dates || '',
      coverGradient: row.cover_gradient || 'from-slate-800 to-slate-900',
      badgeText: row.badge_text || '籌備中',
      apiUrl: '',
      description: row.description || '',
    }));
    return sortTrips(formatted);
  } catch (err) {
    console.error('ensureInitialTripsExist exception:', err);
    return sortTrips(INITIAL_TRIPS);
  }
}

/** 獲取所有旅程清單 */
export async function getTripsList(): Promise<TripConfig[]> {
  return ensureInitialTripsExist();
}

/** 新增一趟新旅程 */
export async function createTrip(trip: Partial<TripConfig>): Promise<TripConfig> {
  const newTrip = {
    id: trip.id || `trip-${Date.now()}`,
    title: trip.title || '新旅程',
    dates: trip.dates || '',
    cover_gradient: trip.coverGradient || 'from-indigo-600 to-purple-800',
    badge_text: trip.badgeText || '籌備中',
    description: trip.description || '',
  };

  const { error } = await supabase.from('trips').insert(newTrip);
  if (error) throw new Error(`建立旅程失敗: ${error.message}`);

  return {
    id: newTrip.id,
    title: newTrip.title,
    dates: newTrip.dates,
    coverGradient: newTrip.cover_gradient,
    badgeText: newTrip.badge_text,
    apiUrl: '',
    description: newTrip.description,
  };
}

/** 刪除旅程 */
export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw new Error(`刪除旅程失敗: ${error.message}`);
}

/** 獲取單一旅程的所有資料 (行程, 待辦, 行李, 花費, 購物, 設定) */
export async function getAllData(bypassCache = false, tripId = 'la-2026'): Promise<AllTripData> {
  try {
    const [
      itineraryRes,
      todoRes,
      packingRes,
      expenseRes,
      shoppingRes,
      settingsRes,
      tripRes,
      allPackingCatsRes,
      allTodoCatsRes,
    ] = await Promise.all([
      supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      supabase.from('todo_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      supabase.from('packing_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      supabase.from('expense_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      supabase.from('shopping_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      // 使用 select('*') 容錯讀取所有存在欄位
      supabase.from('trip_settings')
        .select('*')
        .eq('trip_id', tripId)
        .limit(1),
      supabase.from('trips')
        .select('*')
        .eq('id', tripId)
        .limit(1),
      supabase.from('packing_items').select('category'),
      supabase.from('todo_items').select('category'),
    ]);

    const itinerary: ItineraryItem[] = (itineraryRes.data || []).map((row, idx) => ({
      rowIndex: idx + 2, // 保持相容性 1-indexed
      day: row.Day || row.day || `Day ${row.day_number || 1}`,
      date: row.Date || row.date || row.date_str || '',
      time: row.Time || row.time || '',
      type: row.Type || row.type || row.category || '觀光',
      title: row.Title || row.title || '未命名行程',
      content: row.Content || row.content || row.note || '',
      links: row.Links || row.links || row.location || row.url || row.URL || '',
      isVisited: !!(row.Is_Visited ?? row.is_visited ?? false),
    }));

    const todo: TodoItem[] = (todoRes.data || []).map((row, idx) => ({
      rowIndex: idx + 2,
      category: row.category || row.Category || '待辦',
      task: row.task || row.Task || row.task_name || '',
      note: row.note || row.Note || (row.due_date ? `到期日: ${row.due_date}` : ''),
      isDone: !!(row.completed ?? row.Is_Done ?? row.is_done ?? false),
    }));

    const packing: PackingItem[] = (packingRes.data || []).map((row, idx) => ({
      rowIndex: idx + 2,
      category: row.category || row.Category || '個人物品',
      person: row.owner || row.person || row.Person || '全員',
      item: row.item_name || row.item || row.Item || '',
      note: row.note || row.Note || '',
      location: row.location || row.Location || row.place || row.storage || '',
      isPacked: !!(row.packed ?? row.is_packed ?? row.Is_Packed ?? false),
    }));

    const expenses: ExpenseItem[] = (expenseRes.data || []).map((row, idx) => ({
      rowIndex: idx + 2,
      category: row.category || row.Category || '餐飲',
      // DB 欄位：title（CSV 上傳後直接對應）
      item: row.title || row.Title || row.item || row.Item || row.item_name || '',
      amount: Number(row.amount || row.Amount || 0),
      currency: row.currency || row.Currency || 'USD',
      // DB 欄位：paid_by（CSV 上傳後直接對應）
      paidBy: row.paid_by || row['Paid By'] || row.Paid_By || row.payer || 'Jo',
      split: row.split || row.Split || 'Both',
      note: row.note || row.Note || row.notes || '',
      date: row.date || row.Date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
    }));

    const shopping: ShoppingItem[] = (shoppingRes.data || []).map((row, idx) => ({
      rowIndex: idx + 2,
      store: row.store || row.Store || '一般店家',
      // 為誰買：對應 for_whom / For Whom
      forWhom: row.for_whom || row['For Whom'] || row.For_Whom || row.forWhom || '自己',
      item: row.item_name || row.item || row.Item || '',
      quantity: row.quantity || row.Quantity || '1',
      price: Number(row.estimated_price ?? row.Estimated_Price ?? row['Estimated Price'] ?? 0),
      purchaseStatus: row.purchase_status || row.Purchase_Status || (row.bought ?? row.Done ?? row.Is_Done ?? row.is_done ? 'purchased' : 'pending'),
      image: row.image || row.Image || '',
      note: row.note || row.Note || '',
      // 完成狀態：對應 bought / Done / is_done
      isDone: !!(row.bought ?? row.Done ?? row.Is_Done ?? row.is_done ?? false),
    }));

    // settingsRes / tripRes 現在回傳 array（.limit(1)），取第一筆
    const settingsData = settingsRes.data?.[0] ?? null;
    const tripData = tripRes.data?.[0] ?? null;

    const fxRate = settingsData?.fx_rate ? Number(settingsData.fx_rate) : 32.5;
    const startDate = settingsData?.start_date || '';
    const budgetTwd = settingsData?.budget_twd ? Number(settingsData.budget_twd) : 0;
    const rawTripNote = settingsData?.trip_note || '';
    let tripNote = rawTripNote;
    let customIcon = '';

    // 解析跨裝置同步的自訂圖示（前台上傳之 PNG Data URI 或隱藏標籤）
    const customIconMatch = rawTripNote.match(/<!--CUSTOM_ICON_START-->([\s\S]*?)<!--CUSTOM_ICON_END-->/) ||
                            rawTripNote.match(/<!--SVG_ICON_START-->([\s\S]*?)<!--SVG_ICON_END-->/);
    if (customIconMatch && customIconMatch[1].trim()) {
      const inner = customIconMatch[1].trim();
      try {
        customIcon = decodeURIComponent(atob(inner));
      } catch {
        try {
          customIcon = decodeURIComponent(inner);
        } catch {
          customIcon = inner;
        }
      }
      tripNote = rawTripNote.replace(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/, '').trim();
    } else {
      const localCustomIcon = typeof window !== 'undefined'
        ? localStorage.getItem(`customIcon_${tripId}`) || localStorage.getItem(`svgIcon_${tripId}`) || ''
        : '';
      customIcon = settingsData?.custom_icon || settingsData?.svg_icon || localCustomIcon || '';
    }

    const foreignCurrency = settingsData?.foreign_currency || 'USD';
    const companions = settingsData?.companions || 'Jo, Will';
    const tripTitle = settingsData?.title || tripData?.title || tripId;
    const tripDates = settingsData?.dates || tripData?.dates || '';
    const timezone = settingsData?.timezone || TRIPS[tripId]?.timezone || 'Asia/Taipei';

    // 跨旅程歷史分類聚合（去重並過濾無效關鍵字）
    const INVALID_CATEGORIES = ['公用', '公用物品', '隨身', '行李', '託運', '托運', '手提', '穿著', '其他', '全部'];
    const historicalPackingCategories = Array.from(new Set(
      (allPackingCatsRes.data || [])
        .map((r: any) => (r.category || '').trim())
        .filter((c: string) => c && !INVALID_CATEGORIES.includes(c))
    ));
    const historicalTodoCategories = Array.from(new Set(
      (allTodoCatsRes.data || [])
        .map((r: any) => (r.category || '').trim())
        .filter((c: string) => c && !INVALID_CATEGORIES.includes(c))
    ));

    return {
      itinerary,
      todo,
      packing,
      expenses,
      shopping,
      fxRate,
      tripNote,
      startDate,
      budgetTwd,
      foreignCurrency,
      companions,
      tripTitle,
      tripDates,
      timezone,
      customIcon,
      svgIcon: customIcon,
      historicalPackingCategories,
      historicalTodoCategories,
    };
  } catch (err) {
    console.error('getAllData Supabase error:', err);
    const localCustomIcon = typeof window !== 'undefined' ? localStorage.getItem(`customIcon_${tripId}`) || '' : '';
    return {
      itinerary: [],
      todo: [],
      packing: [],
      expenses: [],
      shopping: [],
      fxRate: 32.5,
      tripNote: '',
      startDate: '',
      budgetTwd: 0,
      foreignCurrency: 'USD',
      companions: 'Jo, Will',
      tripTitle: '',
      tripDates: '',
      timezone: TRIPS[tripId]?.timezone || 'Asia/Taipei',
      customIcon: localCustomIcon,
      svgIcon: localCustomIcon,
    };
  }
}

/** 儲存所有旅程設定（設定彈窗用） */
export async function updateTripSettings(
  tripId: string,
  settings: {
    startDate?: string;
    fxRate?: number;
    budgetTwd?: number;
    tripNote?: string;
    foreignCurrency?: string;
    companions?: string;
    timezone?: string;
    title?: string;
    dates?: string;
    customIcon?: string;
    svgIcon?: string;
  }
): Promise<void> {
  const iconToSave = settings.customIcon !== undefined ? settings.customIcon : settings.svgIcon;

  if (typeof window !== 'undefined' && iconToSave !== undefined) {
    localStorage.setItem(`customIcon_${tripId}`, iconToSave);
  }

  // 1. 查詢現有資料與欄位名稱
  const { data: list } = await supabase
    .from('trip_settings')
    .select('*')
    .eq('trip_id', tripId)
    .limit(1);

  const existingRow = list?.[0] || null;
  const dbKeys = existingRow ? Object.keys(existingRow) : [];

  // 處理 trip_note 中跨裝置同步的自訂上傳圖示 (PNG Data URI)
  let finalTripNote = settings.tripNote ?? '';

  if (iconToSave !== undefined) {
    // 使用者明確編輯/上傳了圖示
    finalTripNote = finalTripNote.replace(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/, '').trim();
    if (iconToSave.trim()) {
      try {
        const encodedIcon = btoa(encodeURIComponent(iconToSave.trim()));
        finalTripNote = `${finalTripNote}\n<!--CUSTOM_ICON_START-->${encodedIcon}<!--CUSTOM_ICON_END-->`;
      } catch {
        finalTripNote = `${finalTripNote}\n<!--CUSTOM_ICON_START-->${iconToSave.trim()}<!--CUSTOM_ICON_END-->`;
      }
    }
  } else {
    // 保留原始隱藏標籤
    const existingIconMatch = existingRow?.trip_note?.match(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/);
    if (existingIconMatch) {
      finalTripNote = `${finalTripNote.replace(/<!--(CUSTOM|SVG)_ICON_START-->[\s\S]*?<!--(CUSTOM|SVG)_ICON_END-->/, '').trim()}\n${existingIconMatch[0]}`;
    }
  }

  const payload: Record<string, any> = {
    start_date: settings.startDate ?? '',
    fx_rate: settings.fxRate ?? 32.5,
    budget_twd: settings.budgetTwd ?? 0,
    trip_note: finalTripNote,
  };

  // 只有當 DB 擁有此欄位（或是準備全新建立）才帶入
  if (dbKeys.length === 0 || dbKeys.includes('foreign_currency')) {
    payload.foreign_currency = settings.foreignCurrency ?? 'USD';
  }
  if (dbKeys.length === 0 || dbKeys.includes('companions')) {
    payload.companions = settings.companions ?? 'Jo, Will';
  }
  if (dbKeys.length === 0 || dbKeys.includes('timezone')) {
    payload.timezone = settings.timezone ?? 'Asia/Taipei';
  }
  if (dbKeys.length === 0 || dbKeys.includes('svg_icon')) {
    payload.svg_icon = settings.svgIcon ?? '';
  }

  let settingsError;
  if (existingRow) {
    const { error } = await supabase
      .from('trip_settings')
      .update(payload)
      .eq('trip_id', tripId);
    settingsError = error;

    // 容錯重試：若因新欄位出錯，降級只更新基礎 4 欄
    if (settingsError) {
      const { start_date, fx_rate, budget_twd, trip_note } = payload;
      const { error: retryErr } = await supabase
        .from('trip_settings')
        .update({ start_date, fx_rate, budget_twd, trip_note })
        .eq('trip_id', tripId);
      settingsError = retryErr;
    }
  } else {
    const { error } = await supabase
      .from('trip_settings')
      .insert({ trip_id: tripId, categories: '[]', ...payload });
    settingsError = error;
  }

  if (settingsError) throw new Error(`設定儲存失敗: ${settingsError.message}`);

  // 2. 同步更新 trips 資料表（旅程卡片名稱與日期）
  if (settings.title !== undefined || settings.dates !== undefined) {
    try {
      await supabase
        .from('trips')
        .update({ title: settings.title, dates: settings.dates })
        .eq('id', tripId);
    } catch (e) {
      console.warn('trips update skipped:', e);
    }
  }
}

/** 根據 DB 實際擁有的欄位動態建立 Payload */
function matchDbPayload(sampleRow: any, map: Record<string, [any, ...string[]]>, tripId: string): Record<string, any> {
  const payload: Record<string, any> = { trip_id: tripId };
  const dbKeys = sampleRow ? Object.keys(sampleRow) : [];

  Object.values(map).forEach(([val, ...possibleCols]) => {
    if (dbKeys.length > 0) {
      for (const col of possibleCols) {
        if (dbKeys.includes(col)) {
          payload[col] = val;
          break;
        }
      }
    } else {
      // 若 Table 目前完全為空，帶第一個優先的欄位名
      payload[possibleCols[0]] = val;
    }
  });

  return payload;
}

/** 行程新增/編輯/儲存 */
export async function saveItineraryData(formData: any, tripId = 'la-2026'): Promise<string> {
  const { rowIndex, day, time, type, title, content, links } = formData;
  const dayMatch = day ? day.match(/\d+/) : null;
  const dayNumber = dayMatch ? parseInt(dayMatch[0], 10) : 1;

  const { data: list, error: fetchErr } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.warn('itinerary_items fetch error:', fetchErr);
  }

  const sampleRow = list?.[0] || null;
  const targetRow = (rowIndex && rowIndex >= 2 && list) ? list[rowIndex - 2] : null;

  // 優先採用標準 Supabase 欄位名稱 (day_number, url, note, category, title, time)
  const map: Record<string, [any, ...string[]]> = {
    day_number: [dayNumber, 'day_number', 'day', 'Day', 'dayNumber'],
    time: [time || '', 'time', 'Time'],
    category: [type || '觀光', 'category', 'Category', 'type', 'Type'],
    title: [title || '未命名行程', 'title', 'Title'],
    note: [content || '', 'note', 'Note', 'content', 'Content'],
    url: [links || '', 'url', 'URL', 'links', 'Links', 'location'],
  };

  const payload = matchDbPayload(targetRow || sampleRow, map, tripId);

  if (targetRow) {
    const { error } = await supabase.from('itinerary_items').update(payload).eq('id', targetRow.id);
    if (error) {
      console.error('更新行程失敗 Supabase Error:', error);
      throw new Error(`更新行程失敗: ${error.message}`);
    }
    return '更新成功';
  }

  const statusKey = sampleRow && Object.keys(sampleRow).find((k) => ['is_visited', 'Is_Visited', 'visited'].includes(k)) || 'is_visited';
  const { error } = await supabase.from('itinerary_items').insert({ ...payload, [statusKey]: false });
  if (error) {
    console.error('儲存行程失敗 Supabase Error:', error);
    throw new Error(`儲存行程失敗: ${error.message}`);
  }
  return '儲存成功';
}

export async function deleteItineraryData(rowIndex: number, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('itinerary_items').select('id').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    await supabase.from('itinerary_items').delete().eq('id', data[rowIndex - 2].id);
  }
  return '刪除成功';
}

export async function toggleVisitedStatus(rowIndex: number, isChecked: boolean, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    const row = data[rowIndex - 2];
    const key = Object.keys(row).find((k) => ['is_visited', 'Is_Visited', 'visited'].includes(k)) || 'is_visited';
    await supabase.from('itinerary_items').update({ [key]: isChecked }).eq('id', row.id);
  }
  return '已更新';
}

/** 待辦事項 */
export async function saveTodoData(formData: any, tripId = 'la-2026'): Promise<string> {
  const { rowIndex, task, category, note } = formData;

  const { data: list } = await supabase
    .from('todo_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const sampleRow = list?.[0] || null;
  const targetRow = (rowIndex && rowIndex >= 2 && list) ? list[rowIndex - 2] : null;

  const map: Record<string, [any, ...string[]]> = {
    category: [category || '待辦', 'category', 'Category'],
    task: [task || '新待辦事項', 'task', 'Task', 'task_name'],
    note: [note || '', 'note', 'Note', 'due_date'],
  };

  const payload = matchDbPayload(targetRow || sampleRow, map, tripId);

  if (targetRow) {
    const { error } = await supabase.from('todo_items').update(payload).eq('id', targetRow.id);
    if (error) throw new Error(`更新待辦失敗: ${error.message}`);
    return '更新成功';
  }

  const statusKey = sampleRow && Object.keys(sampleRow).find((k) => ['completed', 'is_done', 'Is_Done'].includes(k)) || 'completed';
  const { error } = await supabase.from('todo_items').insert({ ...payload, [statusKey]: false });
  if (error) throw new Error(`儲存待辦失敗: ${error.message}`);
  return '儲存成功';
}

export async function deleteTodoData(rowIndex: number, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('todo_items').select('id').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    await supabase.from('todo_items').delete().eq('id', data[rowIndex - 2].id);
  }
  return '刪除成功';
}

export async function toggleTodoStatus(rowIndex: number, isChecked: boolean, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('todo_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    const row = data[rowIndex - 2];
    const key = Object.keys(row).find((k) => ['completed', 'is_done', 'Is_Done'].includes(k)) || 'completed';
    await supabase.from('todo_items').update({ [key]: isChecked }).eq('id', row.id);
  }
  return '已更新';
}

/** 行李清單 */
export async function savePackingData(formData: any, tripId = 'la-2026'): Promise<string> {
  const { rowIndex, item, category, person, note, location } = formData;
  
  const { data: list } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const sampleRow = list?.[0] || null;
  const targetRow = (rowIndex && rowIndex >= 2 && list) ? list[rowIndex - 2] : null;

  const map: Record<string, [any, ...string[]]> = {
    category: [category || '個人物品', 'category', 'Category'],
    person: [person || '全員', 'owner', 'person', 'Person'],
    item: [item || '物品', 'item_name', 'item', 'Item'],
    note: [note || '', 'note', 'Note'],
    location: [location || '', 'location', 'Location', 'place', 'storage'],
  };

  const payload = matchDbPayload(targetRow || sampleRow, map, tripId);

  if (targetRow) {
    const { error } = await supabase.from('packing_items').update(payload).eq('id', targetRow.id);
    if (error) throw new Error(`更新行李失敗: ${error.message}`);
    return '更新成功';
  }

  const statusKey = sampleRow && Object.keys(sampleRow).find((k) => ['packed', 'is_packed', 'Is_Packed', 'is_done'].includes(k)) || 'packed';
  const { error } = await supabase.from('packing_items').insert({ ...payload, [statusKey]: false });
  if (error) throw new Error(`儲存行李失敗: ${error.message}`);
  return '儲存成功';
}

export async function deletePackingData(rowIndex: number, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('packing_items').select('id').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    await supabase.from('packing_items').delete().eq('id', data[rowIndex - 2].id);
  }
  return '刪除成功';
}

export async function togglePackingStatus(rowIndex: number, isChecked: boolean, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('packing_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    const row = data[rowIndex - 2];
    const key = Object.keys(row).find((k) => ['packed', 'is_packed', 'Is_Packed', 'is_done'].includes(k)) || 'packed';
    await supabase.from('packing_items').update({ [key]: isChecked }).eq('id', row.id);
  }
  return '已更新';
}

/** 記帳 */
export async function addExpenseData(formData: any, tripId = 'la-2026'): Promise<string> {
  const { rowIndex, item, category, amount, currency, paidBy, split, note } = formData;

  const { data: list } = await supabase
    .from('expense_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const sampleRow = list?.[0] || null;
  const targetRow = (rowIndex && rowIndex >= 2 && list) ? list[rowIndex - 2] : null;

  const map: Record<string, [any, ...string[]]> = {
    category: [category || '餐飲', 'category', 'Category'],
    title: [item || '消費', 'title', 'Title', 'item', 'Item', 'item_name'],
    amount: [Number(amount || 0), 'amount', 'Amount'],
    currency: [currency || 'USD', 'currency', 'Currency'],
    paidBy: [paidBy || 'Jo', 'paid_by', 'Paid By', 'Paid_By', 'payer'],
    split: [split || 'Both', 'split', 'Split'],
    note: [note || '', 'note', 'Note', 'notes'],
  };

  const payload = matchDbPayload(targetRow || sampleRow, map, tripId);

  if (targetRow) {
    const { error } = await supabase.from('expense_items').update(payload).eq('id', targetRow.id);
    if (error) throw new Error(`更新記帳失敗: ${error.message}`);
    return '更新成功';
  }

  const { error } = await supabase.from('expense_items').insert(payload);
  if (error) throw new Error(`記帳失敗: ${error.message}`);
  return '記帳成功';
}

export async function deleteExpenseData(rowIndex: number, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('expense_items').select('id').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    await supabase.from('expense_items').delete().eq('id', data[rowIndex - 2].id);
  }
  return '刪除成功';
}

/** 購物清單 */
export async function saveShoppingData(formData: any, tripId = 'la-2026'): Promise<string> {
  const { rowIndex, item, store, forWhom, quantity, price, purchaseStatus, note, image } = formData;

  const { data: list } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const sampleRow = list?.[0] || null;
  const targetRow = (rowIndex && rowIndex >= 2 && list) ? list[rowIndex - 2] : null;

  const map: Record<string, [any, ...string[]]> = {
    store: [store || '一般店家', 'store', 'Store'],
    forWhom: [forWhom || '自己', 'for_whom', 'For Whom', 'For_Whom', 'forWhom'],
    item: [item || '購物品', 'item_name', 'item', 'Item'],
    quantity: [quantity || '1', 'quantity', 'Quantity'],
    price: [Number(price) || 0, 'estimated_price', 'Estimated_Price', 'Estimated Price'],
    purchaseStatus: [purchaseStatus || 'pending', 'purchase_status', 'Purchase_Status'],
    image: [image || '', 'image', 'Image'],
    note: [note || '', 'note', 'Note'],
  };

  const payload = matchDbPayload(targetRow || sampleRow, map, tripId);

  if (targetRow) {
    const { error } = await supabase.from('shopping_items').update(payload).eq('id', targetRow.id);
    if (error) throw new Error(`更新購物清單失敗: ${error.message}`);
    return '更新成功';
  }

  const statusKey = sampleRow && Object.keys(sampleRow).find((k) => ['bought', 'is_done', 'Is_Done', 'Done'].includes(k)) || 'bought';
  const { error } = await supabase.from('shopping_items').insert({ ...payload, [statusKey]: false });
  if (error) throw new Error(`儲存購物清單失敗: ${error.message}`);
  return '儲存成功';
}

export async function deleteShoppingData(rowIndex: number, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('shopping_items').select('id').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    await supabase.from('shopping_items').delete().eq('id', data[rowIndex - 2].id);
  }
  return '刪除成功';
}

export async function toggleShoppingStatus(rowIndex: number, isChecked: boolean, tripId = 'la-2026'): Promise<string> {
  const { data } = await supabase.from('shopping_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
  if (data && data[rowIndex - 2]) {
    const row = data[rowIndex - 2];
    const key = Object.keys(row).find((k) => ['bought', 'is_done', 'Is_Done', 'Done'].includes(k)) || 'bought';
    await supabase.from('shopping_items').update({ [key]: isChecked, purchase_status: isChecked ? 'purchased' : 'pending' }).eq('id', row.id);
  }
  return '已更新';
}

export async function checkoutShoppingStore(
  {
    store,
    amount,
    currency,
    paidBy,
    split,
    purchasedRowIndexes,
    outOfStockRowIndexes,
  }: {
    store: string;
    amount: number;
    currency: string;
    paidBy?: string;
    split?: string;
    purchasedRowIndexes: number[];
    outOfStockRowIndexes: number[];
  },
  tripId = 'la-2026',
): Promise<void> {
  await addExpenseData({
    category: '🛒',
    item: `購物：${store}`,
    amount,
    currency,
    paidBy: paidBy || 'Jo',
    split: split || '均分',
    note: '由購物清單結帳建立',
  }, tripId);

  const { data: items, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`讀取購物清單失敗: ${error.message}`);

  const boughtKey = items?.[0] && Object.keys(items[0]).find((key) => ['bought', 'is_done', 'Is_Done', 'Done'].includes(key)) || 'bought';
  const updateItem = async (rowIndex: number, purchaseStatus: 'purchased' | 'out_of_stock') => {
    const item = items?.[rowIndex - 2];
    if (!item) return;
    const { error: updateError } = await supabase
      .from('shopping_items')
      .update({ [boughtKey]: purchaseStatus === 'purchased', purchase_status: purchaseStatus })
      .eq('id', item.id);
    if (updateError) throw new Error(`更新購物品項失敗: ${updateError.message}`);
  };

  await Promise.all([
    ...purchasedRowIndexes.map((rowIndex) => updateItem(rowIndex, 'purchased')),
    ...outOfStockRowIndexes.map((rowIndex) => updateItem(rowIndex, 'out_of_stock')),
  ]);
}

// 保持與舊介面極相容的函數名稱
export function getScriptUrl(): string { return ''; }
export function getApiToken(): string { return ''; }
export function setScriptUrl(): void {}
export function setApiToken(): void {}
