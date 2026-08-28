'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ItineraryItem } from '@/types/trip';
import {
  getCoordinatesSync,
  searchSpotCoordinates,
  getDayColor,
  GeoLocation,
  optimizeDayRoute,
  RouteOptimizedResult,
} from '@/lib/geo';
import { getCityForDay } from '@/lib/weather';
import { RouteOptimizeModal } from '@/components/modals/RouteOptimizeModal';
import { MapPin, Navigation, Edit3, ArrowUp, ArrowDown, Sparkles, Hotel } from 'lucide-react';
import type * as LeafletType from 'leaflet';

export interface ProcessedSpot {
  item: ItineraryItem;
  coords: GeoLocation;
  dayLabel: string;
  stepIndex: number;
  isExact: boolean;
  dayColor: { bg: string; text: string; hex: string };
}

interface ItineraryMapProps {
  items: ItineraryItem[];
  days: string[];
  selectedDay: string;
  citySchedule?: string;
  onSelectDay: (day: string) => void;
  onOpenItemModal?: (item: ItineraryItem) => void;
  onSwapItemTimes?: (itemA: ItineraryItem, itemB: ItineraryItem) => Promise<void>;
  onBatchUpdateTimes?: (updates: Array<{ rowIndex: number; time: string }>) => Promise<void>;
}

