'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { TRIPS, TripConfig } from '@/config/trips';
import { AllTripData, ItineraryItem, TodoItem, PackingItem, ShoppingItem } from '@/types/trip';
import { TabType, Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { Header } from '@/components/Header';

import { ItineraryTab } from '@/components/tabs/ItineraryTab';
import { TodoTab } from '@/components/tabs/TodoTab';
import { PackingTab } from '@/components/tabs/PackingTab';
import { ExpensesTab } from '@/components/tabs/ExpensesTab';
import { ShoppingTab } from '@/components/tabs/ShoppingTab';

import { ItineraryModal } from '@/components/modals/ItineraryModal';
import { TodoModal } from '@/components/modals/TodoModal';
import { PackingModal } from '@/components/modals/PackingModal';
import { ShoppingModal } from '@/components/modals/ShoppingModal';
import { ShoppingCheckoutModal } from '@/components/modals/ShoppingCheckoutModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { LightboxModal } from '@/components/modals/LightboxModal';

import {
  getAllData,
  saveItineraryData,
  deleteItineraryData,
  toggleVisitedStatus,
  saveTodoData,
  deleteTodoData,
  toggleTodoStatus,
  savePackingData,
  deletePackingData,
  togglePackingStatus,
  addExpenseData,
  deleteExpenseData,
  saveShoppingData,
  deleteShoppingData,
  toggleShoppingStatus,
  checkoutShoppingStore,
} from '@/lib/supabase-client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const VALID_TABS: TabType[] = ['itinerary', 'todo', 'packing', 'expenses', 'shopping'];

export default function TripPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const rawConfig: TripConfig | undefined = TRIPS[tripId];
  const tripConfig: TripConfig = rawConfig || {
    id: tripId,
    title: tripId.replace('trip-', '旅程 '),
    dates: '2026',
    coverGradient: 'from-indigo-600 to-purple-800',
    badgeText: '進行中',
    apiUrl: 'supabase',
    description: '專屬隨身旅程',
  };

  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as TabType)) {
      return tabFromUrl as TabType;
    }
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(`activeTab_${tripId}`) as TabType) || 'itinerary';
    }
    return 'itinerary';
  });

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    localStorage.setItem(`activeTab_${tripId}`, tab);
    router.replace(`/trip/${tripId}?tab=${tab}`, { scroll: false });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/trip/${tripId}?tab=${currentTab}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('連結已複製，分享給旅伴吧！');
    } catch {
      showToast(`複製失敗，請手動複製：${url}`);
    }
  };
  const [hideVisited, setHideVisited] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Main data state
  const [tripData, setTripData] = useState<AllTripData>({
    itinerary: [],
    todo: [],
    packing: [],
    expenses: [],
    shopping: [],
    fxRate: 32.5,
    tripNote: '',
    startDate: '',
    budgetTwd: 0,
    foreignCurrency: 'USD',
    tripTitle: '',
    tripDates: '',
    timezone: 'Asia/Taipei',
  });

  // 動態更新當前旅程的 Favicon 與 Apple Touch Icon (供 iPhone 主畫面捷徑讀取)
  useEffect(() => {
    if (!tripConfig) return;

    const displayTitle = tripData.tripTitle || tripConfig.title;
    const displayDates = tripData.tripDates || tripConfig.dates || '';
    const ogBannerUrl = `/api/og?title=${encodeURIComponent(displayTitle)}&dates=${encodeURIComponent(displayDates)}`;

    // 動態更新社群分享縮圖 (og:image & twitter:image)，使用 1200x630 滿版大卡片
    let metaOg = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
    if (!metaOg) {
      metaOg = document.createElement('meta');
      metaOg.setAttribute('property', 'og:image');
      document.head.appendChild(metaOg);
    }
    metaOg.content = ogBannerUrl;

    let metaTwitter = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
    if (!metaTwitter) {
      metaTwitter = document.createElement('meta');
      metaTwitter.name = 'twitter:image';
      document.head.appendChild(metaTwitter);
    }
    // 動態更新瀏覽器標籤頁 Favicon (若未上傳自訂圖示，預設全站使用 3.png 藍色地球標誌)
    let linkIcon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    const currentFavicon = (tripData.customIcon && tripData.customIcon.trim())
      ? tripData.customIcon.trim()
      : (tripData.svgIcon && tripData.svgIcon.trim())
        ? tripData.svgIcon.trim()
        : '/hub-logo.png';
    linkIcon.href = currentFavicon;

    if (displayTitle) {
      document.title = `${displayTitle} - Jo Travel Hub`;
    }
  }, [tripConfig, tripData.tripTitle, tripData.tripDates, tripData.customIcon, tripData.svgIcon]);

  // Modal states
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [activeItineraryItem, setActiveItineraryItem] = useState<ItineraryItem | null>(null);

  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [activeTodoItem, setActiveTodoItem] = useState<TodoItem | null>(null);

  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [activePackingItem, setActivePackingItem] = useState<PackingItem | null>(null);

  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);
  const [activeShoppingItem, setActiveShoppingItem] = useState<ShoppingItem | null>(null);
  const [checkoutStore, setCheckoutStore] = useState<string | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<ShoppingItem[]>([]);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Fetch data from Supabase
  const fetchData = useCallback(async (bypassCache = false) => {
    setIsLoading(true);
    const start = Date.now();
    try {
      const res = await getAllData(bypassCache, tripId);
      if (res) {
        setTripData(res);
        if (bypassCache) {
          showToast('已完成最新資料同步 ✨');
        }
      }
    } catch (err: any) {
      showToast(`資料載入失敗: ${err.message || err}`);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  if (!tripConfig) {
    notFound();
  }

  // Itinerary Handlers
  const handleToggleVisited = async (rowIndex: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTripData((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((i) =>
        i.rowIndex === rowIndex ? { ...i, isVisited: nextStatus } : i
      ),
    }));

    try {
      await toggleVisitedStatus(rowIndex, nextStatus, tripId);
    } catch (err: any) {
      showToast(`更新失敗，正在還原: ${err.message}`);
      fetchData(false);
    }
  };

  const handleSaveItinerary = async (formData: any) => {
    try {
      showToast('正在儲存行程...');
      await saveItineraryData(formData, tripId);
      showToast('行程儲存成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`儲存失敗: ${err.message}`);
    }
  };

  const handleDeleteItinerary = async (rowIndex: number) => {
    try {
      showToast('正在刪除行程...');
      await deleteItineraryData(rowIndex, tripId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`刪除失敗: ${err.message}`);
    }
  };

  // Todo Handlers
  const handleToggleTodo = async (rowIndex: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTripData((prev) => ({
      ...prev,
      todo: prev.todo.map((t) =>
        t.rowIndex === rowIndex ? { ...t, isDone: nextStatus } : t
      ),
    }));

    try {
      await toggleTodoStatus(rowIndex, nextStatus, tripId);
    } catch (err: any) {
      showToast(`更新失敗，正在還原: ${err.message}`);
      fetchData(false);
    }
  };

  const handleSaveTodo = async (formData: any) => {
    try {
      showToast('正在儲存待辦...');
      await saveTodoData(formData, tripId);
      showToast('待辦儲存成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`儲存失敗: ${err.message}`);
    }
  };

  const handleDeleteTodo = async (rowIndex: number) => {
    try {
      showToast('正在刪除待辦...');
      await deleteTodoData(rowIndex, tripId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`刪除失敗: ${err.message}`);
    }
  };

  // Packing Handlers
  const handleTogglePacking = async (rowIndex: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTripData((prev) => ({
      ...prev,
      packing: prev.packing.map((p) =>
        p.rowIndex === rowIndex ? { ...p, isPacked: nextStatus } : p
      ),
    }));

    try {
      await togglePackingStatus(rowIndex, nextStatus, tripId);
    } catch (err: any) {
      showToast(`更新失敗，正在還原: ${err.message}`);
      fetchData(false);
    }
  };

  const handleSavePacking = async (formData: any) => {
    try {
      showToast('正在儲存打包項...');
      await savePackingData(formData, tripId);
      showToast('打包項儲存成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`儲存失敗: ${err.message}`);
    }
  };

  const handleDeletePacking = async (rowIndex: number) => {
    try {
      showToast('正在刪除打包項...');
      await deletePackingData(rowIndex, tripId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`刪除失敗: ${err.message}`);
    }
  };

  // Expense Handlers
  const handleAddExpense = async (formData: any) => {
    try {
      showToast('正在新增記帳...');
      await addExpenseData(formData, tripId);
      showToast('記帳成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`記帳失敗: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (rowIndex: number) => {
    try {
      showToast('正在刪除記帳...');
      await deleteExpenseData(rowIndex, tripId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`刪除失敗: ${err.message}`);
    }
  };

  // Shopping Handlers
  const handleToggleShopping = async (rowIndex: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTripData((prev) => ({
      ...prev,
      shopping: prev.shopping.map((s) =>
        s.rowIndex === rowIndex ? { ...s, isDone: nextStatus, purchaseStatus: nextStatus ? 'purchased' : 'pending' } : s
      ),
    }));

    try {
      await toggleShoppingStatus(rowIndex, nextStatus, tripId);
    } catch (err: any) {
      showToast(`更新失敗，正在還原: ${err.message}`);
      fetchData(false);
    }
  };

  const handleSaveShopping = async (formData: any) => {
    try {
      showToast('正在儲存購物項...');
      await saveShoppingData(formData, tripId);
      showToast('購物項儲存成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`儲存失敗: ${err.message}`);
    }
  };

  const handleDeleteShopping = async (rowIndex: number) => {
    try {
      showToast('正在刪除購物項...');
      await deleteShoppingData(rowIndex, tripId);
      showToast('刪除成功！');
      fetchData(true);
    } catch (err: any) {
      showToast(`刪除失敗: ${err.message}`);
    }
  };

  const handleCheckoutShoppingStore = async (data: {
    store: string;
    amount: number;
    purchasedRowIndexes: number[];
    outOfStockRowIndexes: number[];
  }) => {
    try {
      showToast('正在記錄購物結帳…');
      await checkoutShoppingStore({ ...data, currency: tripData.foreignCurrency || 'USD' }, tripId);
      showToast('結帳已加入記帳頁');
      await fetchData(true);
    } catch (err: any) {
      showToast(`結帳儲存失敗：${err.message}`);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        hideVisited={hideVisited}
        onToggleHideVisited={() => setHideVisited(!hideVisited)}
        tripTitle={tripData.tripTitle || tripConfig.title}
      />

      {/* Main Container */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Header */}
        <Header
          hideVisited={hideVisited}
          onToggleHideVisited={() => setHideVisited(!hideVisited)}
          onRefresh={() => fetchData(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onShare={handleShare}
          isLoading={isLoading}
          tripTitle={tripData.tripTitle || tripConfig.title}
        />

        {/* Top Back Link & Trip Title Bar */}
        <div className="bg-slate-100/80 border-b border-slate-200/60 px-4 py-2 flex items-center justify-between text-xs md:px-8">
          <Link
            href="/"
            className="flex items-center space-x-1 font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回旅程大廳</span>
          </Link>
          <span className="font-extrabold text-slate-700">{tripData.tripTitle || tripConfig.title}</span>
        </div>

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 mt-4 md:px-8">
          {isLoading && tripData.itinerary.length === 0 && tripData.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-extrabold text-slate-400">正在讀取雲端資料庫...</p>
            </div>
          ) : (
            <>
              {currentTab === 'itinerary' && (
                <ItineraryTab
                  data={tripData.itinerary}
                  tripNote={tripData.tripNote}
                  hideVisited={hideVisited}
                  startDate={tripData.startDate}
                  timezone={tripData.timezone}
                  onToggleVisited={handleToggleVisited}
                  onOpenModal={(item) => {
                    setActiveItineraryItem(item || null);
                    setItineraryModalOpen(true);
                  }}
                  onOpenLightbox={(img) => setLightboxUrl(img)}
                />
              )}

              {currentTab === 'todo' && (
                <TodoTab
                  data={tripData.todo}
                  hideDone={hideVisited}
                  onToggleTodo={handleToggleTodo}
                  onOpenModal={(item) => {
                    setActiveTodoItem(item || null);
                    setTodoModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'packing' && (
                <PackingTab
                  data={tripData.packing}
                  hidePacked={hideVisited}
                  onTogglePacking={handleTogglePacking}
                  onOpenModal={(item) => {
                    setActivePackingItem(item || null);
                    setPackingModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'expenses' && (
                <ExpensesTab
                  data={tripData.expenses}
                  shopping={tripData.shopping}
                  fxRate={tripData.fxRate}
                  foreignCurrency={tripData.foreignCurrency || 'USD'}
                  companions={tripData.companions}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {currentTab === 'shopping' && (
                <ShoppingTab
                  data={tripData.shopping}
                  foreignCurrency={tripData.foreignCurrency || 'USD'}
                  fxRate={tripData.fxRate}
                  hideDone={hideVisited}
                  onToggleShopping={handleToggleShopping}
                  onOpenModal={(item) => {
                    setActiveShoppingItem(item || null);
                    setShoppingModalOpen(true);
                  }}
                  onOpenLightbox={(img) => setLightboxUrl(img)}
                  onCheckoutStore={(store, items) => {
                    setCheckoutStore(store);
                    setCheckoutItems(items);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentTab={currentTab} onSelectTab={handleTabChange} />

      {/* Modals */}
      <ItineraryModal
        isOpen={itineraryModalOpen}
        item={activeItineraryItem}
        onClose={() => setItineraryModalOpen(false)}
        onSave={handleSaveItinerary}
        onDelete={handleDeleteItinerary}
      />

      <TodoModal
        isOpen={todoModalOpen}
        item={activeTodoItem}
        onClose={() => setTodoModalOpen(false)}
        onSave={handleSaveTodo}
        onDelete={handleDeleteTodo}
      />

      <PackingModal
        isOpen={packingModalOpen}
        item={activePackingItem}
        onClose={() => setPackingModalOpen(false)}
        onSave={handleSavePacking}
        onDelete={handleDeletePacking}
      />

      <ShoppingModal
        isOpen={shoppingModalOpen}
        item={activeShoppingItem}
        onClose={() => setShoppingModalOpen(false)}
        onSave={handleSaveShopping}
        onDelete={handleDeleteShopping}
      />

      {checkoutStore && (
        <ShoppingCheckoutModal
          isOpen
          store={checkoutStore}
          items={checkoutItems}
          currency={tripData.foreignCurrency || 'USD'}
          onClose={() => setCheckoutStore(null)}
          onConfirm={handleCheckoutShoppingStore}
        />
      )}

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={() => fetchData(true)}
        tripId={tripId}
        tripTitle={tripData.tripTitle || tripConfig.title}
        tripDates={tripData.tripDates || tripConfig.dates || ''}
        startDate={tripData.startDate || ''}
        fxRate={tripData.fxRate}
        budgetTwd={tripData.budgetTwd || 0}
        tripNote={tripData.tripNote}
        foreignCurrency={tripData.foreignCurrency || 'USD'}
        timezone={tripData.timezone}
        companions={tripData.companions}
        customIcon={tripData.customIcon || tripData.svgIcon}
      />

      <LightboxModal imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-extrabold flex items-center justify-between animate-scale-up">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
