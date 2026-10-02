'use client';

import React, { useState, useMemo } from 'react';
import { AccommodationItem, AccommodationStatus } from '@/types/trip';
import {
  Building2,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  ChevronDown,
  ChevronUp,
  BedDouble,
  DollarSign,
  User,
  X,
  RotateCcw,
} from 'lucide-react';

interface AccommodationsTabProps {
  accommodations: AccommodationItem[];
  tripId: string;
  fxRate?: number;
  foreignCurrency?: string;
  timezone?: string;
  companions?: string;
  startDate?: string;
  onSave: (item: Partial<AccommodationItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: AccommodationStatus) => Promise<void>;
  onOpenModal: (item?: AccommodationItem | null) => void;
  showToast?: (msg: string) => void;
}

export const AccommodationsTab: React.FC<AccommodationsTabProps> = ({
  accommodations = [],
  tripId,
  fxRate = 1,
  foreignCurrency = '',
  timezone = 'Asia/Taipei',
  companions = 'Jo, Will',
  startDate = '',
  onSave,
  onDelete,
  onStatusChange,
  onOpenModal,
  showToast = (msg: string) => alert(msg),
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState<boolean>(false);

  // 計算取消倒數資訊
  const getDeadlineStatus = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const deadlineTime = new Date(deadlineStr).getTime();
    if (isNaN(deadlineTime)) return null;

    const now = Date.now();
    const diffMs = deadlineTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return { status: 'expired', label: '已過期', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    if (diffHours <= 24) {
      return { status: 'critical', label: `即將截止 (${diffHours}小時後)`, color: 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse' };
    }
    if (diffDays <= 3) {
      return { status: 'warning', label: `剩餘 ${diffDays} 天截止`, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    return { status: 'safe', label: `截止: ${deadlineStr.replace('T', ' ')}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  // 複製訂單號
  const handleCopyRef = async (ref: string, id: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedId(id);
      showToast('已複製訂單編號');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast(`複製失敗：${ref}`);
    }
  };

  // 一鍵確認保留，並詢問是否將同區間其他候補轉為待退訂
  const handleConfirmKeep = async (item: AccommodationItem) => {
    await onStatusChange(item.id, 'confirmed');

    // 尋找同入住日期的其他 candidate
    const rivals = accommodations.filter(
      (x) =>
        x.id !== item.id &&
        x.status === 'candidate' &&
        x.checkInDate === item.checkInDate &&
        Boolean(item.checkInDate)
    );

    if (rivals.length > 0) {
      const rivalNames = rivals.map((r) => r.name).join('、');
      if (confirm(`已保留「${item.name}」！\n是否一併將同期的候補房型（${rivalNames}）標記為「待去平台退訂」？`)) {
        for (const rival of rivals) {
          await onStatusChange(rival.id, 'pending_cancel');
        }
        showToast('已更新狀態，別忘了去平台取消訂單喔！');
      }
    } else {
      showToast(`已將「${item.name}」設為保留`);
    }
  };

  // 統計指標
  const stats = useMemo(() => {
    const candidateCount = accommodations.filter((a) => a.status === 'candidate').length;
    const confirmedCount = accommodations.filter((a) => a.status === 'confirmed').length;
    const pendingCancelCount = accommodations.filter((a) => a.status === 'pending_cancel').length;
    const cancelledCount = accommodations.filter((a) => a.status === 'cancelled').length;

    // 即將在 3 天內截止的未退訂房型（排除已退訂）
    const urgentItems = accommodations.filter((a) => {
      if (a.status === 'cancelled') return false;
      const d = getDeadlineStatus(a.freeCancellationDeadline);
      return d && (d.status === 'critical' || d.status === 'warning');
    });

    return {
      total: accommodations.length,
      candidateCount,
      confirmedCount,
      pendingCancelCount,
      cancelledCount,
      urgentItems,
    };
  }, [accommodations]);

  // 分組邏輯：依「入住日期區間」分組呈現 PK
  const groupedAccommodations = useMemo(() => {
    let filtered = accommodations;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((a) => a.status === filterStatus);
    } else if (!showCancelled) {
      // 預設全部檢視隱藏已退訂
      filtered = filtered.filter((a) => a.status !== 'cancelled');
    }

    // 分組鍵：`checkInDate ~ checkOutDate` 或 `未定日期`
    const groups: Record<string, { label: string; items: AccommodationItem[]; nights?: number }> = {};

    filtered.forEach((item) => {
      const key = item.checkInDate ? `${item.checkInDate}_${item.checkOutDate || 'same'}` : 'undated';
      if (!groups[key]) {
        let label = '未定入住日期';
        let nights: number | undefined = undefined;

        if (item.checkInDate) {
          const inDate = item.checkInDate.replace(/^\d{4}-/, '');
          const outDate = item.checkOutDate ? item.checkOutDate.replace(/^\d{4}-/, '') : '';

          if (item.checkOutDate) {
            const d1 = new Date(item.checkInDate).getTime();
            const d2 = new Date(item.checkOutDate).getTime();
            if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
              nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
            }
          }

          label = outDate ? `${inDate} ➔ ${outDate}` : inDate;
        }

        groups[key] = {
          label,
          items: [],
          nights,
        };
      }
      groups[key].items.push(item);
    });

    // 排序分組（依入住日）
    return Object.entries(groups).sort(([aKey], [bKey]) => {
      if (aKey === 'undated') return 1;
      if (bKey === 'undated') return -1;
      return aKey.localeCompare(bKey);
    });
  }, [accommodations, filterStatus, showCancelled]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      {/* 1. 頂部緊湊統計 & 快捷工具列 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto py-1">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <BedDouble className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">總預訂</span>
            <span className="font-bold text-white text-xs sm:text-sm">{stats.total}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-300">抉擇中</span>
            <span className="font-bold text-amber-400 text-xs sm:text-sm">{stats.candidateCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-300">已保留</span>
            <span className="font-bold text-emerald-400 text-xs sm:text-sm">{stats.confirmedCount}</span>
          </div>

          {stats.pendingCancelCount > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/15 rounded-xl border border-rose-500/30 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs text-rose-300 font-bold">待退訂</span>
              <span className="font-bold text-rose-400 text-xs sm:text-sm">{stats.pendingCancelCount}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onOpenModal(null)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer shadow-md shadow-amber-400/20 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>新增預訂</span>
        </button>
      </div>

      {/* 2. 免費取消警示橫幅（若有即將到期者） */}
      {stats.urgentItems.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/60 to-amber-950/40 border border-rose-500/40 rounded-2xl p-3 sm:p-4 text-slate-200 shadow-md">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs sm:text-sm mb-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>免費取消期限即將截止警示</span>
          </div>
          <div className="space-y-1">
            {stats.urgentItems.map((u) => {
              const d = getDeadlineStatus(u.freeCancellationDeadline);
              return (
                <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60">
                  <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-md">{u.name}</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${d?.color}`}>{d?.label}</span>
                    {u.bookingUrl && (
                      <a
                        href={u.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center space-x-0.5 text-[11px]"
                      >
                        <span>去平台</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 狀態切換膠囊 */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center space-x-1.5">
          {[
            { id: 'all', label: '全部' },
            { id: 'candidate', label: '抉擇中' },
            { id: 'confirmed', label: '已保留' },
            { id: 'pending_cancel', label: '待退訂' },
            { id: 'cancelled', label: '已退訂' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filterStatus === 'all' && stats.cancelledCount > 0 && (
          <button
            onClick={() => setShowCancelled(!showCancelled)}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 flex-shrink-0"
          >
            <span>{showCancelled ? '隱藏已退訂' : `顯示已退訂 (${stats.cancelledCount})`}</span>
          </button>
        )}
      </div>

      {/* 4. 房型 PK 與分組清單 */}
      {groupedAccommodations.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-slate-300 font-bold text-base mb-1">尚未建立住宿預訂</h4>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mb-5">
            將您與旅伴在各平台預訂的免費取消房型記錄在此，隨時掌握截止倒數與同梯比價！
          </p>
          <button
            onClick={() => onOpenModal(null)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>新增第一間預訂</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedAccommodations.map(([groupKey, group]) => {
            const hasMultipleCandidates = group.items.filter((i) => i.status === 'candidate').length > 1;

            return (
              <div key={groupKey} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                      {group.label}
                    </h3>
                    {group.nights !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold border border-slate-700/60">
                        {group.nights} 晚
                      </span>
                    )}
                  </div>

                  {hasMultipleCandidates && (
                    <span className="text-[11px] text-amber-400 font-semibold flex items-center space-x-1">
                      <span>🥊 {group.items.filter((i) => i.status === 'candidate').length} 間比價中</span>
                    </span>
                  )}
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {group.items.map((item) => {
                    const deadline = getDeadlineStatus(item.freeCancellationDeadline);
                    const isConfirmed = item.status === 'confirmed';
                    const isPendingCancel = item.status === 'pending_cancel';
                    const isCancelled = item.status === 'cancelled';

                    // 估算台幣金額
                    let twdEstimate: number | null = null;
                    if (item.price !== undefined && item.currency) {
                      if (item.currency.toUpperCase() === 'TWD') {
                        twdEstimate = item.price;
                      } else if (fxRate > 0) {
                        twdEstimate = Math.round(item.price * fxRate);
                      }
                    }

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between ${
                          isConfirmed
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                            : isPendingCancel
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : isCancelled
                            ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Card Top: Tags & Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              {/* Platform Badge */}
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                                {item.platform || 'Agoda'}
                              </span>

                              {/* Booker Badge */}
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-sky-400/10 text-sky-300 border border-sky-400/20 flex items-center space-x-1">
                                <User className="w-2.5 h-2.5" />
                                <span>{item.booker || 'Jo'}</span>
                              </span>

                              {/* Status Tag */}
                              {isConfirmed && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  ✓ 已保留
                                </span>
                              )}
                              {isPendingCancel && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  ⚠️ 待去平台退訂
                                </span>
                              )}
                              {isCancelled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  ✕ 已退訂
                                </span>
                              )}
                            </div>

                            {/* Price */}
                            {item.price !== undefined && (
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                                  {item.currency} {item.price.toLocaleString()}
                                </span>
                                {twdEstimate && item.currency?.toUpperCase() !== 'TWD' && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ≈ NT$ {twdEstimate.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Hotel Name & Area */}
                          <div className="mb-2">
                            <h4 className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug">
                              {item.name}
                            </h4>
                            {item.cityArea && (
                              <div className="flex items-center space-x-1 text-slate-400 text-xs mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span>{item.cityArea}</span>
                              </div>
                            )}
                          </div>

                          {/* Room Type */}
                          {item.roomType && (
                            <div className="text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/40 mb-2.5">
                              {item.roomType}
                            </div>
                          )}

                          {/* Free Cancellation Deadline */}
                          {deadline && !isCancelled && (
                            <div className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center justify-between mb-2.5 ${deadline.color}`}>
                              <div className="flex items-center space-x-1.5 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{deadline.label}</span>
                              </div>
                              {item.freeCancellationDeadline && (
                                <span className="text-[10px] opacity-80 font-mono">
                                  {item.freeCancellationDeadline.replace('T', ' ')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Note */}
                          {item.note && (
                            <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                              {item.note}
                            </p>
                          )}
                        </div>

                        {/* Card Bottom: Quick Links & Actions */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                          {/* Links (Order / Map / Ref) */}
                          <div className="flex items-center space-x-1.5">
                            {item.bookingUrl && (
                              <a
                                href={item.bookingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="開啟平台訂單"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {item.mapUrl && (
                              <a
                                href={item.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="開啟地圖導航"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {item.bookingRef && (
                              <button
                                type="button"
                                onClick={() => handleCopyRef(item.bookingRef!, item.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center space-x-1 ${
                                  copiedId === item.id
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                                title="複製訂單號"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{item.bookingRef}</span>
                              </button>
                            )}
                          </div>

                          {/* State Actions & Edit */}
                          <div className="flex items-center space-x-1">
                            {!isConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleConfirmKeep(item)}
                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                                title="保留此間"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">保留</span>
                              </button>
                            )}

                            {!isCancelled ? (
                              <button
                                type="button"
                                onClick={() => onStatusChange(item.id, isPendingCancel ? 'cancelled' : 'pending_cancel')}
                                className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1 ${
                                  isPendingCancel
                                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold'
                                    : 'bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300'
                                }`}
                                title={isPendingCancel ? '確認已在平台完成退訂' : '標記為待退訂'}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isPendingCancel ? '已退訂' : '捨棄'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStatusChange(item.id, 'candidate')}
                                className="px-2 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                title="恢復為抉擇中"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenModal(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="編輯"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
    </div>
  );
};
