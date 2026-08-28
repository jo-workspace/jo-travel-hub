'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ItineraryItem } from '@/types/trip';
import { getTodayDayLabel } from '@/lib/tripDate';
import { MapPin, ExternalLink, Plus, CheckCircle2, Circle, Edit3, List, Map as MapIcon, Bookmark } from 'lucide-react';
import { WeatherIcon } from '@/components/WeatherIcon';
import {
  getCityForDay,
  getUniqueCities,
  fetchWeatherForCity,
  CityWeatherData,
  DayWeatherInfo,
} from '@/lib/weather';

const ItineraryMap = dynamic(
  () => import('@/components/ItineraryMap').then((mod) => mod.ItineraryMap),
  { ssr: false }
);

interface ItineraryTabProps {
  data: ItineraryItem[];
  tripNote?: string;
  hideVisited: boolean;
  startDate?: string; // YYYY-MM-DD，旅程起始日
  timezone?: string; // 旅程目的地時區（IANA），用來判斷「今天」是第幾天
  citySchedule?: string; // 跨城市天數排程，例如 Day 1-3: Los Angeles, Day 4-5: Las Vegas
  onToggleVisited: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: ItineraryItem, initialDay?: string) => void;
  onOpenLightbox: (imageUrl: string) => void;
  onSwapItemTimes?: (itemA: ItineraryItem, itemB: ItineraryItem) => Promise<void>;
  onBatchUpdateTimes?: (updates: Array<{ rowIndex: number; time: string }>) => Promise<void>;
}

const ICON_MAPPING: Record<string, string> = {
  '景點': '📍',
  '美食': '🍔',
  '購物': '🛒',
  '交通': '🚗',
  '住宿': '🏨',
  '球場': '⚾',
  '娛樂': '🎡',
  '機票': '✈️',
  '其他': '📌',
};

