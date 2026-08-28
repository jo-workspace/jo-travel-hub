'use client';

import React, { useState, useMemo } from 'react';
import { X, Sparkles, ArrowRight, Check, Navigation, AlertCircle, Lock, Unlock } from 'lucide-react';
import { ProcessedSpot } from '@/components/ItineraryMap';
import { optimizeDayRoute, RouteOptimizedResult } from '@/lib/geo';

interface RouteOptimizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLabel: string;
  initialSpots: ProcessedSpot[];
  onApply: (optimizedSpots: ProcessedSpot[], lockedRowIndexes: number[]) => Promise<void>;
}

export const RouteOptimizeModal: React.FC<RouteOptimizeModalProps> = ({
  isOpen,
  onClose,
  dayLabel,
  initialSpots,
  onApply,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  // 被鎖定（不參與時間調整、保持原時間）的景點 rowIndex 集合
  const [lockedRowIndexes, setLockedRowIndexes] = useState<number[]>([]);

  // 根據鎖定狀態即時重算動線
  const currentResult: RouteOptimizedResult<ProcessedSpot> = useMemo(() => {
    if (!initialSpots || initialSpots.length === 0) {
      return {
        originalSpots: [],
        optimizedSpots: [],
        originalDistanceKm: 0,
        optimizedDistanceKm: 0,
        savedDistanceKm: 0,
      };
    }

    // 將未鎖定的景點進行動線最佳化
    const flexibleSpots = initialSpots.filter((s) => !lockedRowIndexes.includes(s.item.rowIndex));
    const optimizedFlexible = optimizeDayRoute(flexibleSpots).optimizedSpots;

    // 重新組裝完整清單：被鎖定的景點維持原順序位置，其餘填入最佳化後的點
    let flexIdx = 0;
    const finalRoute = initialSpots.map((spot) => {
      if (lockedRowIndexes.includes(spot.item.rowIndex)) {
        return spot;
      }
      const nextOpt = optimizedFlexible[flexIdx];
      flexIdx++;
      return nextOpt || spot;
    });

    const fullOptimization = optimizeDayRoute(finalRoute);
    return {
      originalSpots: initialSpots,
      optimizedSpots: finalRoute,
      originalDistanceKm: optimizeDayRoute(initialSpots).originalDistanceKm,
      optimizedDistanceKm: fullOptimization.optimizedDistanceKm,
      savedDistanceKm: Math.max(
        0,
        Math.round((optimizeDayRoute(initialSpots).originalDistanceKm - fullOptimization.optimizedDistanceKm) * 10) / 10
      ),
    };
  }, [initialSpots, lockedRowIndexes]);

  if (!isOpen || !initialSpots || initialSpots.length === 0) return null;

  const { originalSpots, optimizedSpots, originalDistanceKm, optimizedDistanceKm, savedDistanceKm } =
    currentResult;

  const handleToggleLock = (rowIndex: number) => {
    setLockedRowIndexes((prev) =>
      prev.includes(rowIndex) ? prev.filter((id) => id !== rowIndex) : [...prev, rowIndex]
    );
  };

  const handleConfirm = async () => {
    try {
      setIsApplying(true);
      await onApply(optimizedSpots, lockedRowIndexes);
      onClose();
    } catch (err) {
      console.error('Failed to apply optimized route:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {dayLabel} 智慧順路最佳化預覽
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                可點擊鎖頭排除特定已預約行程（保持原時間）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mileage Savings Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-xs space-y-1 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              預估節省車程
            </span>
            <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">
              原 {originalDistanceKm} km ➔ 新 {optimizedDistanceKm} km
            </span>
          </div>
          <div className="text-lg font-black tracking-tight">
            {savedDistanceKm > 0 ? (
              <span>🎉 預計可為您省下約 {savedDistanceKm} 公里折返跑車程！</span>
            ) : (
              <span>當前排程已接近最佳順路動線！</span>
            )}
          </div>
        </div>

        {/* Route Comparison List with Lock Toggle */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-64 no-scrollbar">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>建議造訪順序：</span>
            <span>點擊鎖頭固定時間</span>
          </div>

          <div className="space-y-1.5">
            {optimizedSpots.map((spot, idx) => {
              const isLocked = lockedRowIndexes.includes(spot.item.rowIndex);
              const origIndex = originalSpots.findIndex(
                (s) => s.item.rowIndex === spot.item.rowIndex
              );
              const isChanged = origIndex !== idx && !isLocked;

              return (
                <div
                  key={spot.item.rowIndex}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isLocked
                      ? 'bg-slate-100/80 border-slate-200 opacity-80'
                      : isChanged
                      ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: spot.dayColor.hex }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {spot.item.title}
                        </h4>
                        {spot.item.time && (
                          <span className="text-[10px] font-bold text-slate-400">
                            ({spot.item.time})
                          </span>
                        )}
                      </div>
                      {spot.item.content && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {spot.item.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 text-xs">
                    {isLocked ? (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>固定原時間</span>
                      </span>
                    ) : isChanged ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center space-x-1">
                        <span>原第 {origIndex + 1} 站</span>
                        <ArrowRight className="w-3 h-3 inline" />
                        <span>第 {idx + 1} 站</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        位置不變
                      </span>
                    )}

                    {/* Lock / Unlock Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLock(spot.item.rowIndex)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isLocked
                          ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                          : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isLocked ? '已固定原時間（點擊解鎖參與排程）' : '點擊鎖定原時間（不被排程調動）'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety Note */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 font-medium flex items-start space-x-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            若有固定預約（如特定時間餐廳、球賽），可點擊右側鎖頭鎖定原時間。套用後其餘行程將自動圍繞鎖定點排成最順動線。
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer text-center"
          >
            取消維持原狀
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isApplying}
            className="flex-1 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isApplying ? '正在套用新動線...' : '確認套用最順動線'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
