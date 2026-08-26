import {
  AllTripData
} from '@/types/trip';

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuT0HjqVqIpY9fO-zHC9xuG_U6et5AsYE9qkhR8_PqvLG3vTWdxRGERLbeEXzo4iUQ/exec";

export function getScriptUrl(overrideUrl?: string): string {
  if (overrideUrl && overrideUrl.startsWith('http')) {
    return overrideUrl;
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('la_trip_api_url');
    if (saved && saved.includes('/macros/s/') && saved.includes('/exec')) {
      return saved;
    }
  }
  return DEFAULT_SCRIPT_URL;
}

export function getApiToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('la_trip_api_token') || '';
  }
  return '';
}

export function setScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('la_trip_api_url', url);
  }
}

export function setApiToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('la_trip_api_token', token);
  }
}

/**
 * 通用 Apps Script API 呼叫器
 */
export async function callGasApi<T>(action: string, args: any[] = [], overrideUrl?: string): Promise<T> {
  const scriptUrl = getScriptUrl(overrideUrl);
  const token = getApiToken();

  const requestBody = {
    action,
    token,
    args
  };

  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    throw new Error(`HTTP 錯誤狀態: ${res.status}`);
  }

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
      throw new Error("API 網址回傳了 HTML 網頁而非 JSON。請確認 Web App 部署權限或 API 網址。");
    }
    throw new Error(`回傳格式非 JSON: ${text.substring(0, 100)}...`);
  }

  if (json && (json.error || json.status === 'error')) {
    const err = json.error || "API 執行失敗";
    if (/unauthorized/i.test(err) || /invalid token/i.test(err)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('la_trip_api_token');
      }
    }
    throw new Error(err);
  }

  return (json && json.result !== undefined) ? json.result : json;
}

/** 獲取所有資料 */
export async function getAllData(bypassCache = false, overrideUrl?: string): Promise<AllTripData> {
  return callGasApi<AllTripData>('getAllData', [bypassCache], overrideUrl);
}

/** 行程 API */
export async function saveItineraryData(formData: any, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('saveItineraryData', [formData], overrideUrl);
}

export async function deleteItineraryData(rowIndex: number, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('deleteItineraryData', [rowIndex], overrideUrl);
}

export async function toggleVisitedStatus(rowIndex: number, isChecked: boolean, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('toggleVisitedStatus', [rowIndex, isChecked], overrideUrl);
}

/** 待辦 API */
export async function saveTodoData(formData: any, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('saveTodoData', [formData], overrideUrl);
}

export async function deleteTodoData(rowIndex: number, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('deleteTodoData', [rowIndex], overrideUrl);
}

export async function toggleTodoStatus(rowIndex: number, isChecked: boolean, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('toggleTodoStatus', [rowIndex, isChecked], overrideUrl);
}

/** 打包 API */
export async function savePackingData(formData: any, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('savePackingData', [formData], overrideUrl);
}

export async function batchSavePackingData(items: any[], overrideUrl?: string): Promise<string> {
  for (const it of items) {
    await savePackingData({ ...it, rowIndex: 0, isPacked: false }, overrideUrl);
  }
  return `成功匯入 ${items.length} 項`;
}

export async function deletePackingData(rowIndex: number, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('deletePackingData', [rowIndex], overrideUrl);
}

export async function togglePackingStatus(rowIndex: number, isChecked: boolean, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('togglePackingStatus', [rowIndex, isChecked], overrideUrl);
}

/** 記帳 API */
export async function addExpenseData(formData: any, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('addExpenseData', [formData], overrideUrl);
}

export async function deleteExpenseData(rowIndex: number, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('deleteExpenseData', [rowIndex], overrideUrl);
}

/** 購物 API */
export async function saveShoppingData(formData: any, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('saveShoppingData', [formData], overrideUrl);
}

export async function deleteShoppingData(rowIndex: number, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('deleteShoppingData', [rowIndex], overrideUrl);
}

export async function toggleShoppingStatus(rowIndex: number, isChecked: boolean, overrideUrl?: string): Promise<string> {
  return callGasApi<string>('toggleShoppingStatus', [rowIndex, isChecked], overrideUrl);
}
