// 依旅程目的地時區（而非瀏覽器時區）取得當天 YYYY-MM-DD
export function getTodayInTimezone(timezone?: string): string {
  const tz = timezone || 'Asia/Taipei';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// 依旅程目的地時區（而非瀏覽器時區）判斷「今天」對應的是 availableDays 裡的哪一個 "Day N"
// 找不到（旅程尚未開始、已結束、或時區/日期無效）就回傳 null，維持顯示全部天數
export function getTodayDayLabel(
  startDate: string,
  timezone: string,
  availableDays: string[],
): string | null {
  if (!startDate || !timezone || availableDays.length === 0) return null;

  const todayStr = getTodayInTimezone(timezone);

  const start = parseYMD(startDate);
  const today = parseYMD(todayStr);
  if (!start || !today) return null;

  const diffDays = Math.round((today - start) / 86400000);
  const dayNumber = diffDays + 1;

  return (
    availableDays.find((day) => parseInt(day.replace(/[^0-9]/g, ''), 10) === dayNumber) ?? null
  );
}

function parseYMD(value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

/** 依據出發日或月份自動推算旅程狀態（出發日前為籌備中，抵達或當前為進行中） */
export function computeAutoTripStatus(
  startDate?: string,
  dates?: string,
  timezone?: string
): '進行中' | '籌備中' {
  const today = getTodayInTimezone(timezone);

  // 1. 若有精確起始日 (YYYY-MM-DD)
  if (startDate) {
    const match = startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return today < startDate ? '籌備中' : '進行中';
    }
  }

  // 2. 若有月份格式 (如 2026/08, 2026/10, 2026-08)
  if (dates) {
    const match = dates.match(/(\d{4})[./-](\d{1,2})/);
    if (match) {
      const tripYearMonth = `${match[1]}-${match[2].padStart(2, '0')}`;
      const currentYearMonth = today.slice(0, 7);
      return currentYearMonth < tripYearMonth ? '籌備中' : '進行中';
    }
  }

  return '進行中';
}

