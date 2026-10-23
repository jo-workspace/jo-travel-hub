'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface HubSpaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpace?: string;
}

interface RemoteSubPage {
  id: string;
  name: string;
  path: string;
  badge?: string;
  icon?: string;
}

interface RemoteChannel {
  id: string;
  name: string;
  subPages: RemoteSubPage[];
}

export default function HubSpaceSwitcherModal({
  isOpen,
  onClose,
  currentSpace = 'travel',
}: HubSpaceSwitcherModalProps) {
  const [mounted, setMounted] = useState(false);
  const [remotePins, setRemotePins] = useState<Record<string, string>>({});
  const [remoteChannels, setRemoteChannels] = useState<Record<string, RemoteChannel>>({});
  const [savingPin, setSavingPin] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const cached = localStorage.getItem('hub_pins');
      if (cached) {
        setRemotePins(JSON.parse(cached));
      }
    } catch {}
  }, []);

  // 當開啟選單時，從 Life Hub API 抓取最新跨裝置釘選與活躍旅程
  useEffect(() => {
    if (!isOpen) return;

    const fetchSpaces = async () => {
      try {
        const res = await fetch('https://life-hub-nu-murex.vercel.app/api/spaces', {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.pins) {
          setRemotePins(data.pins);
          try {
            localStorage.setItem('hub_pins', JSON.stringify(data.pins));
          } catch {}
        }
        if (data.channels && Array.isArray(data.channels)) {
          const map: Record<string, RemoteChannel> = {};
          data.channels.forEach((c: any) => {
            map[c.id] = c;
          });
          setRemoteChannels(map);
        }
      } catch (err) {
        console.error('Failed to fetch remote spaces in switcher:', err);
      }
    };

    fetchSpaces();
  }, [isOpen]);

  // 監聽 ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const defaultSpaces = [
    {
      id: 'travel',
      name: 'Travel Hub',
      subtitle: '多旅程隨身助理 · 每日行程',
      icon: '✈️',
      color: 'from-blue-500 to-indigo-600',
      baseUrl: '/',
      isCurrent: true,
      fallbackSubLinks: [
        { id: 'okinawa-2026', name: '沖繩之旅 🌺', path: '/trip/okinawa-2026' },
        { id: 'trip-msj15h2t', name: '九州之旅 🐕', path: '/trip/trip-msj15h2t' },
        { id: 'overview', name: '旅程總覽', path: '/' },
      ],
    },
    {
      id: 'camping',
      name: 'Camping Hub',
      subtitle: '露營裝備 · 營隊清單與分帳',
      icon: '⛺',
      color: 'from-emerald-500 to-teal-600',
      baseUrl: process.env.NEXT_PUBLIC_CAMPING_URL || 'https://camping-green.vercel.app/',
      fallbackSubLinks: [
        { id: 'camp-mv63u9w1', name: '馬丘比丘 🏕️', path: '/camp/camp-mv63u9w1' },
        { id: 'camp-mvf1tq9n', name: '九窩 🏕️', path: '/camp/camp-mvf1tq9n' },
        { id: 'pocket', name: '口袋名單', path: '/pocket' },
        { id: 'overview', name: '大廳', path: '/' },
      ],
    },
    {
      id: 'pantry',
      name: 'Pantry Tracker',
      subtitle: '食材庫存追蹤 · 採買清單 · 料理食譜',
      icon: '🍳',
      color: 'from-amber-500 to-orange-600',
      baseUrl: process.env.NEXT_PUBLIC_PANTRY_URL || 'https://pantry-tracker-v2-gules.vercel.app/',
      fallbackSubLinks: [
        { id: 'inventory', name: '食材庫存 🥬', path: '/' },
        { id: 'shopping', name: '採買清單 🛒', path: '/#shopping' },
        { id: 'recipes', name: '料理食譜 📖', path: '/#recipes' },
      ],
    },
    {
      id: 'tete',
      name: 'Tete Tracker',
      subtitle: '特特日常日記 · 體重用藥 · 醫療記錄',
      icon: '💬',
      color: 'from-rose-500 to-pink-600',
      baseUrl: process.env.NEXT_PUBLIC_TETE_URL || 'https://tete-tracker.vercel.app/',
      fallbackSubLinks: [
        { id: 'daily', name: '生活日誌 🐾', path: '/' },
        { id: 'weight', name: '體重 ⚖️', path: '/weight' },
        { id: 'supplements', name: '保健用藥 💊', path: '/supplements' },
        { id: 'medical', name: '就診紀錄 🏥', path: '/medical' },
      ],
    },
  ];

  const hubUrl = process.env.NEXT_PUBLIC_LIFE_HUB_URL || 'https://life-hub-nu-murex.vercel.app/';

  // 原地直接跳轉，不另開分頁
  const handleNavigate = (url: string) => {
    window.location.href = url;
    onClose();
  };

  // 跨裝置雲端釘選
  const handleTogglePin = async (e: React.MouseEvent, channelId: string, subPageId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const currentPin = remotePins[channelId];
    const newPin = currentPin === subPageId ? '' : subPageId;
    const nextPins = { ...remotePins, [channelId]: newPin };

    setRemotePins(nextPins);
    try {
      localStorage.setItem('hub_pins', JSON.stringify(nextPins));
    } catch {}
    setSavingPin(`${channelId}-${subPageId}`);

    try {
      const res = await fetch('https://life-hub-nu-murex.vercel.app/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, subPageId: newPin }),
      });
      const data = await res.json();
      if (data.pins) {
        setRemotePins(data.pins);
        try {
          localStorage.setItem('hub_pins', JSON.stringify(data.pins));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to sync pin to cloud from switcher:', err);
    } finally {
      setSavingPin(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center font-sans">
      {/* 背景遮罩 */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Instagram 風格 Bottom Sheet (手機) / Modal (桌面) */}
      <div className="relative w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl p-4 sm:p-5 z-10 max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-250 text-slate-100">
        {/* 頂部拖曳把手與極簡關閉鈕 */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 opacity-0" />
          <div className="w-10 h-1.5 rounded-full bg-slate-700/80 -mr-2" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* 空間清單 */}
        <div className="space-y-2">
          {defaultSpaces.map((space) => {
            const isCurrent = space.id === currentSpace;
            const remoteChannel = remoteChannels[space.id];
            const subPages = remoteChannel?.subPages?.length
              ? remoteChannel.subPages
              : space.fallbackSubLinks;

            // 尋找釘選目標
            const customPinId = remotePins[space.id];
            const pinnedSub = subPages.find((s) => s.id === customPinId || s.path.includes(customPinId));
            const defaultTarget = pinnedSub || (subPages.length > 1 ? subPages[1] : subPages[0]);

            // 計算目標網址
            const cleanBase = space.baseUrl.replace(/\/+$/, '');
            const targetPath = defaultTarget?.path ? (defaultTarget.path.startsWith('/') ? defaultTarget.path : `/${defaultTarget.path}`) : '/';
            const fullTargetUrl = isCurrent ? targetPath : `${cleanBase}${targetPath}`;

            return (
              <div
                key={space.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-800/90 border-blue-500/60 shadow-md shadow-blue-500/5'
                    : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div
                  onClick={() => !isCurrent && handleNavigate(fullTargetUrl)}
                  className={`flex items-center justify-between gap-3 ${
                    isCurrent ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${space.color} text-white flex items-center justify-center text-lg shadow-md shrink-0`}
                    >
                      {space.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate">
                          {space.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            目前所在
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                        {pinnedSub ? (
                          <span className="text-amber-300 flex items-center gap-0.5 font-medium truncate">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-amber-400 shrink-0"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            直達：{pinnedSub.name}
                          </span>
                        ) : (
                          <span className="truncate">{space.subtitle}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isCurrent ? (
                    <button
                      onClick={() => handleNavigate(fullTargetUrl)}
                      className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>前往</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </button>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                  )}
                </div>

                {/* 空間的直達子頁面標籤 */}
                {subPages && subPages.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 shrink-0">子頁:</span>
                    {subPages.map((sub) => {
                      const cleanPath = sub.path.startsWith('/') ? sub.path : `/${sub.path}`;
                      const subTargetUrl = isCurrent ? sub.path : `${cleanBase}${cleanPath}`;
                      const isPinned = customPinId === sub.id || (sub.path !== '/' && customPinId && sub.path.includes(customPinId));
                      const isSaving = savingPin === `${space.id}-${sub.id}`;

                      return (
                        <div
                          key={sub.id || sub.name}
                          className={`inline-flex items-center rounded-md border text-[11px] transition-all ${
                            isPinned
                              ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 shadow-sm'
                              : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(subTargetUrl);
                            }}
                            className="px-2 py-0.5 cursor-pointer whitespace-nowrap"
                          >
                            {sub.name}
                          </button>

                          <button
                            onClick={(e) => handleTogglePin(e, space.id, sub.id)}
                            title={isPinned ? '取消釘選（跨裝置同步）' : '釘選為此空間預設直達子頁（跨裝置同步）'}
                            disabled={isSaving}
                            className={`px-1 py-0.5 border-l border-slate-700/60 transition-colors cursor-pointer ${
                              isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {isSaving ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 animate-spin text-amber-400"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-2.5 h-2.5 ${isPinned ? 'text-amber-400' : ''}`}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部低調「大廳」入口 */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <button
            onClick={() => handleNavigate(hubUrl)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/70 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer text-xs"
          >
            <span className="flex items-center gap-2 font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-500"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span>大廳</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-600"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
