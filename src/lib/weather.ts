/**
 * Open-Meteo Weather & City Schedule Engine
 * 支援跨城市日程解析、座標對應、即時天候抓取與 LocalStorage 快取
 */

export interface DayWeatherInfo {
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  dateStr?: string; // YYYY-MM-DD
}

export interface CityWeatherData {
  cityName: string;
  currentTemp?: number;
  currentWeatherCode?: number;
  daily: DayWeatherInfo[]; // 14 天逐日預報
  fetchedAt: number;
}

// 內建熱門旅遊城市離線經緯度字典 (0ms 即時對應與斷網 Fallback)
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'la': { lat: 34.0522, lon: -118.2437 },
  '洛杉磯': { lat: 34.0522, lon: -118.2437 },
  'las vegas': { lat: 36.1699, lon: -115.1398 },
  '拉斯維加斯': { lat: 36.1699, lon: -115.1398 },
  'san diego': { lat: 32.7157, lon: -117.1611 },
  '聖地牙哥': { lat: 32.7157, lon: -117.1611 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  '舊金山': { lat: 37.7749, lon: -122.4194 },
  'grand canyon': { lat: 36.0544, lon: -112.1401 },
  '大峽谷': { lat: 36.0544, lon: -112.1401 },
  'yosemite': { lat: 37.8651, lon: -119.5383 },
  '優勝美地': { lat: 37.8651, lon: -119.5383 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  '紐約': { lat: 40.7128, lon: -74.0060 },
  'naha': { lat: 26.2124, lon: 127.6809 },
  '那霸': { lat: 26.2124, lon: 127.6809 },
  'okinawa': { lat: 26.2124, lon: 127.6809 },
  '沖繩': { lat: 26.2124, lon: 127.6809 },
  'nago': { lat: 26.5917, lon: 127.9772 },
  '名護': { lat: 26.5917, lon: 127.9772 },
  'tokyo': { lat: 35.6762, lon: 139.6503 },
  '東京': { lat: 35.6762, lon: 139.6503 },
  'kyoto': { lat: 35.0116, lon: 135.7681 },
  '京都': { lat: 35.0116, lon: 135.7681 },
  'osaka': { lat: 34.6937, lon: 135.5023 },
  '大阪': { lat: 34.6937, lon: 135.5023 },
  'taipei': { lat: 25.0330, lon: 121.5654 },
  '台北': { lat: 25.0330, lon: 121.5654 },
  'london': { lat: 51.5074, lon: -0.1278 },
  '倫敦': { lat: 51.5074, lon: -0.1278 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  '巴黎': { lat: 48.8566, lon: 2.3522 },
};

/**
 * 解析跨城市天數排程字串
 * 支援格式：
 * 1. "Day 1-3: Los Angeles, Day 4-5: Las Vegas, Day 6: Grand Canyon"
 * 2. "Day 1: LA, Day 2: LV"
 * 3. "Los Angeles, Las Vegas, San Diego" (無天數時預設所有天數均適用)
 */
export function parseCitySchedule(scheduleStr?: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!scheduleStr) return map;

  const segments = scheduleStr.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean);

  segments.forEach((seg) => {
    // 檢查是否有 "Day X-Y: City" 或 "Day X: City" 格式
    const matchRange = seg.match(/Day\s*(\d+)\s*[-~至到]\s*(\d+)\s*[:：]\s*(.+)/i);
    if (matchRange) {
      const startDay = parseInt(matchRange[1], 10);
      const endDay = parseInt(matchRange[2], 10);
      const cityName = matchRange[3].trim();
      if (!isNaN(startDay) && !isNaN(endDay) && cityName) {
        for (let d = startDay; d <= endDay; d++) {
          map.set(d, cityName);
        }
      }
      return;
    }

    const matchSingle = seg.match(/Day\s*(\d+)\s*[:：]\s*(.+)/i);
    if (matchSingle) {
      const dayNum = parseInt(matchSingle[1], 10);
      const cityName = matchSingle[2].trim();
      if (!isNaN(dayNum) && cityName) {
        map.set(dayNum, cityName);
      }
      return;
    }
  });

  return map;
}

/**
 * 依據 Day 標籤（如 "Day 1", "Day 4"）取得該天對應的城市名稱
 */
