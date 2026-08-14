'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings2, Calendar, DollarSign, FileText, Globe, LogOut } from 'lucide-react';
import { updateTripSettings } from '@/lib/supabase-client';

const TIMEZONE_PRESETS = ['Asia/Taipei', 'America/Los_Angeles', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];

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
  svgIcon?: string;
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
  svgIcon,
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
  const [svgCode, setSvgCode] = useState('');
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
      setSvgCode(svgIcon || '');
      setError('');
    }
  }, [isOpen, tripTitle, tripDates, startDate, fxRate, budgetTwd, tripNote, foreignCurrency, companions, timezone, svgIcon]);

  if (!isOpen) return null;

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
        svgIcon: svgCode.trim(),
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

        <form onSubmit={handleSave} className="overflow-y-auto max-h-[70vh]">
          <div className="px-6 py-4 space-y-5">

            {/* 基本資訊 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>基本資訊</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">旅程名稱</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：2026 LA Trip"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">旅程日期顯示</label>
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="例：2026/08"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  同行人員
                  <span className="text-slate-400 font-normal ml-1">（用逗號分隔，記帳與打包自動連動）</span>
                </label>
                <input
                  type="text"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  placeholder="例：Jo, Will, Alex"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>自訂 SVG 圖示原始碼</span>
                  <span className="text-slate-400 font-normal">（可直接貼上 &lt;svg&gt;...&lt;/svg&gt;）</span>
                </label>
                <textarea
                  value={svgCode}
                  onChange={(e) => setSvgCode(e.target.value)}
                  placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>'
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono resize-none"
                />
                {svgCode.trim() && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400">圖示預覽：</span>
                    <div
                      className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900 shadow-2xs p-1"
                      dangerouslySetInnerHTML={{ __html: svgCode }}
                    />
                    <span className="text-[10px] text-emerald-600 font-bold">✓ 儲存後將自動套用至標籤頁與 iPhone 桌面</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 日期與財務 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>日期與財務</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  旅程起始日期
                  <span className="text-slate-400 font-normal ml-1">（Day 1 對應的日期）</span>
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  目的地時區
                  <span className="text-slate-400 font-normal ml-1">（用來判斷「今天」對應第幾天，分享連結給人在其他時區的旅伴也不會算錯）</span>
                </label>
                <input
                  type="text"
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  placeholder="例：America/Los_Angeles"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono mb-2"
                />
                <div className="flex items-center flex-wrap gap-1.5">
                  {TIMEZONE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTz(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                        tz === preset
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    外幣代碼
                    <span className="text-slate-400 font-normal ml-1">例：USD、JPY、EUR</span>
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={5}
                    className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono tracking-widest"
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
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={
                        ['JPY', 'KRW', 'VND', 'IDR'].includes((currency || 'USD').toUpperCase())
                          ? '例如 5.05'
                          : '例如 32.5'
                      }
                      className="w-full bg-slate-50 border border-slate-200 text-sm pl-8 pr-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {['JPY', 'KRW', 'VND', 'IDR'].includes((currency || 'USD').toUpperCase())
                      ? `如輸入 5.05，代表 $1 台幣可換 $5.05 ${currency}`
                      : `如輸入 32.5，代表 $1 ${currency} 可換 $32.5 台幣`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  預算
                  <span className="text-slate-400 font-normal ml-1">TWD</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 行程重要備註 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>行程重要備註</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  備註內容
                  <span className="text-slate-400 font-normal ml-1">（顯示在行程表最上方的公告欄）</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={"例：\n8/30 李政厚搖頭娃娃 (1:05 PM)\n班機時間：\n---8/30 TPE 00:05"}
                  rows={6}
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
