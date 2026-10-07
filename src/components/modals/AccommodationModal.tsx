'use client';

import React, { useState, useEffect } from 'react';
import { AccommodationItem, AccommodationStatus } from '@/types/trip';
import { formatTimeOnBlur } from '@/lib/timeUtils';
import { X, Trash2, Calendar, MapPin, ExternalLink, ShieldCheck, DollarSign, User, Building } from 'lucide-react';

interface AccommodationModalProps {
  isOpen: boolean;
  item?: AccommodationItem | null;
  companions?: string;
  defaultCurrency?: string;
  tripStartDate?: string;
  defaultCheckInDate?: string;
  onClose: () => void;
  onSave: (data: Partial<AccommodationItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COMMON_PLATFORMS = ['Agoda', 'Booking.com', 'Airbnb', 'Trip.com', '官網'];

export const AccommodationModal: React.FC<AccommodationModalProps> = ({
  isOpen,
  item,
  companions = 'Jo, Will',
  defaultCurrency = 'TWD',
  tripStartDate = '',
  defaultCheckInDate = '',
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [platform, setPlatform] = useState('Agoda');
  const [booker, setBooker] = useState('Jo');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState(defaultCurrency || 'TWD');
  const [roomType, setRoomType] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [status, setStatus] = useState<AccommodationStatus>('candidate');
  const [bookingRef, setBookingRef] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 解析旅伴清單
  const companionList = Array.from(
    new Set(
      companions
        .split(/[,、，]/)
        .map((c) => c.trim())
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCityArea(item.cityArea || '');
      setCheckInDate(item.checkInDate || '');
      setCheckOutDate(item.checkOutDate || '');
      setPlatform(item.platform || 'Agoda');
      setBooker(item.booker || companionList[0] || 'Jo');
      setPrice(item.price !== undefined ? String(item.price) : '');
      setCurrency(item.currency || defaultCurrency || 'TWD');
      setRoomType(item.roomType || '');
      if (item.freeCancellationDeadline) {
        const parts = item.freeCancellationDeadline.split(/[T ]/);
        setDeadlineDate(parts[0] || '');
        setDeadlineTime(parts[1] ? parts[1].slice(0, 5) : '23:59');
      } else {
        setDeadlineDate('');
        setDeadlineTime('23:59');
      }
      setStatus(item.status || 'candidate');
      setBookingRef(item.bookingRef || '');
      setBookingUrl(item.bookingUrl || '');
      setMapUrl(item.mapUrl || '');
      setNote(item.note || '');
    } else {
      const initialIn = defaultCheckInDate || tripStartDate || '';
      let initialOut = '';
      if (initialIn) {
        const d = new Date(initialIn);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          initialOut = `${y}-${m}-${day}`;
        }
      }
      setName('');
      setCityArea('');
      setCheckInDate(initialIn);
      setCheckOutDate(initialOut);
      setPlatform('Agoda');
      setBooker(companionList[0] || 'Jo');
      setPrice('');
      setCurrency(defaultCurrency || 'TWD');
      setRoomType('');
      setDeadlineDate('');
      setDeadlineTime('23:59');
      setStatus('candidate');
      setBookingRef('');
      setBookingUrl('');
      setMapUrl('');
      setNote('');
    }
  }, [item, isOpen, companions, defaultCurrency, tripStartDate, defaultCheckInDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const freeCancellationDeadline = deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}` : '';

      await onSave({
        id: item?.id,
        name: name.trim(),
        cityArea: cityArea.trim(),
        checkInDate,
        checkOutDate,
        platform: platform.trim(),
        booker: booker.trim(),
        price: price !== '' ? Number(price) : undefined,
        currency: currency.trim() || 'TWD',
        roomType: roomType.trim(),
        freeCancellationDeadline,
        status,
        bookingRef: bookingRef.trim(),
        bookingUrl: bookingUrl.trim(),
        mapUrl: mapUrl.trim(),
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id || !onDelete) return;
    if (confirm('確定要刪除這筆住宿資料嗎？')) {
      setIsSubmitting(true);
      try {
        await onDelete(item.id);
        onClose();
      } catch (err) {
        console.error(err);
        alert('刪除失敗');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              {item ? '編輯住宿' : '新增預訂住宿'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm">
          {/* 飯店名稱 */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">住宿名稱 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：那霸歌町大和 Roynet 飯店"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 城市地區 & 房型 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">地區 / 城市</label>
              <input
                type="text"
                value={cityArea}
                onChange={(e) => setCityArea(e.target.value)}
                placeholder="例：那霸市新都心"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">房型與方案</label>
              <input
                type="text"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="例：標準雙床 含早餐"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* 入住與退房日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block font-semibold text-slate-300 mb-1">入住日</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full min-w-0 appearance-none min-h-[38px] px-2.5 sm:px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
              />
            </div>
            <div className="min-w-0">
              <label className="block font-semibold text-slate-300 mb-1">退房日</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full min-w-0 appearance-none min-h-[38px] px-2.5 sm:px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
              />
            </div>
          </div>

          {/* 預訂平台 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-300">預訂平台</label>
              <div className="flex items-center space-x-1">
                {COMMON_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      platform === p
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="例：Agoda、Booking.com、官網"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 訂房者 & 狀態 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">訂房者</label>
              <div className="flex items-center space-x-1 mb-1.5 flex-wrap gap-y-1">
                {companionList.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBooker(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      booker === c
                        ? 'bg-sky-400/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={booker}
                onChange={(e) => setBooker(e.target.value)}
                placeholder="訂房者姓名"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">目前狀態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AccommodationStatus)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="candidate">抉擇中 (PK候補)</option>
                <option value="confirmed">✓ 已保留 (確定入住)</option>
                <option value="pending_cancel">⚠️ 待去平台退訂</option>
                <option value="cancelled">✕ 已在平台退訂</option>
              </select>
            </div>
          </div>

          {/* 費用與幣別 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">總金額</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="總房價"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">幣別</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="JPY / TWD"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-center uppercase"
              />
            </div>
          </div>

          {/* 免費取消截止時間 */}
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <label className="font-bold text-amber-300 text-xs">免費取消截止時間</label>
              </div>
              {deadlineDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDeadlineDate('');
                    setDeadlineTime('23:59');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>清除</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7 min-w-0">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => {
                    setDeadlineDate(e.target.value);
                    if (!deadlineTime) setDeadlineTime('23:59');
                  }}
                  className="w-full min-w-0 appearance-none min-h-[38px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 sm:px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono text-sm cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
                />
              </div>
              <div className="sm:col-span-5 flex items-center space-x-1.5 min-w-0">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  onBlur={(e) => setDeadlineTime(formatTimeOnBlur(e.target.value))}
                  placeholder="23:59"
                  className="w-full min-w-0 appearance-none min-h-[38px] bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-400 font-mono text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => setDeadlineTime('23:59')}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border min-h-[38px] flex items-center justify-center ${
                    deadlineTime === '23:59'
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                  }`}
                  title="設為 23:59"
                >
                  23:59
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>以當地時區為準，預設為當日 23:59</span>
              <div className="flex items-center space-x-1">
                {['18:00', '12:00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeadlineTime(preset)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 訂單編號 & 訂單連結 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">訂單編號 / 確認號</label>
              <input
                type="text"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="例：123456789"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">訂單網址</label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Google 地圖連結 */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">地圖連結 (Google Maps)</label>
            <input
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 備註 */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">備註</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="停車費用、加床政策、入住 Check-in 密碼等..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {item?.id && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                title="刪除住宿"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-400/20"
              >
                {isSubmitting ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
