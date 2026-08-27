export interface TripConfig {
  id: string;
  title: string;
  dates?: string;
  coverGradient: string;
  badgeText: string;
  apiUrl: string;
  description?: string;
  timezone?: string; // 旅程目的地時區（IANA），例如 America/Los_Angeles
  iconUrl?: string;
  appleIconUrl?: string;
  emoji?: string;
  citySchedule?: string; // 跨城市天數排程，例如 Day 1-3: Los Angeles, Day 4-5: Las Vegas
}

export const TRIPS: Record<string, TripConfig> = {
  'la-2026': {
    id: 'la-2026',
    title: '2026 LA Trip',
    dates: '2026/08',
    coverGradient: 'from-slate-800 to-slate-900',
    badgeText: '進行中',
    apiUrl: 'https://script.google.com/macros/s/AKfycbwuT0HjqVqIpY9fO-zHC9xuG_U6et5AsYE9qkhR8_PqvLG3vTWdxRGERLbeEXzo4iUQ/exec',
    description: '洛杉磯觀光、棒球賽與美食之旅',
    timezone: 'America/Los_Angeles',
    iconUrl: '/favicon_la_trip.png',
    appleIconUrl: '/favicon_la_trip.png',
    emoji: '⚾',
    citySchedule: 'Day 1-5: Los Angeles, Day 6-7: San Diego, Day 8-10: Los Angeles',
  },
  'okinawa-2026': {
    id: 'okinawa-2026',
    title: '2026 沖繩之旅',
    dates: '2026/10',
    coverGradient: 'from-teal-700 to-cyan-900',
    badgeText: '籌備中',
    apiUrl: '', // 可在齒輪設定中隨時填入或建立新 Sheet 端點
    description: '沖繩自駕、海景與休閒之旅',
    timezone: 'Asia/Tokyo',
    iconUrl: '/favicon.png',
    appleIconUrl: '/favicon.png',
    emoji: '🌺',
    citySchedule: 'Day 1-2: 那霸, Day 3-4: 名護, Day 5: 那霸',
  },
};