export const ItineraryMap: React.FC<ItineraryMapProps> = ({
  items,
  days,
  selectedDay,
  citySchedule,
  onSelectDay,
  onOpenItemModal,
  onSwapItemTimes,
  onBatchUpdateTimes,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ProcessedSpot | null>(null);
  const [exactCoordsOverrides, setExactCoordsOverrides] = useState<Record<string, GeoLocation>>({});
  const [isSwapping, setIsSwapping] = useState(false);

  // 智慧最佳化路線彈窗狀態
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] =
    useState<RouteOptimizedResult<ProcessedSpot> | null>(null);

  // 初始化 activeDays
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
      const itemKey = `${item.rowIndex}_${item.title}_${item.day}`;

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
        const itemKey = `${spot.item.rowIndex}_${spot.item.title}_${spot.item.day}`;
        if (exactCoordsOverrides[itemKey]) continue;

        const dayCity = getCityForDay(spot.dayLabel, citySchedule);
        const fetched = await searchSpotCoordinates(
          spot.item.title,
          dayCity,
          spot.item.links
        );

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

  // 當前選取天數的景點清單
  const singleDaySpots = useMemo(() => {
    if (activeDays.length !== 1) return [];
    return processedSpots.filter((s) => s.dayLabel === activeDays[0]);
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

  // 初始化地圖容器
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
          weight: 3.5,
          opacity: 0.75,
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

      const isHotel =
        spot.item.type === '住宿' ||
        /hotel|飯店|酒店|旅館|住宿|hostel|airbnb|resort|check-in|check in|drop-off|退房/i.test(
          `${spot.item.title || ''} ${spot.item.content || ''}`
        );

      const hotelSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
          <path d="M8 7h.01"/>
          <path d="M16 7h.01"/>
          <path d="M12 7h.01"/>
          <path d="M12 11h.01"/>
          <path d="M16 11h.01"/>
          <path d="M8 11h.01"/>
          <path d="M10 22v-6.5"/>
          <path d="M14 22v-6.5"/>
        </svg>
      `;

      const markerHtml = `
        <div style="
          background-color: ${spot.dayColor.hex};
          color: white;
          width: 30px;
          height: 30px;
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
          ${isHotel ? hotelSvg : spot.stepIndex}
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
      const next = activeDays.filter((d) => d !== day);
      setActiveDays(next);
      if (next.length === 1) {
        onSelectDay(next[0]);
      } else if (next.length === 0) {
        onSelectDay('');
      }
    } else {
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
      setActiveDays([]);
      onSelectDay('');
    } else {
      setActiveDays(days);
      onSelectDay('ALL');
    }
  };

  // 開啟智慧順路排程預覽
  const handleOpenRouteOptimizer = () => {
    if (singleDaySpots.length < 3) return;
    const res = optimizeDayRoute(singleDaySpots);
    setOptimizationResult(res);
    setOptimizeModalOpen(true);
  };

  // 套用智慧順路排程
  const handleApplyOptimizedRoute = async (optimizedSpots: ProcessedSpot[]) => {
    if (!onBatchUpdateTimes) return;

    // 提取原本所有時間戳列表（按順序）
    const timeList = singleDaySpots.map((s) => s.item.time || '').filter(Boolean);

    // 建立每個景點的新時間更新清單
    const updates = optimizedSpots.map((spot, idx) => {
      const assignedTime = idx < timeList.length ? timeList[idx] : spot.item.time || '';
      return {
        rowIndex: spot.item.rowIndex,
        time: assignedTime,
      };
    });

    await onBatchUpdateTimes(updates);
    setSelectedSpot(null);
  };

  // 快速與上一站或下一站對調時間
  const handleSwapAdjacent = async (direction: 'up' | 'down') => {
    if (!selectedSpot || !onSwapItemTimes) return;
    const sameDaySpots = processedSpots.filter((s) => s.dayLabel === selectedSpot.dayLabel);
    const currentIndex = sameDaySpots.findIndex(
      (s) => s.item.rowIndex === selectedSpot.item.rowIndex
    );

    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameDaySpots.length) return;

    const targetSpot = sameDaySpots[targetIndex];

    try {
      setIsSwapping(true);
      await onSwapItemTimes(selectedSpot.item, targetSpot.item);
      setSelectedSpot(null);
    } catch (err) {
      console.error('Swap times failed:', err);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] md:h-[75vh] rounded-3xl overflow-hidden border border-slate-200/80 shadow-md flex flex-col bg-slate-50 animate-fade-in">
      {/* 頂部天數切換篩選膠囊列 ＆ 順路排程工具按鈕 */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
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

        {/* 智慧順路最佳化按鈕（單日視圖且景點 >= 3 時顯現） */}
        {activeDays.length === 1 && singleDaySpots.length >= 3 && onBatchUpdateTimes && (
          <div className="flex-shrink-0 pl-1 border-l border-slate-150">
            <button
              type="button"
              onClick={handleOpenRouteOptimizer}
              className="px-2.5 py-1.5 text-xs font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
              title="自動計算最順動線，消除交叉折返跑"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span className="hidden sm:inline">順路排程</span>
            </button>
          </div>
        )}
      </div>

      {/* 地圖容器 */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 點擊景點卡片預覽（含編輯與 ⬆️ / ⬇️ 快速調序） */}
      {selectedSpot ? (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-84 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl space-y-2.5 animate-scale-up">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ backgroundColor: selectedSpot.dayColor.hex }}
              >
                {selectedSpot.item.type === '住宿' ||
                /hotel|飯店|酒店|旅館|住宿|hostel|airbnb|resort|check-in|check in|drop-off|退房/i.test(
                  `${selectedSpot.item.title || ''} ${selectedSpot.item.content || ''}`
                ) ? (
                  <Hotel className="w-3.5 h-3.5 text-white" />
                ) : (
                  selectedSpot.stepIndex
                )}
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

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
            {/* 上移 / 下移對調按鈕 */}
            {onSwapItemTimes && (
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => handleSwapAdjacent('up')}
                  disabled={isSwapping || selectedSpot.stepIndex === 1}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                  title="與前一站對調時間順序"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSwapAdjacent('down')}
                  disabled={
                    isSwapping ||
                    selectedSpot.stepIndex ===
                      processedSpots.filter((s) => s.dayLabel === selectedSpot.dayLabel).length
                  }
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all cursor-pointer"
                  title="與後一站對調時間順序"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 編輯行程按鈕 */}
            {onOpenItemModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenItemModal(selectedSpot.item);
                  setSelectedSpot(null);
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                title="修改時間、天數或備註"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>編輯</span>
              </button>
            )}

            {/* Google Maps 導航 */}
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
              <span>導航</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-xs pointer-events-none flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {activeDays.length === 0
              ? '請點選上方天數標籤以在地圖上查看景點'
              : '點擊圖釘查看景點資訊與調序'}
          </span>
        </div>
      )}

      {/* 智慧順路最佳化安全預覽彈窗 */}
      <RouteOptimizeModal
        isOpen={optimizeModalOpen}
        onClose={() => setOptimizeModalOpen(false)}
        dayLabel={activeDays[0] || ''}
        optimizationResult={optimizationResult}
        onApply={handleApplyOptimizedRoute}
      />
    </div>
  );
};
