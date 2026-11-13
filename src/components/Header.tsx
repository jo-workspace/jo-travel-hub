'use client';

import React, { useState } from 'react';
import { RefreshCw, Settings, Eye, EyeOff, Plane, Share2, ChevronDown, Users, Link2 } from 'lucide-react';
import HubSpaceSwitcherModal from './HubSpaceSwitcherModal';

interface HeaderProps {
  hideVisited: boolean;
  onToggleHideVisited: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onShare?: () => void;
  onShareCompanion?: () => void;
  isLoading?: boolean;
  tripTitle?: string;
  customIcon?: string;
}

export const Header: React.FC<HeaderProps> = ({
  hideVisited,
  onToggleHideVisited,
  onRefresh,
  onOpenSettings,
  onShare,
  onShareCompanion,
  isLoading = false,
  tripTitle = '旅程總覽',
  customIcon,
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  // 算乾淨的 Badge 符號：若包含英文則取前兩個英文字母（如 LA），中文則用 Plane 圖示
  const englishMatches = tripTitle.match(/[A-Za-z]+/g);
  const badgeText = englishMatches ? englishMatches.join('').substring(0, 2).toUpperCase() : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Title & Hub Switcher */}
          <button
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center space-x-2.5 min-w-0 text-left cursor-pointer group focus:outline-none"
            title="切換生活空間"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0 select-none overflow-hidden group-hover:scale-105 transition-transform">
              {customIcon ? (
                <img src={customIcon} alt="Icon" className="w-full h-full object-cover" />
              ) : badgeText ? (
                badgeText
              ) : (
                <Plane className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0 flex items-center space-x-1">
              <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none truncate group-hover:text-blue-600 transition-colors">
                {tripTitle}
              </h1>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-y-0.5 shrink-0" />
            </div>
          </button>

          {/* Action Controls */}
          <div className="flex items-center space-x-1.5 md:space-x-2 flex-shrink-0 ml-2">
            {/* Hide Visited / Done Toggle */}
            <button
              onClick={onToggleHideVisited}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${
                hideVisited
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title={hideVisited ? '顯示已完成' : '隱藏已完成'}
            >
              {hideVisited ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Share Button & Minimalist Dropdown */}
            {(onShare || onShareCompanion) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (onShare && onShareCompanion) {
                      setIsShareMenuOpen((prev) => !prev);
                    } else if (onShareCompanion) {
                      onShareCompanion();
                    } else if (onShare) {
                      onShare();
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
                  title="分享旅程"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {isShareMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsShareMenuOpen(false)}
                    />
                    <div
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 space-y-0.5 animate-scale-up"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onShareCompanion && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareMenuOpen(false);
                            onShareCompanion();
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900">旅伴連結</div>
                            <div className="text-[10px] text-slate-400 font-medium">僅行程 · 記帳</div>
                          </div>
                        </button>
                      )}
                      {onShare && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareMenuOpen(false);
                            onShare();
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition-colors cursor-pointer"
                        >
                          <Link2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-700">完整連結</div>
                            <div className="text-[10px] text-slate-400 font-medium">全部分頁 · 需登入</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="重新整理"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
              title="設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <HubSpaceSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentSpace="travel"
      />
    </>
  );
};
