'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PackingItem, ItineraryItem } from '@/types/trip';
import { Plus, Edit3, Copy, Download, CornerDownLeft, Thermometer } from 'lucide-react';
import { fetchWeatherForCity, getCityForDay, CityWeatherData } from '@/lib/weather';
import { WeatherGuideModal, DayWeatherGuideItem } from '@/components/modals/WeatherGuideModal';

interface PackingTabProps {
  data: PackingItem[];
  hidePacked: boolean;
  citySchedule?: string;
  startDate?: string;
  tripTitle?: string;
  itinerary?: ItineraryItem[];
  onTogglePacking: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: PackingItem, defaultPerson?: string, defaultCategory?: string, defaultLocation?: string) => void;
  onOpenImportModal?: () => void;
  onQuickAdd: (newItem: { item: string; category: string; person: string; location: string }) => Promise<void>;
}

const stripEmoji = (str: string) =>
  str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|\p{Extended_Pictographic}/gu, '').trim();

const ALL_CATEGORIES = '全類別';
const ALL_PERSONS = '全人員';
const ALL_LOCATIONS = '全位置';

export const PackingTab: React.FC<PackingTabProps> = ({
  data,
  hidePacked,
  citySchedule,
  startDate,
  tripTitle,
  itinerary = [],
  onTogglePacking,
  onOpenModal,
  onOpenImportModal,
  onQuickAdd,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [selectedPerson, setSelectedPerson] = useState<string>(ALL_PERSONS);
  const [selectedLocation, setSelectedLocation] = useState<string>(ALL_LOCATIONS);

  const [quickItemName, setQuickItemName] = useState('');
  const [showCategoryError, setShowCategoryError] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [weatherGuideOpen, setWeatherGuideOpen] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // 精準依照行程天數與出發日期計算逐日穿著與全景氣溫
  const [dailyGuideItems, setDailyGuideItems] = useState<DayWeatherGuideItem[]>([]);
  const [overallMin, setOverallMin] = useState(999);
  const [overallMax, setOverallMax] = useState(-999);
  const [overallAdvice, setOverallAdvice] = useState('');

  useEffect(() => {
    if (!itinerary || itinerary.length === 0) return;

    const days = Array.from(new Set(itinerary.map((i) => i.day))).filter(Boolean);
    days.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '')) || 999;
      const numB = parseInt(b.replace(/[^0-9]/g, '')) || 999;
      return numA - numB;
    });

    const loadGuides = async () => {
      const citySet = new Set<string>();
      days.forEach((d) => {
        const city = getCityForDay(d, citySchedule);
        if (city) citySet.add(city);
      });

      const weatherCache: Record<string, CityWeatherData> = {};
      for (const city of Array.from(citySet)) {
        const w = await fetchWeatherForCity(city);
        if (w) weatherCache[city.toLowerCase()] = w;
      }

      const guides: DayWeatherGuideItem[] = [];
      let minVal = 999;
      let maxVal = -999;

      days.forEach((dayLabel) => {
        const cityName = getCityForDay(dayLabel, citySchedule, '主要城市');
        const cWeather = weatherCache[cityName.toLowerCase()];

        let dateDisplay = '';
        let targetIso = '';

        if (startDate) {
          const dayNum = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(dayNum)) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              const target = new Date(start);
              target.setDate(target.getDate() + dayNum - 1);
              const m = target.getMonth() + 1;
              const d = target.getDate();
              const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
              dateDisplay = `${m}/${d} (${weekdays[target.getDay()]})`;
              const yStr = target.getFullYear();
              const mStr = String(m).padStart(2, '0');
              const dStr = String(d).padStart(2, '0');
              targetIso = `${yStr}-${mStr}-${dStr}`;
            }
          }
        }

        let dayW = cWeather?.daily.find((d) => d.dateStr === targetIso);
        if (!dayW && cWeather && cWeather.daily.length > 0) {
          dayW = cWeather.daily[0];
        }

        const tMax = dayW ? dayW.tempMax : 24;
        const tMin = dayW ? dayW.tempMin : 16;
        const code = dayW ? dayW.weatherCode : 0;
        const precip = dayW ? dayW.precipitationProbability : 0;

        if (dayW) {
          if (tMin < minVal) minVal = tMin;
          if (tMax > maxVal) maxVal = tMax;
        }

        let dayAdvice = '早晚舒適';
        if (tMax - tMin >= 14) {
          dayAdvice = `日夜溫差達 ${tMax - tMin}°C，務必備薄外套`;
        } else if (tMax >= 30) {
          dayAdvice = '炎熱高溫，建議防曬短袖';
        } else if (tMin <= 14) {
          dayAdvice = '氣溫偏涼，建議穿著長袖外套';
        }

        guides.push({
          dayLabel,
          dateStr: dateDisplay,
          cityName,
          tempMax: tMax,
          tempMin: tMin,
          weatherCode: code,
          precipitationProbability: precip,
          advice: dayAdvice,
        });
      });

      setDailyGuideItems(guides);
      setOverallMin(minVal);
      setOverallMax(maxVal);

      let advice = '早晚溫差適中，建議洋蔥式穿搭';
      if (maxVal - minVal >= 15) {
        advice = `跨城市溫差達 ${maxVal - minVal}°C（最低 ${minVal}°C / 最高 ${maxVal}°C），建議同時備齊保暖外套與透氣防曬衣物`;
      } else if (maxVal >= 30) {
        advice = '全旅程多為高溫炎熱天候，建議透氣短袖與防曬裝備';
      } else if (minVal <= 14) {
        advice = '全旅程氣溫偏涼冷，建議保暖外套與長袖衣物';
      }
      setOverallAdvice(advice);
    };

    loadGuides();
  }, [itinerary, citySchedule, startDate]);

  // Listen to window scroll to collapse header into single horizontal scroll row
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Custom sorting order for Categories, Persons and Locations
  const PREFERRED_CATEGORY_ORDER = ['證件', '重要證件', '衣物', '3C', '藥品', '盥洗', '美妝盥洗'];
  const PREFERRED_PERSON_ORDER = ['Jo', 'Will', '公用', '特特'];
  const PREFERRED_LOCATION_ORDER = ['託運', '托運', '手提', '隨身', '穿著'];

  // Extract unique categories (strictly from existing data)
  const categorySet = new Set<string>();
  data.forEach((item) => {
    if (item.category) {
      const trimmed = stripEmoji(item.category);
      if (trimmed) categorySet.add(trimmed);
    }
  });

  const categoryList = [ALL_CATEGORIES, ...Array.from(categorySet).sort((a, b) => {
    const idxA = PREFERRED_CATEGORY_ORDER.indexOf(a);
    const idxB = PREFERRED_CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  })];

  // Auto-reset category selection if the active category was deleted/renamed
  useEffect(() => {
    if (selectedCategory !== ALL_CATEGORIES && !categoryList.includes(selectedCategory)) {
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [categoryList, selectedCategory]);

  // Extract unique persons
  const personSet = new Set<string>();
  data.forEach((item) => {
    if (item.person) {
      item.person.split(/[\n,，]+/).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed) personSet.add(trimmed);
      });
    }
  });
  const personList = [ALL_PERSONS, ...Array.from(personSet).sort((a, b) => {
    const idxA = PREFERRED_PERSON_ORDER.indexOf(a);
    const idxB = PREFERRED_PERSON_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  })];

  // Extract unique locations
  const locationSet = new Set<string>();
  data.forEach((item) => {
    if (item.location) {
      const trimmed = stripEmoji(item.location);
      if (trimmed) locationSet.add(trimmed);
    }
  });
  const locationList = [ALL_LOCATIONS, ...Array.from(locationSet).sort((a, b) => {
    const idxA = PREFERRED_LOCATION_ORDER.indexOf(a);
    const idxB = PREFERRED_LOCATION_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  })];

  const hasMultiplePersons = personSet.size > 1;

  // Group items by category after filters
  const groupedByCategory: Record<string, PackingItem[]> = {};
  data.forEach((item) => {
    if (hidePacked && item.isPacked) return;

    const cleanCat = item.category ? stripEmoji(item.category) : '其他';
    if (selectedCategory !== ALL_CATEGORIES) {
      if (cleanCat !== selectedCategory) return;
    }

    if (hasMultiplePersons && selectedPerson !== ALL_PERSONS) {
      const pTokens = item.person ? item.person.split(/[\n,，]+/).map((t) => t.trim()) : [];
      if (!pTokens.includes(selectedPerson)) return;
    }

    if (selectedLocation !== ALL_LOCATIONS) {
      const itemLoc = item.location ? stripEmoji(item.location) : '';
      if (itemLoc !== selectedLocation) return;
    }

    const cat = cleanCat;
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(item);
  });

  const categories = Object.keys(groupedByCategory).sort((a, b) =>
    a.localeCompare(b, 'zh-Hant')
  );

  // Quick Add submit handler
  const handleQuickSubmit = async (isMobile = false) => {
    if (selectedCategory === ALL_CATEGORIES) {
      setShowCategoryError(true);
      setTimeout(() => setShowCategoryError(false), 3000);
      if (isMobile) mobileInputRef.current?.focus();
      else desktopInputRef.current?.focus();
      return;
    }

    const trimmed = quickItemName.trim();
    if (!trimmed || isQuickAdding) return;

    setIsQuickAdding(true);
    try {
      await onQuickAdd({
        item: trimmed,
        category: selectedCategory,
        person: selectedPerson !== ALL_PERSONS ? selectedPerson : '',
        location: selectedLocation !== ALL_LOCATIONS ? selectedLocation : '',
      });
      setQuickItemName('');
    } finally {
      setIsQuickAdding(false);
      setTimeout(() => {
        if (isMobile) mobileInputRef.current?.focus();
        else desktopInputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isMobile = false) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickSubmit(isMobile);
    }
  };

  return (
    <div className="space-y-4 pb-36 md:pb-20">
      {/* Sticky Header Container: Freeze right below top header during scroll */}
      <div className="sticky top-[57px] z-30 bg-slate-50/95 backdrop-blur-md pt-1 pb-2.5 space-y-2 border-b border-slate-200/50 shadow-xs transition-all duration-200">
        {/* Top Filter Controls: Dynamic Transition between Expanded & Compact Single Row */}
        <div className={`bg-white/95 rounded-2xl border border-slate-200/70 shadow-2xs transition-all duration-200 ${
          isScrolled ? 'p-1.5' : 'p-2.5 space-y-2'
        }`}>
          {isScrolled ? (
            /* Scrolled state: Ultra-slim Single-Row Horizontal Scroll Capsules with Edge Fade */
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-1 px-1 text-xs [mask-image:linear-gradient(to_right,black_0%,black_88%,transparent_100%)]">
              {categoryList.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={`scroll-cat-${cat}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (showCategoryError) setShowCategoryError(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {/* Person Badges (Subtle Tint) */}
              {hasMultiplePersons && (
                <>
                  <div className="h-3.5 w-px bg-slate-200 flex-shrink-0 mx-1" />
                  {personList.map((person) => {
                    const isSelected = selectedPerson === person;
                    return (
                      <button
                        key={`scroll-p-${person}`}
                        onClick={() => setSelectedPerson(person)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        {person}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Location Badges (Subtle Tint) */}
              {locationList.length > 1 && (
                <>
                  <div className="h-3.5 w-px bg-slate-200 flex-shrink-0 mx-1" />
                  {locationList.map((loc) => {
                    const isSelected = selectedLocation === loc;
                    return (
                      <button
                        key={`scroll-loc-${loc}`}
                        onClick={() => setSelectedLocation(loc)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            /* Normal Top state: Multi-row wrap */
            <>
              {/* Row 1: Category Filter Chips (Outlined) with Subtle Edge Fade */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 [mask-image:linear-gradient(to_right,black_0%,black_88%,transparent_100%)]">
                {categoryList.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        if (showCategoryError) setShowCategoryError(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Row 2 & 3: Person & Location Sub-filters (Dedicated rows on mobile, inline on desktop) */}
              {(hasMultiplePersons || locationList.length > 1) && (
                <div className="flex flex-col md:flex-row md:items-center gap-2 border-t border-slate-100 pt-2">
                  {/* Person Filter (Full Row on mobile) */}
                  {hasMultiplePersons && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                      {personList.map((person) => {
                        const isSelected = selectedPerson === person;
                        return (
                          <button
                            key={person}
                            onClick={() => setSelectedPerson(person)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                            }`}
                          >
                            {person}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider visible only on desktop when both exist */}
                  {hasMultiplePersons && locationList.length > 1 && (
                    <div className="hidden md:block h-3.5 w-px bg-slate-200 flex-shrink-0 mx-0.5" />
                  )}

                  {/* Location Filter (Full Row on mobile) */}
                  {locationList.length > 1 && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                      {locationList.map((loc) => {
                        const isSelected = selectedLocation === loc;
                        return (
                          <button
                            key={loc}
                            onClick={() => setSelectedLocation(loc)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop Inline Quick-Add Bar (Hidden on Mobile) */}
        <div className="hidden md:block space-y-1">
          <div
            className={`bg-white p-1.5 pl-3 rounded-2xl border transition-all flex items-center gap-2 shadow-2xs ${
              showCategoryError
                ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                : 'border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-100'
            }`}
          >
            <input
              ref={desktopInputRef}
              type="text"
              value={quickItemName}
              onChange={(e) => {
                setQuickItemName(e.target.value);
                if (showCategoryError) setShowCategoryError(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, false)}
              placeholder={
                selectedCategory !== ALL_CATEGORIES
                  ? `新增至「${selectedCategory}」... (按 Enter 新增)`
                  : '請先在上方點選類別以快速新增...'
              }
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setWeatherGuideOpen(true)}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                title="查看逐日天氣與穿搭指南"
              >
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span>氣候</span>
              </button>

              {onOpenImportModal && (
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                  title="從其他旅程複製清單"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯入</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onOpenModal(
                    undefined,
                    selectedPerson !== ALL_PERSONS ? selectedPerson : undefined,
                    selectedCategory !== ALL_CATEGORIES ? selectedCategory : undefined,
                    selectedLocation !== ALL_LOCATIONS ? selectedLocation : undefined
                  )
                }
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                title="開啟完整彈窗設定備註"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>詳細</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSubmit(false)}
                disabled={isQuickAdding}
                className={`px-3 py-1.5 text-xs font-extrabold text-white rounded-xl transition-all flex items-center space-x-1 cursor-pointer select-none active:scale-95 shadow-2xs ${
                  selectedCategory === ALL_CATEGORIES
                    ? 'bg-slate-400 hover:bg-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>{isQuickAdding ? '新增中...' : '新增'}</span>
              </button>
            </div>
          </div>

          {showCategoryError && (
            <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 pl-2">
              請先在上方點選一個「類別」（如：衣物、3C）即可開始快速新增
            </p>
          )}
        </div>
      </div>

      {/* Main Content Layout: Frameless High-Density Clean Items List */}
      <div className="w-full p-2 md:p-4 space-y-6">
        {categories.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm space-y-3">
            <p className="font-medium text-slate-500">目前沒有符合條件的打包項目</p>
            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>從其他旅程匯入打包清單</span>
              </button>
            )}
          </div>
        )}

        {categories.map((cat) => {
          const items = groupedByCategory[cat];
          items.sort((a, b) => a.rowIndex - b.rowIndex);
          const packedCount = items.filter((i) => i.isPacked).length;
          const allItemsPacked = items.length > 0 && packedCount === items.length;

          return (
            <div key={cat} className="space-y-1.5">
              {/* Minimalist Category Header without emoji */}
              <div className="flex items-center justify-between px-1 py-1 select-none border-b border-slate-100 pb-1.5 mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-slate-900 tracking-wide">
                    {cat}
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {packedCount}/{items.length}
                  </span>
                </div>
                {allItemsPacked && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    ✓ COMPLETED
                  </span>
                )}
              </div>

              {/* Items List - Clean Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                {items.map((item) => {
                  const pTokens = item.person ? item.person.split(/[\n,，]+/).map((t) => t.trim()) : [];
                  const cleanLoc = item.location ? stripEmoji(item.location) : '';

                  return (
                    <div
                      key={item.rowIndex}
                      className={`group flex items-start justify-between px-2 py-1.5 rounded-xl transition-all hover:bg-slate-100/70 ${
                        item.isPacked ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Checkbox & Item Content */}
                      <div className="flex items-start space-x-2.5 min-w-0 flex-1 pr-2">
                        <input
                          type="checkbox"
                          checked={item.isPacked}
                          onChange={() => onTogglePacking(item.rowIndex, item.isPacked)}
                          className="w-4.5 h-4.5 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer flex-shrink-0 transition-transform active:scale-90"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1">
                            <span
                              onClick={() => onOpenModal(item)}
                              className={`text-sm font-semibold text-slate-800 leading-snug cursor-pointer hover:text-indigo-600 transition-colors ${
                                item.isPacked ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {item.item}
                            </span>

                            {/* Person Badges */}
                            {hasMultiplePersons && selectedPerson === ALL_PERSONS &&
                              pTokens.map((p, idx) => {
                                if (!p) return null;
                                let colorClass = 'bg-slate-100 text-slate-600';
                                if (p === 'Jo')
                                  colorClass = 'bg-indigo-50 text-indigo-600';
                                else if (p === 'Will')
                                  colorClass = 'bg-amber-50 text-amber-700';
                                return (
                                  <span
                                    key={`${p}-${idx}`}
                                    className={`inline-block ${colorClass} px-1.5 py-0.5 rounded text-[10px] font-extrabold ml-1`}
                                  >
                                    {p}
                                  </span>
                                );
                              })}

                            {/* Location Badge */}
                            {selectedLocation === ALL_LOCATIONS && cleanLoc && (
                              <span className="inline-flex items-center bg-slate-100/80 text-slate-500 border border-slate-200/50 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">
                                {cleanLoc}
                              </span>
                            )}
                          </div>

                          {/* Note */}
                          {item.note && (
                            <div className="text-xs text-slate-400 mt-0.5 leading-normal whitespace-pre-line">
                              {item.note.replace(/<br\s*\/?>/gi, '\n')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: Copy & Edit */}
                      <div className="flex items-center space-x-0.5 flex-shrink-0 opacity-80 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          onClick={() => onOpenModal({ ...item, rowIndex: 0, isPacked: false })}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-90"
                          title="複製此項目"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenModal(item)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-90"
                          title="編輯"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Bottom-Docked Quick-Add Bar (Floats right above MobileNav) */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 shadow-lg">
        <div
          className={`bg-slate-50 p-1.5 pl-3 rounded-2xl border transition-all flex items-center gap-2 ${
            showCategoryError
              ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/40'
              : 'border-slate-200 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100'
          }`}
        >
          <input
            ref={mobileInputRef}
            type="text"
            value={quickItemName}
            onChange={(e) => {
              setQuickItemName(e.target.value);
              if (showCategoryError) setShowCategoryError(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, true)}
            placeholder={
              selectedCategory !== ALL_CATEGORIES
                ? `新增至「${selectedCategory}」... (按 Enter 新增)`
                : '請先在上方點選類別以快速新增...'
            }
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
          />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setWeatherGuideOpen(true)}
              className="p-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="查看逐日天氣與穿搭指南"
            >
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            </button>

            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="p-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="從其他旅程複製清單"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onOpenModal(
                  undefined,
                  selectedPerson !== ALL_PERSONS ? selectedPerson : undefined,
                  selectedCategory !== ALL_CATEGORIES ? selectedCategory : undefined,
                  selectedLocation !== ALL_LOCATIONS ? selectedLocation : undefined
                )
              }
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>詳細</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSubmit(true)}
              disabled={isQuickAdding}
              className={`px-3 py-1.5 text-xs font-extrabold text-white rounded-xl transition-all flex items-center space-x-1 cursor-pointer select-none active:scale-95 shadow-xs ${
                selectedCategory === ALL_CATEGORIES
                  ? 'bg-slate-400 hover:bg-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>{isQuickAdding ? '新增中...' : '新增'}</span>
            </button>
          </div>
        </div>

        {showCategoryError && (
          <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 pt-1 pl-2">
            請先在上方點選一個「類別」（如：衣物、3C）即可開始快速新增
          </p>
        )}
      </div>

      <WeatherGuideModal
        isOpen={weatherGuideOpen}
        onClose={() => setWeatherGuideOpen(false)}
        tripTitle={tripTitle}
        items={dailyGuideItems}
        overallMin={overallMin}
        overallMax={overallMax}
        overallAdvice={overallAdvice}
      />
    </div>
  );
};
