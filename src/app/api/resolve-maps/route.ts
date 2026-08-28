import { NextRequest, NextResponse } from 'next/server';

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let targetUrl = searchParams.get('url')?.trim();

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // 自動補齊 https:// 前綴
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    let currentUrl = targetUrl;
    let maxRedirects = 5;

    // 手動追蹤 302 重定向直到拿到完整的 Google Maps 長網址
    while (maxRedirects > 0) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const location = res.headers.get('location');
      if (location) {
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
        maxRedirects--;
      } else {
        break;
      }
    }

    const decodedResolvedUrl = decodeURIComponent(currentUrl);

    // 1. 優先從 !3d37.7954425!4d-122.3936136 提取 POI 精準經緯度
    const dataMatch = decodedResolvedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      if (isValidLatLng(lat, lng)) {
        return NextResponse.json({ lat, lng, resolvedUrl: currentUrl });
      }
    }

    // 2. 從 /@37.7974329,-122.4047093 提取視角中心經緯度
    const atMatch = decodedResolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidLatLng(lat, lng)) {
        return NextResponse.json({ lat, lng, resolvedUrl: currentUrl });
      }
    }

    // 3. 從 query 參數提取 q=37.7904,-122.4056 或 q=Place+Name
    let placeName = '';
    const qMatch = decodedResolvedUrl.match(/[?&](?:q|query|destination)=([^&]+)/);
    if (qMatch) {
      const rawQuery = qMatch[1].replace(/\+/g, ' ');
      placeName = rawQuery.replace(/美國|USA/gi, '').trim();

      const coordsMatch = placeName.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        if (isValidLatLng(lat, lng)) {
          return NextResponse.json({ lat, lng, resolvedUrl: currentUrl, placeName });
        }
      }

      // 若為地名，透過 Photon 查詢真實座標
      try {
        const geoRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&limit=1`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.features && geoData.features.length > 0) {
            const [lng, lat] = geoData.features[0].geometry.coordinates;
            if (isValidLatLng(lat, lng)) {
              return NextResponse.json({ lat, lng, resolvedUrl: currentUrl, placeName });
            }
          }
        }
      } catch {}
    }

    // 4. 從 /place/Place+Name/ 提取地名並透過 Photon 查詢
    const placeMatch = decodedResolvedUrl.match(/\/place\/([^/@?]+)/);
    if (placeMatch) {
      placeName = placeMatch[1].replace(/\+/g, ' ').trim();
      try {
        const geoRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&limit=1`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.features && geoData.features.length > 0) {
            const [lng, lat] = geoData.features[0].geometry.coordinates;
            if (isValidLatLng(lat, lng)) {
              return NextResponse.json({ lat, lng, resolvedUrl: currentUrl, placeName });
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({ resolvedUrl: currentUrl, placeName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
