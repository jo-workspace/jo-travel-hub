'use client';

import React, { useMemo } from 'react';
import { TodoItem } from '@/types/trip';
import { linkifyText } from '@/lib/linkify';
import { normalizeDateToYMD, parseYMD } from '@/lib/tripDate';
import { Plus, Edit3, Calendar, CheckSquare, Link2, ExternalLink } from 'lucide-react';

interface TodoTabProps {
  data: TodoItem[];
  hideDone: boolean;
  onToggleTodo: (rowIndex: number, currentStatus: boolean, id?: string) => void;
  onOpenModal: (item?: TodoItem) => void;
}

/** 解析備註文字，抽離出結構化網址標籤並保留純文字 */
function parseNoteAndLinks(rawNote?: string): { text: string; links: Array<{ url: string; title: string }> } {
  if (!rawNote) return { text: '', links: [] };

  const urlRegex = /https?:\/\/[^\s]+/g;
  const links: Array<{ url: string; title: string }> = [];
  const cleanText = rawNote
    .replace(urlRegex, (url) => {
      const cleanUrl = url.replace(/[.,;:!?)\]}'"]+$/, '');
      let title = '相關連結';
      try {
        const parsed = new URL(cleanUrl);
        title = parsed.hostname.replace(/^www\./, '');
      } catch {
        title = '外部連結';
      }
      links.push({ url: cleanUrl, title });
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: cleanText, links };
}

