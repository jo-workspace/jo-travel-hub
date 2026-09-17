/**
 * 行程分類（Itinerary Category）定義與工具函式
 */

export interface ItineraryPreset {
  name: string;
  icon: string;
}

// 7 大預設行程分類（已移除球場、機票）
export const ITINERARY_CATEGORY_PRESETS: ItineraryPreset[] = [
  { name: '景點', icon: '📍' },
  { name: '美食', icon: '🍔' },
  { name: '購物', icon: '🛒' },
  { name: '交通', icon: '🚗' },
  { name: '住宿', icon: '🏨' },
  { name: '娛樂', icon: '🎡' },
  { name: '其他', icon: '📌' },
];

// 精選旅遊常用 Emoji 快捷面板
export const POPULAR_ITINERARY_EMOJIS: string[] = [
  '📍', '🍔', '🛒', '🚗', '🏨', '🎡', '📌',
  '☕', '🥐', '🍜', '🍣', '🍕', '🍰', '🍦', '🍸', '🍺',
  '🏖️', '🏕️', '🥾', '♨️', '⛩️', '🗼', '🏰', '🎨', '📸',
  '🚶', '🚲', '🚆', '✈️', '🛳️', '🎟️', '🛍️', '🎁', '⚾',
];

// 中文關鍵字與常用 Emoji 智慧對照表（包含歷史分類相容）
const KEYWORD_ICON_MAP: Record<string, string> = {
  // 預設與歷史分類
  '景點': '📍',
  '觀光': '📍',
  '美食': '🍔',
  '餐廳': '🍔',
  '用餐': '🍔',
  '午餐': '🍔',
  '晚餐': '🍔',
  '早餐': '🥐',
  '早午餐': '🥐',
  '購物': '🛒',
  '逛街': '🛒',
  '採買': '🛒',
  '超市': '🛒',
  '交通': '🚗',
  '開車': '🚗',
  '租車': '🚗',
  '住宿': '🏨',
  '飯店': '🏨',
  '旅館': '🏨',
  '民宿': '🏨',
  '娛樂': '🎡',
  '遊樂園': '🎡',
  '迪士尼': '🎡',
  '環球': '🎡',
  '其他': '📌',
  '球場': '⚾',
  '棒球': '⚾',
  '比賽': '⚾',
  '機票': '✈️',
  '航班': '✈️',
  '飛機': '✈️',
  '機場': '✈️',

  // 飲食飲品類
  '咖啡': '☕',
  'cafe': '☕',
  '甜點': '🍰',
  '蛋糕': '🍰',
  '下午茶': '🍰',
  '冰品': '🍦',
  '冰淇淋': '🍦',
  '拉麵': '🍜',
  '麵': '🍜',
  '壽司': '🍣',
  '生魚片': '🍣',
  '披薩': '🍕',
  '居酒屋': '🍺',
  '酒吧': '🍸',
  '小酌': '🍸',
  '調酒': '🍸',
  '夜市': '🍢',
  '小吃': '🥟',

  // 戶外與休閒活動類
  '健行': '🥾',
  '登山': '🥾',
  '爬山': '🥾',
  '步道': '🥾',
  '海灘': '🏖️',
  '海邊': '🏖️',
  '沙灘': '🏖️',
  '衝浪': '🏄',
  '潛水': '🤿',
  '露營': '⛺',
  '溫泉': '♨️',
  '泡湯': '♨️',
  '散步': '🚶',
  '公園': '🌳',
  '騎車': '🚲',
  '單車': '🚲',
  '腳踏車': '🚲',

  // 文化、觀光景點與攝影
  '神社': '⛩️',
  '寺廟': '⛩️',
  '古蹟': '⛩️',
  '城堡': '🏰',
  '博物館': '🏛️',
  '美術館': '🎨',
  '展覽': '🎨',
  '攝影': '📸',
  '拍照': '📸',
  '夜景': '🌃',
  '看夜景': '🌃',
  '水族館': '🐬',
  '動物園': '🦁',

  // 交通方式
  '地鐵': '🚇',
  '捷運': '🚇',
  '火車': '🚆',
  '電車': '🚆',
  '新幹線': '🚅',
  '高鐵': '🚅',
  '渡輪': '🛳️',
  '郵輪': '🛳️',
  '乘船': '🛳️',

  // 票券與購物
  '門票': '🎟️',
  '體驗': '🎟️',
  '紀念品': '🎁',
  '伴手禮': '🛍️',
};

/**
 * 依關鍵字自動推測對應的 Emoji
 */
export function matchKeywordIcon(keyword: string): string {
  if (!keyword) return '📍';
  const trimmed = keyword.trim().toLowerCase();

  // 1. 完全命中
  if (KEYWORD_ICON_MAP[trimmed]) {
    return KEYWORD_ICON_MAP[trimmed];
  }

  // 2. 部分符合（依關鍵字長度由長至短比對）
  const sortedKeys = Object.keys(KEYWORD_ICON_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (trimmed.includes(key.toLowerCase())) {
      return KEYWORD_ICON_MAP[key];
    }
  }

  return '📍';
}

/**
 * 解析行程分類字串
 * 支援:
 * 1. "☕ 咖啡" -> { icon: "☕", name: "咖啡" }
 * 2. "景點" -> { icon: "📍", name: "景點" }
 * 3. "球場" -> { icon: "⚾", name: "球場" }
 * 4. "散步" -> { icon: "🚶", name: "散步" }
 */
export function parseItineraryCategory(rawCategory?: string): { icon: string; name: string } {
  if (!rawCategory || !rawCategory.trim()) {
    return { icon: '📍', name: '景點' };
  }

  const trimmed = rawCategory.trim();

  // 檢查是否以 Emoji 開頭
  const emojiPrefixMatch = trimmed.match(/^(\p{Extended_Pictographic}+)\s*(.*)$/u);
  if (emojiPrefixMatch) {
    const icon = emojiPrefixMatch[1];
    const name = emojiPrefixMatch[2]?.trim() || icon;
    return { icon, name };
  }

  // 若為純文字，透過關鍵字推測圖示
  const matchedIcon = matchKeywordIcon(trimmed);
  return {
    icon: matchedIcon,
    name: trimmed,
  };
}

/**
 * 格式化行程分類為存儲字串
 * - 若為標準預設分類（如「景點」且圖示為📍），直接儲存純名稱 "景點"（相容舊資料）
 * - 若有自訂 Emoji 或圖示與名稱預設不同，儲存為 "Emoji 名稱"（例如 "☕ 咖啡"）
 */
export function formatItineraryCategory(name: string, icon: string): string {
  const cleanName = (name || '').trim() || '景點';
  const cleanIcon = (icon || '').trim() || '📍';

  const defaultPreset = ITINERARY_CATEGORY_PRESETS.find((p) => p.name === cleanName);
  if (defaultPreset && defaultPreset.icon === cleanIcon) {
    return cleanName;
  }

  // 如果已經包含相同 emoji 前綴，直接返回
  if (cleanName.startsWith(cleanIcon)) {
    return cleanName;
  }

  // 自訂圖示 + 名稱
  return `${cleanIcon} ${cleanName}`;
}
