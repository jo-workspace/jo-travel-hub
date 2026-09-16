'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings2, Calendar, DollarSign, FileText, Globe, LogOut, Upload, Image as ImageIcon, Trash2, Archive } from 'lucide-react';
import { updateTripSettings } from '@/lib/supabase-client';
import { computeAutoTripStatus } from '@/lib/tripDate';
import { getUniqueCities, resolveCityInfo, CityResolutionInfo } from '@/lib/weather';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  tripId: string;
  tripTitle: string;
  tripDates: string;
  startDate: string;
  fxRate: number;
  budgetTwd: number;
  tripNote: string;
  foreignCurrency: string;
  companions?: string;
  timezone?: string;
  customIcon?: string;
  svgIcon?: string;
  citySchedule?: string;
  badgeText?: string;
  isTaiwanTrip?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  tripId,
  tripTitle,
  tripDates,
  startDate,
  fxRate,
  budgetTwd,
  tripNote,
  foreignCurrency,
  companions,
  timezone,
  customIcon,
  svgIcon,
  citySchedule,
  badgeText,
  isTaiwanTrip,
}) => {
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [start, setStart] = useState('');
  const [rate, setRate] = useState('');
  const [budget, setBudget] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState('');
  const [hasWill, setHasWill] = useState(true);
  const [otherCompanions, setOtherCompanions] = useState('');
  const [tz, setTz] = useState('Asia/Taipei');
  const [citySched, setCitySched] = useState('');
  const [isTaiwan, setIsTaiwan] = useState(false);
  const [resolvedCities, setResolvedCities] = useState<Record<string, CityResolutionInfo | null>>({});
  const [iconDataUrl, setIconDataUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // 每次開啟時重新載入目前值
  useEffect(() => {
    if (isOpen) {
      setTitle(tripTitle || '');
      setDates(tripDates || '');
      setIsArchived(badgeText === '已封存');
      setStart(startDate || '');
      const initCurr = foreignCurrency || '';
      setCurrency(initCurr);
      // 若無外幣，則匯率不填入 32.5 預設值
      setRate(initCurr && fxRate ? String(fxRate) : (fxRate && fxRate !== 1 && fxRate !== 32.5 ? String(fxRate) : ''));
      setBudget(budgetTwd ? String(budgetTwd) : '');
      setNote(tripNote || '');
      const tokens = (companions || '').split(/[\n,，]+/).map((p) => p.trim()).filter(Boolean);
      setHasWill(tokens.includes('Will'));
      setOtherCompanions(tokens.filter((p) => p !== 'Jo' && p !== 'Will').join(', '));
      setTz(timezone || 'Asia/Taipei');
      setCitySched(citySchedule || '');
      const defaultTaiwan =
        isTaiwanTrip !== undefined
          ? isTaiwanTrip
          : ((timezone || '').includes('Taipei') || (tripTitle || '').includes('台灣') || (tripTitle || '').includes('武嶺') || (tripTitle || '').includes('南投') || (citySchedule || '').includes('武嶺'));
      setIsTaiwan(Boolean(defaultTaiwan));
      setIconDataUrl(customIcon || svgIcon || '');
      setError('');
    }
  }, [isOpen, tripTitle, tripDates, startDate, fxRate, budgetTwd, tripNote, foreignCurrency, companions, timezone, customIcon, svgIcon, citySchedule, badgeText, isTaiwanTrip]);

  // 即時解析城市日程並快取地點資訊
  useEffect(() => {
    if (!isOpen) return;
    const cities = getUniqueCities(citySched);
    if (cities.length === 0) {
      setResolvedCities({});
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      const results: Record<string, CityResolutionInfo | null> = {};
      for (const c of cities) {
        const info = await resolveCityInfo(c, isTaiwan);
        if (info) results[c] = info;
      }
      if (isMounted) setResolvedCities(results);
    }, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [citySched, isOpen, isTaiwan]);

  if (!isOpen) return null;

  // 圖片選擇後，透通 Canvas 自動裁切正方形並壓縮成 180x180 PNG Data URI
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 180, 180);
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 180, 180);
          const pngData = canvas.toDataURL('image/png', 0.9);
          setIconDataUrl(pngData);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const otherTokens = otherCompanions
      .split(/[\n,，]+/)
      .map((p) => p.trim())
      .filter((p) => p && p !== 'Jo' && p !== 'Will');
    const combined = ['Jo', ...(hasWill ? ['Will'] : []), ...otherTokens];
    const finalCompanions = Array.from(new Set(combined)).join(', ');

    const trimmedCurrency = currency.trim().toUpperCase();
    const autoStatus = computeAutoTripStatus(start.trim(), dates.trim(), tz.trim());
    const finalBadgeText = isArchived ? '已封存' : autoStatus;
    const finalFxRate = rate ? parseFloat(rate) : (trimmedCurrency ? (['JPY', 'KRW', 'VND', 'IDR'].includes(trimmedCurrency) ? 5.05 : 32.5) : 1);

    try {
      await updateTripSettings(tripId, {
        title: title.trim(),
        dates: dates.trim(),
        badgeText: finalBadgeText,
        startDate: start.trim(),
        fxRate: finalFxRate,
        budgetTwd: budget ? parseInt(budget, 10) : 0,
        tripNote: note,
        foreignCurrency: trimmedCurrency,
        companions: finalCompanions,
        timezone: tz.trim() || 'Asia/Taipei',
        citySchedule: citySched.trim(),
        customIcon: iconDataUrl,
        isTaiwanTrip: isTaiwan,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || '儲存失敗，請再試一次');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-slate-700" />
            <span>旅程設定</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto overflow-x-hidden max-h-[75vh]">
          <div className="px-6 py-4 space-y-5">

            {/* 基本與日程資訊 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>基本資訊</span>
              </div>

              {/* Row 1: 名稱 + 圖示 */}
              <div className="flex items-end gap-2.5">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-slate-600 mb-1">名稱</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="2026 LA Trip"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium h-[38px]"
                  />
                </div>

                <div className="w-28 shrink-0">
                  <label className="block text-xs font-bold text-slate-600 mb-1">圖示</label>
                  {iconDataUrl ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl h-[38px]">
                      <img
                        src={iconDataUrl}
                        alt="圖示"
                        className="w-7 h-7 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setIconDataUrl('')}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="清除圖示"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center space-x-1.5 w-full h-[38px] border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer group px-2">
                      <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">選擇圖片</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Row 2: 日期 + 出發日 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">日期</label>
                  <input
                    type="text"
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                    placeholder="2026/08"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium h-[38px]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-600 mb-1">出發日</label>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left w-full min-w-0 bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium text-slate-800 h-[38px]"
                  />
                </div>
              </div>

              {/* Row 3: 時區 + 城市日程 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">時區</label>
                  <input
                    type="text"
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    placeholder="例：America/Los_Angeles"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">城市日程</label>
                  <div className="flex items-center space-x-1.5">
                    <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer select-none h-[38px] shrink-0" title="台灣氣象署 (CWA) 預報">
                      <input
                        type="checkbox"
                        checked={isTaiwan}
                        onChange={(e) => setIsTaiwan(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-slate-900 bg-white border-slate-300 focus:ring-slate-900 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">台灣</span>
                    </label>
                    <input
                      type="text"
                      value={citySched}
                      onChange={(e) => setCitySched(e.target.value)}
                      placeholder={isTaiwan ? "例：Day 1-2: 武嶺" : "例：Day 1-3: LA"}
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-sm px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-sans text-slate-800 h-[38px]"
                    />
                  </div>
                </div>
              </div>

              {/* 城市日程即時地點解析晶片 */}
              {Object.keys(resolvedCities).length > 0 && (
                <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2.5 space-y-1.5 animate-fade-in">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between px-0.5">
                    <span>地點解析</span>
                    <span className="text-[10px] text-slate-400 font-normal">{isTaiwan ? 'CWA 官方預報' : '國際預報模式'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(resolvedCities).map(([name, info]) => {
                      if (!info) return null;
                      return (
                        <div
                          key={name}
                          className="inline-flex items-center space-x-1.5 text-xs bg-white border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs"
                          title={`座標: ${info.latitude.toFixed(4)}°N, ${info.longitude.toFixed(4)}°E${info.elevation ? ` | 海拔 ${info.elevation}m` : ''}`}
                        >
                          <span className="text-xs">{info.source === 'CWA' ? '🇹🇼' : '🌍'}</span>
                          <span className="font-bold text-slate-900">{name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600 text-[11px] truncate max-w-[140px]">{info.resolvedName}</span>
                          {info.elevation ? (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/50">
                              {info.elevation}m
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 4: 外幣 + 匯率 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">外幣</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="留空即純台幣"
                    maxLength={5}
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono tracking-widest h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    匯率
                    {currency ? (
                      <span className="text-amber-600 font-bold ml-1">
                        {['JPY', 'KRW', 'VND', 'IDR'].includes(currency.toUpperCase())
                          ? `(1 TWD = ? ${currency})`
                          : `(1 ${currency} = ? TWD)`}
                      </span>
                    ) : null}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={
                        currency
                          ? (['JPY', 'KRW', 'VND', 'IDR'].includes(currency.toUpperCase()) ? '5.05' : '32.5')
                          : '留空'
                      }
                      className="w-full bg-slate-50 border border-slate-200 text-sm pl-7 pr-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono font-bold h-[38px]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: 分帳成員 (含 Will 同行 checkbox) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">分帳成員</label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer select-none h-[38px] shrink-0">
                    <input
                      type="checkbox"
                      checked={hasWill}
                      onChange={(e) => setHasWill(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 bg-white border-slate-300 focus:ring-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">Will</span>
                  </label>
                  <input
                    type="text"
                    value={otherCompanions}
                    onChange={(e) => setOtherCompanions(e.target.value)}
                    placeholder="例：Ting, Amy"
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-sm px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 備註 */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>備註</span>
              </div>
              <div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={"例：\n**8/30 李政厚搖頭娃娃 (1:05 PM)**\n[野火空氣品質](https://fire.airnow.gov)\n[加州即時路況](https://quickmap.dot.ca.gov)"}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between space-x-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>登出</span>
            </button>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsArchived(!isArchived)}
                className={`flex items-center space-x-1 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                  isArchived
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                title={isArchived ? "解除封存" : "封存旅程"}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isArchived ? '已封存' : '封存'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
