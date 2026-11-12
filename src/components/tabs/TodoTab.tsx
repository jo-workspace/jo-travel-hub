'use client';

import React, { useMemo } from 'react';
import { TodoItem } from '@/types/trip';
import { normalizeDateToYMD, parseYMD } from '@/lib/tripDate';
import { getTodoDueDiffDays, getTodayRef } from '@/lib/todoUtils';
import { Plus, CheckSquare, Check, Link2, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface TodoTabProps {
  data: TodoItem[];
  hideDone: boolean;
  timezone?: string;
  onToggleHideDone?: () => void;
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

/** 依據截止日期計算極簡低噪日期標籤 */
function getDueDateBadge(dueDate?: string, isDone?: boolean, todayMs?: number, timezone?: string) {
  if (!dueDate || isDone) return null;

  const dueNorm = normalizeDateToYMD(dueDate);
  if (!dueNorm) return null;

  const diffDays = getTodoDueDiffDays(dueNorm, todayMs, timezone);
  if (diffDays === null) return null;

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 whitespace-nowrap">
        逾期 {Math.abs(diffDays)} 天
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 whitespace-nowrap">
        今天
      </span>
    );
  }
  if (diffDays === 1) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        明天
      </span>
    );
  }
  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50/70 text-amber-700 border border-amber-200/70 whitespace-nowrap">
        {diffDays} 天後
      </span>
    );
  }

  // 更久之後僅顯示純淨月/日，降低視覺壓迫
  const parts = dueNorm.split('-');
  const formattedDate = parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : dueNorm;
  return (
    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap pt-0.5">
      {formattedDate}
    </span>
  );
}

