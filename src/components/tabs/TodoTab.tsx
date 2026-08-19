'use client';

import React from 'react';
import { TodoItem } from '@/types/trip';
import { compareTodoCategories } from '@/lib/todoCategories';
import { linkifyText } from '@/lib/linkify';
import { Plus, Edit3 } from 'lucide-react';

interface TodoTabProps {
  data: TodoItem[];
  hideDone: boolean;
  onToggleTodo: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: TodoItem) => void;
}

export const TodoTab: React.FC<TodoTabProps> = ({
  data,
  hideDone,
  onToggleTodo,
  onOpenModal,
}) => {
  // Sort by category (fixed priority order), then by rowIndex
  const sortedData = [...data].sort((a, b) => {
    const catA = a.category || '其他';
    const catB = b.category || '其他';
    const catCompare = compareTodoCategories(catA, catB);
    if (catCompare !== 0) return catCompare;
    return a.rowIndex - b.rowIndex;
  });

  const filteredItems = sortedData.filter((item) => {
    if (hideDone && item.isDone) return false;
    return true;
  });

  // Group by category
  const groupedByCategory: Record<string, TodoItem[]> = {};
  filteredItems.forEach((item) => {
    const cat = item.category || '其他';
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(item);
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Top Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          待辦事項 (共 {filteredItems.length} 項)
        </h2>
        <button
          onClick={() => onOpenModal()}
          className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer select-none whitespace-nowrap shadow-xs transition-all active:scale-95 flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增待辦</span>
        </button>
      </div>

      {/* Empty State or Category Groups */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          目前沒有待辦事項 ✨
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
              {category}
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.rowIndex}
                  className={`bg-white border rounded-2xl p-4 flex justify-between items-center transition-all duration-200 ${
                    item.isDone
                      ? 'border-slate-100 opacity-40 bg-slate-50'
                      : 'border-slate-100 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex-1 pr-4 min-w-0">
                    <h3
                      className={`text-base font-extrabold text-slate-900 leading-tight ${
                        item.isDone ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      <span>{item.task}</span>
                    </h3>
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
                      onChange={() => onToggleTodo(item.rowIndex, item.isDone)}
                      className="w-5 h-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer transition-transform active:scale-90"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
