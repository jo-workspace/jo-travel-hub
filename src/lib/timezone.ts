/**
 * 時區智慧解析模組 (Smart Timezone Engine)
 * 支援縮寫 (JST/PST/UTC)、時差 (+9/-7/GMT+9)、常見旅遊目的地別名 (日本/曼谷/洛杉磯) 與標準 IANA
 * 純前端極速零延遲解析，附即時本地時間計算
 */

export interface TimezoneResolution {
  iana: string; // 標準 IANA 代碼，例如 Asia/Tokyo
  displayText: string; // 易讀標籤，例如 日本時間 (GMT+9)
  localTime: string; // 當地現在時間，例如 12:25
  isValid: boolean; // 是否有效匹配
  isDefault: boolean; // 是否為預設台灣
}

// 常見時區縮寫映射
const ABBREVIATION_MAP: Record<string, { iana: string; name: string }> = {
  jst: { iana: 'Asia/Tokyo', name: '日本時間 (JST)' },
  kst: { iana: 'Asia/Seoul', name: '韓國時間 (KST)' },
  tst: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  cst: { iana: 'Asia/Taipei', name: '台北/中原標準時 (GMT+8)' },
  sgt: { iana: 'Asia/Singapore', name: '新加坡時間 (SGT)' },
  hkt: { iana: 'Asia/Hong_Kong', name: '香港時間 (HKT)' },
  ict: { iana: 'Asia/Bangkok', name: '中南半島時間 (ICT)' },
  pst: { iana: 'America/Los_Angeles', name: '美西標準時 (PST, GMT-8)' },
  pdt: { iana: 'America/Los_Angeles', name: '美西日光節約時 (PDT, GMT-7)' },
  mst: { iana: 'America/Denver', name: '美山區標準時 (MST, GMT-7)' },
  mdt: { iana: 'America/Denver', name: '美山區日光時 (MDT, GMT-6)' },
  est: { iana: 'America/New_York', name: '美東標準時 (EST, GMT-5)' },
  edt: { iana: 'America/New_York', name: '美東日光節約時 (EDT, GMT-4)' },
  cet: { iana: 'Europe/Paris', name: '中歐時間 (CET, GMT+1)' },
  cest: { iana: 'Europe/Paris', name: '中歐夏令時 (CEST, GMT+2)' },
  bst: { iana: 'Europe/London', name: '英國夏令時 (BST, GMT+1)' },
  gmt: { iana: 'UTC', name: '格林威治標準時 (GMT)' },
  utc: { iana: 'UTC', name: '世界協調時 (UTC)' },
  aest: { iana: 'Australia/Sydney', name: '澳洲東部時間 (AEST, GMT+10)' },
  aedt: { iana: 'Australia/Sydney', name: '澳洲東部夏令時 (AEDT, GMT+11)' },
  hst: { iana: 'Pacific/Honolulu', name: '夏威夷時間 (HST, GMT-10)' },
  chst: { iana: 'Pacific/Guam', name: '關島時間 (ChST, GMT+10)' },
};

