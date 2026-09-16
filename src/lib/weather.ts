/**
 * Hybrid Weather & City Schedule Engine
 * 支援中央氣象署 (CWA) 官方在地預報 + Open-Meteo 全球數值模式雙引擎
 * 支援跨城市日程解析、精確座標、海拔標高、即時天候抓取與 LocalStorage 快取
 */

export interface DayWeatherInfo {
  weatherCode: number;
  weatherDesc?: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum?: number; // mm 降雨量
  dateStr?: string; // YYYY-MM-DD
  highAltitudeNote?: string; // 高山氣溫與雲霧體感提醒
}

export interface CityWeatherData {
  cityName: string;
  resolvedName?: string;
  source: 'CWA' | 'Open-Meteo';
  latitude?: number;
  longitude?: number;
  elevation?: number; // 海拔公尺
  countyName?: string;
  townshipName?: string;
  currentTemp?: number;
  currentWeatherCode?: number;
  daily: DayWeatherInfo[]; // 逐日預報
  fetchedAt: number;
}

export interface CityResolutionInfo {
  cityName: string;
  resolvedName: string;
  source: 'CWA' | 'Open-Meteo';
  latitude: number;
  longitude: number;
  elevation?: number;
  countyName?: string;
  townshipName?: string;
  countryCode?: string;
}

const CWA_API_KEY =
  process.env.NEXT_PUBLIC_CWA_API_KEY ||
  process.env.CWA_API_KEY ||
  'CWA-F83E8FAE-CDB6-4327-9AAD-B3995B5F66F2';

interface TaiwanLocationMeta {
  datasetId: string;
  county: string;
  township?: string;
  lat: number;
  lon: number;
  elevation?: number;
}

