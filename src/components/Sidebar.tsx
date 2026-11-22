'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  BedDouble,
  CheckSquare,
  Package,
  DollarSign,
  ShoppingBag,
  Eye,
  EyeOff,
  Plane,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  Settings,
  Share2,
  Users,
  Link2,
} from 'lucide-react';
import { TodoBadgeSummary } from '@/lib/todoUtils';
import HubSpaceSwitcherModal from './HubSpaceSwitcherModal';

export type TabType = 'itinerary' | 'accommodations' | 'todo' | 'packing' | 'expenses' | 'shopping';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hideVisited: boolean;
  onToggleHideVisited: () => void;
  tripTitle?: string;
  customIcon?: string;
  todoBadge?: TodoBadgeSummary;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onShare?: () => void;
  onShareCompanion?: () => void;
  isLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  hideVisited,
  onToggleHideVisited,
  tripTitle = '旅程總覽',
  customIcon,
  todoBadge,
  onRefresh,
  onOpenSettings,
  onShare,
  onShareCompanion,
  isLoading = false,
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  const tabs = [
    { id: 'itinerary', label: '行程', icon: Calendar },
    { id: 'accommodations', label: '住宿', icon: BedDouble },
    { id: 'todo', label: '待辦', icon: CheckSquare },
    { id: 'packing', label: '打包', icon: Package },
    { id: 'expenses', label: '記帳', icon: DollarSign },
    { id: 'shopping', label: '購物', icon: ShoppingBag },
  ] as const;

  // 算乾淨的 Badge 符號：若包含英文則取前兩個英文字母（如 LA），中文則用 Plane 圖示
  const englishMatches = tripTitle.match(/[A-Za-z]+/g);
  const badgeText = englishMatches ? englishMatches.join('').substring(0, 2).toUpperCase() : null;

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-200 fixed left-0 top-0 bottom-0 z-50 p-4 border-r border-slate-800">
        {/* Top: Back to Hub Link */}
        <div className="mb-2">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 group"
            title="返回旅程大廳"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-amber-400" />
            <span>旅程大廳</span>
          </Link>
        </div>

        {/* Brand Header & Space Switcher Trigger */}
        <button
          type="button"
          onClick={() => setIsSwitcherOpen(true)}
          className="w-full flex items-center space-x-3 px-2.5 py-2.5 rounded-2xl hover:bg-slate-800/80 transition-all text-left cursor-pointer group focus:outline-none mb-5"
          title="切換生活空間"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md flex-shrink-0 select-none overflow-hidden group-hover:scale-105 transition-transform">
            {customIcon ? (
              <img src={customIcon} alt="Icon" className="w-full h-full object-cover" />
            ) : badgeText ? (
              badgeText
            ) : (
              <Plane className="w-5 h-5 text-slate-950" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1">
              <h2
                className="font-extrabold text-sm text-white tracking-tight leading-tight truncate group-hover:text-amber-300 transition-colors"
                title={tripTitle}
              >
                {tripTitle}
              </h2>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-y-0.5 shrink-0" />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">切換空間</span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const showTodoUrgent = tab.id === 'todo' && todoBadge?.tier === 'urgent';
            const showTodoCalm = tab.id === 'todo' && todoBadge?.tier === 'calm';
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id as TabType)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer font-bold text-sm ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border-l-4 border-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </span>

                {showTodoUrgent && todoBadge && (
                  <span
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[11px] font-mono tabular-nums"
                    title={`${todoBadge.urgentCount} 項近期或已逾期待辦`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{todoBadge.urgentCount}</span>
                  </span>
                )}

                {showTodoCalm && (
                  <span
                    className="w-2 h-2 rounded-full border border-slate-500 mr-1"
                    title="尚有更久之後或無期限待辦"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Global Action Toolbar */}
        <div className="pt-3 border-t border-slate-800/80 relative">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/60 shadow-inner">
            {/* 1. Hide Visited Toggle */}
            <button
              type="button"
              onClick={onToggleHideVisited}
              className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                hideVisited
                  ? 'bg-slate-800 text-amber-400 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title={hideVisited ? '顯示已完成' : '隱藏已完成'}
            >
              {hideVisited ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* 2. Share Menu Toggle */}
            {(onShare || onShareCompanion) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (onShare && onShareCompanion) {
                      setIsShareMenuOpen((prev) => !prev);
                    } else if (onShareCompanion) {
                      onShareCompanion();
                    } else if (onShare) {
                      onShare();
                    }
                  }}
                  className={`w-full h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isShareMenuOpen
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
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
                      className="absolute bottom-11 left-0 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 space-y-0.5 animate-scale-up"
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

            {/* 3. Refresh Sync */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="重新整理同步"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

            {/* 4. Settings */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer active:scale-95"
                title="旅程設定"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <HubSpaceSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentSpace="travel"
      />
    </>
  );
};
