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

// 各天專屬鮮明色系方案（Day 1 ~ Day 8+）
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

/**
 * 0.001 毫秒秒解 Google Maps 網址中的真實經緯度
 * 支援格式：
 * 1. .../@34.0522,-118.2437,15z
 * 2. ...?q=34.0522,-118.2437
 * 3. ...!3d34.0522!4d-118.2437
 * 4. ...ll=34.0522,-118.2437
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
 * 依據景點名稱或 Google Maps 連結解析座標（含 LocalStorage 快取）
 */
export async function getCoordinatesForItem(
  item: ItineraryItem,
  defaultCityFallback?: GeoLocation
): Promise<GeoLocation | null> {
  // 1. 優先從卡片上的 Google Maps 連結秒解析 (100% 準確且 0ms)
  const fromUrl = extractCoordinatesFromUrl(item.links);
  if (fromUrl) return fromUrl;

  const titleClean = (item.title || '').trim();
  if (!titleClean) return defaultCityFallback || null;

  // 2. 查 LocalStorage 快取
  const cacheKey = `geo_spot_${titleClean.toLowerCase()}`;
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isValidLatLng(parsed.lat, parsed.lng)) return parsed;
      } catch {}
    }
  }

  // 3. 透過 Open-Meteo Geocoding 免費搜尋景點座標
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(titleClean)}&count=1&language=zh&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const coords: GeoLocation = {
          lat: data.results[0].latitude,
          lng: data.results[0].longitude,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(coords));
        }
        return coords;
      }
    }
  } catch (err) {
    console.warn(`Geocoding failed for ${titleClean}:`, err);
  }

  return defaultCityFallback || null;
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