// 台灣熱門旅遊景點與主要縣市高精度對照表
const TAIWAN_LOCATIONS: Record<string, TaiwanLocationMeta> = {
  '武嶺': { datasetId: 'F-D0047-023', county: '南投縣', township: '仁愛鄉', lat: 24.1400, lon: 121.2747, elevation: 3250 },
  '合歡山': { datasetId: 'F-D0047-023', county: '南投縣', township: '仁愛鄉', lat: 24.1415, lon: 121.2828, elevation: 3417 },
  '清境': { datasetId: 'F-D0047-023', county: '南投縣', township: '仁愛鄉', lat: 24.0435, lon: 121.1625, elevation: 1750 },
  '清境農場': { datasetId: 'F-D0047-023', county: '南投縣', township: '仁愛鄉', lat: 24.0435, lon: 121.1625, elevation: 1750 },
  '日月潭': { datasetId: 'F-D0047-023', county: '南投縣', township: '魚池鄉', lat: 23.8687, lon: 120.9160, elevation: 760 },
  '南投': { datasetId: 'F-D0047-023', county: '南投縣', township: '南投市', lat: 23.9133, lon: 120.6792, elevation: 110 },
  '南投縣': { datasetId: 'F-D0047-023', county: '南投縣', township: '南投市', lat: 23.9133, lon: 120.6792, elevation: 110 },
  '仁愛鄉': { datasetId: 'F-D0047-023', county: '南投縣', township: '仁愛鄉', lat: 24.0232, lon: 121.1241, elevation: 1148 },
  '台北': { datasetId: 'F-D0047-063', county: '臺北市', township: '中正區', lat: 25.0330, lon: 121.5654, elevation: 20 },
  '臺北': { datasetId: 'F-D0047-063', county: '臺北市', township: '中正區', lat: 25.0330, lon: 121.5654, elevation: 20 },
  '台北市': { datasetId: 'F-D0047-063', county: '臺北市', township: '中正區', lat: 25.0330, lon: 121.5654, elevation: 20 },
  '臺北市': { datasetId: 'F-D0047-063', county: '臺北市', township: '中正區', lat: 25.0330, lon: 121.5654, elevation: 20 },
  '新北': { datasetId: 'F-D0047-071', county: '新北市', township: '板橋區', lat: 25.0118, lon: 121.4658, elevation: 20 },
  '新北市': { datasetId: 'F-D0047-071', county: '新北市', township: '板橋區', lat: 25.0118, lon: 121.4658, elevation: 20 },
  '桃園': { datasetId: 'F-D0047-007', county: '桃園市', township: '桃園區', lat: 24.9936, lon: 121.3010, elevation: 50 },
  '桃園市': { datasetId: 'F-D0047-007', county: '桃園市', township: '桃園區', lat: 24.9936, lon: 121.3010, elevation: 50 },
  '新竹': { datasetId: 'F-D0047-055', county: '新竹市', township: '東區', lat: 24.8138, lon: 120.9675, elevation: 35 },
  '新竹市': { datasetId: 'F-D0047-055', county: '新竹市', township: '東區', lat: 24.8138, lon: 120.9675, elevation: 35 },
  '新竹縣': { datasetId: 'F-D0047-011', county: '新竹縣', township: '竹北市', lat: 24.8383, lon: 121.0076, elevation: 30 },
  '苗栗': { datasetId: 'F-D0047-015', county: '苗栗縣', township: '苗栗市', lat: 24.5602, lon: 120.8214, elevation: 60 },
  '苗栗縣': { datasetId: 'F-D0047-015', county: '苗栗縣', township: '苗栗市', lat: 24.5602, lon: 120.8214, elevation: 60 },
  '台中': { datasetId: 'F-D0047-075', county: '臺中市', township: '西區', lat: 24.1477, lon: 120.6736, elevation: 85 },
  '臺中': { datasetId: 'F-D0047-075', county: '臺中市', township: '西區', lat: 24.1477, lon: 120.6736, elevation: 85 },
  '台中市': { datasetId: 'F-D0047-075', county: '臺中市', township: '西區', lat: 24.1477, lon: 120.6736, elevation: 85 },
  '臺中市': { datasetId: 'F-D0047-075', county: '臺中市', township: '西區', lat: 24.1477, lon: 120.6736, elevation: 85 },
  '彰化': { datasetId: 'F-D0047-019', county: '彰化縣', township: '彰化市', lat: 24.0815, lon: 120.5385, elevation: 30 },
  '彰化縣': { datasetId: 'F-D0047-019', county: '彰化縣', township: '彰化市', lat: 24.0815, lon: 120.5385, elevation: 30 },
  '雲林': { datasetId: 'F-D0047-027', county: '雲林縣', township: '斗六市', lat: 23.7092, lon: 120.5435, elevation: 45 },
  '雲林縣': { datasetId: 'F-D0047-027', county: '雲林縣', township: '斗六市', lat: 23.7092, lon: 120.5435, elevation: 45 },
  '嘉義': { datasetId: 'F-D0047-059', county: '嘉義市', township: '東區', lat: 23.4800, lon: 120.4491, elevation: 35 },
  '嘉義市': { datasetId: 'F-D0047-059', county: '嘉義市', township: '東區', lat: 23.4800, lon: 120.4491, elevation: 35 },
  '嘉義縣': { datasetId: 'F-D0047-031', county: '嘉義縣', township: '太保市', lat: 23.4589, lon: 120.3323, elevation: 20 },
  '阿里山': { datasetId: 'F-D0047-031', county: '嘉義縣', township: '阿里山鄉', lat: 23.5100, lon: 120.8000, elevation: 2200 },
  '台南': { datasetId: 'F-D0047-079', county: '臺南市', township: '安平區', lat: 22.9997, lon: 120.2270, elevation: 15 },
  '臺南': { datasetId: 'F-D0047-079', county: '臺南市', township: '安平區', lat: 22.9997, lon: 120.2270, elevation: 15 },
  '台南市': { datasetId: 'F-D0047-079', county: '臺南市', township: '安平區', lat: 22.9997, lon: 120.2270, elevation: 15 },
  '臺南市': { datasetId: 'F-D0047-079', county: '臺南市', township: '安平區', lat: 22.9997, lon: 120.2270, elevation: 15 },
  '高雄': { datasetId: 'F-D0047-067', county: '高雄市', township: '苓雅區', lat: 22.6273, lon: 120.3014, elevation: 10 },
  '高雄市': { datasetId: 'F-D0047-067', county: '高雄市', township: '苓雅區', lat: 22.6273, lon: 120.3014, elevation: 10 },
  '屏東': { datasetId: 'F-D0047-035', county: '屏東縣', township: '屏東市', lat: 22.6761, lon: 120.4885, elevation: 25 },
  '屏東縣': { datasetId: 'F-D0047-035', county: '屏東縣', township: '屏東市', lat: 22.6761, lon: 120.4885, elevation: 25 },
  '墾丁': { datasetId: 'F-D0047-035', county: '屏東縣', township: '恆春鎮', lat: 21.9463, lon: 120.7981, elevation: 20 },
  '恆春': { datasetId: 'F-D0047-035', county: '屏東縣', township: '恆春鎮', lat: 22.0042, lon: 120.7447, elevation: 20 },
  '宜蘭': { datasetId: 'F-D0047-003', county: '宜蘭縣', township: '宜蘭市', lat: 24.7570, lon: 121.7530, elevation: 10 },
  '宜蘭縣': { datasetId: 'F-D0047-003', county: '宜蘭縣', township: '宜蘭市', lat: 24.7570, lon: 121.7530, elevation: 10 },
  '礁溪': { datasetId: 'F-D0047-003', county: '宜蘭縣', township: '礁溪鄉', lat: 24.8272, lon: 121.7712, elevation: 15 },
  '花蓮': { datasetId: 'F-D0047-043', county: '花蓮縣', township: '花蓮市', lat: 23.9872, lon: 121.6016, elevation: 25 },
  '花蓮縣': { datasetId: 'F-D0047-043', county: '花蓮縣', township: '花蓮市', lat: 23.9872, lon: 121.6016, elevation: 25 },
  '太魯閣': { datasetId: 'F-D0047-043', county: '花蓮縣', township: '秀林鄉', lat: 24.1583, lon: 121.6222, elevation: 60 },
  '台東': { datasetId: 'F-D0047-039', county: '臺東縣', township: '臺東市', lat: 22.7583, lon: 121.1444, elevation: 15 },
  '臺東': { datasetId: 'F-D0047-039', county: '臺東縣', township: '臺東市', lat: 22.7583, lon: 121.1444, elevation: 15 },
  '台東縣': { datasetId: 'F-D0047-039', county: '臺東縣', township: '臺東市', lat: 22.7583, lon: 121.1444, elevation: 15 },
  '臺東縣': { datasetId: 'F-D0047-039', county: '臺東縣', township: '臺東市', lat: 22.7583, lon: 121.1444, elevation: 15 },
  '澎湖': { datasetId: 'F-D0047-047', county: '澎湖縣', township: '馬公市', lat: 23.5711, lon: 119.5793, elevation: 15 },
  '金門': { datasetId: 'F-D0047-087', county: '金門縣', township: '金城鎮', lat: 24.4363, lon: 118.3186, elevation: 20 },
  '馬祖': { datasetId: 'F-D0047-083', county: '連江縣', township: '南竿鄉', lat: 26.1558, lon: 119.9397, elevation: 30 },
  '連江': { datasetId: 'F-D0047-083', county: '連江縣', township: '南竿鄉', lat: 26.1558, lon: 119.9397, elevation: 30 },
};

