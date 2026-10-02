'use client';

import React from 'react';
import { X, CloudSun, Calendar, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { WeatherIcon } from '@/components/WeatherIcon';
import { getWeatherDescription } from '@/lib/weather';
import { ClimateGuide } from '@/types/trip';

export interface DayWeatherGuideItem {
  dayLabel: string;
  dateStr: string; // e.g. "8/28 Fri" or "2026-08-28"
  cityName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
  advice: string;
  hasWeather?: boolean;
}

interface WeatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripTitle?: string;
  items: DayWeatherGuideItem[];
  overallMin: number;
  overallMax: number;
  overallAdvice: string;
  climateGuide?: ClimateGuide;
  isLongRange?: boolean;
  cityName?: string;
  travelDates?: string;
  onGenerateClimateGuide?: () => Promise<void>;
  isGeneratingClimate?: boolean;
}

export const WeatherGuideModal: React.FC<WeatherGuideModalProps> = ({
  isOpen,
  onClose,
  tripTitle,
  items,
  overallMin,
  overallMax,
  overallAdvice,
  climateGuide,
  isLongRange = false,
  cityName = '',
  travelDates = '',
  onGenerateClimateGuide,
  isGeneratingClimate = false,
}) => {
  // 檢查快取之氣候指南是否與目前目的地相符（若舊快取無城市標記且包含基隆等出發港字串，則視為不相符）
  const hasMatchingGuide = Boolean(
    climateGuide &&
    (climateGuide.city
      ? climateGuide.city === cityName
      : !cityName || (!climateGuide.advice?.includes('基隆') && !climateGuide.headline?.includes('基隆')))
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  氣候與穿著
                </h3>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                    isLongRange
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isLongRange ? '歷史氣候' : '即時預報'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {cityName ? `${cityName} · ` : ''}
                {travelDates ? `${travelDates} · ` : ''}打包與穿搭指南
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

        {/* 內容區塊：依據天數切換長程歷史氣候或近程逐日預報 */}
        {isLongRange ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 py-1">
            {hasMatchingGuide && climateGuide ? (
              <div className="space-y-4">
                {/* 氣候重點卡片 */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-sm border border-slate-700/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{cityName ? `${cityName} · ` : ''}同期歷史氣溫</span>
                      </div>
                      <div className="text-3xl font-mono font-black text-white tracking-tight">
                        {climateGuide.tempMin}°C ~ {climateGuide.tempMax}°C
                      </div>
                    </div>

                    {onGenerateClimateGuide && (
                      <button
                        type="button"
                        onClick={() => onGenerateClimateGuide()}
                        disabled={isGeneratingClimate}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="重新產生指南"
                      >
                        {isGeneratingClimate ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="inline-block px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold">
                    {climateGuide.headline}
                  </div>
                </div>

                {/* 穿搭與打包建議 */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1">
                    <span>💡 穿搭與行李建議</span>
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {climateGuide.advice}
                  </p>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-slate-400 font-medium">
                    出發前 14 天將自動切換為即時逐日氣象預報
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 space-y-4 bg-slate-50/80 rounded-3xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mx-auto">
                  <CloudSun className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-extrabold text-slate-900">
                    出發前 14 天開放即時預報
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    現在可先由 Gemini AI 查詢{cityName ? `「${cityName}」` : '目的地'}同期的歷史氣候與穿搭建議，方便提早準備行李。
                  </p>
                </div>
                {onGenerateClimateGuide && (
                  <button
                    type="button"
                    onClick={() => onGenerateClimateGuide()}
                    disabled={isGeneratingClimate}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isGeneratingClimate ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>查詢氣候中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>產生{cityName ? `「${cityName}」` : ''}歷史氣候與穿搭指南</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 近程模式：現有即時逐日預報 */
          <>
            {overallMin < 900 && overallMax > -900 && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-xs space-y-1.5 flex-shrink-0 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>旅程氣溫</span>
                  </span>
                  <span className="text-sm font-mono font-black text-white">
                    {overallMin}°C ~ {overallMax}°C
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  💡 {overallAdvice}
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {items.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  尚未設定起始日或城市。
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/80 hover:bg-slate-100/80 transition-all border border-slate-150 rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                        <span className="text-xs font-extrabold text-slate-900 bg-white border border-slate-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
                          {item.dayLabel}
                        </span>
                        {item.dateStr && (
                          <span className="text-xs font-bold text-slate-500">
                            {item.dateStr}
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md">
                          {item.cityName}
                        </span>
                      </div>
                      {item.advice && (
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {item.advice}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 text-right">
                      {item.hasWeather !== false ? (
                        <>
                          <div>
                            <div className="text-sm font-mono font-extrabold text-slate-900">
                              {item.tempMax}° / {item.tempMin}°
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end space-x-1">
                              <span>{getWeatherDescription(item.weatherCode)}</span>
                              {item.precipitationProbability > 0 && (
                                <span className="text-sky-600 font-mono">
                                  · 🌧️ {item.precipitationProbability}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-2 bg-white rounded-xl shadow-2xs border border-slate-100 flex items-center justify-center">
                            <WeatherIcon code={item.weatherCode} className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                          尚無預報
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            了解，開始打包
          </button>
        </div>
      </div>
    </div>
  );
};
