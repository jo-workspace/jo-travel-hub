'use client';

import React, { useState, useEffect } from 'react';
import { ItineraryItem } from '@/types/trip';
import { X, Trash2, ChevronDown } from 'lucide-react';
import {
  ITINERARY_CORE_PRESETS,
  TRAVEL_ICON_PICKER_LIST,
  cleanCategoryName,
  matchCategoryIconKey,
  ItineraryCategoryIcon,
} from '@/lib/itineraryCategories';

interface ItineraryModalProps {
  isOpen: boolean;
  item?: ItineraryItem | null;
  defaultDay?: string;
  existingCategories?: string[];
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (target: any) => Promise<void>;
}

// 排除無效或歷史誤留的雜訊詞彙
const NOISE_CATEGORY_WORDS = ['行船', '行程', '觀光', '球場', '機票'];

export const ItineraryModal: React.FC<ItineraryModalProps> = ({
  isOpen,
  item,
  defaultDay,
  existingCategories = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [categoryName, setCategoryName] = useState('景點');
  const [selectedIconKey, setSelectedIconKey] = useState('map-pin');
  const [isManualIcon, setIsManualIcon] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當前旅程中出現過的合法自訂分類（經名稱清洗與唯一去重，排除預設 7 項與歷史雜訊）
  const customPresets = Array.from(
    new Set(
      existingCategories
        .map((c) => cleanCategoryName(c))
        .filter((cleanName) => {
          if (!cleanName) return false;
          // 排除預設 7 大核心標籤
          if (ITINERARY_CORE_PRESETS.some((p) => p.name === cleanName)) return false;
          // 排除歷史雜訊詞彙
          if (NOISE_CATEGORY_WORDS.includes(cleanName)) return false;
          return true;
        })
    )
  );

  useEffect(() => {
    if (item) {
      setDay(item.day || '');
      setTime(item.time || '');
      const clean = cleanCategoryName(item.type || '景點');
      setCategoryName(clean);
      setSelectedIconKey(matchCategoryIconKey(clean));
      setIsManualIcon(false);
      setTitle(item.title || '');
      setContent(item.content || '');
      setLinks(item.links || '');
    } else {
      setDay(defaultDay && defaultDay !== 'ALL' ? defaultDay : 'Day 1');
      setTime('');
      setCategoryName('景點');
      setSelectedIconKey('map-pin');
      setIsManualIcon(false);
      setTitle('');
      setContent('');
      setLinks('');
    }
    setShowIconPicker(false);
  }, [item, isOpen, defaultDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day.trim()) return;

    // 存儲純淨文字名稱，不再包含 Emoji 前綴以維持資料庫一致
    const finalType = cleanCategoryName(categoryName);

    setIsSubmitting(true);
    try {
      await onSave({
        id: item?.id,
        rowIndex: item?.rowIndex || 0,
        day: day.trim(),
        time: time.trim(),
        type: finalType,
        title: title.trim(),
        content: content.trim(),
        links: links.trim(),
        isVisited: item?.isVisited || false,
        isIgnored: item?.isIgnored || false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm('確定要刪除此行程嗎？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(item.id ? { id: item.id, rowIndex: item.rowIndex } : item.rowIndex);
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
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {item ? '編輯行程' : '新增行程'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">天數</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="如 Day 1"
                required
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">時間</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="09:00 (留空為口袋名單)"
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">類別</label>
            <div className="flex items-center space-x-2 mb-2">
              {/* SVG 向量圖示切換按鈕 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker((prev) => !prev)}
                  className="h-10 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none"
                  title="更換向量圖示"
                >
                  <ItineraryCategoryIcon
                    iconKey={selectedIconKey}
                    className="w-4 h-4 text-slate-700"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* SVG 向量圖示快捷選擇盤 */}
                {showIconPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowIconPicker(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 z-30 w-64 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xl animate-scale-up">
                      <div className="text-[11px] font-bold text-slate-400 px-1 mb-1.5">
                        選擇旅遊圖示
                      </div>
                      <div className="grid grid-cols-5 gap-1 max-h-48 overflow-y-auto p-0.5">
                        {TRAVEL_ICON_PICKER_LIST.map((tIcon) => {
                          const isCurrent = selectedIconKey === tIcon.key;
                          const IconComp = tIcon.Icon;
                          return (
                            <button
                              key={tIcon.key}
                              type="button"
                              onClick={() => {
                                setSelectedIconKey(tIcon.key);
                                setIsManualIcon(true);
                                setShowIconPicker(false);
                              }}
                              className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl transition-all hover:bg-slate-100 cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-100 ring-2 ring-slate-900 text-slate-900'
                                  : 'text-slate-600'
                              }`}
                              title={tIcon.label}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-[9px] mt-0.5 font-medium leading-none">
                                {tIcon.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 類別文字輸入框 */}
              <input
                type="text"
                value={categoryName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryName(val);
                  if (!isManualIcon) {
                    setSelectedIconKey(matchCategoryIconKey(val));
                  }
                }}
                placeholder="自訂或點選下方分類"
                className="flex-1 bg-slate-50 border border-slate-200 text-sm px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold h-10"
              />
            </div>

            {/* 預設分類標籤與自訂分類 */}
            <div className="flex items-center flex-wrap gap-1.5">
              {ITINERARY_CORE_PRESETS.map((preset) => {
                const isSelected = categoryName === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCategoryName(preset.name);
                      setSelectedIconKey(preset.iconKey);
                      setIsManualIcon(false);
                      setShowIconPicker(false);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none font-bold flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ItineraryCategoryIcon
                      iconKey={preset.iconKey}
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`}
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}

              {/* 當前旅程曾用過的乾淨自訂分類（如：郵輪） */}
              {customPresets.map((customName) => {
                const isSelected = categoryName === customName;
                const iconKey = matchCategoryIconKey(customName);
                return (
                  <button
                    key={customName}
                    type="button"
                    onClick={() => {
                      setCategoryName(customName);
                      setSelectedIconKey(iconKey);
                      setIsManualIcon(false);
                      setShowIconPicker(false);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none font-bold flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ItineraryCategoryIcon
                      iconKey={iconKey}
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`}
                    />
                    <span>{customName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">名稱</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="景點或餐廳名稱"
              required
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">備註</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="相關備註..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">地圖連結</label>
            <input
              type="url"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            {item && item.rowIndex > 1 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>刪除</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '處理中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