// 內建海外熱門旅遊城市離線字典
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'la': { lat: 34.0522, lon: -118.2437 },
  '洛杉磯': { lat: 34.0522, lon: -118.2437 },
  'las vegas': { lat: 36.1699, lon: -115.1398 },
  'lv': { lat: 36.1699, lon: -115.1398 },
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
  'fukuoka': { lat: 33.5904, lon: 130.4017 },
  '福岡': { lat: 33.5904, lon: 130.4017 },
  'london': { lat: 51.5074, lon: -0.1278 },
  '倫敦': { lat: 51.5074, lon: -0.1278 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  '巴黎': { lat: 48.8566, lon: 2.3522 },
};

/**
 * 解析跨城市天數排程字串
 */
export function parseCitySchedule(scheduleStr?: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!scheduleStr) return map;

  const segments = scheduleStr.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean);

  segments.forEach((seg) => {
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
 * 依據 Day 標籤取得該天對應的城市名稱
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
 * 將中央氣象署 (CWA) 的中文天氣現象字串轉換為相容的 WMO Code
 */
export function cwaWeatherDescToCode(desc: string): number {
  if (!desc) return 0;
  if (desc.includes('雷')) return 95;
  if (desc.includes('雪')) return 71;
  if (desc.includes('雨')) {
    if (desc.includes('陣雨') || desc.includes('午後')) return 80;
    if (desc.includes('毛毛雨') || desc.includes('細雨')) return 51;
    return 61;
  }
  if (desc.includes('霧')) return 45;
  if (desc.includes('陰')) return 3;
  if (desc.includes('多雲')) return 2;
  if (desc.includes('晴時多雲')) return 1;
  if (desc.includes('晴')) return 0;
  return 1;
}

/**
 * 快速解析城市所在地點、行政區、海拔與來源（用於 UI 地點即時預覽與透明度核對）
 */
export async function resolveCityInfo(cityName: string): Promise<CityResolutionInfo | null> {
  const clean = cityName.trim();
  if (!clean) return null;

  // 1. 優先檢查台灣高精度字典
  const twMeta = TAIWAN_LOCATIONS[clean];
  if (twMeta) {
    const parts = ['台灣', twMeta.county, twMeta.township, clean !== twMeta.township && clean !== twMeta.county ? clean : '']
      .filter(Boolean);
    return {
      cityName: clean,
      resolvedName: parts.join(' · '),
      source: 'CWA',
      latitude: twMeta.lat,
      longitude: twMeta.lon,
      elevation: twMeta.elevation,
      countyName: twMeta.county,
      townshipName: twMeta.township,
      countryCode: 'TW',
    };
  }

  // 2. 檢查知名海外城市
  const lower = clean.toLowerCase();
  if (KNOWN_COORDINATES[lower]) {
    const coords = KNOWN_COORDINATES[lower];
    return {
      cityName: clean,
      resolvedName: clean,
      source: 'Open-Meteo',
      latitude: coords.lat,
      longitude: coords.lon,
    };
  }

  // 3. 透過 Open-Meteo Geocoding 搜尋
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=zh&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const isTW = item.country_code === 'TW';
        const parts = [
          isTW ? '台灣' : item.country,
          item.admin2,
          item.admin3,
          item.name,
        ].filter(Boolean);

        return {
          cityName: clean,
          resolvedName: Array.from(new Set(parts)).join(' · '),
          source: isTW ? 'CWA' : 'Open-Meteo',
          latitude: item.latitude,
          longitude: item.longitude,
          elevation: item.elevation,
          countyName: item.admin2,
          townshipName: item.admin3,
          countryCode: item.country_code,
        };
      }
    }
  } catch (err) {
    console.warn(`Geocoding resolution failed for ${clean}:`, err);
  }

  return null;
}

