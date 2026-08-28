import { ItineraryItem } from '@/types/trip';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface MappedItineraryItem {
  item: ItineraryItem;
  location: GeoLocation;
  dayIndex: number;
  stepIndex: number;
  color: {
    bg: string;
    text: string;
    hex: string;
  };
}

// 各天專屬鮮明色系方案（Day 1 ~ Day 10+）
export const DAY_COLOR_PALETTE = [
  { hex: '#2563eb', bg: 'bg-blue-600', text: 'text-white' },      // Day 1: 藍色
  { hex: '#059669', bg: 'bg-emerald-600', text: 'text-white' },   // Day 2: 綠色
  { hex: '#d97706', bg: 'bg-amber-600', text: 'text-white' },     // Day 3: 琥珀橘
  { hex: '#7c3aed', bg: 'bg-purple-600', text: 'text-white' },    // Day 4: 紫色
  { hex: '#db2777', bg: 'bg-pink-600', text: 'text-white' },      // Day 5: 桃粉
  { hex: '#0891b2', bg: 'bg-cyan-600', text: 'text-white' },      // Day 6: 青藍
  { hex: '#4f46e5', bg: 'bg-indigo-600', text: 'text-white' },    // Day 7: 靛藍
  { hex: '#ea580c', bg: 'bg-orange-600', text: 'text-white' },    // Day 8: 亮橘
  { hex: '#0d9488', bg: 'bg-teal-600', text: 'text-white' },      // Day 9: 水鴨綠
  { hex: '#475569', bg: 'bg-slate-600', text: 'text-white' },      // Day 10+: 墨灰
];

export function getDayColor(dayLabel: string) {
  const num = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num <= 0) {
    return { hex: '#64748b', bg: 'bg-slate-500', text: 'text-white' };
  }
  const index = (num - 1) % DAY_COLOR_PALETTE.length;
  return DAY_COLOR_PALETTE[index];
}

