'use client';

import React from 'react';
import { X, Thermometer, Calendar, MapPin, Sparkles } from 'lucide-react';
import { WeatherIcon } from '@/components/WeatherIcon';
import { getWeatherDescription } from '@/lib/weather';

export interface DayWeatherGuideItem {
  dayLabel: string;
  dateStr: string; // e.g. "8/28 Fri" or "2026-08-28"
  cityName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
  advice: string;
}

interface WeatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripTitle?: string;
  items: DayWeatherGuideItem[];
  overallMin: number;
  overallMax: number;
  overallAdvice: string;
}

export const WeatherGuideModal: React.FC<WeatherGuideModalProps> = ({
  isOpen,
  onClose,
  tripTitle,
  items,
  overallMin,
  overallMax,
  overallAdvice,
}) => {
  if (!isOpen) return null;

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
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                行程天氣與穿著參考
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {tripTitle ? `${tripTitle} · ` : ''}逐日氣候預測與行李打包建議
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

        {/* Overall Climate Summary Banner */}
        {overallMin < 900 && overallMax > -900 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-xs space-y-1.5 flex-shrink-0 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>全旅程氣溫範圍</span>
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

        {/* Daily Weather List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              尚未設定旅程起始日或城市日程安排。
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

                {/* Weather details */}
                <div className="flex items-center space-x-2 flex-shrink-0 text-right">
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
                </div>
              </div>
            ))
          )}
        </div>

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
