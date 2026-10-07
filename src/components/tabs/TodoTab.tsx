'use client';

import React from 'react';
import { TodoItem } from '@/types/trip';
import { linkifyText } from '@/lib/linkify';
import { Plus, Edit3, Calendar } from 'lucide-react';

interface TodoTabProps {
  data: TodoItem[];
  hideDone: boolean;
  onToggleTodo: (rowIndex: number, currentStatus: boolean, id?: string) => void;
  onOpenModal: (item?: TodoItem) => void;
}

/** 依據截止日期計算徽章樣式與文字 */
function getDueDateBadge(dueDate?: string, isDone?: boolean) {
  if (!dueDate || isDone) return null;

  // 使用本地日期計算差距天數 (消除時區偏差)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const due = new Date(dueDate + 'T00:00:00');
  const cur = new Date(todayStr + 'T00:00:00');
  const diffDays = Math.round((due.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200">
        <span>🚨</span>
        <span>逾期 {Math.abs(diffDays)} 天</span>
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-500 text-white shadow-2xs">
        <span>🔥</span>
        <span>今天截止</span>
      </span>
    );
  }
  if (diffDays === 1) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <span>⚡</span>
        <span>明天截止</span>
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span>⏳</span>
        <span>剩 {diffDays} 天</span>
      </span>
    );
  }

  // 4 天以上顯示簡短月/日
  const formattedDate = dueDate.length >= 10 ? `${parseInt(dueDate.slice(5, 7), 10)}/${parseInt(dueDate.slice(8, 10), 10)}` : dueDate;
  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
      <Calendar className="w-3 h-3 text-slate-400" />
      <span>{formattedDate}</span>
    </span>
  );
}

export const TodoTab: React.FC<TodoTabProps> = ({
  data,
  hideDone,
  onToggleTodo,
  onOpenModal,
}) => {
  // 排序優先序（純 Checklist）：
  // 1. 未完成優先於已完成
  // 2. 未完成項目中：有 deadline（即將到期者）排在最前
  // 3. 原始順序 (rowIndex)
  const sortedData = [...data].sort((a, b) => {
    // 未完成優先
    if (a.isDone !== b.isDone) {
      return a.isDone ? 1 : -1;
    }

    // 未完成項目中，有截止日期者優先排序（先到期先做）
    if (!a.isDone && !b.isDone) {
      if (a.dueDate && b.dueDate) {
        const dateCompare = a.dueDate.localeCompare(b.dueDate);
        if (dateCompare !== 0) return dateCompare;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }
    }

    return (a.rowIndex || 0) - (b.rowIndex || 0);
  });

  const filteredItems = sortedData.filter((item) => {
    if (hideDone && item.isDone) return false;
    return true;
  });

  return (
    <div className="space-y-3 pb-20">
      {/* Top Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          待辦 ({filteredItems.length})
        </h2>
        <button
          onClick={() => onOpenModal()}
          className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer select-none whitespace-nowrap shadow-xs transition-all active:scale-95 flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增</span>
        </button>
      </div>

      {/* Empty State or Flat Checklist */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          尚無待辦事項 ✨
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const dueBadge = getDueDateBadge(item.dueDate, item.isDone);

            return (
              <div
                key={item.id || item.rowIndex}
                className={`bg-white border rounded-2xl p-4 flex justify-between items-center transition-all duration-200 ${
                  item.isDone
                    ? 'border-slate-100 opacity-40 bg-slate-50'
                    : 'border-slate-100 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div className="flex-1 pr-4 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3
                      className={`text-base font-extrabold text-slate-900 leading-tight ${
                        item.isDone ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      <span>{item.task}</span>
                    </h3>
                    {dueBadge}
                  </div>

                  {item.note && (
                    <div className="text-sm text-slate-500 font-medium mt-1.5 leading-relaxed whitespace-pre-line">
                      {linkifyText(item.note.replace(/<br\s*\/?>/gi, '\n'))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => onOpenModal(item)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90"
                    title="編輯"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <input
                    type="checkbox"
                    checked={item.isDone}
                    onChange={() => onToggleTodo(item.rowIndex, item.isDone, item.id)}
                    className="w-5 h-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer transition-transform active:scale-90"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
