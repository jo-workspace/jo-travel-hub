import React from 'react';
import {
  MapPin,
  Utensils,
  ShoppingBag,
  Car,
  Hotel,
  Sparkles,
  Pin,
  Ship,
  Coffee,
  Beer,
  Wine,
  Train,
  Plane,
  Bike,
  Tent,
  Palmtree,
  Mountain,
  Bath,
  Camera,
  Ticket,
  Palette,
  Bookmark,
  LucideIcon,
} from 'lucide-react';

export interface TravelIconDef {
  key: string;
  label: string;
  Icon: LucideIcon;
}

// 7 大核心預設行程分類（完全使用 SVG 圖示）
export const ITINERARY_CORE_PRESETS: Array<{ name: string; iconKey: string }> = [
  { name: '景點', iconKey: 'map-pin' },
  { name: '美食', iconKey: 'utensils' },
  { name: '購物', iconKey: 'shopping-bag' },
  { name: '交通', iconKey: 'car' },
  { name: '住宿', iconKey: 'hotel' },
  { name: '娛樂', iconKey: 'sparkles' },
  { name: '其他', iconKey: 'pin' },
];

// 精選旅遊常用向量 SVG 圖庫（供選擇盤點選使用）
export const TRAVEL_ICON_PICKER_LIST: TravelIconDef[] = [
  { key: 'map-pin', label: '景點', Icon: MapPin },
  { key: 'utensils', label: '美食', Icon: Utensils },
  { key: 'ship', label: '郵輪', Icon: Ship },
  { key: 'shopping-bag', label: '購物', Icon: ShoppingBag },
  { key: 'car', label: '交通', Icon: Car },
  { key: 'hotel', label: '住宿', Icon: Hotel },
  { key: 'sparkles', label: '娛樂', Icon: Sparkles },
  { key: 'coffee', label: '咖啡', Icon: Coffee },
  { key: 'beer', label: '啤酒', Icon: Beer },
  { key: 'wine', label: '酒吧', Icon: Wine },
  { key: 'plane', label: '航班', Icon: Plane },
  { key: 'train', label: '鐵道', Icon: Train },
  { key: 'bike', label: '單車', Icon: Bike },
  { key: 'mountain', label: '登山', Icon: Mountain },
  { key: 'palmtree', label: '海灘', Icon: Palmtree },
  { key: 'tent', label: '露營', Icon: Tent },
  { key: 'bath', label: '溫泉', Icon: Bath },
  { key: 'camera', label: '攝影', Icon: Camera },
  { key: 'ticket', label: '門票', Icon: Ticket },
  { key: 'palette', label: '展覽', Icon: Palette },
  { key: 'pin', label: '其他', Icon: Pin },
];

const ICON_MAP: Record<string, LucideIcon> = {
  'map-pin': MapPin,
  'utensils': Utensils,
  'ship': Ship,
  'shopping-bag': ShoppingBag,
  'car': Car,
  'hotel': Hotel,
  'sparkles': Sparkles,
  'coffee': Coffee,
  'beer': Beer,
  'wine': Wine,
  'plane': Plane,
  'train': Train,
  'bike': Bike,
  'mountain': Mountain,
  'palmtree': Palmtree,
  'tent': Tent,
  'bath': Bath,
  'camera': Camera,
  'ticket': Ticket,
  'palette': Palette,
  'pin': Pin,
  'bookmark': Bookmark,
};

/**
 * 取得對應 key 的 LucideIcon
 */
export function getTravelIconComponent(iconKey?: string): LucideIcon {
  if (iconKey && ICON_MAP[iconKey]) {
    return ICON_MAP[iconKey];
  }
  return MapPin;
}

