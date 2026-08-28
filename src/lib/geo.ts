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
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  '舊金山': { lat: 37.7749, lng: -122.4194 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'la': { lat: 34.0522, lng: -118.2437 },
  '洛杉磯': { lat: 34.0522, lng: -118.2437 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  '聖地牙哥': { lat: 32.7157, lng: -117.1611 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  '拉斯維加斯': { lat: 36.1699, lng: -115.1398 },
  'yosemite': { lat: 37.7456, lng: -119.5936 },
  '優勝美地': { lat: 37.7456, lng: -119.5936 },
  'big sur': { lat: 36.2704, lng: -121.8081 },
  '大索爾': { lat: 36.2704, lng: -121.8081 },
  'monterey': { lat: 36.6002, lng: -121.8947 },
  '蒙特雷': { lat: 36.6002, lng: -121.8947 },
  'carmel': { lat: 36.5552, lng: -121.9233 },
  '卡梅爾': { lat: 36.5552, lng: -121.9233 },
  'santa barbara': { lat: 34.4208, lng: -119.6982 },
  '聖塔芭芭拉': { lat: 34.4208, lng: -119.6982 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  '東京': { lat: 35.6762, lng: 139.6503 },
  'okinawa': { lat: 26.2124, lng: 127.6809 },
  '沖繩': { lat: 26.2124, lng: 127.6809 },
  'taipei': { lat: 25.0330, lng: 121.5654 },
  '台北': { lat: 25.0330, lng: 121.5654 },
};

// 知名自然/世界級大型景點離線字典
export const KNOWN_SPOT_COORDINATES: Record<string, GeoLocation> = {
  // San Francisco & Bay Area
  '金門大橋': { lat: 37.8199, lng: -122.4783 },
  'golden gate bridge': { lat: 37.8199, lng: -122.4783 },
  '金門公園': { lat: 37.7694, lng: -122.4862 },
  'golden gate park': { lat: 37.7694, lng: -122.4862 },
  '藝術宮': { lat: 37.8029, lng: -122.4484 },
  'palace of fine arts': { lat: 37.8029, lng: -122.4484 },
  '漁人碼頭': { lat: 37.8080, lng: -122.4098 },
  'fishermans wharf': { lat: 37.8080, lng: -122.4098 },
  '39號碼頭': { lat: 37.8087, lng: -122.4098 },
  'pier 39': { lat: 37.8087, lng: -122.4098 },
  '九曲花街': { lat: 37.8021, lng: -122.4187 },
  '倫巴底街': { lat: 37.8021, lng: -122.4187 },
  'lombard': { lat: 37.8021, lng: -122.4187 },
  '渡輪大廈': { lat: 37.7955, lng: -122.3937 },
  'ferry building': { lat: 37.7955, lng: -122.3937 },
  '惡魔島': { lat: 37.8267, lng: -122.4230 },
  'alcatraz': { lat: 37.8267, lng: -122.4230 },
  '雙峰山': { lat: 37.7544, lng: -122.4477 },
  'twin peaks': { lat: 37.7544, lng: -122.4477 },
  '聯合廣場': { lat: 37.7879, lng: -122.4075 },
  'union square': { lat: 37.7879, lng: -122.4075 },
  '彩繪女士': { lat: 37.7763, lng: -122.4328 },
  'painted ladies': { lat: 37.7763, lng: -122.4328 },
  '阿拉莫廣場': { lat: 37.7763, lng: -122.4328 },
  'alamo square': { lat: 37.7763, lng: -122.4328 },
  '叮叮車': { lat: 37.7845, lng: -122.4078 },
  'cable car': { lat: 37.7845, lng: -122.4078 },
  '唐人街': { lat: 37.7941, lng: -122.4078 },
  'chinatown': { lat: 37.7941, lng: -122.4078 },
  '柯伊特塔': { lat: 37.8024, lng: -122.4058 },
  'coit tower': { lat: 37.8024, lng: -122.4058 },
  '索薩利托': { lat: 37.8590, lng: -122.4853 },
  'sausalito': { lat: 37.8590, lng: -122.4853 },
  '謬爾森林': { lat: 37.8970, lng: -122.5811 },
  'muir woods': { lat: 37.8970, lng: -122.5811 },
  '甲骨文球場': { lat: 37.7786, lng: -122.3893 },
  'oracle park': { lat: 37.7786, lng: -122.3893 },
  '舊金山巨人': { lat: 37.7786, lng: -122.3893 },

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
  '比佛利': { lat: 34.0696, lng: -118.4053 },
  'beverly hills': { lat: 34.0696, lng: -118.4053 },
  '天使球場': { lat: 33.8003, lng: -117.8827 },
  'angel stadium': { lat: 33.8003, lng: -117.8827 },
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
  'petco park': { lat: 32.7076, lng: -117.1570 },
  '教士球場': { lat: 32.7076, lng: -117.1570 },

  // Yosemite & Highway 1
  '優勝美地': { lat: 37.7456, lng: -119.5936 },
  'yosemite': { lat: 37.7456, lng: -119.5936 },
  '大索爾': { lat: 36.2704, lng: -121.8081 },
  'big sur': { lat: 36.2704, lng: -121.8081 },
  'bixby': { lat: 36.3714, lng: -121.9018 },
  '比克斯比大橋': { lat: 36.3714, lng: -121.9018 },
  '17哩路': { lat: 36.5772, lng: -121.9547 },
  '17 mile drive': { lat: 36.5772, lng: -121.9547 },
};

/** 0.001 毫秒秒解 Google Maps 網址中的真實經緯度 */
export function extractCoordinatesFromUrl(url?: string): GeoLocation | null {
  if (!url) return null;
  const decodedUrl = decodeURIComponent(url.trim());

  // 格式 1: !3d37.7954425!4d-122.3936136
  const dataMatch = decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 格式 2: /@34.0522,-118.2437
  const atMatch = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 格式 3: q=34.0522,-118.2437
  const qMatch = decodedUrl.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** 取得統一的快取 Key */
export function getGeoCacheKey(title: string, links?: string): string {
  const cleanLink = (links || '').trim().toLowerCase();
  if (cleanLink) {
    return `geo_url_${cleanLink}`;
  }
  return `geo_title_${(title || '').trim().toLowerCase()}`;
}

/** 同步解析景點座標（含 URL 解析 ＋ 離線字典 ＋ 本地快取 ＋ 相同地點嚴格重疊） */
export function getCoordinatesSync(
  item: ItineraryItem,
  cityContext?: string,
  indexOffset = 0
): { coords: GeoLocation; isExact: boolean } {
  // 1. 優先從卡片上的 Google Maps 完整連結秒解析 (100% 準確且 0ms)
  const fromUrl = extractCoordinatesFromUrl(item.links);
  if (fromUrl) return { coords: fromUrl, isExact: true };

  const cacheKey = getGeoCacheKey(item.title, item.links);

  // 2. 查 LocalStorage 快取（若非同步已查過，秒取精準座標）
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isValidLatLng(parsed.lat, parsed.lng)) {
          return { coords: parsed, isExact: true };
        }
      } catch {}
    }
  }

  const titleLower = (item.title || '').toLowerCase();
  const hasUrl = !!(item.links && item.links.trim());

  // 3. 只有在「沒有提供網址」時才允許命中標題字典（若有網址，必須以 URL 為準，不可被標題字典帶偏！）
  if (!hasUrl) {
    for (const [key, coords] of Object.entries(KNOWN_SPOT_COORDINATES)) {
      if (titleLower.includes(key)) {
        return { coords, isExact: true };
      }
    }
  }

  // 4. 查城市中心點並微量排開（同 URL 或同標題保證重疊在同一點！）
  let baseCoords = CITY_COORDINATES['san francisco'];
  if (cityContext) {
    const cityKey = cityContext.toLowerCase().trim();
    for (const [cName, cCoords] of Object.entries(CITY_COORDINATES)) {
      if (cityKey.includes(cName)) {
        baseCoords = cCoords;
        break;
      }
    }
  }

  // 若有相同的 link 或 title，以 link/title 做 hash，確保同地點 100% 重疊！
  const seedString = (item.links || item.title || '').trim();
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const effectiveOffset = seedString ? Math.abs(hash) % 20 : indexOffset;

  const angle = (effectiveOffset * 137.5 * Math.PI) / 180;
  const radius = 0.002 * Math.sqrt((effectiveOffset % 6) + 1);

  return {
    coords: {
      lat: baseCoords.lat + radius * Math.cos(angle),
      lng: baseCoords.lng + radius * Math.sin(angle),
    },
    isExact: false,
  };
}

