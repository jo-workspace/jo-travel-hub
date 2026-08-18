'use client';

import React from 'react';
import { RefreshCw, Settings, Eye, EyeOff, Plane, Share2 } from 'lucide-react';

interface HeaderProps {
  hideVisited: boolean;
  onToggleHideVisited: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onShare?: () => void;
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
  isLoading = false,
  tripTitle = '旅程總覽',
  customIcon,
}) => {
  // 算乾淨的 Badge 符號：若包含英文則取前兩個英文字母（如 LA），中文則用 Plane 圖示
  const englishMatches = tripTitle.match(/[A-Za-z]+/g);
  const badgeText = englishMatches ? englishMatches.join('').substring(0, 2).toUpperCase() : null;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Title */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0 select-none overflow-hidden">
            {customIcon ? (
              <img src={customIcon} alt="Icon" className="w-full h-full object-cover" />
            ) : badgeText ? (
              badgeText
            ) : (
              <Plane className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none truncate">
              {tripTitle}
            </h1>
          </div>
        </div>

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
            title={hideVisited ? '顯示已完成項目' : '隱藏已完成項目'}
          >
            {hideVisited ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
              title="複製此頁面連結分享給旅伴"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="重新讀取資料"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
            title="旅程設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