/** 依據截止日期計算徽章樣式與文字 */
function getDueDateBadge(dueDate?: string, isDone?: boolean) {
  if (!dueDate || isDone) return null;

  const dueNorm = normalizeDateToYMD(dueDate);
  if (!dueNorm) return null;

  // 使用本地日期計算差距天數 (消除時區偏差)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const todayMs = parseYMD(todayStr);
  const dueMs = parseYMD(dueNorm);
  if (todayMs === null || dueMs === null) return null;

  const diffDays = Math.round((dueMs - todayMs) / 86400000);

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

  // 4 天以上顯示簡短月/日 (例如 8/28)
  const parts = dueNorm.split('-');
  const formattedDate = parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : dueNorm;
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
  const todayMs = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    return parseYMD(todayStr) ?? Date.now();
  }, []);

  // 依照截止日期 (DueDate) 與緊迫程度動態小分組，組內嚴格依照 Date 毫秒數升冪排序
  const groups = useMemo(() => {
    const overdue: TodoItem[] = [];
    const upcoming: TodoItem[] = [];
    const later: TodoItem[] = [];
    const nodate: TodoItem[] = [];
    const completed: TodoItem[] = [];

    data.forEach((item) => {
      if (item.isDone) {
        if (!hideDone) {
          completed.push(item);
        }
        return;
      }

      const dueNorm = normalizeDateToYMD(item.dueDate);
      const dueMs = dueNorm ? parseYMD(dueNorm) : null;

      if (!dueNorm || dueMs === null) {
        nodate.push(item);
        return;
      }

      const diffDays = Math.round((dueMs - todayMs) / 86400000);

      if (diffDays < 0) {
        overdue.push(item);
      } else if (diffDays <= 7) {
        upcoming.push(item);
      } else {
        later.push(item);
      }
    });

    // 嚴格升冪排序演算法 (依截止日毫秒數由近到遠升冪，若同日依建立順序 rowIndex)
    const compareDueAsc = (a: TodoItem, b: TodoItem) => {
      const msA = parseYMD(normalizeDateToYMD(a.dueDate) || '') ?? Infinity;
      const msB = parseYMD(normalizeDateToYMD(b.dueDate) || '') ?? Infinity;
      return msA - msB || (a.rowIndex || 0) - (b.rowIndex || 0);
    };

    overdue.sort(compareDueAsc);
    upcoming.sort(compareDueAsc);
    later.sort(compareDueAsc);
    nodate.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
    completed.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));

    const hasActiveTodos = overdue.length > 0 || later.length > 0 || nodate.length > 0;

    return [
      { key: 'overdue', title: '已逾期', badgeClass: 'text-rose-600', icon: '🚨', items: overdue },
      { key: 'upcoming', title: '7 天內', badgeClass: 'text-amber-700', icon: '🔥', items: upcoming },
      { key: 'later', title: '更久之後', badgeClass: 'text-slate-600', icon: '🗓️', items: later },
      { key: 'nodate', title: '無期限', badgeClass: 'text-slate-500', icon: '📌', items: nodate },
      { key: 'completed', title: '已完成', badgeClass: 'text-slate-400', icon: '✓', items: completed },
    ].filter((g) => {
      // 7 天內若目前為 0 件，但其他分組有待辦時，保留此分組以呈現放鬆鼓勵提示
      if (g.key === 'upcoming' && g.items.length === 0) {
        return hasActiveTodos;
      }
      return g.items.length > 0;
    });
  }, [data, hideDone, todayMs]);

  return (
    <div className="space-y-4 pb-20">
      {/* Empty State or Grouped Checklist */}
      {groups.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center shadow-2xs">
          <CheckSquare className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-slate-800 font-bold text-sm mb-3">尚無待辦事項 ✨</h4>
          <button
            onClick={() => onOpenModal()}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新增待辦</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2.5">
              {/* Group Section Header */}
              <div className="flex items-center space-x-1.5 px-1 pt-1">
                <span className="text-sm">{group.icon}</span>
                <h3 className={`text-xs font-black uppercase tracking-wider ${group.badgeClass}`}>
                  <span>{group.title}</span>
                  <span className="ml-1 opacity-75 font-mono">({group.items.length})</span>
                </h3>
              </div>

              {/* Items List or Layback Chill Empty Message */}
              {group.items.length === 0 && group.key === 'upcoming' ? (
                <div className="bg-gradient-to-b from-emerald-50/70 to-teal-50/40 border border-dashed border-emerald-200/90 rounded-3xl py-7 px-5 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2.5 shadow-2xs transition-all">
                  <span className="text-2xl select-none">🌴</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-800/90 tracking-wide">
                    近期無須操心，放輕鬆 Lay back & chill ✨
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                {group.items.map((item) => {
                  const dueBadge = getDueDateBadge(item.dueDate, item.isDone);
                  const isLater = group.key === 'later';
                  const { text: cleanNote, links } = parseNoteAndLinks(item.note);

                  return (
                    <div
                      key={item.id || item.rowIndex}
                      className={`flex justify-between items-start transition-all duration-200 border ${
                        item.isDone
                          ? 'rounded-2xl p-4 border-slate-100 opacity-40 bg-slate-50'
                          : isLater
                          ? 'rounded-xl px-3.5 py-2.5 sm:py-3 bg-slate-50/60 border-slate-200/50 shadow-none hover:bg-slate-100/50'
                          : 'rounded-2xl p-4 bg-white border-slate-100 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      <div className="flex-1 pr-4 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h3
                            className={`text-base leading-tight ${
                              item.isDone
                                ? 'line-through text-slate-400 font-extrabold'
                                : isLater
                                ? 'text-slate-700 font-medium'
                                : 'text-slate-900 font-extrabold'
                            }`}
                          >
                            <span>{item.task}</span>
                          </h3>
                          {dueBadge}
                        </div>

                        {cleanNote && (
                          <div
                            className={`mt-1 leading-relaxed whitespace-pre-line ${
                              isLater
                                ? 'text-xs text-slate-400 font-normal'
                                : 'text-sm text-slate-600 font-medium'
                            }`}
                          >
                            {cleanNote}
                          </div>
                        )}

                        {/* 連結自動縮為精緻膠囊標籤 (Pill Tag) */}
                        {links.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            {links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-sky-700 hover:text-sky-800 rounded-lg text-xs font-semibold transition-all active:scale-95 border border-slate-200/80 shadow-2xs group/link max-w-full cursor-pointer"
                                title={link.url}
                              >
                                <Link2 className="w-3 h-3 text-sky-500 flex-shrink-0" />
                                <span className="truncate max-w-[140px] sm:max-w-[200px]">{link.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/link:text-sky-600 flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 mt-0.5">
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
        ))}
        </div>
      )}

      {/* 右下角固定懸浮「＋」按鈕 (FAB) - 統一住宿頁面樣式與位置 */}
      <button
        type="button"
        onClick={() => onOpenModal()}
        className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 border border-slate-700/50"
        title="新增待辦"
        aria-label="新增待辦"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
