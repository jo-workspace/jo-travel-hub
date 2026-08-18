'use client';

import React from 'react';
import { Calendar, CheckSquare, Package, DollarSign, ShoppingBag, Eye, EyeOff, Plane } from 'lucide-react';

export type TabType = 'itinerary' | 'todo' | 'packing' | 'expenses' | 'shopping';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hideVisited: boolean;
  onToggleHideVisited: () => void;
  tripTitle?: string;
  customIcon?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  hideVisited,
  onToggleHideVisited,
  tripTitle = '旅程總覽',
  customIcon,
}) => {
  const tabs = [
    { id: 'itinerary', label: '行程表', icon: Calendar },
    { id: 'todo', label: '待辦事項', icon: CheckSquare },
    { id: 'packing', label: '打包清單', icon: Package },
    { id: 'expenses', label: '記帳分帳', icon: DollarSign },
    { id: 'shopping', label: '購物清單', icon: ShoppingBag },
  ] as const;

  // 算乾淨的 Badge 符號：若包含英文則取前兩個英文字母（如 LA），中文則用 Plane 圖示
  const englishMatches = tripTitle.match(/[A-Za-z]+/g);
  const badgeText = englishMatches ? englishMatches.join('').substring(0, 2).toUpperCase() : null;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-200 fixed left-0 top-0 bottom-0 z-50 p-4 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md flex-shrink-0 select-none overflow-hidden">
          {customIcon ? (
            <img src={customIcon} alt="Icon" className="w-full h-full object-cover" />
          ) : badgeText ? (
            badgeText
          ) : (
            <Plane className="w-5 h-5 text-slate-950" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-base text-white tracking-tight leading-tight truncate" title={tripTitle}>
            {tripTitle}
          </h2>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as TabType)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer font-bold text-sm ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border-l-4 border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Toggle */}
      <div className="pt-4 border-t border-slate-800">
        <button
          onClick={onToggleHideVisited}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer text-xs font-semibold text-slate-300"
        >
          <div className="flex items-center space-x-2">
            {hideVisited ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            <span>{hideVisited ? '隱藏去過/已完成' : '顯示全項目'}</span>
          </div>
          <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
            {hideVisited ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </aside>
  );
};
