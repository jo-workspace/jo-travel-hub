'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PackingItem } from '@/types/trip';
import { TripConfig } from '@/config/trips';
import { getTripsList, getAllData } from '@/lib/supabase-client';
import { X, Download, CheckSquare, Square, Loader2 } from 'lucide-react';

interface ImportPackingModalProps {
  isOpen: boolean;
  currentTripId: string;
  existingItems: PackingItem[];
  onClose: () => void;
  onImport: (items: Array<{ category: string; person: string; item: string; note?: string; location?: string }>) => Promise<void>;
}

export const ImportPackingModal: React.FC<ImportPackingModalProps> = ({
  isOpen,
  currentTripId,
  existingItems,
  onClose,
  onImport,
}) => {
  const [trips, setTrips] = useState<TripConfig[]>([]);
  const [selectedSourceTripId, setSelectedSourceTripId] = useState<string>('');
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sourcePackingItems, setSourcePackingItems] = useState<PackingItem[]>([]);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('全人員');
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());

  // 載入可供選擇的來源旅程清單（排除當前旅程）
  useEffect(() => {
    if (!isOpen) return;

    const loadTrips = async () => {
      setIsLoadingTrips(true);
      try {
        const list = await getTripsList();
        const otherTrips = list.filter((t) => t.id !== currentTripId);
        setTrips(otherTrips);
        if (otherTrips.length > 0) {
          setSelectedSourceTripId(otherTrips[0].id);
        }
      } catch (err) {
        console.error('Failed to load trips list:', err);
      } finally {
        setIsLoadingTrips(false);
      }
    };

    loadTrips();
  }, [isOpen, currentTripId]);

  // 當選定來源旅程時，動態載入該旅程的打包清單
  useEffect(() => {
    if (!isOpen || !selectedSourceTripId) return;

    const loadSourceItems = async () => {
      setIsLoadingItems(true);
      try {
        const data = await getAllData(false, selectedSourceTripId);
        const packing = data.packing || [];
        setSourcePackingItems(packing);

        // 預設全選尚未在當前旅程存在的項目
        const initialSelected = new Set<string>();
        packing.forEach((item, idx) => {
          const key = `${item.item}__${item.category}__${item.person || ''}__${idx}`;
          const isDuplicate = existingItems.some(
            (e) => e.item.trim().toLowerCase() === item.item.trim().toLowerCase() &&
                   (e.person || '').trim() === (item.person || '').trim()
          );
          if (!isDuplicate) {
            initialSelected.add(key);
          }
        });
        setSelectedItemKeys(initialSelected);
        setSelectedPersonFilter('全人員');
      } catch (err) {
        console.error('Failed to load source trip packing items:', err);
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadSourceItems();
  }, [isOpen, selectedSourceTripId, existingItems]);

  // 提取來源清單中的人員標籤
  const availablePersons = useMemo(() => {
    const set = new Set<string>();
    sourcePackingItems.forEach((it) => {
      if (it.person) {
        it.person.split(/[\n,，]+/).forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return ['全人員', ...Array.from(set)];
  }, [sourcePackingItems]);

  // 依人員過濾後的來源清單
  const filteredSourceItems = useMemo(() => {
    if (selectedPersonFilter === '全人員') return sourcePackingItems;
    return sourcePackingItems.filter((it) => {
      const pTokens = it.person ? it.person.split(/[\n,，]+/).map((t) => t.trim()) : [];
      return pTokens.includes(selectedPersonFilter);
    });
  }, [sourcePackingItems, selectedPersonFilter]);

  // 依類別分組
  const groupedSourceItems = useMemo(() => {
    const map: Record<string, Array<{ item: PackingItem; originalIdx: number }>> = {};
    filteredSourceItems.forEach((item) => {
      const originalIdx = sourcePackingItems.indexOf(item);
      const cat = (item.category || '個人物品').trim();
      if (!map[cat]) map[cat] = [];
      map[cat].push({ item, originalIdx });
    });
    return map;
  }, [filteredSourceItems, sourcePackingItems]);

  if (!isOpen) return null;

  const handleToggleItem = (key: string) => {
    const next = new Set(selectedItemKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedItemKeys(next);
  };

  const handleSelectAll = () => {
    const next = new Set(selectedItemKeys);
    filteredSourceItems.forEach((it) => {
      const idx = sourcePackingItems.indexOf(it);
      const key = `${it.item}__${it.category}__${it.person || ''}__${idx}`;
      next.add(key);
    });
    setSelectedItemKeys(next);
  };

  const handleDeselectAll = () => {
    const next = new Set(selectedItemKeys);
    filteredSourceItems.forEach((it) => {
      const idx = sourcePackingItems.indexOf(it);
      const key = `${it.item}__${it.category}__${it.person || ''}__${idx}`;
      next.delete(key);
    });
    setSelectedItemKeys(next);
  };

  const handleConfirmImport = async () => {
    if (selectedItemKeys.size === 0) return;

    const itemsToImport: Array<{ category: string; person: string; item: string; note?: string; location?: string }> = [];

    sourcePackingItems.forEach((it, idx) => {
      const key = `${it.item}__${it.category}__${it.person || ''}__${idx}`;
      if (selectedItemKeys.has(key)) {
        itemsToImport.push({
          item: it.item.trim(),
          category: (it.category || '個人物品').trim(),
          person: (it.person || '').trim(),
          note: (it.note || '').trim(),
          location: (it.location || '').trim(),
        });
      }
    });

    if (itemsToImport.length === 0) return;

    setIsSubmitting(true);
    try {
      await onImport(itemsToImport);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                跨旅程匯入打包清單
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                從其他旅程快速複製必備行李項目
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Trip Selector & Person Filter */}
        <div className="space-y-3 flex-shrink-0">
          {/* Trip Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              選擇來源旅程
            </label>
            {isLoadingTrips ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse flex items-center px-3 text-xs text-slate-400">
                載入旅程清單中...
              </div>
            ) : trips.length === 0 ? (
              <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200">
                目前沒有其他旅程可供匯入。
              </div>
            ) : (
              <select
                value={selectedSourceTripId}
                onChange={(e) => setSelectedSourceTripId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white font-bold text-slate-900 cursor-pointer"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.dates || '未設日期'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Person Filter Chips */}
          {availablePersons.length > 2 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400">人員篩選</span>
                <div className="space-x-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-900 hover:underline cursor-pointer"
                  >
                    全選
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    取消全選
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {availablePersons.map((p) => {
                  const isSelected = selectedPersonFilter === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPersonFilter(p)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Items List Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto border border-slate-100 rounded-2xl p-3 bg-slate-50/50 space-y-4">
          {isLoadingItems ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              <span className="text-xs font-semibold">載入來源行李清單中...</span>
            </div>
          ) : filteredSourceItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              該旅程目前沒有符合條件的打包項目。
            </div>
          ) : (
            Object.entries(groupedSourceItems).map(([category, items]) => (
              <div key={category} className="space-y-1.5">
                <div className="text-xs font-extrabold text-slate-700 px-1 flex items-center space-x-1">
                  <span>{category}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({items.length})</span>
                </div>

                <div className="space-y-1">
                  {items.map(({ item, originalIdx }) => {
                    const key = `${item.item}__${item.category}__${item.person || ''}__${originalIdx}`;
                    const isChecked = selectedItemKeys.has(key);
                    const isDuplicate = existingItems.some(
                      (e) => e.item.trim().toLowerCase() === item.item.trim().toLowerCase() &&
                             (e.person || '').trim() === (item.person || '').trim()
                    );

                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleItem(key)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all border cursor-pointer select-none ${
                          isChecked
                            ? 'bg-white border-slate-300 shadow-2xs'
                            : 'bg-slate-100/60 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                          <div className="flex-shrink-0 text-slate-700">
                            {isChecked ? (
                              <CheckSquare className="w-4.5 h-4.5 text-slate-900" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                                {item.item}
                              </span>
                              {item.person && (
                                <span className="text-[10px] font-bold bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded">
                                  {item.person}
                                </span>
                              )}
                              {item.location && (
                                <span className="text-[10px] font-bold bg-slate-200/70 text-slate-500 px-1.5 py-0.2 rounded">
                                  {item.location}
                                </span>
                              )}
                              {isDuplicate && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                                  已存在
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Submit Button */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-shrink-0">
          <span className="text-xs font-bold text-slate-500">
            已選取 <strong className="text-slate-900 font-mono text-sm">{selectedItemKeys.size}</strong> 項
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedItemKeys.size === 0 || isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>匯入中...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>匯入 ({selectedItemKeys.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
