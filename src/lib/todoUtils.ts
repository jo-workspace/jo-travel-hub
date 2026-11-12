import { TodoItem } from '@/types/trip';
import { getTodayInTimezone, normalizeDateToYMD, parseYMD } from './tripDate';

export type TodoBadgeTier = 'none' | 'calm' | 'urgent';

export interface TodoBadgeSummary {
  tier: TodoBadgeTier;
  urgentCount: number;
  calmCount: number;
  unfinishedCount: number;
}

/** 依旅程時區取得今日 YYYY-MM-DD 與 UTC 基準毫秒 */
export function getTodayRef(timezone?: string): { todayStr: string; todayMs: number } {
  const todayStr = getTodayInTimezone(timezone);
  const todayMs = parseYMD(todayStr) ?? Date.now();
  return { todayStr, todayMs };
}

/** 計算待辦截止日距離今天的天數（負數＝逾期，0＝今天，正數＝未來天數，無有效日期回傳 null） */
export function getTodoDueDiffDays(dueDate?: string, todayMs?: number, timezone?: string): number | null {
  const dueNorm = normalizeDateToYMD(dueDate);
  if (!dueNorm) return null;

  const dueMs = parseYMD(dueNorm);
  if (dueMs === null) return null;

  const baseMs = todayMs ?? getTodayRef(timezone).todayMs;
  return Math.round((dueMs - baseMs) / 86400000);
}

/** 計算導覽列「待辦」分頁的 2 階不惱人標註狀態 */
export function getTodoBadgeSummary(todos: TodoItem[], timezone?: string): TodoBadgeSummary {
  const { todayMs } = getTodayRef(timezone);
  let urgentCount = 0;
  let calmCount = 0;

  for (const item of todos) {
    if (item.isDone) continue;
    const diffDays = getTodoDueDiffDays(item.dueDate, todayMs, timezone);
    if (diffDays !== null && diffDays <= 7) {
      urgentCount += 1;
    } else {
      calmCount += 1;
    }
  }

  const unfinishedCount = urgentCount + calmCount;
  const tier: TodoBadgeTier = urgentCount > 0 ? 'urgent' : calmCount > 0 ? 'calm' : 'none';

  return { tier, urgentCount, calmCount, unfinishedCount };
}

/** 在基準 YYYY-MM-DD 上加減天數，回傳標準 YYYY-MM-DD（避免本地與 UTC 跨日偏差） */
export function addDaysToYMD(baseYmd: string, offsetDays: number): string {
  const ms = parseYMD(baseYmd);
  if (ms === null) return '';
  const target = new Date(ms + offsetDays * 86400000);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 取得旅程時區今日加減天數後的 YYYY-MM-DD */
export function getTodayOffsetYMD(offsetDays: number, timezone?: string): string {
  const todayStr = getTodayInTimezone(timezone);
  return addDaysToYMD(todayStr, offsetDays);
}