export function getCityForDay(
  dayLabel: string,
  scheduleStr?: string,
  defaultCity = ''
): string {
  if (!scheduleStr) return defaultCity;

  const map = parseCitySchedule(scheduleStr);
  const dayNum = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);

  if (!isNaN(dayNum) && map.has(dayNum)) {
    return map.get(dayNum)!;
  }

  // 若沒明確指定該天，但 scheduleStr 包含單純逗號分割的城市名稱，預設回傳第一個
  if (map.size === 0) {
    const rawCities = scheduleStr.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean);
    if (rawCities.length > 0) return rawCities[0];
  }

  return defaultCity;
}

/**
 * 取得行程設定中所有不重複的城市清單
 */
export function getUniqueCities(scheduleStr?: string): string[] {
  if (!scheduleStr) return [];
  const set = new Set<string>();

  const map = parseCitySchedule(scheduleStr);
  if (map.size > 0) {
    map.forEach((c) => {
      if (c) set.add(c);
    });
  } else {
    scheduleStr.split(/[,，\n]+/).forEach((c) => {
      const trimmed = c.trim();
      if (trimmed) set.add(trimmed);
    });
  }

  return Array.from(set);
}

/**
 * 搜尋城市經緯度（優先快取與離線字典，無則透過 Open-Meteo Geocoding API）
 */
export async function fetchCityCoordinates(
  cityName: string
): Promise<{ lat: number; lon: number } | null> {
  const clean = cityName.trim().toLowerCase();
  if (KNOWN_COORDINATES[clean]) {
    return KNOWN_COORDINATES[clean];
  }

  // 嘗試透過 LocalStorage 讀取地理編碼快取
  const cacheKey = `geo_cache_${clean}`;
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const coords = {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(coords));
      }
      return coords;
    }
  } catch (err) {
    console.warn(`Geocoding failed for ${cityName}:`, err);
  }

  return null;
}

/**
 * 取得特定城市的完整 14 天天氣預報（附 60 分鐘 LocalStorage 快取）
 */
export async function fetchWeatherForCity(
  cityName: string
): Promise<CityWeatherData | null> {
  const cleanName = cityName.trim();
  if (!cleanName) return null;

  const cacheKey = `weather_cache_${cleanName.toLowerCase()}`;
  const now = Date.now();
  const CACHE_TTL = 60 * 60 * 1000; // 60 分鐘快取

  if (typeof window !== 'undefined') {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData: CityWeatherData = JSON.parse(cachedStr);
        if (now - cachedData.fetchedAt < CACHE_TTL) {
          return cachedData;
        }
      } catch {}
    }
  }

  const coords = await fetchCityCoordinates(cleanName);
  if (!coords) return null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&current=temperature_2m,weather_code&timezone=auto&forecast_days=14`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const dailyList: DayWeatherInfo[] = [];
    const dates = data.daily?.time || [];
    const codes = data.daily?.weather_code || [];
    const maxs = data.daily?.temperature_2m_max || [];
    const mins = data.daily?.temperature_2m_min || [];
    const precips = data.daily?.precipitation_probability_max || [];

    for (let i = 0; i < dates.length; i++) {
      dailyList.push({
        dateStr: dates[i],
        weatherCode: codes[i] ?? 0,
        tempMax: Math.round(maxs[i] ?? 20),
        tempMin: Math.round(mins[i] ?? 15),
        precipitationProbability: Math.round(precips[i] ?? 0),
      });
    }

    const result: CityWeatherData = {
      cityName: cleanName,
      currentTemp: data.current?.temperature_2m !== undefined ? Math.round(data.current.temperature_2m) : undefined,
      currentWeatherCode: data.current?.weather_code ?? 0,
      daily: dailyList,
      fetchedAt: now,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    }

    return result;
  } catch (err) {
    console.warn(`Weather fetch failed for ${cleanName}:`, err);
    return null;
  }
}

/**
 * 依據 WMO Weather Code 回傳簡要中文天氣描述
 */
export function getWeatherDescription(code: number): string {
  if (code === 0) return '晴朗';
  if (code === 1 || code === 2) return '多雲時晴';
  if (code === 3) return '陰天';
  if (code === 45 || code === 48) return '有霧';
  if (code >= 51 && code <= 55) return '毛毛雨';
  if (code >= 61 && code <= 65) return '下雨';
  if (code >= 71 && code <= 77) return '降雪';
  if (code >= 80 && code <= 82) return '短暫陣雨';
  if (code >= 95 && code <= 99) return '雷陣雨';
  return '晴';
}
