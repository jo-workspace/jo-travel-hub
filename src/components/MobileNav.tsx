'use client';

import React from 'react';
import { Calendar, BedDouble, CheckSquare, Package, DollarSign, ShoppingBag } from 'lucide-react';
import { TabType } from './Sidebar';
import { TodoBadgeSummary } from '@/lib/todoUtils';

interface MobileNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  todoBadge?: TodoBadgeSummary;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, todoBadge }) => {
  const tabs = [
    { id: 'itinerary', label: '行程', icon: Calendar },
    { id: 'accommodations', label: '住宿', icon: BedDouble },
    { id: 'todo', label: '待辦', icon: CheckSquare },
    { id: 'packing', label: '打包', icon: Package },
    { id: 'expenses', label: '記帳', icon: DollarSign },
    { id: 'shopping', label: '購物', icon: ShoppingBag },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        const showTodoUrgent = tab.id === 'todo' && todoBadge?.tier === 'urgent';
        const showTodoCalm = tab.id === 'todo' && todoBadge?.tier === 'calm';
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as TabType)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isActive ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'scale-110 text-amber-400' : ''} transition-transform`} />
              {showTodoUrgent && (
                <span
                  className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-slate-900"
                  aria-hidden="true"
                />
              )}
              {showTodoCalm && (
                <span
                  className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full border border-slate-400 bg-slate-900"
                  aria-hidden="true"
                />
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