/**
 * 透過中央氣象署 (CWA) 官方 API 抓取逐日天氣預報
 */
async function fetchWeatherFromCwa(
  cleanName: string,
  resInfo: CityResolutionInfo
): Promise<CityWeatherData | null> {
  try {
    const datasetId = TAIWAN_LOCATIONS[cleanName]?.datasetId || 'F-D0047-091';
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${datasetId}?Authorization=${CWA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    const locations = data.records?.Locations?.[0]?.Location || [];
    if (locations.length === 0) return null;

    // 優先匹配鄉鎮，其次匹配縣市，否則取第一筆
    const targetTownship = resInfo.townshipName || cleanName;
    const targetCounty = resInfo.countyName || cleanName;

    const matchedLoc =
      locations.find((l: any) => l.LocationName === targetTownship) ||
      locations.find((l: any) => l.LocationName === targetCounty) ||
      locations.find((l: any) => cleanName.includes(l.LocationName) || l.LocationName.includes(cleanName)) ||
      locations[0];

    const wxTimes = matchedLoc.WeatherElement.find((w: any) => w.ElementName === '天氣現象')?.Time || [];
    const popTimes = matchedLoc.WeatherElement.find((w: any) => w.ElementName === '12小時降雨機率')?.Time || [];
    const maxTTimes = matchedLoc.WeatherElement.find((w: any) => w.ElementName === '最高溫度')?.Time || [];
    const minTTimes = matchedLoc.WeatherElement.find((w: any) => w.ElementName === '最低溫度')?.Time || [];

    const dailyMap: Record<string, DayWeatherInfo> = {};

    // CWA 預報每 12 小時一筆，逐日聚合（白天 06:00~18:00 為代表）
    for (let i = 0; i < wxTimes.length; i++) {
      const timeItem = wxTimes[i];
      const startStr = timeItem.StartTime || '';
      const dateStr = startStr.split('T')[0];
      if (!dateStr) continue;

      const wx = timeItem.ElementValue?.[0]?.Weather || '';
      const popStr = popTimes[i]?.ElementValue?.[0]?.ProbabilityOfPrecipitation || '';
      const prob = popStr && popStr !== '-' ? parseInt(popStr, 10) : 0;
      const maxT = parseInt(maxTTimes[i]?.ElementValue?.[0]?.MaxTemperature || '28', 10);
      const minT = parseInt(minTTimes[i]?.ElementValue?.[0]?.MinTemperature || '20', 10);

      // 高山體感提醒（武嶺標高 3250m，因高度每上升 1000m 約降 6°C）
      let highAltitudeNote = '';
      if (resInfo.elevation && resInfo.elevation >= 2000) {
        const drop = Math.round((resInfo.elevation - 1100) * 0.006);
        highAltitudeNote = `⛰️ 標高 ${resInfo.elevation}m 高山區，山頂氣溫約比市區低 ${drop}°C (約 ${Math.max(2, minT - drop)}°C ~ ${Math.max(8, maxT - drop)}°C)，體感寒冷請備妥保暖防風衣物。`;
      }

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          dateStr,
          weatherCode: cwaWeatherDescToCode(wx),
          weatherDesc: wx,
          tempMax: maxT,
          tempMin: minT,
          precipitationProbability: prob,
          highAltitudeNote,
        };
      } else {
        // 合併同一天的白天與夜晚極值
        if (maxT > dailyMap[dateStr].tempMax) dailyMap[dateStr].tempMax = maxT;
        if (minT < dailyMap[dateStr].tempMin) dailyMap[dateStr].tempMin = minT;
        if (prob > dailyMap[dateStr].precipitationProbability) {
          dailyMap[dateStr].precipitationProbability = prob;
        }
      }
    }

    const daily = Object.values(dailyMap);
    if (daily.length === 0) return null;

    return {
      cityName: cleanName,
      resolvedName: resInfo.resolvedName,
      source: 'CWA',
      latitude: resInfo.latitude,
      longitude: resInfo.longitude,
      elevation: resInfo.elevation,
      countyName: resInfo.countyName,
      townshipName: matchedLoc.LocationName,
      currentTemp: daily[0]?.tempMax,
      currentWeatherCode: daily[0]?.weatherCode,
      daily,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.warn(`CWA weather fetch failed for ${cleanName}:`, err);
    return null;
  }
}

