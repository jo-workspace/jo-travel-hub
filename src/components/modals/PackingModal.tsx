'use client';

import React, { useState, useEffect } from 'react';
import { PackingItem } from '@/types/trip';
import { X, Trash2 } from 'lucide-react';

interface PackingModalProps {
  isOpen: boolean;
  item?: PackingItem | null;
  defaultPerson?: string;
  existingCategories?: string[];
  companionsList?: string[];
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
}

const INVALID_PACKING_CATEGORIES = ['公用', '公用物品', '隨身', '行李', '託運', '托運', '手提', '穿著', '其他', '全部'];
const LOCATION_PRESETS = ['隨身', '托運', '手提', '穿著'];

export const PackingModal: React.FC<PackingModalProps> = ({
  isOpen,
  item,
  defaultPerson = '',
  existingCategories = [],
  companionsList = [],
  onClose,
  onSave,
  onDelete,
}) => {
  // 跨旅程歷史類別清單（排除誤歸為類別的位置或公用關鍵字）
  const categoryPresets = Array.from(
    new Set(
      existingCategories
        .map((c) => c.trim())
        .filter((c) => c && !INVALID_PACKING_CATEGORIES.includes(c))
    )
  );

  const [category, setCategory] = useState(categoryPresets[0] || '衣物');
  const [person, setPerson] = useState(defaultPerson || '');
  const [itemName, setItemName] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當前旅程攜帶人員清單（僅限同行人員與攜帶歷史，並包含公用）
  const personPresets = Array.from(
    new Set([...companionsList.map((p) => p.trim()).filter(Boolean), '公用'])
  );

  useEffect(() => {
    if (item) {
      setCategory(item.category || categoryPresets[0] || '衣物');
      setPerson(item.person || '');
      setItemName(item.item || '');
      setNote(item.note || '');
      setLocation(item.location || '');
    } else {
      setCategory(categoryPresets[0] || '衣物');
      setPerson(defaultPerson || '');
      setItemName('');
      setNote('');
      setLocation('');
    }
  }, [item, isOpen, defaultPerson]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        rowIndex: item?.rowIndex || 0,
        category: category.trim(),
        person: person.trim(),
        item: itemName.trim(),
        note: note.trim(),
        location: location.trim(),
        isPacked: item?.isPacked || false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex <= 1) return;
    if (!confirm('確定要刪除此打包項目嗎？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(item.rowIndex);
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
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {item ? '編輯打包項目' : '新增打包項目'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">類別</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="輸入或點選下方快捷標籤..."
              required
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold mb-1.5"
            />
            <div className="flex items-center flex-wrap gap-1.5">
              {categoryPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCategory(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                    category === preset
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">攜帶人員 (選填)</label>
            <input
              type="text"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="輸入或點選下方同行人員..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold mb-1.5"
            />
            {personPresets.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5">
                {personPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPerson(person === p ? '' : p)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                      person === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-indigo-50/70 text-indigo-700 border-indigo-100/80 hover:bg-indigo-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">物品名稱</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="準備帶的物品..."
              required
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500">擺放位置</label>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="輸入或點選下方快捷標籤..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold mb-2"
            />
            {/* Quick Presets */}
            <div className="flex items-center flex-wrap gap-1.5">
              {LOCATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLocation(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                    location === preset
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">備註</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="數量、品牌或規格..."
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
