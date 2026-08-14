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
}

export function createPlaneSvg(bgColor = '#0f172a', planeColor = '#f59e0b'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect x="0" y="0" width="24" height="24" rx="5" fill="${bgColor}"/><path fill="none" stroke="${planeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .8l-.6 1 4.5 3.5-3.5 3.5-2.3-.5-.9.9 2.5 2.5 2.5 2.5.9-.9-.5-2.3 3.5-3.5 3.5 4.5 1-.6c.7-.4 1-1.2.8-2z"/></svg>`;
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
  },
};


