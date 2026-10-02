/**
 * 校驗並格式化 24 小時制時間字串 (HH:mm)
 * 配合 iOS 文字數字鍵盤 blur 時自動校驗補全冒號格式
 * 支援輸入 "830" -> "08:30"、"8" -> "08:00"、"1420" -> "14:20"、"9:5" -> "09:05"、"2359" -> "23:59"
 */
export function formatTimeOnBlur(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';

  // 移除非數字與冒號字符
  const clean = trimmed.replace(/[^\d:]/g, '');
  if (!clean) return '';

  let h = 0;
  let m = 0;

  if (clean.includes(':')) {
    const [hStr, mStr] = clean.split(':');
    h = parseInt(hStr, 10);
    m = parseInt(mStr || '0', 10);
  } else if (clean.length === 1 || clean.length === 2) {
    h = parseInt(clean, 10);
    m = 0;
  } else if (clean.length === 3) {
    h = parseInt(clean.slice(0, 1), 10);
    m = parseInt(clean.slice(1), 10);
  } else if (clean.length >= 4) {
    h = parseInt(clean.slice(0, 2), 10);
    m = parseInt(clean.slice(2, 4), 10);
  }

  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;

  // 約束範圍 00:00 ~ 23:59
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
