'use client';

import React, { useState } from 'react';
import { FlightItem } from '@/types/trip';
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  ChevronDown,
  ChevronUp,
  Luggage,
  Armchair,
  CheckCircle2,
  Bot,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface FlightCardProps {
  flights: FlightItem[];
  hideVisited?: boolean;
  timezone?: string;
  startDate?: string;
  onOpenModal: (flight?: FlightItem | null, defaultType?: 'outbound' | 'inbound') => void;
  showToast?: (msg: string) => void;
}

// 判斷某航班是否已搭乘完成（依 isCompleted 或已過抵達日期時間）
export const isFlightFinished = (f: FlightItem) => {
  if (f.isCompleted) return true;
  if (f.arrivalDate) {
    const arrDateTimeStr = `${f.arrivalDate}T${f.arrivalTime || '23:59'}:00`;
    const arrTime = new Date(arrDateTimeStr).getTime();
    if (!isNaN(arrTime) && Date.now() > arrTime) {
      return true;
    }
  }
  return false;
};

export const FlightCard: React.FC<FlightCardProps> = ({
  flights = [],
  hideVisited = false,
  timezone = 'Asia/Taipei',
  startDate = '',
  onOpenModal,
  showToast = (msg: string) => alert(msg),
}) => {
  const [copiedPnr, setCopiedPnr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 複製 PNR 訂位代號
  const handleCopyPnr = async (pnr: string, id: string) => {
    try {
      await navigator.clipboard.writeText(pnr);
      setCopiedPnr(id);
      showToast('已複製訂位代號 (PNR)');
      setTimeout(() => setCopiedPnr(null), 2000);
    } catch {
      showToast(`複製失敗：${pnr}`);
    }
  };

  // 若尚未設定任何航班，呈現緊湊引導橫幅
  if (flights.length === 0) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-3 sm:p-4 text-white shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-100">尚未填寫班機資訊</div>
            <div className="text-[10px] sm:text-xs text-slate-400">
              記錄去程與回程航班，隨時追蹤報到、選位與行李額度
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenModal(null, 'outbound')}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1 cursor-pointer transition-colors shadow-sm flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>設定班機</span>
        </button>
      </div>
    );
  }

  // 依去程、回程等分組，並套用自動隱藏邏輯
  const outboundFlights = flights.filter((f) => f.type === 'outbound');
  const inboundFlights = flights.filter((f) => f.type === 'inbound');
  const otherFlights = flights.filter((f) => f.type !== 'outbound' && f.type !== 'inbound');

  // 若已開啟 hideVisited，且去程班機均已抵達完成，則不顯示去程
  const visibleOutbound = outboundFlights.filter((f) => {
    if (hideVisited && isFlightFinished(f)) return false;
    return true;
  });

  const visibleInbound = inboundFlights.filter((f) => {
    if (hideVisited && isFlightFinished(f)) return false;
    return true;
  });

  const visibleOthers = otherFlights.filter((f) => {
    if (hideVisited && isFlightFinished(f)) return false;
    return true;
  });

  const displayList = [...visibleOutbound, ...visibleInbound, ...visibleOthers];

  // 若全部航班都已結束且開啟隱藏已造訪，則只顯示極簡通知或收合膠囊
  if (displayList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {displayList.map((flight) => {
        const finished = isFlightFinished(flight);
        const isOutbound = flight.type === 'outbound';
        const isInbound = flight.type === 'inbound';
        const isExpanded = expandedId === flight.id;

        // 若未開啟 hideVisited 但已完成，以灰階簡化摺疊狀態顯示
        if (finished && !hideVisited && !isExpanded) {
          return (
            <div
              key={flight.id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-400 opacity-75 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300">
                  {isOutbound ? '去程' : isInbound ? '回程' : '航段'} {flight.airline} {flight.flightNumber}
                </span>
                <span className="text-slate-500 font-mono">
                  {flight.departureAirport} ➔ {flight.arrivalAirport} (已抵達)
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setExpandedId(flight.id)}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                >
                  展開明細
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal(flight)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="編輯"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={flight.id}
            className={`rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden ${
              isOutbound
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-500/30'
                : isInbound
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            {/* Header: Type, Flight No., PNR, Edit */}
            <div className="px-3.5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center space-x-1 ${
                    isOutbound
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : isInbound
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isOutbound ? <PlaneTakeoff className="w-3 h-3" /> : <PlaneLanding className="w-3 h-3" />}
                  <span>{isOutbound ? '去程航班' : isInbound ? '回程航班' : '轉機航段'}</span>
                </span>

                <span className="font-bold text-white text-xs sm:text-sm">
                  {flight.airline} {flight.flightNumber}
                </span>

                {flight.departureDate && (
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    {flight.departureDate}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                {flight.pnr && (
                  <button
                    type="button"
                    onClick={() => handleCopyPnr(flight.pnr!, flight.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors ${
                      copiedPnr === flight.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                    title="複製訂位代號"
                  >
                    <span>PNR: {flight.pnr}</span>
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                )}

                {flight.ticketUrl && (
                  <a
                    href={flight.ticketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
                    title="開啟電子機票/官網報到"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onOpenModal(flight)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="編輯班機"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Flight Path Section */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                {/* Departure Airport */}
                <div className="text-left">
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight leading-none">
                    {flight.departureAirport}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {flight.departureCity || flight.departureAirport}
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                    {flight.departureTime}
                  </div>
                </div>

                {/* Arrow / Flight Duration */}
                <div className="flex-1 flex flex-col items-center px-3 max-w-[160px]">
                  <div className="flex items-center space-x-1 text-slate-500 text-[10px] font-mono mb-1">
                    {flight.terminal && <span>{flight.terminal}</span>}
                    {flight.gate && <span>· 登機門 {flight.gate}</span>}
                  </div>
                  <div className="w-full flex items-center">
                    <div className="h-0.5 flex-1 bg-slate-700" />
                    <Plane className="w-4 h-4 text-amber-400 mx-1 flex-shrink-0" />
                    <div className="h-0.5 flex-1 bg-slate-700" />
                  </div>
                </div>

                {/* Arrival Airport */}
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight leading-none">
                    {flight.arrivalAirport}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {flight.arrivalCity || flight.arrivalAirport}
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                    {flight.arrivalTime}
                  </div>
                </div>
              </div>

              {/* Status Chips Checklist (Check-in / Seats / Baggage) */}
              <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                {/* 報到狀態 */}
                {flight.checkInStatus === 'done' ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>已完成報到</span>
                  </span>
                ) : flight.checkInStatus === 'auto' ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center space-x-1">
                    <Bot className="w-3 h-3 text-sky-400" />
                    <span>已設自動報到</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>待報到</span>
                  </span>
                )}

                {/* 選位狀態 */}
                {flight.seatNumbers ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700 flex items-center space-x-1 font-mono">
                    <Armchair className="w-3 h-3 text-amber-400" />
                    <span>座位 {flight.seatNumbers}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60 flex items-center space-x-1">
                    <Armchair className="w-3 h-3 text-slate-500" />
                    <span>尚未選位</span>
                  </span>
                )}

                {/* 行李件數與重量 */}
                {flight.checkedBaggage && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
                    <Luggage className="w-3 h-3 text-amber-400" />
                    <span>託運: {flight.checkedBaggage}</span>
                  </span>
                )}

                {flight.carryOnBaggage && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
                    <span>手提: {flight.carryOnBaggage}</span>
                  </span>
                )}
              </div>

              {/* Note (if any) */}
              {flight.note && (
                <div className="text-[11px] text-slate-400 bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                  {flight.note}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 若目前只有去程或只有回程，提供快速新增另一程的小按鈕 */}
      {outboundFlights.length > 0 && inboundFlights.length === 0 && (
        <button
          type="button"
          onClick={() => onOpenModal(null, 'inbound')}
          className="w-full py-1.5 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>＋ 新增回程航班資訊</span>
        </button>
      )}

      {inboundFlights.length > 0 && outboundFlights.length === 0 && (
        <button
          type="button"
          onClick={() => onOpenModal(null, 'outbound')}
          className="w-full py-1.5 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>＋ 新增去程航班資訊</span>
        </button>
      )}
    </div>
  );
};