// 常用城市中心點字典
export const CITY_COORDINATES: Record<string, GeoLocation> = {
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'la': { lat: 34.0522, lng: -118.2437 },
  '洛杉磯': { lat: 34.0522, lng: -118.2437 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  '聖地牙哥': { lat: 32.7157, lng: -117.1611 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  '舊金山': { lat: 37.7749, lng: -122.4194 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  '拉斯維加斯': { lat: 36.1699, lng: -115.1398 },
  'yosemite': { lat: 37.7456, lng: -119.5936 },
  '優勝美地': { lat: 37.7456, lng: -119.5936 },
  'big sur': { lat: 36.2704, lng: -121.8081 },
  '大索爾': { lat: 36.2704, lng: -121.8081 },
  'santa clarita': { lat: 34.3917, lng: -118.5426 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  '東京': { lat: 35.6762, lng: 139.6503 },
  'okinawa': { lat: 26.2124, lng: 127.6809 },
  '沖繩': { lat: 26.2124, lng: 127.6809 },
  '那霸': { lat: 26.2124, lng: 127.6809 },
  'taipei': { lat: 25.0330, lng: 121.5654 },
  '台北': { lat: 25.0330, lng: 121.5654 },
};

// 知名景點離線字典（0ms 秒解）
export const KNOWN_SPOT_COORDINATES: Record<string, GeoLocation> = {
  // Los Angeles & Southern California
  '道奇': { lat: 34.0739, lng: -118.2400 },
  'dodger': { lat: 34.0739, lng: -118.2400 },
  '好萊塢': { lat: 34.1016, lng: -118.3268 },
  'hollywood': { lat: 34.1016, lng: -118.3268 },
  '格里斐斯': { lat: 34.1184, lng: -118.3004 },
  'griffith': { lat: 34.1184, lng: -118.3004 },
  '天文台': { lat: 34.1184, lng: -118.3004 },
  '聖塔莫尼卡': { lat: 34.0099, lng: -118.4965 },
  'santa monica': { lat: 34.0099, lng: -118.4965 },
  '威尼斯海灘': { lat: 33.9850, lng: -118.4695 },
  'venice': { lat: 33.9850, lng: -118.4695 },
  '迪士尼': { lat: 33.8121, lng: -117.9190 },
  'disney': { lat: 33.8121, lng: -117.9190 },
  '環球影城': { lat: 34.1381, lng: -118.3534 },
  'universal': { lat: 34.1381, lng: -118.3534 },
  '蓋蒂': { lat: 34.0780, lng: -118.4741 },
  'getty': { lat: 34.0780, lng: -118.4741 },
  '中央市場': { lat: 34.0507, lng: -118.2488 },
  'grand central market': { lat: 34.0507, lng: -118.2488 },
  '天使鐵路': { lat: 34.0514, lng: -118.2505 },
  'angels flight': { lat: 34.0514, lng: -118.2505 },
  'the broad': { lat: 34.0544, lng: -118.2505 },
  '布洛德': { lat: 34.0544, lng: -118.2505 },
  'lacma': { lat: 34.0639, lng: -118.3592 },
  '美術館': { lat: 34.0639, lng: -118.3592 },
  '比佛利': { lat: 34.0696, lng: -118.4053 },
  'beverly hills': { lat: 34.0696, lng: -118.4053 },
  '天使球場': { lat: 33.8003, lng: -117.8827 },
  'angel stadium': { lat: 33.8003, lng: -117.8827 },
  'in-n-out': { lat: 33.9536, lng: -118.3969 },
  'ucla': { lat: 34.0689, lng: -118.4452 },
  'usc': { lat: 34.0224, lng: -118.2851 },

  // San Diego
  '中途島': { lat: 32.7137, lng: -117.1751 },
  'midway': { lat: 32.7137, lng: -117.1751 },
  '聖地牙哥動物園': { lat: 32.7353, lng: -117.1490 },
  'balboa': { lat: 32.7341, lng: -117.1446 },
  '巴爾波亞': { lat: 32.7341, lng: -117.1446 },
  'la jolla': { lat: 32.8504, lng: -117.2730 },
  '拉荷亞': { lat: 32.8504, lng: -117.2730 },
  'coronado': { lat: 32.6859, lng: -117.1831 },
  '科羅納多': { lat: 32.6859, lng: -117.1831 },
  'petco': { lat: 32.7076, lng: -117.1570 },
  '教士': { lat: 32.7076, lng: -117.1570 },

  // Northern California & Parks
  '金門大橋': { lat: 37.8199, lng: -122.4783 },
  'golden gate': { lat: 37.8199, lng: -122.4783 },
  '漁人碼頭': { lat: 37.8080, lng: -122.4098 },
  'fishermans wharf': { lat: 37.8080, lng: -122.4098 },
  'pier 39': { lat: 37.8087, lng: -122.4098 },
  '九曲花街': { lat: 37.8021, lng: -122.4187 },
  'lombard': { lat: 37.8021, lng: -122.4187 },
  '優勝美地': { lat: 37.7456, lng: -119.5936 },
  'yosemite': { lat: 37.7456, lng: -119.5936 },
  '大索爾': { lat: 36.2704, lng: -121.8081 },
  'big sur': { lat: 36.2704, lng: -121.8081 },
  'bixby': { lat: 36.3714, lng: -121.9018 },
  '比克斯比大橋': { lat: 36.3714, lng: -121.9018 },
};

/**
 * 0.001 毫秒秒解 Google Maps 網址中的真實經緯度
 */
export function extractCoordinatesFromUrl(url?: string): GeoLocation | null {
  if (!url) return null;
  const decodedUrl = decodeURIComponent(url);

  // 格式 1: /@34.0522,-118.2437
  const atMatch = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 格式 2: q=34.0522,-118.2437 或 query=34.0522,-118.2437 或 ll=34.0522,-118.2437
  const qMatch = decodedUrl.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 格式 3: !3d34.0522!4d-118.2437 (Google Maps 嵌入/重導向參數)
  const dataMatch = decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * 同步解析景點座標（含 URL 解析 ＋ 離線字典 ＋ 關鍵字匹配）
 */
export function getCoordinatesSync(
  item: ItineraryItem,
  cityContext?: string,
  indexOffset = 0
): GeoLocation {
  // 1. 優先從卡片上的 Google Maps 連結秒解析 (100% 準確且 0ms)
  const fromUrl = extractCoordinatesFromUrl(item.links);
  if (fromUrl) return fromUrl;

  const titleLower = (item.title || '').toLowerCase();

  // 2. 查常用知名景點離線字典 (精準命中)
  for (const [key, coords] of Object.entries(KNOWN_SPOT_COORDINATES)) {
    if (titleLower.includes(key)) {
      return coords;
    }
  }

  // 3. 查城市中心點並微量偏移 (Jitter)，避免多個未知點完全重疊
  let baseCoords = CITY_COORDINATES['los angeles'];
  if (cityContext) {
    const cityKey = cityContext.toLowerCase().trim();
    for (const [cName, cCoords] of Object.entries(CITY_COORDINATES)) {
      if (cityKey.includes(cName)) {
        baseCoords = cCoords;
        break;
      }
    }
  }

  // 加上微微的隨機/序號偏移 (約 500m~1km 範圍)，避免地圖釘重疊
  const jitterLat = (Math.sin(indexOffset * 1.7) * 0.015) + (indexOffset * 0.003);
  const jitterLng = (Math.cos(indexOffset * 1.7) * 0.015) - (indexOffset * 0.003);

  return {
    lat: baseCoords.lat + jitterLat,
    lng: baseCoords.lng + jitterLng,
  };
}

/**
 * 計算兩點間的球面大圓距離 (Haversine Formula)，單位：公里 (km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球半徑 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
