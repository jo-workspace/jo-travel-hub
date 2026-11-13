'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TRIPS, TripConfig } from '@/config/trips';
import { AllTripData, ExpenseItem } from '@/types/trip';
import { ItineraryTab } from '@/components/tabs/ItineraryTab';
import { ExpensesTab } from '@/components/tabs/ExpensesTab';
import { ExpenseModal } from '@/components/modals/ExpenseModal';
import { LightboxModal } from '@/components/modals/LightboxModal';
import {
  getAllData,
  addExpenseData,
  deleteExpenseData,
  saveShoppingData,
  toggleShoppingStatus,
} from '@/lib/supabase-client';
import { Calendar, DollarSign, Eye, EyeOff, RefreshCw, Plane } from 'lucide-react';

type ShareTabType = 'itinerary' | 'expenses';
const VALID_SHARE_TABS: ShareTabType[] = ['itinerary', 'expenses'];

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default function CompanionSharePage({ params }: SharePageProps) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const tokenFromUrl = searchParams.get('token');

  const rawConfig: TripConfig | undefined = TRIPS[tripId];
  const tripConfig: TripConfig = useMemo(
    () =>
      rawConfig || {
        id: tripId,
        title: tripId.replace('trip-', '旅程 '),
        dates: '2026',
        coverGradient: 'from-indigo-600 to-purple-800',
        badgeText: '進行中',
        apiUrl: 'supabase',
        description: '專屬隨身旅程',
      },
    [rawConfig, tripId]
  );

  const [currentTab, setCurrentTab] = useState<ShareTabType>(() => {
    if (tabFromUrl && VALID_SHARE_TABS.includes(tabFromUrl as ShareTabType)) {
      return tabFromUrl as ShareTabType;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`shareActiveTab_${tripId}`) as ShareTabType;
      if (saved && VALID_SHARE_TABS.includes(saved)) return saved;
    }
    return 'itinerary';
  });

  const handleTabChange = (tab: ShareTabType) => {
    setCurrentTab(tab);
    localStorage.setItem(`shareActiveTab_${tripId}`, tab);
    const nextParams = new URLSearchParams();
    if (tokenFromUrl) nextParams.set('token', tokenFromUrl);
    nextParams.set('tab', tab);
    router.replace(`/share/${tripId}?${nextParams.toString()}`, { scroll: false });
  };

  const [hideVisited, setHideVisited] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [activeExpenseItem, setActiveExpenseItem] = useState<ExpenseItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [tripData, setTripData] = useState<AllTripData>({
    itinerary: [],
    accommodations: [],
    flights: [],
    todo: [],
    packing: [],
    expenses: [],
    shopping: [],
    fxRate: 1,
    tripNote: '',
    startDate: '',
    budgetTwd: 0,
    foreignCurrency: '',
    tripTitle: '',
    tripDates: '',
    timezone: tripConfig?.timezone || 'Asia/Taipei',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchData = useCallback(
    async (bypassCache = false) => {
      setIsLoading(true);
      try {
        const res = await getAllData(bypassCache, tripId);
        if (res) {
          setTripData(res);
          if (bypassCache) {
            showToast('已完成最新資料同步 ✨');
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`資料載入失敗: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    },
    [tripId]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // 動態更新頁面標題與 Favicon
  useEffect(() => {
    const displayTitle = tripData.tripTitle || tripConfig.title;
    if (displayTitle) {
      document.title = `${displayTitle} - 旅程分享`;
    }
  }, [tripConfig.title, tripData.tripTitle]);

  const companionTokens = useMemo(() => {
    return (tripData.companions || '')
      .split(/[\n,，]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [tripData.companions]);
  const hasWillCompanion = companionTokens.includes('Will');

  const currentCompanions = useMemo(() => {
    const set = new Set<string>();
    set.add('Jo');
    if (hasWillCompanion) set.add('Will');
    const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];
    if (tripData.companions) {
      tripData.companions.split(/[\n,，]+/).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
      });
    }
    tripData.expenses.forEach((e) => {
      const p = (e.paidBy || '').trim();
      const s = (e.split || '').trim();
      if (p && !EXCLUDED_KEYWORDS.includes(p) && !p.includes(':') && !p.includes('：')) set.add(p);
      if (s && !EXCLUDED_KEYWORDS.includes(s) && !s.includes(':') && !s.includes('：')) set.add(s);
    });
    return Array.from(set);
  }, [tripData.companions, tripData.expenses, hasWillCompanion]);

  const effectiveStartDate = useMemo(() => {
    const outboundFlight = tripData.flights?.find((f) => f.type === 'outbound');
    return outboundFlight?.departureDate || tripData.startDate || '';
  }, [tripData.flights, tripData.startDate]);

  // 記帳操作 Handlers
  const handleAddExpense = async (formData: Record<string, unknown>) => {
    try {
      const isEdit = Boolean(formData.id || (typeof formData.rowIndex === 'number' && formData.rowIndex >= 2));
      showToast(isEdit ? '正在儲存記帳...' : '正在新增記帳...');
      await addExpenseData(formData, tripId);
      showToast(isEdit ? '記帳更新成功！' : '記帳成功！');
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`記帳失敗: ${msg}`);
    }
  };

  const handleDeleteExpense = async (rowIndex: number, itemId?: string) => {
    try {
      showToast('正在刪除記帳...');
      await deleteExpenseData(rowIndex, tripId, itemId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`刪除失敗: ${msg}`);
    }
  };

  const handleToggleShopping = async (rowIndex: number, currentStatus: boolean, itemId?: string) => {
    const nextStatus = !currentStatus;
    setTripData((prev) => ({
      ...prev,
      shopping: prev.shopping.map((s) =>
        (itemId ? s.id === itemId : s.rowIndex === rowIndex)
          ? { ...s, isDone: nextStatus, purchaseStatus: nextStatus ? 'purchased' : 'pending', isIgnored: false }
          : s
      ),
    }));

    try {
      await toggleShoppingStatus(rowIndex, nextStatus, tripId, itemId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`更新失敗，正在還原: ${msg}`);
      fetchData(false);
    }
  };

  const handleUpdateShoppingPrice = async (rowIndex: number, newPrice: number) => {
    setTripData((prev) => ({
      ...prev,
      shopping: prev.shopping.map((item) => (item.rowIndex === rowIndex ? { ...item, price: newPrice } : item)),
    }));

    const targetItem = tripData.shopping.find((item) => item.rowIndex === rowIndex);
    if (!targetItem) return;

    try {
      await saveShoppingData({ ...targetItem, price: String(newPrice) }, tripId);
      showToast('單價已更新！');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`價格更新失敗: ${msg}`);
      fetchData(false);
    }
  };

  const displayTitle = tripData.tripTitle || tripConfig.title;
  const customIcon = tripData.customIcon || tripData.svgIcon;
  const englishMatches = displayTitle.match(/[A-Za-z]+/g);
  const badgeText = englishMatches ? englishMatches.join('').substring(0, 2).toUpperCase() : null;

  const tabs = [
    { id: 'itinerary' as const, label: '行程', icon: Calendar },
    { id: 'expenses' as const, label: '記帳', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Desktop Sidebar Navigation (僅行程與記帳) */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 text-slate-200 fixed left-0 top-0 bottom-0 z-50 p-4 border-r border-slate-800">
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
            <h2 className="font-extrabold text-base text-white tracking-tight leading-tight truncate" title={displayTitle}>
              {displayTitle}
            </h2>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={() => setHideVisited(!hideVisited)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer text-xs font-semibold text-slate-300"
          >
            <div className="flex items-center space-x-2">
              {hideVisited ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              <span>{hideVisited ? '隱藏已完成' : '顯示全部'}</span>
            </div>
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
              {hideVisited ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 md:ml-60 flex flex-col">
        {/* Minimalist Share Header (無空間切換、無返回大廳、無設定) */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
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
              <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none truncate">
                {displayTitle}
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 md:space-x-2 flex-shrink-0 ml-2">
              <button
                onClick={() => setHideVisited(!hideVisited)}
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${
                  hideVisited
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={hideVisited ? '顯示已完成' : '隱藏已完成'}
              >
                {hideVisited ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                onClick={() => fetchData(true)}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
                title="重新整理"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 mt-4 md:px-8">
          {isLoading && tripData.itinerary.length === 0 && tripData.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-extrabold text-slate-400">正在讀取旅程資料...</p>
            </div>
          ) : (
            <>
              {currentTab === 'itinerary' && (
                <ItineraryTab
                  data={tripData.itinerary}
                  tripNote={tripData.tripNote}
                  hideVisited={hideVisited}
                  readOnly={true}
                  startDate={effectiveStartDate}
                  timezone={tripData.timezone}
                  citySchedule={tripData.citySchedule}
                  isTaiwanTrip={tripData.isTaiwanTrip}
                  flights={tripData.flights || []}
                  accommodations={tripData.accommodations || []}
                  showToast={showToast}
                  onOpenLightbox={(img) => setLightboxUrl(img)}
                />
              )}

              {currentTab === 'expenses' && (
                <ExpensesTab
                  data={tripData.expenses}
                  shopping={tripData.shopping}
                  fxRate={tripData.fxRate}
                  foreignCurrency={tripData.foreignCurrency || ''}
                  companions={tripData.companions}
                  timezone={tripData.timezone}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onOpenModal={(item) => {
                    setActiveExpenseItem(item || null);
                    setExpenseModalOpen(true);
                  }}
                  onUpdateShoppingPrice={handleUpdateShoppingPrice}
                  onToggleShopping={handleToggleShopping}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (僅行程與記帳) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-1.5 flex items-center justify-around shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-6 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-amber-400' : ''} transition-transform`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals (僅開放記帳與圖片檢視) */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        item={activeExpenseItem}
        companionsList={currentCompanions}
        foreignCurrency={tripData.foreignCurrency || ''}
        fxRate={tripData.fxRate}
        shopping={tripData.shopping}
        timezone={tripData.timezone}
        onToggleShopping={handleToggleShopping}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleAddExpense}
        onDelete={handleDeleteExpense}
      />

      <LightboxModal imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-extrabold flex items-center justify-between animate-scale-up">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