/**
 * 透過 Open-Meteo 全球氣象模式抓取預報（海外城市或 CWA 斷網 Fallback）
 */
async function fetchWeatherFromOpenMeteo(
  cleanName: string,
  resInfo: CityResolutionInfo
): Promise<CityWeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${resInfo.latitude}&longitude=${resInfo.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&current=temperature_2m,weather_code&timezone=auto&forecast_days=14`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const dailyList: DayWeatherInfo[] = [];
    const dates = data.daily?.time || [];
    const codes = data.daily?.weather_code || [];
    const maxs = data.daily?.temperature_2m_max || [];
    const mins = data.daily?.temperature_2m_min || [];
    const precips = data.daily?.precipitation_probability_max || [];
    const precipSums = data.daily?.precipitation_sum || [];

    for (let i = 0; i < dates.length; i++) {
      const code = codes[i] ?? 0;
      const precipSum = Math.round((precipSums[i] ?? 0) * 10) / 10;
      let desc = getWeatherDescription(code);

      // 高山微氣候雨量判別（若是毛毛雨且降雨量 < 2mm，註記為高山短暫雲霧）
      if ((code === 51 || code === 53 || code === 55) && precipSum < 2) {
        desc = '高山雲霧 / 細微霧雨';
      }

      dailyList.push({
        dateStr: dates[i],
        weatherCode: code,
        weatherDesc: desc,
        tempMax: Math.round(maxs[i] ?? 20),
        tempMin: Math.round(mins[i] ?? 15),
        precipitationProbability: Math.round(precips[i] ?? 0),
        precipitationSum: precipSum,
      });
    }

    return {
      cityName: cleanName,
      resolvedName: resInfo.resolvedName,
      source: 'Open-Meteo',
      latitude: resInfo.latitude,
      longitude: resInfo.longitude,
      elevation: resInfo.elevation,
      countyName: resInfo.countyName,
      townshipName: resInfo.townshipName,
      currentTemp: data.current?.temperature_2m !== undefined ? Math.round(data.current.temperature_2m) : undefined,
      currentWeatherCode: data.current?.weather_code ?? 0,
      daily: dailyList,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.warn(`Open-Meteo weather fetch failed for ${cleanName}:`, err);
    return null;
  }
}

/**
 * 取得特定城市的完整天氣預報（附 60 分鐘 LocalStorage 快取與雙引擎支援）
 */
export async function fetchWeatherForCity(
  cityName: string
): Promise<CityWeatherData | null> {
  const cleanName = cityName.trim();
  if (!cleanName) return null;

  const cacheKey = `weather_cache_v2_${cleanName.toLowerCase()}`;
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

  const resInfo = await resolveCityInfo(cleanName);
  if (!resInfo) return null;

  let result: CityWeatherData | null = null;

  // 1. 若屬於台灣地點且有 CWA API KEY，優先走中央氣象署官方預報
  if (resInfo.source === 'CWA' && CWA_API_KEY) {
    result = await fetchWeatherFromCwa(cleanName, resInfo);
  }

  // 2. 海外城市或 CWA 無結果時，平滑走 Open-Meteo 全球模式
  if (!result) {
    result = await fetchWeatherFromOpenMeteo(cleanName, resInfo);
  }

  if (result && typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}
  }

  return result;
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