export const TodoTab: React.FC<TodoTabProps> = ({
  data,
  hideDone,
  timezone,
  onToggleHideDone,
  onToggleTodo,
  onOpenModal,
}) => {
  const { todayMs } = useMemo(() => getTodayRef(timezone), [timezone]);

  const { totalCount, doneCount, unfinishedCount, progressPct } = useMemo(() => {
    const total = data.length;
    const done = data.filter((t) => t.isDone).length;
    const unfinished = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { totalCount: total, doneCount: done, unfinishedCount: unfinished, progressPct: pct };
  }, [data]);

  // 依照截止日期由近到遠分組與嚴格升冪排序
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

      const diffDays = getTodoDueDiffDays(item.dueDate, todayMs, timezone);
      if (diffDays === null) {
        nodate.push(item);
      } else if (diffDays < 0) {
        overdue.push(item);
      } else if (diffDays <= 7) {
        upcoming.push(item);
      } else {
        later.push(item);
      }
    });

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

    return [
      { key: 'overdue', title: '已逾期', titleClass: 'text-rose-600', items: overdue },
      { key: 'upcoming', title: '7 天內', titleClass: 'text-amber-700', items: upcoming },
      { key: 'later', title: '更久之後', titleClass: 'text-slate-500', items: later },
      { key: 'nodate', title: '無期限', titleClass: 'text-slate-400', items: nodate },
      { key: 'completed', title: '已完成', titleClass: 'text-slate-400', items: completed },
    ].filter((g) => g.items.length > 0);
  }, [data, hideDone, todayMs, timezone]);

  return (
    <div className="space-y-4 pb-24">
      {/* 頂部極簡進度與已完成切換列 */}
      {totalCount > 0 && (
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-600">
                {unfinishedCount === 0 ? '全部完成' : `待辦 ${unfinishedCount}`}
              </span>
              {doneCount > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-[11px]">
                    {doneCount}/{totalCount}
                  </span>
                </>
              )}
            </div>

            {doneCount > 0 && onToggleHideDone && (
              <button
                type="button"
                onClick={onToggleHideDone}
                className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer py-0.5 px-1.5 -mr-1.5 rounded-md hover:bg-slate-100"
                title={hideDone ? '顯示已完成' : '隱藏已完成'}
              >
                {hideDone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{hideDone ? `已完成 (${doneCount})` : '隱藏已完成'}</span>
              </button>
            )}
          </div>

          <div className="h-0.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                unfinishedCount === 0 ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty States or Grouped Checklist */}
      {totalCount === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 text-center">
          <CheckSquare className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
          <p className="text-slate-600 font-bold text-sm mb-3">尚無待辦</p>
          <button
            type="button"
            onClick={() => onOpenModal()}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新增待辦</span>
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-10 text-center space-y-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <p className="text-slate-700 font-bold text-sm">已全部完成</p>
          {doneCount > 0 && onToggleHideDone && (
            <button
              type="button"
              onClick={onToggleHideDone}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              查看已完成 ({doneCount})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isQuiet = group.key === 'later' || group.key === 'nodate';

            return (
              <div key={group.key} className="space-y-2">
                {/* Group Section Header */}
                <div className="flex items-center px-1 pt-0.5">
                  <h3 className={`text-[11px] font-bold tracking-wider ${group.titleClass}`}>
                    <span>{group.title}</span>
                    <span className="mx-1 opacity-50">·</span>
                    <span className="font-mono opacity-80">{group.items.length}</span>
                  </h3>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const dueBadge = getDueDateBadge(item.dueDate, item.isDone, todayMs, timezone);
                    const { text: cleanNote, links } = parseNoteAndLinks(item.note);

                    return (
                      <div
                        key={item.id || item.rowIndex}
                        onClick={() => onOpenModal(item)}
                        className={`flex items-start gap-2 transition-all duration-150 border cursor-pointer ${
                          item.isDone
                            ? 'rounded-xl px-3.5 py-3 border-slate-100 opacity-50 hover:opacity-75 bg-slate-50/40'
                            : isQuiet
                            ? 'rounded-xl px-3.5 py-3 bg-slate-50/80 border-slate-200/60 hover:bg-slate-100/70'
                            : 'rounded-2xl p-3.5 sm:p-4 bg-white border-slate-200/70 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        {/* 左側擴大觸控熱區勾選框 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTodo(item.rowIndex, item.isDone, item.id);
                          }}
                          aria-label={item.isDone ? `標記「${item.task}」為未完成` : `標記「${item.task}」為已完成`}
                          className="-ml-2 -mt-2 w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl group/chk cursor-pointer"
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              item.isDone
                                ? 'bg-slate-400 border-slate-400 text-white'
                                : isQuiet
                                ? 'border-slate-300 bg-white/80 group-hover/chk:border-slate-500'
                                : 'border-slate-300 bg-white group-hover/chk:border-slate-900'
                            }`}
                          >
                            {item.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </button>

                        {/* 任務內容與右側對齊截止日 */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-3">
                            <h4
                              className={`text-[15px] leading-snug break-words ${
                                item.isDone
                                  ? 'line-through text-slate-400 font-medium'
                                  : isQuiet
                                  ? 'text-slate-600 font-medium'
                                  : 'text-slate-900 font-bold'
                              }`}
                            >
                              {item.task}
                            </h4>

                            {dueBadge && <div className="flex-shrink-0 pt-0.5">{dueBadge}</div>}
                          </div>

                          {cleanNote && (
                            <div
                              className={`mt-1 leading-relaxed whitespace-pre-line ${
                                isQuiet
                                  ? 'text-xs text-slate-400 font-normal'
                                  : 'text-xs sm:text-sm text-slate-500 font-normal'
                              }`}
                            >
                              {cleanNote}
                            </div>
                          )}

                          {links.length > 0 && (
                            <div className="flex items-center flex-wrap gap-1.5 mt-2">
                              {links.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-sky-700 hover:text-sky-800 rounded-lg text-xs font-medium transition-all active:scale-95 border border-slate-200/80 group/link max-w-full cursor-pointer"
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 右下角固定懸浮「＋」按鈕 (FAB) */}
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
