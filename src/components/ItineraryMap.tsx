'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ItineraryItem } from '@/types/trip';
import {
  getCoordinatesSync,
  searchSpotCoordinates,
  getDayColor,
  GeoLocation,
} from '@/lib/geo';
import { getCityForDay } from '@/lib/weather';
import { RouteOptimizeModal } from '@/components/modals/RouteOptimizeModal';
import {
  MapPin,
  Navigation,
  Edit3,
  ArrowUp,
  ArrowDown,
  Wand2,
  Layers,
  Hotel,
  Check,
  Utensils,
  Bookmark,
} from 'lucide-react';
import type * as LeafletType from 'leaflet';

export interface ProcessedSpot {
  item: ItineraryItem;
  coords: GeoLocation;
  dayLabel: string;
  stepIndex: number;
  isExact: boolean;
  isCandidate: boolean;
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

  // 圖層下拉選單開關
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

  // 智慧最佳化路線彈窗狀態
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);

  // 點擊外部自動收合圖層選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layersMenuRef.current && !layersMenuRef.current.contains(e.target as Node)) {
        setLayersMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 同步外部 selectedDay（頂部主要 Bar 單選切換）
  useEffect(() => {
    if (selectedDay === 'ALL') {
      setActiveDays(days);
    } else if (selectedDay) {
      setActiveDays([selectedDay]);
    } else {
      setActiveDays(days.length > 0 ? [days[0]] : []);
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

      const isCandidate =
        !item.time ||
        !item.time.trim() ||
        /候選|備選|口袋|彈性|wishlist|candidate/i.test(item.time);

      if (!isCandidate) {
        dayCounter[dayLabel] = (dayCounter[dayLabel] || 0) + 1;
      }

      spots.push({
        item,
        coords,
        dayLabel,
        stepIndex: isCandidate ? 0 : dayCounter[dayLabel],
        isExact,
        isCandidate,
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

  // 當前選取天數的景點清單（單日排程用，只包含有時間的主行程）
  const singleDaySpots = useMemo(() => {
    if (activeDays.length !== 1) return [];
    return processedSpots.filter((s) => s.dayLabel === activeDays[0] && !s.isCandidate);
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

    // 1. 各天路線連線 (Polyline) —— 排除未指定時間的口袋名單，主動線乾淨俐落！
    const spotsByDay: Record<string, ProcessedSpot[]> = {};
    visibleSpots.forEach((spot) => {
      if (!spotsByDay[spot.dayLabel]) spotsByDay[spot.dayLabel] = [];
      spotsByDay[spot.dayLabel].push(spot);
    });

    Object.entries(spotsByDay).forEach(([day, spots]) => {
      const mainScheduledSpots = spots.filter((s) => !s.isCandidate);
      if (mainScheduledSpots.length > 1) {
        const latlngs = mainScheduledSpots.map((s) => [s.coords.lat, s.coords.lng] as [number, number]);
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

      const isHotel = spot.item.type === '住宿';

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

      const utensilsSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
          <path d="M15 2v19"/>
          <path d="M6 2v19"/>
          <path d="M6 13a4 4 0 0 0 4-4V2"/>
        </svg>
      `;

      const bookmarkSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      `;

      // 決定圖釘內部 SVG 或序號
      let pinContent = '';
      if (isHotel) {
        pinContent = hotelSvg;
      } else if (spot.isCandidate) {
        pinContent = spot.item.type === '美食' ? utensilsSvg : bookmarkSvg;
      } else {
        pinContent = String(spot.stepIndex);
      }

      const markerHtml = `
        <div style="
          background-color: ${spot.dayColor.hex};
          color: white;
          width: ${spot.isCandidate ? '27px' : '30px'};
          height: ${spot.isCandidate ? '27px' : '30px'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          border: ${spot.isCandidate ? '2px dashed white' : '2.5px solid white'};
          box-shadow: ${spot.isCandidate ? '0 2px 6px rgba(0,0,0,0.25)' : '0 4px 10px rgba(0,0,0,0.3)'};
          transform: translate(-50%, -50%);
          cursor: pointer;
          opacity: ${spot.isCandidate ? '0.92' : '1'};
          transition: transform 0.15s ease;
        ">
          ${pinContent}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: markerHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker(latlng, { icon: customIcon }).addTo(markersLayer);

      marker.on('click', () => {
        setSelectedSpot(spot);
        mapInstanceRef.current?.panTo(latlng, { animate: true });
      });
    });

    // 視野適配（頂部無橫條，使用均勻舒適的 padding，100% 零遮擋）
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [visibleSpots, leafletLoaded]);

  // 多選切換天數
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

  const handleSelectAllDays = () => {
    if (activeDays.length === days.length) {
      setActiveDays([]);
      onSelectDay('');
    } else {
      setActiveDays(days);
      onSelectDay('ALL');
    }
  };

  // 套用智慧順路排程（支援鎖定行程保持原時間）
  const handleApplyOptimizedRoute = async (
    optimizedSpots: ProcessedSpot[],
    lockedRowIndexes: number[]
  ) => {
    if (!onBatchUpdateTimes) return;

    // 只提取未鎖定景點的原有時間列表
    const flexibleOriginalTimes = singleDaySpots
      .filter((s) => !lockedRowIndexes.includes(s.item.rowIndex))
      .map((s) => s.item.time || '')
      .filter(Boolean);

    let timeIdx = 0;
    const updates: Array<{ rowIndex: number; time: string }> = [];

    optimizedSpots.forEach((spot) => {
      if (lockedRowIndexes.includes(spot.item.rowIndex)) {
        // 鎖定行程：維持原時間，不發送更新
        return;
      }
      const assignedTime =
        timeIdx < flexibleOriginalTimes.length
          ? flexibleOriginalTimes[timeIdx]
          : spot.item.time || '';
      timeIdx++;

      updates.push({
        rowIndex: spot.item.rowIndex,
        time: assignedTime,
      });
    });

    if (updates.length > 0) {
      await onBatchUpdateTimes(updates);
    }
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
      {/* 地圖右上角純向量 SVG 工具按鈕群（無中文字） */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center space-x-2">
        {/* 魔法棒順路排程（單日且景點 >= 3 時顯現，純 SVG） */}
        {activeDays.length === 1 && singleDaySpots.length >= 3 && onBatchUpdateTimes && (
          <button
            type="button"
            onClick={() => setOptimizeModalOpen(true)}
            className="p-2 text-amber-700 bg-white/95 hover:bg-amber-50 backdrop-blur-md border border-amber-200/90 active:scale-95 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center"
            title="魔法棒：自動計算最順動線"
          >
            <Wand2 className="w-4 h-4 text-amber-500 fill-amber-300" />
          </button>
        )}

        {/* 圖層天數多選按鈕（純 SVG） */}
        <div className="relative" ref={layersMenuRef}>
          <button
            type="button"
            onClick={() => setLayersMenuOpen((prev) => !prev)}
            className={`p-2 rounded-2xl border backdrop-blur-md shadow-md transition-all cursor-pointer flex items-center justify-center relative ${
              layersMenuOpen || activeDays.length > 1
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                : 'bg-white/95 text-slate-700 hover:bg-slate-100 border-slate-200/90'
            }`}
            title="圖層多選：自由勾選跨天天數"
          >
            <Layers className="w-4 h-4" />
            {activeDays.length > 0 && activeDays.length < days.length && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                {activeDays.length}
              </span>
            )}
          </button>

          {/* 圖層天數複選下拉抽屜面板 */}
          {layersMenuOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-3 space-y-2.5 animate-scale-up z-[1100]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  跨天多選比對
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {activeDays.length === days.length ? '全部取消' : '全部選取'}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
                {days.map((day) => {
                  const daySpots = processedSpots.filter((s) => s.dayLabel === day);
                  const isSelected = activeDays.includes(day);
                  const color = getDayColor(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="truncate">{day}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({daySpots.length})
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
                {selectedSpot.item.type === '住宿' ? (
                  <Hotel className="w-3.5 h-3.5 text-white" />
                ) : selectedSpot.isCandidate ? (
                  selectedSpot.item.type === '美食' ? (
                    <Utensils className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5 text-white" />
                  )
                ) : (
                  selectedSpot.stepIndex
                )}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block truncate">
                  {selectedSpot.dayLabel}
                  {selectedSpot.isCandidate
                    ? ' · 📌 口袋候選'
                    : selectedSpot.item.time
                    ? ` · ${selectedSpot.item.time}`
                    : ''}
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
              ? '請點選上方天數以在地圖上查看景點'
              : '點擊圖釘查看景點資訊與調序'}
          </span>
        </div>
      )}

      {/* 智慧順路最佳化安全預覽彈窗 */}
      <RouteOptimizeModal
        isOpen={optimizeModalOpen}
        onClose={() => setOptimizeModalOpen(false)}
        dayLabel={activeDays[0] || ''}
        initialSpots={singleDaySpots}
        onApply={handleApplyOptimizedRoute}
      />
    </div>
  );
};
