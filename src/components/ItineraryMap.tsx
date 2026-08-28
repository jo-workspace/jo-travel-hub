'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ItineraryItem } from '@/types/trip';
import { getCoordinatesSync, searchSpotCoordinates, getDayColor, GeoLocation } from '@/lib/geo';
import { getCityForDay } from '@/lib/weather';
import { MapPin, Navigation } from 'lucide-react';
import type * as LeafletType from 'leaflet';

interface ItineraryMapProps {
  items: ItineraryItem[];
  days: string[];
  selectedDay: string;
  citySchedule?: string;
  onSelectDay: (day: string) => void;
  onOpenItemModal?: (item: ItineraryItem) => void;
}

interface ProcessedSpot {
  item: ItineraryItem;
  coords: GeoLocation;
  dayLabel: string;
  stepIndex: number;
  isExact: boolean;
  dayColor: { bg: string; text: string; hex: string };
}

export const ItineraryMap: React.FC<ItineraryMapProps> = ({
  items,
  days,
  selectedDay,
  citySchedule,
  onSelectDay,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ProcessedSpot | null>(null);
  const [exactCoordsOverrides, setExactCoordsOverrides] = useState<Record<string, GeoLocation>>({});

  // 初始化 activeDays：若 selectedDay 為 ALL 則預設只選第 1 天（避免 50+ 景點擠爆），若為特定天則選該天
  useEffect(() => {
    if (selectedDay === 'ALL') {
      setActiveDays(days.length > 0 ? [days[0]] : []);
    } else if (selectedDay) {
      setActiveDays([selectedDay]);
    } else {
      setActiveDays([]);
    }
  }, [selectedDay, days]);

  // 解析所有景點的座標與序號
  const processedSpots = useMemo(() => {
    const dayCounter: Record<string, number> = {};
    const spots: ProcessedSpot[] = [];

    // 按天數與時間排序
    const sorted = [...items].sort((a, b) => {
      const dayA = a.day || '';
      const dayB = b.day || '';
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      return (a.time || '').localeCompare(b.time || '');
    });

    sorted.forEach((item, idx) => {
      const dayLabel = item.day || '未定日期';
      const dayCity = getCityForDay(dayLabel, citySchedule);
      const itemKey = `${item.title}_${item.day}`;

      let coords: GeoLocation;
      let isExact = false;

      if (exactCoordsOverrides[itemKey]) {
        coords = exactCoordsOverrides[itemKey];
        isExact = true;
      } else {
        const syncResult = getCoordinatesSync(item, dayCity, idx);
        coords = syncResult.coords;
        isExact = syncResult.isExact;
      }

      dayCounter[dayLabel] = (dayCounter[dayLabel] || 0) + 1;
      spots.push({
        item,
        coords,
        dayLabel,
        stepIndex: dayCounter[dayLabel],
        isExact,
        dayColor: getDayColor(dayLabel),
      });
    });

    return spots;
  }, [items, citySchedule, exactCoordsOverrides]);

  // 背景非同步精準搜尋尚未 exact 的景點座標
  useEffect(() => {
    let isCancelled = false;

    const fetchMissingCoordinates = async () => {
      const nonExactSpots = processedSpots.filter((s) => !s.isExact);
      for (const spot of nonExactSpots) {
        if (isCancelled) break;
        const itemKey = `${spot.item.title}_${spot.item.day}`;
        if (exactCoordsOverrides[itemKey]) continue;

        const dayCity = getCityForDay(spot.dayLabel, citySchedule);
        const fetched = await searchSpotCoordinates(spot.item.title, dayCity);

        if (fetched && !isCancelled) {
          setExactCoordsOverrides((prev) => ({
            ...prev,
            [itemKey]: fetched,
          }));
        }
      }
    };

    if (processedSpots.length > 0) {
      fetchMissingCoordinates();
    }

    return () => {
      isCancelled = true;
    };
  }, [processedSpots, citySchedule, exactCoordsOverrides]);

  // 篩選當前 activeDays 要顯示的點
  const visibleSpots = useMemo(() => {
    return processedSpots.filter((spot) => activeDays.includes(spot.dayLabel));
  }, [processedSpots, activeDays]);

  // 動態載入 Leaflet 與注入 CSS
  useEffect(() => {
    let isMounted = true;
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (isMounted) {
        (window as any).L = L;
        setLeafletLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 初始化地圖容器（使用 Esri 高清免費無浮水印圖資）
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L as typeof LeafletType;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = [37.7749, -122.4194]; // San Francisco
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &mdash; World Street Map',
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      polylinesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // 重新渲染圖釘與連線
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L = (window as any).L as typeof LeafletType;
    if (!L) return;

    const markersLayer = markersLayerRef.current;
    const polylinesLayer = polylinesLayerRef.current;
    if (!markersLayer || !polylinesLayer) return;

    markersLayer.clearLayers();
    polylinesLayer.clearLayers();

    if (visibleSpots.length === 0) return;

    const bounds = L.latLngBounds([]);

    // 1. 各天路線連線 (Polyline)
    const spotsByDay: Record<string, ProcessedSpot[]> = {};
    visibleSpots.forEach((spot) => {
      if (!spotsByDay[spot.dayLabel]) spotsByDay[spot.dayLabel] = [];
      spotsByDay[spot.dayLabel].push(spot);
    });

    Object.entries(spotsByDay).forEach(([day, spots]) => {
      if (spots.length > 1) {
        const latlngs = spots.map((s) => [s.coords.lat, s.coords.lng] as [number, number]);
        const colorHex = spots[0].dayColor.hex;

        L.polyline(latlngs, {
          color: colorHex,
          weight: 3,
          opacity: 0.7,
          dashArray: '6, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(polylinesLayer);
      }
    });

    // 2. 建立純向量 SVG 圖釘標記
    visibleSpots.forEach((spot) => {
      const latlng: [number, number] = [spot.coords.lat, spot.coords.lng];
      bounds.extend(latlng);

      const markerHtml = `
        <div style="
          background-color: ${spot.dayColor.hex};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          border: 2.5px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transform: translate(-50%, -50%);
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          ${spot.stepIndex}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(latlng, { icon: customIcon }).addTo(markersLayer);

      marker.on('click', () => {
        setSelectedSpot(spot);
        mapInstanceRef.current?.panTo(latlng, { animate: true });
      });
    });

    // 自動適配視野
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [visibleSpots, leafletLoaded]);

  const handleToggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      // 取消選取該天
      const next = activeDays.filter((d) => d !== day);
      setActiveDays(next);
      if (next.length === 1) {
        onSelectDay(next[0]);
      } else if (next.length === 0) {
        onSelectDay('');
      }
    } else {
      // 加入選取該天
      const next = [...activeDays, day];
      setActiveDays(next);
      if (next.length === days.length) {
        onSelectDay('ALL');
      } else if (next.length === 1) {
        onSelectDay(next[0]);
      }
    }
  };

  const handleSelectAll = () => {
    if (activeDays.length === days.length) {
      // 若目前已全選，點擊「全部天數」➜ 一鍵清空（全部取消選取）！
      setActiveDays([]);
      onSelectDay('');
    } else {
      // 若目前未全選，點擊「全部天數」➜ 一鍵全選！
      setActiveDays(days);
      onSelectDay('ALL');
    }
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] md:h-[75vh] rounded-3xl overflow-hidden border border-slate-200/80 shadow-md flex flex-col bg-slate-50 animate-fade-in">
      {/* 頂部天數切換篩選膠囊列 */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
        <button
          type="button"
          onClick={handleSelectAll}
          className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
            activeDays.length === days.length
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          全部天數 ({processedSpots.length})
        </button>

        {days.map((day) => {
          const daySpots = processedSpots.filter((s) => s.dayLabel === day);
          const isSelected = activeDays.includes(day);
          const color = getDayColor(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleToggleDay(day)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex-shrink-0 flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <span>{day}</span>
              <span className="text-[10px] opacity-75 font-normal">({daySpots.length})</span>
            </button>
          );
        })}
      </div>

      {/* 地圖容器 */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 點擊景點卡片預覽 */}
      {selectedSpot ? (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl space-y-2.5 animate-scale-up">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedSpot.dayColor.hex }}
              >
                {selectedSpot.stepIndex}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block truncate">
                  {selectedSpot.dayLabel} {selectedSpot.item.time ? `· ${selectedSpot.item.time}` : ''}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 truncate">
                  {selectedSpot.item.title}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSpot(null)}
              className="text-slate-400 hover:text-slate-700 p-1 text-xs rounded-full hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          {selectedSpot.item.content && (
            <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2 rounded-xl whitespace-pre-line">
              {selectedSpot.item.content.replace(/<br\s*\/?>/gi, '\n')}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <a
              href={
                selectedSpot.item.links ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedSpot.item.title
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps 導航</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-xs pointer-events-none flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {activeDays.length === 0
              ? '請點選上方天數標籤以在地圖上查看景點'
              : '點擊圖釘查看景點資訊與導航'}
          </span>
        </div>
      )}
    </div>
  );
};
