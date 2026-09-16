'use client';

import React from 'react';
import { X, MapPin, ExternalLink, Mountain, CloudRain, Thermometer, ShieldCheck, Globe } from 'lucide-react';
import { CityWeatherData, DayWeatherInfo, getWeatherDescription } from '@/lib/weather';
import { WeatherIcon } from '@/components/WeatherIcon';

interface WeatherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLabel: string;
  dateText?: string;
  dayCity?: string;
  weatherData?: CityWeatherData | null;
  dayWeather?: DayWeatherInfo | null;
}

export const WeatherDetailModal: React.FC<WeatherDetailModalProps> = ({
  isOpen,
  onClose,
  dayLabel,
  dateText,
  dayCity,
  weatherData,
  dayWeather,
}) => {
  if (!isOpen) return null;

  const isCwa = weatherData?.source === 'CWA';
  const weatherDesc =
    dayWeather?.weatherDesc ||
    (dayWeather ? getWeatherDescription(dayWeather.weatherCode) : '晴朗');
  const lat = weatherData?.latitude;
  const lon = weatherData?.longitude;
  const elevation = weatherData?.elevation;

  const googleMapsUrl =
    lat !== undefined && lon !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : dayCity
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dayCity)}`
      : '';

  const cwaUrl =
    dayCity?.includes('武嶺') || dayCity?.includes('合歡')
      ? 'https://www.cwa.gov.tw/V8/C/L/NationalPark/NationalPark.html?PID=E002'
      : 'https://www.cwa.gov.tw/';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <span className="bg-slate-900 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                {dayLabel}
              </span>
              <span>天氣與地點檢查</span>
            </h3>
            {dateText && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">{dateText}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 資料來源 Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              氣象資料來源
            </span>
            {isCwa ? (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>交通部中央氣象署 (CWA) 官方在地預報</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                <Globe className="w-3.5 h-3.5" />
                <span>Open-Meteo 全球數值氣象模式</span>
              </span>
            )}
          </div>

          {/* 地點核驗卡片 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {dayCity || weatherData?.cityName || '未知地點'}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {weatherData?.resolvedName || '台灣行政區解析'}
                  </p>
                </div>
              </div>

              {elevation && elevation > 0 && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                  <Mountain className="w-3 h-3" />
                  <span>海拔 {elevation.toLocaleString()}m</span>
                </span>
              )}
            </div>

            {lat !== undefined && lon !== undefined && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>
                  座標：{lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                </span>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-sans font-bold hover:underline"
                  >
                    <span>在 Google 地圖開啟</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 天氣預報詳情 */}
          {dayWeather ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-slate-100 rounded-2xl">
                    <WeatherIcon code={dayWeather.weatherCode} className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {weatherDesc}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span className="flex items-center">
                        <Thermometer className="w-3.5 h-3.5 text-rose-500 mr-0.5" />
                        {dayWeather.tempMin}°C ~ {dayWeather.tempMax}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">降雨機率</div>
                  <div className="text-lg font-black text-sky-600 font-mono">
                    {dayWeather.precipitationProbability}%
                  </div>
                  {dayWeather.precipitationSum !== undefined && dayWeather.precipitationSum > 0 && (
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-end space-x-0.5">
                      <CloudRain className="w-3 h-3 text-sky-500" />
                      <span>預估雨量 {dayWeather.precipitationSum} mm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 高山環境備註 / 貼心提醒 */}
              {dayWeather.highAltitudeNote && (
                <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold mb-0.5">💡 高山微氣候與溫差提醒</p>
                  <p className="text-amber-800">{dayWeather.highAltitudeNote}</p>
                </div>
              )}

              {/* 非高山普通說明 */}
              {!dayWeather.highAltitudeNote && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    {isCwa
                      ? '本預報為中央氣象署 (CWA) 官方逐日預報，呈現最符合台灣本地習慣的降雨機率與氣候型態。'
                      : '本預報來自全球數值氣象模式，跨國旅行時提供 14 天完整預測參考。'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              暫無此日詳細天氣資訊
            </div>
          )}

          {/* 外部官方參考連結 */}
          {isCwa && (
            <div className="text-center pt-1">
              <a
                href={cwaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/70 px-4 py-2 rounded-xl transition-all"
              >
                <span>前往中央氣象署 (CWA) 查看即時影像與預報</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
