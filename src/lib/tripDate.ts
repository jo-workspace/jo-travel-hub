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

/** 依據 startDate (YYYY-MM-DD 或任何格式) 與 dayLabel (如 "Day 1") 計算出西元標準 YYYY-MM-DD 字串 */
export function getYmdForTripDay(startDate?: string, dayLabel?: string): string | null {
  if (!startDate || !dayLabel) return null;
  const dayNum = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);
  if (isNaN(dayNum) || dayNum <= 0) return null;

  const startMs = parseYMD(startDate);
  if (startMs === null) return null;

  const targetDate = new Date(startMs + (dayNum - 1) * 86400000);
  const y = targetDate.getUTCFullYear();
  const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDateToYMD(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const m1 = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m1) {
    const y = m1[1];
    const m = m1[2].padStart(2, '0');
    const d = m1[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function parseYMD(value: string): number | null {
  const norm = normalizeDateToYMD(value);
  if (!norm) return null;
  const [y, m, d] = norm.split('-');
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

/** 依據起始日、回程航班或日期區間，計算整趟旅程的天數序列 (例：['Day 1', 'Day 2', ..., 'Day 10']) */
export function computeTripDaySequence(options: {
  startDate?: string;
  tripDates?: string;
  inboundDate?: string;
  existingDays?: string[];
}): string[] {
  const { startDate, tripDates, inboundDate, existingDays = [] } = options;

  let totalDays = 0;

  // 1. 若有已存在的天數標籤（如行程已有項目），找出最大值
  for (const d of existingDays) {
    const num = parseInt((d || '').replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num > totalDays) {
      totalDays = num;
    }
  }

  // 2. 由 startDate + inboundDate 推算天數 (回程日當天是最後一天，天數 = diff + 1)
  const normStart = normalizeDateToYMD(startDate);
  const normInbound = normalizeDateToYMD(inboundDate);

  if (normStart && normInbound) {
    const s = parseYMD(normStart);
    const e = parseYMD(normInbound);
    if (s !== null && e !== null && e >= s) {
      const daysFromDates = Math.round((e - s) / 86400000) + 1;
      // 容錯防護：一般休假旅遊天數極限在 60 天以內，若超過 60 天代表年份設定不一致（例如 2026 出發 vs 2027 回程手誤）
      if (daysFromDates > 0 && daysFromDates <= 60 && daysFromDates > totalDays) {
        totalDays = daysFromDates;
      }
    }
  }

  // 3. 由 tripDates 字串推算 (例："2026/02/19 - 2026/02/28" 或 "2026/02/19 ~ 2026/02/28")
  if (tripDates) {
    const matches = tripDates.match(/(\d{4}[./-]\d{1,2}[./-]\d{1,2})/g);
    if (matches && matches.length >= 2) {
      const startMs = parseYMD(matches[0]);
      const endMs = parseYMD(matches[1]);
      if (startMs !== null && endMs !== null && endMs >= startMs) {
        const daysFromRange = Math.round((endMs - startMs) / 86400000) + 1;
        if (daysFromRange > 0 && daysFromRange <= 60 && daysFromRange > totalDays) {
          totalDays = daysFromRange;
        }
      }
    }
  }

  // 若完全推算不出且無現有天數，回傳 existingDays 或空陣列
  if (totalDays <= 0) {
    return existingDays.length > 0 ? existingDays : [];
  }

  // 生成連續完整的 Day 1 ~ Day N
  const result: string[] = [];
  for (let i = 1; i <= totalDays; i++) {
    result.push(`Day ${i}`);
  }
  return result;
}

/** 判斷目標日期 (YYYY-MM-DD) 是否落在住宿預訂區間 [checkInDate, checkOutDate) 內 */
export function isDateInAccommodationRange(targetDateYmd: string, checkInDate?: string, checkOutDate?: string): boolean {
  const normTarget = normalizeDateToYMD(targetDateYmd);
  const normIn = normalizeDateToYMD(checkInDate);
  const normOut = normalizeDateToYMD(checkOutDate);

  if (!normTarget || !normIn) return false;

  if (normOut) {
    return normIn <= normTarget && normTarget < normOut;
  }
  return normIn === normTarget;
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

