'use client';

import React, { useState, useEffect } from 'react';
import { FlightItem, FlightType, FlightCheckInStatus } from '@/types/trip';
import { formatTimeOnBlur } from '@/lib/timeUtils';
import {
  X,
  Trash2,
  Plane,
  Sparkles,
  Loader2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
const COMMON_CHECKED_BAGGAGE = ['2件 (23kg)', '1件 (23kg)', '1件 (20kg)', '無託運'];
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
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [terminal, setTerminal] = useState('');
  const [pnr, setPnr] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<FlightCheckInStatus>('none');
  const [seatNumbers, setSeatNumbers] = useState('');
  const [checkedBaggage, setCheckedBaggage] = useState('');
  const [carryOnBaggage, setCarryOnBaggage] = useState('');
  const [note, setNote] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // UI 輔助狀態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
      setPnr(item.pnr || '');
      setCheckInStatus(item.checkInStatus || 'none');
      setSeatNumbers(item.seatNumbers || '');
      setCheckedBaggage(
        (item.checkedBaggage || '2件 (23kg)').replace('每人', '')
      );
      setCarryOnBaggage((item.carryOnBaggage || '7kg').replace('每人', ''));
      setNote(item.note || '');
      setIsCompleted(!!item.isCompleted);
      // 若已有次要資訊，自動展開細節
      if (item.seatNumbers || item.note || item.terminal) {
        setShowDetails(true);
      }
    } else {
      setType(defaultFlightType || 'outbound');
      setFlightNumber('');
      setAirline('星宇航空');
      setDepartureAirport(defaultFlightType === 'inbound' ? '' : 'TPE');
      setDepartureCity(defaultFlightType === 'inbound' ? '' : '台北桃園');
      setDepartureDate(tripStartDate || '');
      setDepartureTime('');
      setArrivalAirport('');
      setArrivalCity('');
      setArrivalDate(tripStartDate || '');
      setArrivalTime('');
      setTerminal('');
      setPnr('');
      setCheckInStatus('none');
      setSeatNumbers('');
      setCheckedBaggage('2件 (23kg)');
      setCarryOnBaggage('7kg');
      setNote('');
      setIsCompleted(false);
      setShowDetails(false);
    }
    setAiMessage(null);
  }, [item, isOpen, tripStartDate, defaultFlightType]);

  if (!isOpen) return null;

  // 呼叫 Gemini AI 查詢即時航班資訊
  const handleAiLookup = async () => {
    const cleanFn = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanFn) {
      alert('請先輸入航班號碼（例如：JX800）');
      return;
    }

    setIsAiLoading(true);
    setAiMessage(null);

    try {
      const res = await fetch('/api/flight-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightNumber: cleanFn,
          date: departureDate || tripStartDate || undefined,
        }),
      });

      const result = await res.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || '查詢失敗');
      }

      const info = result.data;

      if (info.airline) setAirline(info.airline);
      if (info.departureAirport) setDepartureAirport(info.departureAirport);
      if (info.departureCity) setDepartureCity(info.departureCity);
      if (info.departureTime) setDepartureTime(info.departureTime);
      if (info.arrivalAirport) setArrivalAirport(info.arrivalAirport);
      if (info.arrivalCity) setArrivalCity(info.arrivalCity);
      if (info.arrivalTime) setArrivalTime(info.arrivalTime);
      if (info.terminal) {
        setTerminal(info.terminal);
        setShowDetails(true);
      }

      setAiMessage(`✓ AI 已自動帶入 ${info.departureAirport} ➔ ${info.arrivalAirport}`);
    } catch (err: any) {
      console.warn('AI Lookup failed:', err);
      alert(err.message || 'AI 查詢失敗，請手動填寫');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !airline.trim() ||
      !flightNumber.trim() ||
      !departureAirport.trim() ||
      !arrivalAirport.trim()
    ) {
      alert('請填寫航班號碼、航空公司與起降機場');
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
        arrivalDate: arrivalDate || departureDate,
        arrivalTime: arrivalTime.trim(),
        terminal: terminal.trim(),
        pnr: pnr.trim().toUpperCase(),
        checkInStatus,
        seatStatus: seatNumbers.trim() ? 'selected' : 'unselected',
        seatNumbers: seatNumbers.trim(),
        checkedBaggage: checkedBaggage.trim(),
        carryOnBaggage: carryOnBaggage.trim(),
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
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-5 text-slate-100 shadow-2xl relative my-auto max-h-[92vh] flex flex-col min-w-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Plane className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              {item ? '編輯班機' : '新增班機'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 pr-1 pt-3 text-xs sm:text-sm min-w-0 w-full">
          {/* 航段類型切換 (極簡 3 鍵 Segment，單詞無贅字) */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 min-w-0 w-full">
            {[
              { id: 'outbound', label: '去程' },
              { id: 'inbound', label: '回程' },
              { id: 'transit', label: '轉機' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as FlightType)}
                className={`flex-1 min-w-0 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  type === t.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 第一格：航班號碼 (核心主體) + AI 查詢 */}
          <div className="min-w-0 w-full">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              航班號碼 <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <input
                type="text"
                autoFocus
                required
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiLookup();
                  }
                }}
                placeholder="例：JX800"
                className="flex-1 min-w-0 w-full appearance-none bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm sm:text-base font-black uppercase tracking-wider min-h-[38px]"
              />
              <button
                type="button"
                onClick={handleAiLookup}
                disabled={isAiLoading || !flightNumber.trim()}
                className="flex-shrink-0 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer min-h-[38px] whitespace-nowrap"
                title="使用 Gemini AI 查詢全球時刻表並自動帶入"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">查詢中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>AI 查詢</span>
                  </>
                )}
              </button>
            </div>

            {aiMessage && (
              <div className="text-[11px] text-emerald-400 font-bold mt-1 pl-1 flex items-center space-x-1 animate-fade-in">
                <span>{aiMessage}</span>
              </div>
            )}
          </div>

          {/* 航空公司 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">航空公司 *</label>
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                {COMMON_AIRLINES.slice(0, 4).map((air) => (
                  <button
                    key={air}
                    type="button"
                    onClick={() => setAirline(air)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
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
            <input
              type="text"
              required
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="例：星宇航空"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[38px]"
            />
          </div>

          {/* 日期與訂位代號 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-slate-300 mb-1">出發日</label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full min-w-0 appearance-none min-h-[38px] bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 sm:px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-bold text-slate-300 mb-1">訂位代號 (PNR)</label>
              <input
                type="text"
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                placeholder="例：ABC123"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold tracking-wider placeholder-slate-500 uppercase focus:outline-none focus:border-amber-400 min-h-[38px]"
              />
            </div>
          </div>

          {/* 起降路線化卡片 (整合出發與抵達時間/機場，杜絕破版) */}
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 space-y-2.5">
            {/* 出發 */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">出發機場 *</label>
                <input
                  type="text"
                  required
                  value={departureAirport}
                  onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                  placeholder="TPE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono font-bold text-center uppercase focus:outline-none focus:border-amber-400 min-h-[38px]"
                />
              </div>
              <div className="col-span-5 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">出發城市</label>
                <input
                  type="text"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  placeholder="台北桃園"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 min-h-[38px]"
                />
              </div>
              <div className="col-span-4 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">起飛時間 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  onBlur={(e) => setDepartureTime(formatTimeOnBlur(e.target.value))}
                  placeholder="08:30"
                  className="w-full min-w-0 appearance-none min-h-[38px] bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>
            </div>

            {/* 抵達 */}
            <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-slate-800/80">
              <div className="col-span-3 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">抵達機場 *</label>
                <input
                  type="text"
                  required
                  value={arrivalAirport}
                  onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
                  placeholder="NRT"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono font-bold text-center uppercase focus:outline-none focus:border-amber-400 min-h-[38px]"
                />
              </div>
              <div className="col-span-5 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">抵達城市</label>
                <input
                  type="text"
                  value={arrivalCity}
                  onChange={(e) => setArrivalCity(e.target.value)}
                  placeholder="東京成田"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 min-h-[38px]"
                />
              </div>
              <div className="col-span-4 min-w-0">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">抵達時間 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  onBlur={(e) => setArrivalTime(formatTimeOnBlur(e.target.value))}
                  placeholder="12:45"
                  className="w-full min-w-0 appearance-none min-h-[38px] bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 次要資訊收合按鈕 (Minimalist 摺疊) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-2 px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs font-semibold"
            >
              <span>{showDetails ? '收合更多選項' : '▾ 更多選填 (座位、行李、航廈、備註)'}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* 摺疊展開區塊 */}
          {showDetails && (
            <div className="space-y-3 pt-1 border-t border-slate-800 animate-fade-in">
              {/* 座位與航廈 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">座位號碼</label>
                  <input
                    type="text"
                    value={seatNumbers}
                    onChange={(e) => setSeatNumbers(e.target.value)}
                    placeholder="例：24A, 24B"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono min-h-[38px]"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">航廈</label>
                  <input
                    type="text"
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value)}
                    placeholder="例：T2"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-amber-400 min-h-[38px]"
                  />
                </div>
              </div>

              {/* 行李額度 (徹底去除「每人」贅字) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">託運行李</label>
                  <input
                    type="text"
                    value={checkedBaggage}
                    onChange={(e) => setCheckedBaggage(e.target.value)}
                    placeholder="例：2件 (23kg)"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[38px] mb-1"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {COMMON_CHECKED_BAGGAGE.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCheckedBaggage(b)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-300 mb-1">手提行李</label>
                  <input
                    type="text"
                    value={carryOnBaggage}
                    onChange={(e) => setCarryOnBaggage(e.target.value)}
                    placeholder="例：7kg"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[38px] mb-1"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {COMMON_CARRY_ON.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarryOnBaggage(c)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 報到狀態 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">報到狀態</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'none', label: '待報到' },
                    { id: 'auto', label: '自動報到' },
                    { id: 'done', label: '已報到' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCheckInStatus(s.id as FlightCheckInStatus)}
                      className={`py-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        checkInStatus === s.id
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 備註 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">備註</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="特殊餐點、航站接駁等..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* 搭乘完成勾選框 */}
              <div className="flex items-center space-x-2 pt-0.5">
                <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => setIsCompleted(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 bg-slate-800 border-slate-700 focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">此班機已搭乘完畢</span>
                </label>
              </div>
            </div>
          )}

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
            ) : (
              <div />
            )}

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
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-400/20 active:scale-95"
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
