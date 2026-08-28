import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 發送請求取得重定向目標網址
    let resolvedUrl = targetUrl;
    let placeName = '';

    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const location = res.headers.get('location');
    if (location) {
      resolvedUrl = location;
    }

    // 1. 從重定向 URL 中提取經緯度 (/@37.7904,-122.4056)
    const atMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return NextResponse.json({
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
        resolvedUrl,
      });
    }

    // 2. 從 query 參數提取 q=The+Orchard+Garden+Hotel
    const qMatch = resolvedUrl.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const rawQuery = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      placeName = rawQuery.replace(/美國|USA/gi, '').trim();

      // 檢查 q 參數是否直接就是經緯度 "37.7904,-122.4056"
      const coordsMatch = placeName.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordsMatch) {
        return NextResponse.json({
          lat: parseFloat(coordsMatch[1]),
          lng: parseFloat(coordsMatch[2]),
          resolvedUrl,
          placeName,
        });
      }

      // 若為地點名稱，透過 Photon Geocoding 查詢真實座標
      try {
        const geoRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&limit=1`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.features && geoData.features.length > 0) {
            const [lng, lat] = geoData.features[0].geometry.coordinates;
            return NextResponse.json({
              lat,
              lng,
              resolvedUrl,
              placeName,
            });
          }
        }
      } catch {}
    }

    return NextResponse.json({
      resolvedUrl,
      placeName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
