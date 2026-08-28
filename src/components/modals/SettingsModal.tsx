'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings2, Calendar, DollarSign, FileText, Globe, LogOut, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { updateTripSettings } from '@/lib/supabase-client';

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
}) => {
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState('');
  const [start, setStart] = useState('');
  const [rate, setRate] = useState('');
  const [budget, setBudget] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [people, setPeople] = useState('Jo, Will');
  const [tz, setTz] = useState('Asia/Taipei');
  const [citySched, setCitySched] = useState('');
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
      setStart(startDate || '');
      setRate(fxRate ? String(fxRate) : '');
      setBudget(budgetTwd ? String(budgetTwd) : '');
      setNote(tripNote || '');
      setCurrency(foreignCurrency || 'USD');
      setPeople(companions || 'Jo, Will');
      setTz(timezone || 'Asia/Taipei');
      setCitySched(citySchedule || '');
      setIconDataUrl(customIcon || svgIcon || '');
      setError('');
    }
  }, [isOpen, tripTitle, tripDates, startDate, fxRate, budgetTwd, tripNote, foreignCurrency, companions, timezone, customIcon, svgIcon, citySchedule]);

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
    try {
      await updateTripSettings(tripId, {
        title: title.trim(),
        dates: dates.trim(),
        startDate: start.trim(),
        fxRate: rate ? parseFloat(rate) : 32.5,
        budgetTwd: budget ? parseInt(budget, 10) : 0,
        tripNote: note,
        foreignCurrency: currency.trim().toUpperCase() || 'USD',
        companions: people.trim() || 'Jo, Will',
        timezone: tz.trim() || 'Asia/Taipei',
        citySchedule: citySched.trim(),
        customIcon: iconDataUrl,
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

            {/* 基本資訊 (2 x 2 網格) */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>基本資訊</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">名稱</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="2026 LA Trip"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">日期</label>
                  <input
                    type="text"
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                    placeholder="2026/08"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">人員</label>
                  <input
                    type="text"
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    placeholder="Jo, Will"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">圖示</label>
                  {iconDataUrl ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl h-[38px]">
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
            </div>

            <div className="border-t border-slate-100" />

            {/* 日期與財務 */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>日期與財務</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-600 mb-1">起始日</label>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left w-full min-w-0 bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">時區</label>
                  <input
                    type="text"
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    placeholder="例：America/Los_Angeles"
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">城市日程</label>
                <input
                  type="text"
                  value={citySched}
                  onChange={(e) => setCitySched(e.target.value)}
                  placeholder="例：Day 1-3: Los Angeles, Day 4-5: Las Vegas"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-sans text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">外幣</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={5}
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    匯率
                    <span className="text-amber-600 font-bold ml-1">
                      {['JPY', 'KRW', 'VND', 'IDR'].includes((currency || 'USD').toUpperCase())
                        ? `(1 TWD = ? ${currency})`
                        : `(1 ${currency} = ? TWD)`}
                    </span>
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
                        ['JPY', 'KRW', 'VND', 'IDR'].includes((currency || 'USD').toUpperCase())
                          ? '5.05'
                          : '32.5'
                      }
                      className="w-full bg-slate-50 border border-slate-200 text-sm pl-7 pr-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 重要備註 */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>重要備註</span>
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
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? '儲存中…' : '儲存設定'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