// 常見旅遊目的地地名與別名映射
const CITY_ALIAS_MAP: Record<string, { iana: string; name: string }> = {
  // 日本
  日本: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  東京: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  沖繩: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  那霸: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  宮古島: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  石垣島: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  石垣: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  大阪: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  京都: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  福岡: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  北海道: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  札幌: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  名古屋: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  廣島: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  仙台: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  japan: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  tokyo: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  okinawa: { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },
  'asia/tokyo': { iana: 'Asia/Tokyo', name: '日本時間 (GMT+9)' },

  // 台灣
  台灣: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  台北: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  臺北: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  台中: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  臺中: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  高雄: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  台南: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  臺南: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  基隆: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  taiwan: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  taipei: { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },
  'asia/taipei': { iana: 'Asia/Taipei', name: '台灣時間 (GMT+8)' },

  // 韓國
  韓國: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  首爾: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  釜山: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  濟州: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  korea: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  seoul: { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },
  'asia/seoul': { iana: 'Asia/Seoul', name: '韓國時間 (GMT+9)' },

  // 東南亞
  泰國: { iana: 'Asia/Bangkok', name: '泰國時間 (GMT+7)' },
  曼谷: { iana: 'Asia/Bangkok', name: '泰國時間 (GMT+7)' },
  清邁: { iana: 'Asia/Bangkok', name: '泰國時間 (GMT+7)' },
  普吉島: { iana: 'Asia/Bangkok', name: '泰國時間 (GMT+7)' },
  'asia/bangkok': { iana: 'Asia/Bangkok', name: '泰國時間 (GMT+7)' },
  越南: { iana: 'Asia/Ho_Chi_Minh', name: '越南時間 (GMT+7)' },
  峴港: { iana: 'Asia/Ho_Chi_Minh', name: '越南時間 (GMT+7)' },
  河內: { iana: 'Asia/Ho_Chi_Minh', name: '越南時間 (GMT+7)' },
  胡志明: { iana: 'Asia/Ho_Chi_Minh', name: '越南時間 (GMT+7)' },
  新加坡: { iana: 'Asia/Singapore', name: '新加坡時間 (GMT+8)' },
  singapore: { iana: 'Asia/Singapore', name: '新加坡時間 (GMT+8)' },
  香港: { iana: 'Asia/Hong_Kong', name: '香港時間 (GMT+8)' },
  澳門: { iana: 'Asia/Macau', name: '澳門時間 (GMT+8)' },
  峇里島: { iana: 'Asia/Makassar', name: '峇里島時間 (GMT+8)' },

  // 美洲
  美西: { iana: 'America/Los_Angeles', name: '美西時間 (GMT-7/8)' },
  洛杉磯: { iana: 'America/Los_Angeles', name: '美西/洛杉磯 (GMT-7/8)' },
  舊金山: { iana: 'America/Los_Angeles', name: '美西/舊金山 (GMT-7/8)' },
  拉斯維加斯: { iana: 'America/Los_Angeles', name: '美西/拉斯維加斯 (GMT-7/8)' },
  西雅圖: { iana: 'America/Los_Angeles', name: '美西/西雅圖 (GMT-7/8)' },
  加州: { iana: 'America/Los_Angeles', name: '美西時間 (GMT-7/8)' },
  la: { iana: 'America/Los_Angeles', name: '美西/洛杉磯 (GMT-7/8)' },
  lv: { iana: 'America/Los_Angeles', name: '美西/拉斯維加斯 (GMT-7/8)' },
  'america/los_angeles': { iana: 'America/Los_Angeles', name: '美西時間 (GMT-7/8)' },
  美東: { iana: 'America/New_York', name: '美東時間 (GMT-4/5)' },
  紐約: { iana: 'America/New_York', name: '美東/紐約 (GMT-4/5)' },
  波士頓: { iana: 'America/New_York', name: '美東/波士頓 (GMT-4/5)' },
  'america/new_york': { iana: 'America/New_York', name: '美東時間 (GMT-4/5)' },
  夏威夷: { iana: 'Pacific/Honolulu', name: '夏威夷時間 (GMT-10)' },
  檀香山: { iana: 'Pacific/Honolulu', name: '夏威夷時間 (GMT-10)' },
  關島: { iana: 'Pacific/Guam', name: '關島時間 (GMT+10)' },

  // 歐洲
  英國: { iana: 'Europe/London', name: '英國時間 (GMT+0/1)' },
  倫敦: { iana: 'Europe/London', name: '英國時間 (GMT+0/1)' },
  法國: { iana: 'Europe/Paris', name: '中西歐時間 (GMT+1/2)' },
  巴黎: { iana: 'Europe/Paris', name: '法國/巴黎 (GMT+1/2)' },
  義大利: { iana: 'Europe/Rome', name: '義大利時間 (GMT+1/2)' },
  羅馬: { iana: 'Europe/Rome', name: '義大利時間 (GMT+1/2)' },
  德國: { iana: 'Europe/Berlin', name: '德國時間 (GMT+1/2)' },
  柏林: { iana: 'Europe/Berlin', name: '德國時間 (GMT+1/2)' },
  瑞士: { iana: 'Europe/Zurich', name: '瑞士時間 (GMT+1/2)' },
  荷蘭: { iana: 'Europe/Amsterdam', name: '荷蘭時間 (GMT+1/2)' },
};

// 數字時差映射至對應熱門代表時區 (支援通用時差數學)
const NUMERIC_OFFSET_MAP: Record<number, { iana: string; name: string }> = {
  12: { iana: 'Pacific/Auckland', name: '紐西蘭時間 (GMT+12)' },
  11: { iana: 'Pacific/Noumea', name: '新喀里多尼亞 (GMT+11)' },
  10: { iana: 'Australia/Sydney', name: '澳洲東部/關島 (GMT+10)' },
  9: { iana: 'Asia/Tokyo', name: '日本/韓國 (GMT+9)' },
  8: { iana: 'Asia/Taipei', name: '台灣/香港/新加坡 (GMT+8)' },
  7: { iana: 'Asia/Bangkok', name: '泰國/越南 (GMT+7)' },
  6: { iana: 'Asia/Dhaka', name: '孟加拉 (GMT+6)' },
  5: { iana: 'Asia/Karachi', name: '巴基斯坦 (GMT+5)' },
  4: { iana: 'Asia/Dubai', name: '杜拜/阿聯酋 (GMT+4)' },
  3: { iana: 'Asia/Riyadh', name: '東歐/中東 (GMT+3)' },
  2: { iana: 'Europe/Athens', name: '東歐 (GMT+2)' },
  1: { iana: 'Europe/Paris', name: '中西歐 (GMT+1)' },
  0: { iana: 'UTC', name: '格林威治/英國 (GMT+0)' },
  '-1': { iana: 'Atlantic/Cape_Verde', name: '維德角 (GMT-1)' },
  '-3': { iana: 'America/Sao_Paulo', name: '巴西 (GMT-3)' },
  '-4': { iana: 'America/New_York', name: '美東夏令/智利 (GMT-4)' },
  '-5': { iana: 'America/New_York', name: '美東標準時 (GMT-5)' },
  '-6': { iana: 'America/Chicago', name: '美中部時間 (GMT-6)' },
  '-7': { iana: 'America/Los_Angeles', name: '美西夏令/山區 (GMT-7)' },
  '-8': { iana: 'America/Los_Angeles', name: '美西標準時 (GMT-8)' },
  '-9': { iana: 'America/Anchorage', name: '阿拉斯加 (GMT-9)' },
  '-10': { iana: 'Pacific/Honolulu', name: '夏威夷 (GMT-10)' },
};

