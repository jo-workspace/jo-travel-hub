'use client';

import React, { useState, useEffect } from 'react';
import { FlightItem, FlightType, FlightCheckInStatus } from '@/types/trip';
import { X, Trash2, Plane, Clock, MapPin, Luggage, Armchair, CheckCircle2, Bot, ExternalLink, Calendar } from 'lucide-react';

interface FlightModalProps {
  isOpen: boolean;
  item?: FlightItem | null;
  tripStartDate?: string;
  defaultFlightType?: FlightType;
  onClose: () => void;
  onSave: (data: Partial<FlightItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COMMON_AIRLINES = ['星宇航空', '長榮航空', '中華航空', '國泰航空', '日本航空', '全日空', '酷航', '樂桃航空'];
const COMMON_CHECKED_BAGGAGE = ['每人2件 (23kg)', '每人1件 (23kg)', '每人1件 (20kg)', '無託運'];
const COMMON_CARRY_ON = ['7kg', '10kg'];

export const FlightModal: React.FC<FlightModalProps> = ({
  isOpen,
  item,
  tripStartDate = '',
  defaultFlightType = 'outbound',
  onClose,
  onSave,
  onDelete,
}) => {
  const [type, setType] = useState<FlightType>(defaultFlightType);
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [terminal, setTerminal] = useState('');
  const [gate, setGate] = useState('');
  const [pnr, setPnr] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<FlightCheckInStatus>('none');
  const [seatNumbers, setSeatNumbers] = useState('');
  const [checkedBaggage, setCheckedBaggage] = useState('');
  const [carryOnBaggage, setCarryOnBaggage] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [note, setNote] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setType(item.type || 'outbound');
      setAirline(item.airline || '');
      setFlightNumber(item.flightNumber || '');
      setDepartureAirport(item.departureAirport || '');
      setDepartureCity(item.departureCity || '');
      setDepartureDate(item.departureDate || '');
      setDepartureTime(item.departureTime || '');
      setArrivalAirport(item.arrivalAirport || '');
      setArrivalCity(item.arrivalCity || '');
      setArrivalDate(item.arrivalDate || '');
      setArrivalTime(item.arrivalTime || '');
      setTerminal(item.terminal || '');
      setGate(item.gate || '');
      setPnr(item.pnr || '');
      setCheckInStatus(item.checkInStatus || 'none');
      setSeatNumbers(item.seatNumbers || '');
      setCheckedBaggage(item.checkedBaggage || '每人2件 (23kg)');
      setCarryOnBaggage(item.carryOnBaggage || '7kg');
      setTicketUrl(item.ticketUrl || '');
      setNote(item.note || '');
      setIsCompleted(!!item.isCompleted);
    } else {
      setType(defaultFlightType || 'outbound');
      setAirline('星宇航空');
      setFlightNumber('');
      setDepartureAirport(defaultFlightType === 'inbound' ? '' : 'TPE');
      setDepartureCity(defaultFlightType === 'inbound' ? '' : '台北桃園');
      setDepartureDate(tripStartDate || '');
      setDepartureTime('');
      setArrivalAirport('');
      setArrivalCity('');
      setArrivalDate(tripStartDate || '');
      setArrivalTime('');
      setTerminal('');
      setGate('');
      setPnr('');
      setCheckInStatus('none');
      setSeatNumbers('');
      setCheckedBaggage('每人2件 (23kg)');
      setCarryOnBaggage('7kg');
      setTicketUrl('');
      setNote('');
      setIsCompleted(false);
    }
  }, [item, isOpen, tripStartDate, defaultFlightType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airline.trim() || !flightNumber.trim() || !departureAirport.trim() || !arrivalAirport.trim()) {
      alert('請填寫航空公司、班機號碼與起降機場');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: item?.id,
        type,
        airline: airline.trim(),
        flightNumber: flightNumber.trim().toUpperCase(),
        departureAirport: departureAirport.trim().toUpperCase(),
        departureCity: departureCity.trim(),
        departureDate,
        departureTime: departureTime.trim(),
        arrivalAirport: arrivalAirport.trim().toUpperCase(),
        arrivalCity: arrivalCity.trim(),
        arrivalDate,
        arrivalTime: arrivalTime.trim(),
        terminal: terminal.trim(),
        gate: gate.trim(),
        pnr: pnr.trim().toUpperCase(),
        checkInStatus,
        seatStatus: seatNumbers.trim() ? 'selected' : 'unselected',
        seatNumbers: seatNumbers.trim(),
        checkedBaggage: checkedBaggage.trim(),
        carryOnBaggage: carryOnBaggage.trim(),
        ticketUrl: ticketUrl.trim(),
        note: note.trim(),
        isCompleted,
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
    if (confirm('確定要刪除這筆班機資訊嗎？')) {
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
            <Plane className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              {item ? '編輯班機資訊' : '設定班機資訊'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm">
          {/* 航段類型切換 (去程 / 回程 / 內陸轉機) */}
          <div className="flex items-center space-x-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {[
              { id: 'outbound', label: '✈️ 去程 (Outbound)' },
              { id: 'inbound', label: '🛬 回程 (Inbound)' },
              { id: 'transit', label: '🔄 內陸/轉機 (Transit)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as FlightType)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  type === t.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 航空公司 & 班機號碼 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-300">航空公司 *</label>
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                {COMMON_AIRLINES.slice(0, 4).map((air) => (
                  <button
                    key={air}
                    type="button"
                    onClick={() => setAirline(air)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      airline === air
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {air}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="例：星宇航空"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                required
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="例：JX800 / BR12"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* 出發地 & 抵達地 */}
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 space-y-3">
            {/* 出發 */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">出發機場 *</label>
                <input
                  type="text"
                  required
                  value={departureAirport}
                  onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                  placeholder="TPE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-center uppercase focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">出發城市</label>
                <input
                  type="text"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  placeholder="台北桃園"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">出發時間 *</label>
                <input
                  type="text"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  placeholder="08:30"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* 抵達 */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">抵達機場 *</label>
                <input
                  type="text"
                  required
                  value={arrivalAirport}
                  onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
                  placeholder="NRT"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-center uppercase focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">抵達城市</label>
                <input
                  type="text"
                  value={arrivalCity}
                  onChange={(e) => setArrivalCity(e.target.value)}
                  placeholder="東京成田"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">抵達時間 *</label>
                <input
                  type="text"
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  placeholder="12:45"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* 日期、航廈與登機門 */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">出發日期</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">航廈 (Terminal)</label>
                <input
                  type="text"
                  value={terminal}
                  onChange={(e) => setTerminal(e.target.value)}
                  placeholder="例：T2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">登機門 (Gate)</label>
                <input
                  type="text"
                  value={gate}
                  onChange={(e) => setGate(e.target.value)}
                  placeholder="例：B4"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* 訂位代號 PNR */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">訂位代號 / 電腦代號 (PNR)</label>
            <input
              type="text"
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              placeholder="例：6 位英數字，如 ABC123"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold tracking-wider placeholder-slate-500 uppercase focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 報到狀態 Checklist */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">報到狀態</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: '⏳ 待報到', desc: '尚未開放/未報到' },
                { id: 'auto', label: '🤖 已設自動報到', desc: '48hr 系統自動報到' },
                { id: 'done', label: '✓ 已完成報到', desc: '已取登機證' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCheckInStatus(s.id as FlightCheckInStatus)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    checkInStatus === s.id
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">{s.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 座位號碼 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">座位號碼</label>
              <span className="text-[10px] text-slate-400">填入座位即視為已選位</span>
            </div>
            <input
              type="text"
              value={seatNumbers}
              onChange={(e) => setSeatNumbers(e.target.value)}
              placeholder="例：Jo: 24A, Will: 24B"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* 行李額度 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">託運行李</label>
              </div>
              <input
                type="text"
                value={checkedBaggage}
                onChange={(e) => setCheckedBaggage(e.target.value)}
                placeholder="例：每人2件 (23kg)"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center space-x-1 mt-1 flex-wrap gap-y-1">
                {COMMON_CHECKED_BAGGAGE.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setCheckedBaggage(b)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">手提行李</label>
              </div>
              <input
                type="text"
                value={carryOnBaggage}
                onChange={(e) => setCarryOnBaggage(e.target.value)}
                placeholder="例：7kg"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center space-x-1 mt-1 flex-wrap gap-y-1">
                {COMMON_CARRY_ON.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCarryOnBaggage(c)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 電子機票連結 */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">電子機票 / 官網線上報到網址</label>
            <input
              type="url"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://..."
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
              placeholder="特殊餐點、預約接駁、航站轉機須知等..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* 搭乘完成手動標記 */}
          <div className="flex items-center space-x-2 pt-1">
            <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-4 h-4 rounded text-amber-400 bg-slate-800 border-slate-700 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-semibold">此班機已搭乘完畢（開啟隱藏時將自動收起）</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {item?.id && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                title="刪除班機"
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
                disabled={isSubmitting || !airline.trim() || !flightNumber.trim()}
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
