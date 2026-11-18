const CACHE_NAME = 'jo-travel-hub-offline-v1';

const PRECACHE_URLS = [
  '/',
  '/hub-logo.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { credentials: 'same-origin' }).then((res) => {
            if (res.ok) return cache.put(url, res);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 接收前端主動通知，將當前開啟的頁面與已載入的 JS/CSS 靜態資源強制寫入離線快取（確保首次開啟無須重整即可離線使用）
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'WARM_OFFLINE_CACHE') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  if (urls.length === 0) return;

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const rawUrl of urls) {
        try {
          const parsed = new URL(rawUrl, self.location.origin);
          if (parsed.origin !== self.location.origin) continue;
          const res = await fetch(parsed.href, { credentials: 'same-origin' });
          if (res && res.ok) {
            await cache.put(parsed.href, res.clone());
            // 若為頁面路由，同時以不含 query string 的路徑作為備援索引（方便切換 ?tab= 時離線命中）
            if (!parsed.pathname.startsWith('/_next/') && !parsed.pathname.startsWith('/api/')) {
              const cleanPathUrl = parsed.origin + parsed.pathname;
              await cache.put(cleanPathUrl, res.clone());
            }
          }
        } catch {
          // 忽略單一資源預熱失敗
        }
      }
    })
  );
});

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 僅處理同源請求與 Google 字型
  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isGoogleFont) return;

  // 略過認證與動態 API
  if (url.pathname.startsWith('/api/')) return;

  // 1. 靜態資源 (/_next/static/, 圖示, 字型)：採用 Cache-First 策略確保秒開
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    isGoogleFont ||
    /\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|ttf|css|js)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const netRes = await fetch(request);
          if (netRes && netRes.ok) {
            cache.put(request, netRes.clone());
          }
          return netRes;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // 2. 頁面導覽 (HTML) 與 Next.js RSC 請求：採用 Network-First (附 3.5 秒超時防郵輪假 Wi-Fi 卡死) + Offline Cache Fallback
  const isNavigation = request.mode === 'navigate';
  const isRsc =
    request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');

  if (isNavigation || isRsc) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const netRes = await fetchWithTimeout(request, 3500);
          if (netRes && netRes.ok) {
            cache.put(request, netRes.clone());
            if (isNavigation) {
              const cleanPathUrl = url.origin + url.pathname;
              cache.put(cleanPathUrl, netRes.clone());
            }
            return netRes;
          }
        } catch {
          // 網路斷線或郵輪內網超時，轉入本機快取救援
        }

        // 先找完全符合的 URL
        const exactMatch = await cache.match(request);
        if (exactMatch) return exactMatch;

        // 針對頁面導覽，忽略 ?tab= 等查詢參數比對乾淨路徑
        if (isNavigation) {
          const cleanPathUrl = url.origin + url.pathname;
          const cleanMatch = await cache.match(cleanPathUrl);
          if (cleanMatch) return cleanMatch;

          // 遍歷快取尋找相同 pathname 的 HTML
          const keys = await cache.keys();
          for (const keyReq of keys) {
            const keyUrl = new URL(keyReq.url);
            if (
              keyUrl.pathname === url.pathname &&
              !keyUrl.searchParams.has('_rsc')
            ) {
              const fallbackRes = await cache.match(keyReq);
              if (fallbackRes) return fallbackRes;
            }
          }
        }

        return new Response(
          '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>離線模式 - Jo Travel Hub</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}.card{background:#1e293b;border:1px solid #334155;border-radius:20px;padding:28px;max-width:360px}h2{margin:0 0 12px;font-size:18px;color:#fbbf24}p{margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.6}a{display:inline-block;background:#fbbf24;color:#0f172a;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:12px;font-size:14px}</style></head><body><div class="card"><h2>目前處於離線狀態</h2><p>此頁面尚未在有網路時開啟過。請返回已快取的旅程頁面或首頁查看。</p><a href="/">返回首頁</a></div></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      })
    );
  }
});
