'use client';

import React, { useState, useEffect } from 'react';
import { ItineraryItem } from '@/types/trip';
import { X, Trash2 } from 'lucide-react';

interface ItineraryModalProps {
  isOpen: boolean;
  item?: ItineraryItem | null;
  defaultDay?: string;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({
  isOpen,
  item,
  defaultDay,
  onClose,
  onSave,
  onDelete,
}) => {
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('景點');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setDay(item.day || '');
      setTime(item.time || '');
      setType(item.type || '景點');
      setTitle(item.title || '');
      setContent(item.content || '');
      setLinks(item.links || '');
    } else {
      setDay(defaultDay && defaultDay !== 'ALL' ? defaultDay : 'Day 1');
      setTime('09:00');
      setType('景點');
      setTitle('');
      setContent('');
      setLinks('');
    }
  }, [item, isOpen, defaultDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        rowIndex: item?.rowIndex || 0,
        day: day.trim(),
        time: time.trim(),
        type,
        title: title.trim(),
        content: content.trim(),
        links: links.trim(),
        isVisited: item?.isVisited || false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex <= 1) return;
    if (!confirm('確定要刪除此行程嗎？')) return;

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
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {item ? '編輯行程項目' : '新增行程項目'}
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
              <label className="block text-xs font-bold text-slate-500 mb-1">天數 (如 Day 1)</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">時間 (如 09:00)</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">類別</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            >
              <option value="景點">📍 景點</option>
              <option value="美食">🍔 美食</option>
              <option value="購物">🛒 購物</option>
              <option value="交通">🚗 交通</option>
              <option value="住宿">🏨 住宿</option>
              <option value="球場">⚾ 球場</option>
              <option value="娛樂">🎡 娛樂</option>
              <option value="機票">✈️ 機票</option>
              <option value="其他">📌 其他</option>
            </select>
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
            <label className="block text-xs font-bold text-slate-500 mb-1">相關備註</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="相關備註事項..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Google 地圖連結</label>
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
