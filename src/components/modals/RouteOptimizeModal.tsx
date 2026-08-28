'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  Check,
  Navigation,
  AlertCircle,
  Lock,
  CheckSquare,
  Square,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { ProcessedSpot } from '@/components/ItineraryMap';
import { optimizeDayRoute, calculateDistance } from '@/lib/geo';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [isApplying, setIsApplying] = useState(false);
  // 參與排程的景點 rowIndex（預設全選）
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<number[]>([]);

  // 每次彈窗打開時重置為 Step 1 並全選
  useEffect(() => {
    if (isOpen && initialSpots) {
      setStep(1);
      setSelectedRowIndexes(initialSpots.map((s) => s.item.rowIndex));
    }
  }, [isOpen, initialSpots]);

  // 切換某個景點是否參與排程
  const handleToggleSpot = (rowIndex: number) => {
    setSelectedRowIndexes((prev) =>
      prev.includes(rowIndex) ? prev.filter((id) => id !== rowIndex) : [...prev, rowIndex]
    );
  };

  // 全選或取消全選
  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedRowIndexes(initialSpots.map((s) => s.item.rowIndex));
    } else {
      setSelectedRowIndexes([]);
    }
  };

  // 計算動線最佳化結果（以未選取者為固定錨點）
  const optimizationResult = useMemo(() => {
    if (!initialSpots || initialSpots.length === 0) {
      return {
        finalRoute: [],
        origDist: 0,
        optDist: 0,
        savedDist: 0,
      };
    }

    // 計算原本總距離
    let origDist = 0;
    for (let i = 0; i < initialSpots.length - 1; i++) {
      origDist += calculateDistance(
        initialSpots[i].coords.lat,
        initialSpots[i].coords.lng,
        initialSpots[i + 1].coords.lat,
        initialSpots[i + 1].coords.lng
      );
    }

    // 彈性景點（有勾選者）
    const flexibleSpots = initialSpots.filter((s) => selectedRowIndexes.includes(s.item.rowIndex));

    // 若全部固定或彈性點少於 2 個，直接維持原狀
    if (flexibleSpots.length <= 1) {
      return {
        finalRoute: initialSpots,
        origDist: Math.round(origDist * 10) / 10,
        optDist: Math.round(origDist * 10) / 10,
        savedDist: 0,
      };
    }

    // 將彈性景點以最近鄰動線排序
    const optimizedFlexible = optimizeDayRoute(flexibleSpots).optimizedSpots;

    // 將彈性景點按計算後順序填入原非固定位置中
    let flexIdx = 0;
    const finalRoute = initialSpots.map((spot) => {
      if (!selectedRowIndexes.includes(spot.item.rowIndex)) {
        // 固定行程：維持原本位置
        return spot;
      }
      const nextSpot = optimizedFlexible[flexIdx];
      flexIdx++;
      return nextSpot || spot;
    });

    // 計算優化後總距離
    let optDist = 0;
    for (let i = 0; i < finalRoute.length - 1; i++) {
      optDist += calculateDistance(
        finalRoute[i].coords.lat,
        finalRoute[i].coords.lng,
        finalRoute[i + 1].coords.lat,
        finalRoute[i + 1].coords.lng
      );
    }

    return {
      finalRoute,
      origDist: Math.round(origDist * 10) / 10,
      optDist: Math.round(optDist * 10) / 10,
      savedDist: Math.max(0, Math.round((origDist - optDist) * 10) / 10),
    };
  }, [initialSpots, selectedRowIndexes]);

  if (!isOpen || !initialSpots || initialSpots.length === 0) return null;

  const lockedRowIndexes = initialSpots
    .map((s) => s.item.rowIndex)
    .filter((id) => !selectedRowIndexes.includes(id));

  const handleConfirmApply = async () => {
    try {
      setIsApplying(true);
      await onApply(optimizationResult.finalRoute, lockedRowIndexes);
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
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {dayLabel} 智慧順路排程
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black bg-slate-100 text-slate-600 rounded-full">
                  步驟 {step} / 2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {step === 1
                  ? '請勾選要自動排順的行程（取消勾選即固定原時間）'
                  : '預覽計算後的最佳順路動線'}
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

        {/* STEP 1: 選擇參與排程的行程 */}
        {step === 1 && (
          <>
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 flex-shrink-0">
              <span>勾選欲自動排順的景點：</span>
              <div className="space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  全選
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-400 hover:underline cursor-pointer"
                >
                  全不選
                </button>
              </div>
            </div>

            {/* Spots Checklist */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-64 no-scrollbar">
              {initialSpots.map((spot, idx) => {
                const isChecked = selectedRowIndexes.includes(spot.item.rowIndex);

                return (
                  <div
                    key={spot.item.rowIndex}
                    onClick={() => handleToggleSpot(spot.item.rowIndex)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-blue-50/40 border-blue-200/80 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200/60 opacity-70'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <button
                        type="button"
                        className="text-slate-700 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSpot(spot.item.rowIndex);
                        }}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <span
                        className="w-5 h-5 rounded-full text-white text-[11px] font-black flex items-center justify-center flex-shrink-0"
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

                    <div className="flex-shrink-0 text-xs">
                      {isChecked ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          參與排程
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-slate-500 inline" />
                          <span>固定時間</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hint */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 font-medium flex items-start space-x-2 flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>
                取消勾選的行程（如已訂位餐廳、球賽）將固定在原時間，系統會為其餘有勾選的景點計算最順路徑。
              </span>
            </div>

            {/* Next Button */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer text-center"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={selectedRowIndexes.length < 2}
                className="flex-1 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>計算最順動線 ➔</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: 預覽計算成果與確認套用 */}
        {step === 2 && (
          <>
            {/* Mileage Savings Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-xs space-y-1 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-100 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  預估節省車程
                </span>
                <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">
                  原 {optimizationResult.origDist} km ➔ 新 {optimizationResult.optDist} km
                </span>
              </div>
              <div className="text-lg font-black tracking-tight">
                {optimizationResult.savedDist > 0 ? (
                  <span>🎉 預計可為您省下約 {optimizationResult.savedDist} 公里折返跑車程！</span>
                ) : (
                  <span>當前排程已接近最佳順路動線！</span>
                )}
              </div>
            </div>

            {/* Route Comparison List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-64 no-scrollbar">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                建議造訪順序：
              </div>

              <div className="space-y-1.5">
                {optimizationResult.finalRoute.map((spot, idx) => {
                  const isLocked = lockedRowIndexes.includes(spot.item.rowIndex);
                  const origIndex = initialSpots.findIndex(
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
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {spot.item.title}
                          </h4>
                          {spot.item.content && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {spot.item.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0 text-xs">
                        {isLocked ? (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isApplying}
                className="py-2.5 px-4 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回修改</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="flex-1 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isApplying ? '正在套用新動線...' : '確認套用最順動線'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