/**
 * 依 IANA 時區取得當地現在時間字串 (例如 "12:30")
 */
export function getLocalTimeString(iana: string): string {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      timeZone: iana,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return '--:--';
  }
}

/**
 * 智慧解析時區輸入字串
 * 支援縮寫 (JST/KST/PST)、時差數字 (+9/-7/GMT+9)、地名 (日本/沖繩/曼谷) 與 IANA
 */
export function resolveTimezone(rawInput?: string): TimezoneResolution {
  const clean = (rawInput || '').trim();

  // 若完全未輸入，回傳預設台灣
  if (!clean) {
    const iana = 'Asia/Taipei';
    return {
      iana,
      displayText: '台灣時間 (GMT+8)',
      localTime: getLocalTimeString(iana),
      isValid: true,
      isDefault: true,
    };
  }

  const lower = clean.toLowerCase();

  // 1. 檢查時區縮寫字典 (JST, PST, UTC, SGT...)
  if (ABBREVIATION_MAP[lower]) {
    const meta = ABBREVIATION_MAP[lower];
    return {
      iana: meta.iana,
      displayText: meta.name,
      localTime: getLocalTimeString(meta.iana),
      isValid: true,
      isDefault: false,
    };
  }

  // 2. 檢查地名別名字典 (日本, 東京, 沖繩, 曼谷...)
  if (CITY_ALIAS_MAP[clean] || CITY_ALIAS_MAP[lower]) {
    const meta = CITY_ALIAS_MAP[clean] || CITY_ALIAS_MAP[lower];
    return {
      iana: meta.iana,
      displayText: meta.name,
      localTime: getLocalTimeString(meta.iana),
      isValid: true,
      isDefault: false,
    };
  }

  // 3. 檢查通用時差數字格式 (+9, -7, GMT+9, UTC-8, +09:00...)
  const offsetMatch = clean.match(/^(?:gmt|utc)?\s*([+-]?\d{1,2})(?::\d{2})?$/i);
  if (offsetMatch) {
    const offsetNum = parseInt(offsetMatch[1], 10);
    if (!isNaN(offsetNum) && offsetNum >= -12 && offsetNum <= 14) {
      const meta = NUMERIC_OFFSET_MAP[offsetNum];
      if (meta) {
        return {
          iana: meta.iana,
          displayText: meta.name,
          localTime: getLocalTimeString(meta.iana),
          isValid: true,
          isDefault: false,
        };
      } else {
        // 通用 Etc/GMT 格式 (POSIX Etc/GMT 符號相反，例如 GMT+2 對應 Etc/GMT-2)
        const etcIana = offsetNum === 0 ? 'UTC' : `Etc/GMT${offsetNum > 0 ? `-${offsetNum}` : `+${Math.abs(offsetNum)}`}`;
        const sign = offsetNum >= 0 ? `+${offsetNum}` : `${offsetNum}`;
        return {
          iana: etcIana,
          displayText: `時區 (GMT${sign})`,
          localTime: getLocalTimeString(etcIana),
          isValid: true,
          isDefault: false,
        };
      }
    }
  }

  // 4. 檢查是否本身就是合法的 IANA 時區代碼 (例如 Asia/Tokyo, America/Los_Angeles)
  try {
    const localTime = getLocalTimeString(clean);
    if (localTime !== '--:--') {
      const cityPart = clean.includes('/') ? clean.split('/').pop()?.replace(/_/g, ' ') : clean;
      return {
        iana: clean,
        displayText: `${cityPart} (${clean})`,
        localTime,
        isValid: true,
        isDefault: false,
      };
    }
  } catch {
    // 非合法 IANA
  }

  // 5. 無法辨識時的友善回退 (標記無效但安全回退為台灣時間)
  const defaultIana = 'Asia/Taipei';
  return {
    iana: defaultIana,
    displayText: `無法辨識 (${clean})`,
    localTime: getLocalTimeString(defaultIana),
    isValid: false,
    isDefault: false,
  };
}