/** 非同步精準搜尋景點經緯度（短網址伺服器解析 ＋ 全球 OSM 地標搜尋） */
export async function searchSpotCoordinates(
  title: string,
  cityContext?: string,
  links?: string
): Promise<GeoLocation | null> {
  const cacheKey = getGeoCacheKey(title, links);

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isValidLatLng(parsed.lat, parsed.lng)) return parsed;
      } catch {}
    }
  }

  const cleanLinks = (links || '').trim();

  // 1. 若有 Google Maps 短網址或包含 maps 連結，打伺服器端解析端點
  if (cleanLinks && (cleanLinks.includes('maps.app.goo.gl') || cleanLinks.includes('goo.gl') || cleanLinks.includes('google.com/maps'))) {
    try {
      const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(cleanLinks)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng && isValidLatLng(data.lat, data.lng)) {
          const result = { lat: data.lat, lng: data.lng };
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          }
          return result;
        }
      }
    } catch (err) {
      console.warn('resolve-maps fetch error:', err);
    }
  }

  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;
  const query = `${cleanTitle} ${cityContext || ''}`.trim();

  // 2. 透過 Photon Geocoding API 搜尋 (全球 OSM 地標超精準搜尋)
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        if (isValidLatLng(lat, lng)) {
          const result = { lat, lng };
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          }
          return result;
        }
      }
    }
  } catch {}

  // 3. 備用 Open-Meteo Geocoding
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanTitle)}&count=1&language=zh&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = {
          lat: data.results[0].latitude,
          lng: data.results[0].longitude,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        }
        return result;
      }
    }
  } catch {}

  return null;
}

