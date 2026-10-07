'use client';

import React, { useState, useMemo } from 'react';
import { AccommodationItem, AccommodationStatus } from '@/types/trip';
import { computeTwdAmount } from '@/components/tabs/ExpensesTab';
import { normalizeDateToYMD, parseYMD, isDateInAccommodationRange } from '@/lib/tripDate';
import {
  Building2,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  MapPin,
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
  itineraryDays?: string[];
  onSave: (item: Partial<AccommodationItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: AccommodationStatus) => Promise<void>;
  onOpenModal: (item?: AccommodationItem | null, defaultDate?: string) => void;
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
  itineraryDays = [],
  onSave,
  onDelete,
  onStatusChange,
  onOpenModal,
  showToast = (msg: string) => alert(msg),
}) => {
  // 分頁狀態：'active' (進行中), 'candidate' (抉擇中), 'confirmed' (已確定), 'pending_cancel' (待退訂), 'cancelled' (已退訂)
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 記錄最近一次保留連動資料，供一鍵「取消確定」復原使用 { winnerId: string, rivalIds: string[] }
  const [lastConfirmedRecord, setLastConfirmedRecord] = useState<{
    winnerId: string;
    rivalIds: string[];
  } | null>(null);

  // 計算取消倒數資訊
  const getDeadlineStatus = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const deadlineTime = new Date(deadlineStr).getTime();
    if (isNaN(deadlineTime)) return null;

    const now = Date.now();
    const diffMs = deadlineTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    const formattedTime = deadlineStr.replace('T', ' ');

    if (diffMs < 0) {
      return { status: 'expired', label: `已過免費取消期限 (${formattedTime})`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (diffHours <= 24) {
      return { status: 'critical', label: `即將截止！剩 ${diffHours} 小時 (${formattedTime})`, color: 'text-rose-700 bg-rose-100 border-rose-300 animate-pulse font-bold' };
    }
    if (diffDays <= 3) {
      return { status: 'warning', label: `剩 ${diffDays} 天截止 (${formattedTime})`, color: 'text-amber-800 bg-amber-50 border-amber-300 font-bold' };
    }
    return { status: 'safe', label: `${formattedTime} 前可免費取消`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  // 複製訂單號
  const handleCopyRef = async (ref: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedId(id);
      showToast('已複製訂單編號');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast(`複製失敗：${ref}`);
    }
  };

  // 一鍵確定房型：自動將同梯候補轉為「待退訂」，並儲存還原點
  const handleConfirmAccommodation = async (item: AccommodationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    await onStatusChange(item.id, 'confirmed');

    // 尋找同入住日期的其他 candidate
    const rivals = accommodations.filter(
      (x) =>
        x.id !== item.id &&
        x.status === 'candidate' &&
        x.checkInDate === item.checkInDate &&
        Boolean(item.checkInDate)
    );

    const rivalIds: string[] = [];
    if (rivals.length > 0) {
      for (const rival of rivals) {
        await onStatusChange(rival.id, 'pending_cancel');
        rivalIds.push(rival.id);
      }
      showToast(`已確定「${item.name}」！其餘 ${rivals.length} 間候補已自動轉為待退訂`);
    } else {
      showToast(`已將「${item.name}」設為已確定`);
    }

    setLastConfirmedRecord({
      winnerId: item.id,
      rivalIds,
    });
  };

  // 取消確定（誤觸還原機制）：將自身與同梯被轉待退訂的房型全部恢復為 candidate
  const handleUndoConfirmation = async (item: AccommodationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    await onStatusChange(item.id, 'candidate');

    if (lastConfirmedRecord && lastConfirmedRecord.winnerId === item.id) {
      for (const rId of lastConfirmedRecord.rivalIds) {
        await onStatusChange(rId, 'candidate');
      }
      setLastConfirmedRecord(null);
      showToast(`已取消確定「${item.name}」，同梯房型已恢復為抉擇中`);
    } else {
      showToast(`已將「${item.name}」恢復為抉擇中`);
    }
  };

  // 統計指標
  const stats = useMemo(() => {
    const candidateCount = accommodations.filter((a) => a.status === 'candidate').length;
    const confirmedCount = accommodations.filter((a) => a.status === 'confirmed').length;
    const pendingCancelCount = accommodations.filter((a) => a.status === 'pending_cancel').length;
    const cancelledCount = accommodations.filter((a) => a.status === 'cancelled').length;
    const activeCount = candidateCount + confirmedCount + pendingCancelCount;

    // 即將在 3 天內截止的未退訂房型（排除已退訂）
    const urgentItems = accommodations.filter((a) => {
      if (a.status === 'cancelled') return false;
      const d = getDeadlineStatus(a.freeCancellationDeadline);
      return d && (d.status === 'critical' || d.status === 'warning');
    });

    return {
      total: accommodations.length,
      activeCount,
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
    if (filterStatus === 'active') {
      // 進行中：排除已退訂
      filtered = filtered.filter((a) => a.status !== 'cancelled');
    } else {
      filtered = filtered.filter((a) => a.status === filterStatus);
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
  }, [accommodations, filterStatus]);

  // 推算尚未安排住宿的過夜夜晚（排除最後一天）
  const missingNights = useMemo(() => {
    if (!startDate || !itineraryDays || itineraryDays.length <= 1) return [];

    const sortedDays = [...itineraryDays].sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '')) || 999;
      const numB = parseInt(b.replace(/[^0-9]/g, '')) || 999;
      return numA - numB;
    });

    const startMs = parseYMD(startDate);
    if (startMs === null) return [];

    const activeAccs = accommodations.filter((a) => a.status !== 'cancelled');
    const missing: Array<{ dayLabel: string; dateStr: string; dateLabel: string }> = [];

    for (let i = 0; i < sortedDays.length - 1; i++) {
      const dayLabel = sortedDays[i];
      const dayNum = parseInt(dayLabel.replace(/[^0-9]/g, ''), 10);
      if (isNaN(dayNum) || dayNum <= 0) continue;

      const targetDate = new Date(startMs + (dayNum - 1) * 86400000);
      const y = targetDate.getUTCFullYear();
      const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dateLabel = `${targetDate.getUTCMonth() + 1}/${targetDate.getUTCDate()}`;

      const isCovered = activeAccs.some((a) =>
        isDateInAccommodationRange(dateStr, a.checkInDate, a.checkOutDate)
      );

      if (!isCovered) {
        missing.push({ dayLabel, dateStr, dateLabel });
      }
    }

    return missing;
  }, [startDate, itineraryDays, accommodations]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      {/* 1. 免費取消警示橫幅（若有即將到期者） */}
      {stats.urgentItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 sm:p-4 text-slate-800 shadow-2xs">
          <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs sm:text-sm mb-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>免費取消即將截止</span>
          </div>
          <div className="space-y-1">
            {stats.urgentItems.map((u) => {
              const d = getDeadlineStatus(u.freeCancellationDeadline);
              return (
                <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-rose-100 shadow-2xs">
                  <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-md">{u.name}</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${d?.color}`}>{d?.label}</span>
                    {u.bookingUrl && (
                      <a
                        href={u.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                        title="前往平台查看訂單"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 狀態切換膠囊（數字一體化） */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center space-x-1.5">
          {[
            { id: 'active', label: `進行中${stats.activeCount > 0 ? ` (${stats.activeCount})` : ''}` },
            { id: 'candidate', label: `抉擇中${stats.candidateCount > 0 ? ` (${stats.candidateCount})` : ''}` },
            { id: 'confirmed', label: `已確定${stats.confirmedCount > 0 ? ` (${stats.confirmedCount})` : ''}` },
            { id: 'pending_cancel', label: `待退訂${stats.pendingCancelCount > 0 ? ` (${stats.pendingCancelCount})` : ''}` },
            { id: 'cancelled', label: `已退訂${stats.cancelledCount > 0 ? ` (${stats.cancelledCount})` : ''}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 房型 PK 與分組清單 */}
      {groupedAccommodations.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center shadow-2xs">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-slate-800 font-bold text-sm mb-3">
            {filterStatus === 'cancelled' ? '目前沒有已退訂的房型紀錄' : '尚未建立住宿預訂'}
          </h4>
          {filterStatus !== 'cancelled' && (
            <button
              onClick={() => onOpenModal(null)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>新增預訂</span>
            </button>
          )}
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
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                      {group.label}
                    </h3>
                    {group.nights !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono font-bold border border-slate-300">
                        {group.nights} 晚
                      </span>
                    )}
                  </div>

                  {hasMultipleCandidates && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-bold">
                      {group.items.filter((i) => i.status === 'candidate').length} 間候選
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

                    // 正確計算台幣金額（自動依據 JPY 等逆向匯率正確除算）
                    let twdEstimate: number | null = null;
                    if (item.price !== undefined && item.currency) {
                      twdEstimate = Math.round(
                        computeTwdAmount(
                          item.price,
                          item.currency,
                          fxRate,
                          foreignCurrency || item.currency
                        )
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => onOpenModal(item)}
                        className={`rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between cursor-pointer hover:border-slate-300 active:scale-[0.995] ${
                          isConfirmed
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                            : isPendingCancel
                            ? 'bg-rose-50/40 border-rose-300 shadow-xs'
                            : isCancelled
                            ? 'bg-slate-100/60 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200/90 shadow-xs'
                        }`}
                      >
                        {/* Card Body */}
                        <div>
                          {/* Card Header: 飯店名稱 (第一焦點) ＋ 價格 */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              {/* 狀態標籤（僅非 candidate 時提示，不喧賓奪主） */}
                              {isConfirmed && (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md font-black bg-emerald-100 text-emerald-800 border border-emerald-300 mb-1">
                                  ✓ 已確定
                                </span>
                              )}
                              {isPendingCancel && (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md font-black bg-rose-100 text-rose-800 border border-rose-300 mb-1">
                                  ⚠️ 待退訂
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-200 text-slate-600 border border-slate-300 mb-1">
                                  ✕ 已退訂
                                </span>
                              )}

                              <h4 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-snug">
                                {item.name}
                              </h4>

                              {/* 次要資訊：區域 · 平台 · 訂購人 */}
                              <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1 flex-wrap">
                                {item.cityArea && (
                                  <span className="flex items-center space-x-0.5 text-slate-600 font-medium">
                                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span>{item.cityArea}</span>
                                  </span>
                                )}
                                {item.cityArea && <span className="text-slate-300">·</span>}
                                <span className="text-slate-500 font-medium">{item.platform || 'Agoda'}</span>
                                {item.booker && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-slate-500">{item.booker}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 價格區塊 */}
                            {item.price !== undefined && (
                              <div className="text-right flex-shrink-0">
                                <div className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight leading-none">
                                  <span className="text-xs font-bold text-slate-500 mr-1">{item.currency}</span>
                                  {item.price.toLocaleString()}
                                </div>
                                {twdEstimate && item.currency?.toUpperCase() !== 'TWD' && (
                                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                                    ≈ NT$ {twdEstimate.toLocaleString()}
                                  </div>
                                )}
                                {group.nights && group.nights > 1 && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    均 {item.currency} {Math.round(item.price / group.nights).toLocaleString()}/晚
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 房型（通透無厚重輸入框） */}
                          {item.roomType && (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-700 my-2">
                              <BedDouble className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">{item.roomType}</span>
                            </div>
                          )}

                          {/* 免費取消截止日（單一精煉，無重複字串） */}
                          {deadline && !isCancelled && (
                            <div className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 mb-2 ${deadline.color}`}>
                              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-semibold">{deadline.label}</span>
                            </div>
                          )}

                          {/* 備註 */}
                          {item.note && (
                            <p className="text-xs text-slate-500 my-1.5 line-clamp-2 leading-relaxed">
                              {item.note}
                            </p>
                          )}
                        </div>

                        {/* Card Bottom: 精煉操作工具列 */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                          {/* 外部連結與訂單號（僅「已確定」才顯示訂單號，抉擇中專注比價） */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {item.bookingUrl && (
                              <a
                                href={item.bookingUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
                                title={`前往 ${item.platform || '平台'} 查看訂單`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {item.mapUrl && (
                              <a
                                href={item.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
                                title="在 Google Maps 查看評價與地圖"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {isConfirmed && item.bookingRef && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyRef(item.bookingRef!, item.id, e)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors flex items-center space-x-1 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                                  copiedId === item.id
                                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                                title={`複製訂單號：${item.bookingRef}`}
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedId === item.id ? '已複製' : item.bookingRef}</span>
                              </button>
                            )}
                          </div>

                          {/* 狀態切換 */}
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {isConfirmed && (
                              <button
                                type="button"
                                onClick={(e) => handleUndoConfirmation(item, e)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer border border-slate-300 shadow-2xs active:scale-95 whitespace-nowrap flex-shrink-0"
                                title="取消確定（恢復為抉擇中，同梯退訂房型亦將一併恢復）"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>取消確定</span>
                              </button>
                            )}

                            {item.status === 'candidate' && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleConfirmAccommodation(item, e)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer border border-emerald-200 shadow-2xs active:scale-95 whitespace-nowrap flex-shrink-0"
                                  title="確定此房型（同梯候補將自動轉為待退訂）"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>確定</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(item.id, 'pending_cancel');
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs transition-colors cursor-pointer border border-slate-200 whitespace-nowrap flex-shrink-0 flex items-center space-x-1"
                                  title="捨棄此房型（轉入待退訂）"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>捨棄</span>
                                </button>
                              </>
                            )}

                            {isPendingCancel && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(item.id, 'cancelled');
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer border border-rose-300 active:scale-95 whitespace-nowrap flex-shrink-0"
                                  title="確認已在平台完成退訂（移入已退訂歸檔）"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>標為已退</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(item.id, 'candidate');
                                  }}
                                  className="p-1.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center cursor-pointer border border-slate-200 whitespace-nowrap flex-shrink-0"
                                  title="恢復為抉擇中"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {isCancelled && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange(item.id, 'candidate');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-1 cursor-pointer border border-slate-200 whitespace-nowrap flex-shrink-0"
                                title="重新恢復為抉擇中"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>恢復</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 待安排夜晚就地插槽 (Inline Empty Slots for Missing Nights) */}
          {(filterStatus === 'active' || filterStatus === 'confirmed') && missingNights.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                待安排夜晚 ({missingNights.length})
              </div>
              <div className="grid gap-2">
                {missingNights.map((m) => (
                  <button
                    key={m.dateStr}
                    type="button"
                    onClick={() => onOpenModal(null, m.dateStr)}
                    className="w-full py-2.5 px-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/70 transition-all text-xs text-slate-500 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
                    title={`新增 ${m.dateLabel} 住宿`}
                  >
                    <div className="flex items-center space-x-2">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-700">{m.dateLabel} ({m.dayLabel})</span>
                      <span className="text-[11px] text-slate-400">尚未安排</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 flex items-center space-x-1">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>安排</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. 右下角固定懸浮「＋」按鈕 (FAB) */}
      <button
        type="button"
        onClick={() => onOpenModal(null)}
        className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-105 border border-slate-700/50"
        title="新增預訂"
        aria-label="新增預訂"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