// 由 startDate (YYYY-MM-DD) + Day N 計算出日期字串，例如 "8/28 Thu"
function calcDateFromStartDate(startDateStr: string, dayLabel: string): string {
  if (!startDateStr) return '';
  const dayNum = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);
  if (isNaN(dayNum)) return '';
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return '';
  const target = new Date(start);
  target.setDate(target.getDate() + dayNum - 1);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${target.getMonth() + 1}/${target.getDate()} ${weekdays[target.getDay()]}`;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const t = timeStr.trim();
  if (!t) return null;

  let h: number | null = null;
  let m = 0;

  const matchColon = t.match(/(\d{1,2})[:：](\d{2})/);
  if (matchColon) {
    h = parseInt(matchColon[1], 10);
    m = parseInt(matchColon[2], 10);
  } else {
    const matchHour = t.match(/(\d{1,2})\s*(?:點|点|時|时|h|H)/);
    if (matchHour) {
      h = parseInt(matchHour[1], 10);
      m = 0;
    }
  }

  if (h === null || isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;

  const isPM = /pm|下午|晚上|傍晚/i.test(t);
  const isAM = /am|上午|早上|清晨/i.test(t);

  if (isPM && h < 12) {
    h += 12;
  } else if (isAM && h === 12) {
    h = 0;
  }

  return h * 60 + m;
}

export function sortItineraryItems(a: ItineraryItem, b: ItineraryItem): number {
  const numA = parseInt((a.day || '').replace(/[^0-9]/g, ''), 10) || 999;
  const numB = parseInt((b.day || '').replace(/[^0-9]/g, ''), 10) || 999;
  if (numA !== numB) return numA - numB;

  const minA = parseTimeToMinutes(a.time);
  const minB = parseTimeToMinutes(b.time);

  if (minA !== null && minB !== null) {
    if (minA !== minB) return minA - minB;
  } else if (minA !== null && minB === null) {
    return -1;
  } else if (minA === null && minB !== null) {
    return 1;
  }

  const timeA = (a.time || '').trim();
  const timeB = (b.time || '').trim();
  if (timeA && timeB) {
    const lexCompare = timeA.localeCompare(timeB, 'zh-Hant');
    if (lexCompare !== 0) return lexCompare;
  } else if (timeA) {
    return -1;
  } else if (timeB) {
    return 1;
  }

  return (a.rowIndex || 0) - (b.rowIndex || 0);
}

export const ItineraryTab: React.FC<ItineraryTabProps> = ({
  data,
  tripNote,
  hideVisited,
  startDate,
  timezone,
  citySchedule,
  onToggleVisited,
  onOpenModal,
  onSwapItemTimes,
  onBatchUpdateTimes,
}) => {
  const [weatherMap, setWeatherMap] = useState<Record<string, CityWeatherData>>({});

  useEffect(() => {
    const cities = getUniqueCities(citySchedule);
    if (cities.length === 0) return;

    const loadWeather = async () => {
      const results: Record<string, CityWeatherData> = {};
      for (const city of cities) {
        const wData = await fetchWeatherForCity(city);
        if (wData) results[city.toLowerCase()] = wData;
      }
      setWeatherMap(results);
    };

    loadWeather();
  }, [citySchedule]);

  // Sort items by Day and Time
  const sortedItems = [...data].sort(sortItineraryItems);

  // Extract unique days
  const days = Array.from(new Set(sortedItems.map((item) => item.day))).filter(Boolean);

  // Sort days logically (Day 1, Day 2...)
  days.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, '')) || 999;
    const numB = parseInt(b.replace(/[^0-9]/g, '')) || 999;
    return numA - numB;
  });

  const [selectedDay, setSelectedDay] = useState<string>(
    () => getTodayDayLabel(startDate || '', timezone || '', days) ?? 'ALL'
  );
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const mapAnchorRef = useRef<HTMLDivElement>(null);

  const handleSwitchViewMode = (mode: 'list' | 'map') => {
    setViewMode(mode);
    if (mode === 'map') {
      // 微延遲確保地圖 DOM 掛載後平滑滾動對齊
      setTimeout(() => {
        mapAnchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 60);
    }
  };

  // Filter items
  const filteredItems = sortedItems.filter((item) => {
    if (hideVisited && item.isVisited) return false;
    if (selectedDay !== 'ALL' && item.day !== selectedDay) return false;
    return true;
  });

  // Group by day for display
  const groupedByDay: Record<string, ItineraryItem[]> = {};
  filteredItems.forEach((item) => {
    const dayKey = item.day || '未定日期';
    if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
    groupedByDay[dayKey].push(item);
  });

  // Ensure items within each group are explicitly sorted by time
  Object.keys(groupedByDay).forEach((dayKey) => {
    groupedByDay[dayKey].sort(sortItineraryItems);
  });

  // 渲染順序依照已排序的 days，而非物件的插入順序；例外 key（如未定日期）排在最後
  const orderedDayKeys = [
    ...days.filter((d) => groupedByDay[d]),
    ...Object.keys(groupedByDay).filter((d) => !days.includes(d)),
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Trip Note Alert Banner */}
      {tripNote && (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-sm border-l-4 border-amber-400">
          <div className="text-xs font-bold uppercase text-amber-400 mb-1.5 flex items-center space-x-1.5">
            <span>📢</span>
            <span>行程重要備註</span>
          </div>
          <div className="text-sm font-medium leading-relaxed font-sans text-slate-200 whitespace-pre-line">
            {tripNote.replace(/<br\s*\/?>/gi, '\n')}
          </div>
        </div>
      )}

      {/* Day Filter, Add Button & View Mode Switch Bar */}
      <div className="flex items-center justify-between gap-2 py-1 sticky top-[57px] md:top-0 bg-slate-50/90 backdrop-blur-md z-30">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <button
            onClick={() => onOpenModal(undefined, selectedDay !== 'ALL' ? selectedDay : undefined)}
            className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer select-none whitespace-nowrap shadow-xs transition-all active:scale-95 flex items-center space-x-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增行程</span>
          </button>

          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
              selectedDay === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            全部天數
          </button>

          {days.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle: Pure SVG List / Map Toggle */}
        <div className="flex items-center bg-white border border-slate-200/90 p-0.5 rounded-full flex-shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => handleSwitchViewMode('list')}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="清單列表"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSwitchViewMode('map')}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="跨天地圖"
          >
            <MapIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map View Mode with Anchor Target */}
      {viewMode === 'map' && (
        <div ref={mapAnchorRef} className="scroll-mt-20 md:scroll-mt-6">
          <ItineraryMap
            items={data}
            days={days}
            selectedDay={selectedDay}
            citySchedule={citySchedule}
            onSelectDay={setSelectedDay}
            onOpenItemModal={onOpenModal}
            onSwapItemTimes={onSwapItemTimes}
            onBatchUpdateTimes={onBatchUpdateTimes}
          />
        </div>
      )}

      {/* List View Mode */}
      {viewMode === 'list' && (
        <>
          {/* Empty State */}
          {Object.keys(groupedByDay).length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              目前沒有行程資料 📍
            </div>
          )}

          {/* Itinerary Cards Grouped by Day */}
          {orderedDayKeys.map((day) => {
            const items = groupedByDay[day];
            // 優先使用計算出來的日期，其次用資料本身的 date 欄位
            const dateText = startDate
              ? calcDateFromStartDate(startDate, day)
              : (items[0]?.date || '');

        const dayCity = getCityForDay(day, citySchedule);
        const cityWeather = dayCity ? weatherMap[dayCity.toLowerCase()] : undefined;

        // 依據 startDate + day 計算西元 YYYY-MM-DD
        let dayWeather: DayWeatherInfo | undefined;
        if (cityWeather) {
          let targetDateStr = '';
          if (startDate) {
            const dayNum = parseInt(day.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(dayNum)) {
              const start = new Date(startDate);
              if (!isNaN(start.getTime())) {
                const target = new Date(start);
                target.setDate(target.getDate() + dayNum - 1);
                const y = target.getFullYear();
                const m = String(target.getMonth() + 1).padStart(2, '0');
                const d = String(target.getDate()).padStart(2, '0');
                targetDateStr = `${y}-${m}-${d}`;
              }
            }
          }

          if (targetDateStr) {
            dayWeather = cityWeather.daily.find((d) => d.dateStr === targetDateStr);
          }

          if (!dayWeather && cityWeather.daily.length > 0) {
            dayWeather = cityWeather.daily[0];
          }
        }

        return (
          <div key={day} className="space-y-3">
            {/* Day Section Header */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-extrabold bg-slate-900 text-white px-3 py-1 rounded-full select-none shadow-xs">
                  {day}
                </span>
                {dateText && (
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {dateText}
                  </span>
                )}
                {dayCity && (
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {dayCity}
                  </span>
                )}
              </div>

              {/* Day Weather Capsule */}
              {dayWeather && (
                <div
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs select-none"
                  title={`${dayCity || ''} ${dayWeather.tempMin}°C ~ ${dayWeather.tempMax}°C`}
                >
                  <WeatherIcon code={dayWeather.weatherCode} className="w-3.5 h-3.5" />
                  <span className="font-mono text-slate-900">{dayWeather.tempMax}° / {dayWeather.tempMin}°</span>
                  {dayWeather.precipitationProbability > 0 && (
                    <span className="text-[10px] text-sky-600 font-mono font-bold">
                      {dayWeather.precipitationProbability}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 分割：有指定時間的主行程 vs 未指定時間的口袋候選名單 */}
            {(() => {
              const isCandidate = (item: ItineraryItem) =>
                !item.time ||
                !item.time.trim() ||
                /候選|備選|口袋|彈性|wishlist|candidate/i.test(item.time);
              const mainItems = items.filter((item) => !isCandidate(item));
              const candidateItems = items.filter((item) => isCandidate(item));

              return (
                <div className="space-y-3">
                  {/* 主要排程卡片網格 */}
                  {mainItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mainItems.map((item) => {
                        const emoji = ICON_MAPPING[item.type] || '📍';
                        return (
                          <div
                            key={item.rowIndex}
                            className={`bg-white border rounded-2xl p-4 flex justify-between items-start transition-all duration-200 ${
                              item.isVisited
                                ? 'border-slate-100 opacity-40 bg-slate-50'
                                : 'border-slate-100/90 shadow-2xs hover:shadow-xs hover:border-slate-200'
                            }`}
                          >
                            <div className="flex-1 pr-3 min-w-0">
                              <div className="flex items-start space-x-2.5">
                                <span className="text-xl leading-none mt-0.5 select-none">{emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                                    {item.time && (
                                      <span className="text-xs font-semibold text-slate-400 font-mono">
                                        {item.time}
                                      </span>
                                    )}
                                    <h3
                                      className={`text-base font-extrabold text-slate-900 leading-tight ${
                                        item.isVisited ? 'line-through text-slate-400' : ''
                                      }`}
                                    >
                                      {item.title}
                                    </h3>
                                    {item.links && (
                                      <a
                                        href={item.links}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sky-600 hover:text-sky-700 transition-transform active:scale-95 ml-0.5"
                                        title="開啟 Google 地圖"
                                      >
                                        <MapPin className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                  {item.content && (
                                    <div className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium whitespace-pre-line">
                                      {item.content.replace(/<br\s*\/?>/gi, '\n')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Actions (Toggle Done & Edit) */}
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                onClick={() => onOpenModal(item)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90"
                                title="編輯"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onToggleVisited(item.rowIndex, item.isVisited)}
                                className="text-slate-400 hover:text-slate-800 transition-transform active:scale-90 cursor-pointer"
                                title={item.isVisited ? '標示為未去過' : '標示為已完成'}
                              >
                                {item.isVisited ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium py-3 px-4 bg-white/60 rounded-xl border border-dashed border-slate-200">
                      今日尚無指定時間的主行程，可從下方口袋名單彈性挑選 📍
                    </div>
                  )}

                  {/* 當日口袋候選清爽小列表 */}
                  {candidateItems.length > 0 && (
                    <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center space-x-1.5 text-xs font-black text-slate-700">
                          <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>當日口袋候選 ({candidateItems.length})</span>
                          <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
                            · 未填時間，彈性備選
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {candidateItems.map((cItem) => {
                          const cEmoji = ICON_MAPPING[cItem.type] || '📍';
                          return (
                            <div
                              key={cItem.rowIndex}
                              className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all"
                            >
                              <div className="flex items-center space-x-2 min-w-0 pr-2">
                                <span className="text-base flex-shrink-0 select-none leading-none">
                                  {cEmoji}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                      {cItem.title}
                                    </h4>
                                    {cItem.links && (
                                      <a
                                        href={cItem.links}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sky-600 hover:text-sky-700 flex-shrink-0"
                                        title="開啟 Google 地圖"
                                      >
                                        <MapPin className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                  {cItem.content && (
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                      {cItem.content}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onOpenModal(cItem)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-all cursor-pointer"
                                  title="填入時間排入主行程或修改備註"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}
        </>
      )}
    </div>
  );
};