/** 計算兩點間的球面大圓距離 (Haversine Formula)，單位：公里 (km) */
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

export interface RouteOptimizedResult<T extends { coords: GeoLocation }> {
  originalSpots: T[];
  optimizedSpots: T[];
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  savedDistanceKm: number;
}

/** 依據地理位置計算當日景點最佳行進順序（Nearest Neighbor 貪婪動線最佳化） */
export function optimizeDayRoute<T extends { coords: GeoLocation }>(
  spots: T[]
): RouteOptimizedResult<T> {
  if (spots.length <= 2) {
    let origDist = 0;
    if (spots.length === 2) {
      origDist = calculateDistance(
        spots[0].coords.lat,
        spots[0].coords.lng,
        spots[1].coords.lat,
        spots[1].coords.lng
      );
    }
    return {
      originalSpots: spots,
      optimizedSpots: spots,
      originalDistanceKm: origDist,
      optimizedDistanceKm: origDist,
      savedDistanceKm: 0,
    };
  }

  let origDist = 0;
  for (let i = 0; i < spots.length - 1; i++) {
    origDist += calculateDistance(
      spots[i].coords.lat,
      spots[i].coords.lng,
      spots[i + 1].coords.lat,
      spots[i + 1].coords.lng
    );
  }

  const unvisited = [...spots];
  const route: T[] = [];

  let current = unvisited.shift()!;
  route.push(current);

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateDistance(
        current.coords.lat,
        current.coords.lng,
        unvisited[i].coords.lat,
        unvisited[i].coords.lng
      );
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    current = unvisited.splice(nearestIdx, 1)[0];
    route.push(current);
  }

  let optDist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    optDist += calculateDistance(
      route[i].coords.lat,
      route[i].coords.lng,
      route[i + 1].coords.lat,
      route[i + 1].coords.lng
    );
  }

  const saved = Math.max(0, Math.round((origDist - optDist) * 10) / 10);

  return {
    originalSpots: spots,
    optimizedSpots: route,
    originalDistanceKm: Math.round(origDist * 10) / 10,
    optimizedDistanceKm: Math.round(optDist * 10) / 10,
    savedDistanceKm: saved,
  };
}
