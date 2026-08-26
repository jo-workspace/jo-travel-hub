'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PackingItem } from '@/types/trip';
import { Plus, Edit3, Briefcase, User, Layers, CornerDownLeft } from 'lucide-react';

interface PackingTabProps {
  data: PackingItem[];
  hidePacked: boolean;
  onTogglePacking: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: PackingItem, defaultPerson?: string, defaultCategory?: string, defaultLocation?: string) => void;
  onQuickAdd: (newItem: { item: string; category: string; person: string; location: string }) => Promise<void>;
}

const stripEmoji = (str: string) =>
  str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|\p{Extended_Pictographic}/gu, '').trim();

export const PackingTab: React.FC<PackingTabProps> = ({
  data,
  hidePacked,
  onTogglePacking,
  onOpenModal,
  onQuickAdd,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedPerson, setSelectedPerson] = useState<string>('全部');
  const [selectedLocation, setSelectedLocation] = useState<string>('全部');

  const [quickItemName, setQuickItemName] = useState('');
  const [showCategoryError, setShowCategoryError] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

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
  const PREFERRED_CATEGORY_ORDER = ['衣物', '3C', '美妝盥洗', '隨身', '藥品', '重要證件', '行李', '特特行李', '車用', '球場裝備', '其他'];
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

  const categoryList = ['全部', ...Array.from(categorySet).sort((a, b) => {
    const idxA = PREFERRED_CATEGORY_ORDER.indexOf(a);
    const idxB = PREFERRED_CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  })];

  // Auto-reset category selection if the active category was deleted/renamed
  useEffect(() => {
    if (selectedCategory !== '全部' && !categoryList.includes(selectedCategory)) {
      setSelectedCategory('全部');
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
  const personList = ['全部', ...Array.from(personSet).sort((a, b) => {
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
  const locationList = ['全部', ...Array.from(locationSet).sort((a, b) => {
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
    if (selectedCategory !== '全部') {
      if (cleanCat !== selectedCategory) return;
    }

    if (hasMultiplePersons && selectedPerson !== '全部') {
      const pTokens = item.person ? item.person.split(/[\n,，]+/).map((t) => t.trim()) : [];
      if (!pTokens.includes(selectedPerson)) return;
    }

    if (selectedLocation !== '全部') {
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
    if (selectedCategory === '全部') {
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
        person: selectedPerson !== '全部' ? selectedPerson : '',
        location: selectedLocation !== '全部' ? selectedLocation : '',
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
            /* Scrolled state: Ultra-slim Single-Row Horizontal Scroll Capsules */
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-1 px-1 text-xs">
              <span className="text-[11px] font-black text-slate-400 select-none pl-1 flex-shrink-0">類別</span>
              {categoryList.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={`scroll-cat-${cat}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (showCategoryError) setShowCategoryError(false);
                    }}
                    className={`px-3 py-1 text-xs font-black rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/70 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {/* Person Badges */}
              {hasMultiplePersons && (
                <>
                  <div className="h-4 w-px bg-slate-200 flex-shrink-0 mx-1" />
                  <span className="text-[11px] font-black text-slate-400 select-none flex-shrink-0">人員</span>
                  {personList.map((person) => {
                    const isSelected = selectedPerson === person;
                    return (
                      <button
                        key={`scroll-p-${person}`}
                        onClick={() => setSelectedPerson(person)}
                        className={`px-2.5 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50/70 text-indigo-700 border border-indigo-200/60 hover:bg-indigo-100'
                        }`}
                      >
                        {person}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Location Badges */}
              {locationList.length > 1 && (
                <>
                  <div className="h-4 w-px bg-slate-200 flex-shrink-0 mx-1" />
                  <span className="text-[11px] font-black text-slate-400 select-none flex-shrink-0">位置</span>
                  {locationList.map((loc) => {
                    const isSelected = selectedLocation === loc;
                    return (
                      <button
                        key={`scroll-loc-${loc}`}
                        onClick={() => setSelectedLocation(loc)}
                        className={`px-2.5 py-1 text-[11px] font-black rounded-full transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50/70 text-amber-700 border border-amber-200/60 hover:bg-amber-100'
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
            /* Normal Top state: Full multi-row wrap */
            <>
              {/* Row 1: Category Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div className="flex items-center gap-1 flex-wrap">
                  {categoryList.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          if (showCategoryError) setShowCategoryError(false);
                        }}
                        className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100/80 text-slate-600 border border-slate-200/60 hover:bg-slate-200/80'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Person & Location Sub-filters (if present) */}
              {(hasMultiplePersons || locationList.length > 1) && (
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
                  {/* Person Filter */}
                  {hasMultiplePersons && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {personList.map((person) => {
                          const isSelected = selectedPerson === person;
                          return (
                            <button
                              key={person}
                              onClick={() => setSelectedPerson(person)}
                              className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100/80 text-slate-600 border border-slate-200/60 hover:bg-slate-200/80'
                              }`}
                            >
                              {person}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Location Filter */}
                  {locationList.length > 1 && (
                    <div className={`flex items-center gap-1.5 flex-wrap ${hasMultiplePersons ? 'pl-2 border-l border-slate-200/80' : ''}`}>
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {locationList.map((loc) => {
                          const isSelected = selectedLocation === loc;
                          return (
                            <button
                              key={loc}
                              onClick={() => setSelectedLocation(loc)}
                              className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-slate-100/80 text-slate-600 border border-slate-200/60 hover:bg-slate-200/80'
                              }`}
                            >
                              {loc}
                            </button>
                          );
                        })}
                      </div>
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
                selectedCategory !== '全部'
                  ? `新增至「${selectedCategory}」... (按 Enter 新增)`
                  : '請先在上方點選類別以快速新增...'
              }
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  onOpenModal(
                    undefined,
                    selectedPerson !== '全部' ? selectedPerson : undefined,
                    selectedCategory !== '全部' ? selectedCategory : undefined,
                    selectedLocation !== '全部' ? selectedLocation : undefined
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
                  selectedCategory === '全部'
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
              ⚠️ 請先在上方點選一個「類別」（如：衣物、3C）即可開始快速新增
            </p>
          )}
        </div>
      </div>

      {/* Main Content Layout: Frameless High-Density Clean Items List */}
      <div className="w-full p-2 md:p-4 space-y-6">
        {categories.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            目前沒有符合條件的打包項目！🧳✨
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
                            {hasMultiplePersons && selectedPerson === '全部' &&
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
                            {selectedLocation === '全部' && cleanLoc && (
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

                      {/* Edit Button */}
                      <button
                        onClick={() => onOpenModal(item)}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-90 flex-shrink-0 opacity-80 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                        title="編輯"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
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
              selectedCategory !== '全部'
                ? `新增至「${selectedCategory}」... (按 Enter 新增)`
                : '請先在上方點選類別以快速新增...'
            }
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
          />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() =>
                onOpenModal(
                  undefined,
                  selectedPerson !== '全部' ? selectedPerson : undefined,
                  selectedCategory !== '全部' ? selectedCategory : undefined,
                  selectedLocation !== '全部' ? selectedLocation : undefined
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
                selectedCategory === '全部'
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
            ⚠️ 請先在上方點選一個「類別」（如：衣物、3C）即可開始快速新增
          </p>
        )}
      </div>
    </div>
  );
};