// 常用關鍵字與向量圖示 key 智慧對照表
const KEYWORD_TO_ICON_KEY: Record<string, string> = {
  // 郵輪與航運
  '郵輪': 'ship',
  '遊輪': 'ship',
  '乘船': 'ship',
  '搭船': 'ship',
  '渡輪': 'ship',
  '船': 'ship',
  '碼頭': 'ship',
  '港口': 'ship',

  // 景點與觀光
  '景點': 'map-pin',
  '觀光': 'map-pin',
  '地標': 'map-pin',
  '園區': 'map-pin',
  '古蹟': 'map-pin',
  '寺廟': 'map-pin',
  '神社': 'map-pin',

  // 餐飲美食
  '美食': 'utensils',
  '餐廳': 'utensils',
  '用餐': 'utensils',
  '午餐': 'utensils',
  '晚餐': 'utensils',
  '早餐': 'utensils',
  '早午餐': 'utensils',
  '小吃': 'utensils',
  '拉麵': 'utensils',
  '壽司': 'utensils',
  '夜市': 'utensils',

  // 飲品放鬆
  '咖啡': 'coffee',
  'cafe': 'coffee',
  '甜點': 'coffee',
  '下午茶': 'coffee',
  '蛋糕': 'coffee',
  '啤酒': 'beer',
  '居酒屋': 'beer',
  '酒吧': 'wine',
  '調酒': 'wine',
  '小酌': 'wine',

  // 購物
  '購物': 'shopping-bag',
  '逛街': 'shopping-bag',
  '採買': 'shopping-bag',
  '伴手禮': 'shopping-bag',
  '超市': 'shopping-bag',
  '市集': 'shopping-bag',
  '免稅': 'shopping-bag',

  // 交通工具
  '交通': 'car',
  '開車': 'car',
  '租車': 'car',
  '計程車': 'car',
  '飛機': 'plane',
  '機票': 'plane',
  '航班': 'plane',
  '機場': 'plane',
  '火車': 'train',
  '電車': 'train',
  '地鐵': 'train',
  '捷運': 'train',
  '新幹線': 'train',
  '高鐵': 'train',
  '單車': 'bike',
  '腳踏車': 'bike',
  '騎車': 'bike',

  // 戶外與休閒
  '住宿': 'hotel',
  '飯店': 'hotel',
  '旅館': 'hotel',
  '民宿': 'hotel',
  '露營': 'tent',
  '帳篷': 'tent',
  '登山': 'mountain',
  '爬山': 'mountain',
  '健行': 'mountain',
  '步道': 'mountain',
  '海灘': 'palmtree',
  '海邊': 'palmtree',
  '沙灘': 'palmtree',
  '衝浪': 'palmtree',
  '度假': 'palmtree',
  '溫泉': 'bath',
  '泡湯': 'bath',

  // 藝文活動與娛樂
  '攝影': 'camera',
  '拍照': 'camera',
  '夜景': 'camera',
  '娛樂': 'sparkles',
  '遊樂園': 'sparkles',
  '迪士尼': 'sparkles',
  '環球': 'sparkles',
  '門票': 'ticket',
  '票券': 'ticket',
  '體驗': 'ticket',
  '展覽': 'palette',
  '博物館': 'palette',
  '美術館': 'palette',
  '藝術': 'palette',

  // 其他
  '其他': 'pin',
};

/**
 * 清洗字串，去除可能存在的舊 Emoji 前綴
 * 例如："🚢 郵輪" -> "郵輪", "☕ 咖啡" -> "咖啡"
 */
export function cleanCategoryName(raw?: string): string {
  if (!raw) return '景點';
  let cleaned = raw.replace(/^(\p{Extended_Pictographic}+|\s)+/u, '').trim();
  return cleaned || '景點';
}

/**
 * 依類別名稱關鍵字推測最合適的 SVG icon key
 */
export function matchCategoryIconKey(categoryName?: string): string {
  if (!categoryName) return 'map-pin';
  const clean = cleanCategoryName(categoryName).toLowerCase();

  // 1. 完全符合
  if (KEYWORD_TO_ICON_KEY[clean]) {
    return KEYWORD_TO_ICON_KEY[clean];
  }

  // 2. 部分符合（依長度優先比對）
  const sortedKeys = Object.keys(KEYWORD_TO_ICON_KEY).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key.toLowerCase())) {
      return KEYWORD_TO_ICON_KEY[key];
    }
  }

  return 'map-pin';
}

interface CategoryIconProps {
  category?: string;
  iconKey?: string;
  className?: string;
}

/**
 * 統一行程向量 SVG 圖示渲染元件
 */
export const ItineraryCategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  iconKey,
  className = 'w-4 h-4',
}) => {
  const effectiveKey = iconKey || matchCategoryIconKey(category);
  const IconComp = getTravelIconComponent(effectiveKey);
  return <IconComp className={className} />;
};
