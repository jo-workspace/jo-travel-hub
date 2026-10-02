'use client';

import React, { useState, useEffect } from 'react';
import { TodoItem } from '@/types/trip';
import { TODO_CATEGORY_PRESETS } from '@/lib/todoCategories';
import { X, Trash2, Calendar } from 'lucide-react';

interface TodoModalProps {
  isOpen: boolean;
  item?: TodoItem | null;
  existingCategories?: string[];
  tripStartDate?: string;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number, id?: string) => Promise<void>;
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  item,
  existingCategories = [],
  tripStartDate = '',
  onClose,
  onSave,
  onDelete,
}) => {
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('預約票券');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 合併預設分類與歷史分類（去重）
  const allCategoryPresets = Array.from(
    new Set([
      ...TODO_CATEGORY_PRESETS,
      ...existingCategories.map((c) => c.trim()).filter((c) => c && c !== '全部'),
    ])
  );

  useEffect(() => {
    if (item) {
      setTask(item.task || '');
      setDueDate(item.dueDate || '');
      setCategory(item.category || '預約票券');
      setNote(item.note || '');
    } else {
      setTask('');
      setDueDate('');
      setCategory('預約票券');
      setNote('');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  // 計算快捷截止日期
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getDaysBeforeTrip = (days: number) => {
    if (!tripStartDate) return '';
    const d = new Date(tripStartDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: item?.id,
        rowIndex: item?.rowIndex || 0,
        task: task.trim(),
        dueDate: dueDate.trim() || undefined,
        category: category.trim() || '其他',
        note: note.trim(),
        isDone: item?.isDone || false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex <= 1) return;
    if (!confirm('確定要刪除此待辦事項嗎？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(item.rowIndex, item.id);
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
            {item ? '編輯待辦' : '新增待辦'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 第一格：任務名稱 (標題優先) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              任務名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="要做什麼？例：預訂晴空塔門票、換日幣..."
              required
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* 第二格：截止日期 (iOS WebKit 防破版標準) */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>截止日期 (Deadline)</span>
              </label>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center space-x-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>清除</span>
                </button>
              )}
            </div>

            <div className="min-w-0">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-w-0 appearance-none min-h-[38px] px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
              />
            </div>

            {/* 快捷按鈕 */}
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setDueDate(getTomorrowStr())}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
              >
                明天
              </button>
              {tripStartDate && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getDaysBeforeTrip(7);
                      if (d) setDueDate(d);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
                  >
                    出發前 1 週
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getDaysBeforeTrip(3);
                      if (d) setDueDate(d);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
                  >
                    出發前 3 天
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 第三格：分類 (極簡直覺標籤) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">分類</label>
            <div className="flex items-center flex-wrap gap-1.5 mb-2">
              {allCategoryPresets.map((preset) => (
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
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="或輸入自訂分類..."
              className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* 第四格：備註 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">備註 (選填)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="補充說明、預約編號、連結等..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* 按鈕列 */}
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
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md active:scale-98"
            >
              {isSubmitting ? '處理中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
