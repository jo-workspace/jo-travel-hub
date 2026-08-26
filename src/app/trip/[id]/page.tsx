'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
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

  // 動態更新當前旅程的 Favicon 與 Apple Touch Icon (安全更新 href，切勿刪除 DOM 節點以免損壞 React 19 Fiber 樹)
  useEffect(() => {
    if (!tripConfig) return;

    const displayTitle = tripData.tripTitle || tripConfig.title;
    const displayDates = tripData.tripDates || tripConfig.dates || '';
    const ogBannerUrl = `/api/og?title=${encodeURIComponent(displayTitle)}&dates=${encodeURIComponent(displayDates)}`;

    // 動態更新社群分享縮圖 (og:image & twitter:image)
    let metaOg = document.querySelector("meta[property='og:image']") as HTMLMetaElement | null;
    if (!metaOg) {
      metaOg = document.createElement('meta');
      metaOg.setAttribute('property', 'og:image');
      document.head.appendChild(metaOg);
    }
    metaOg.content = ogBannerUrl;

    let metaTwitter = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement | null;
    if (!metaTwitter) {
      metaTwitter = document.createElement('meta');
      metaTwitter.name = 'twitter:image';
      document.head.appendChild(metaTwitter);
    }
    metaTwitter.content = ogBannerUrl;

    // 動態更新瀏覽器標籤頁 Favicon (更新 href，不移除元素)
    const currentFavicon = (tripData.customIcon && tripData.customIcon.trim())
      ? tripData.customIcon.trim()
      : (tripData.svgIcon && tripData.svgIcon.trim())
        ? tripData.svgIcon.trim()
        : '/hub-logo.png';

    let iconLink = document.querySelector("link[rel*='icon']:not([rel*='apple'])") as HTMLLinkElement | null;
    if (iconLink) {
      iconLink.href = currentFavicon;
      iconLink.type = currentFavicon.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
    } else {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.type = currentFavicon.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
      iconLink.href = currentFavicon;
      document.head.appendChild(iconLink);
    }

    let appleLink = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement | null;
    if (appleLink) {
      appleLink.href = currentFavicon;
    } else {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = currentFavicon;
      document.head.appendChild(appleLink);
    }

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
  const [defaultPackingPerson, setDefaultPackingPerson] = useState<string>('');

  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);
  const [activeShoppingItem, setActiveShoppingItem] = useState<ShoppingItem | null>(null);
  const [defaultShoppingStore, setDefaultShoppingStore] = useState<string>('');
  const [defaultShoppingPerson, setDefaultShoppingPerson] = useState<string>('Jo');
  const [checkoutStore, setCheckoutStore] = useState<string | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<ShoppingItem[]>([]);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // 嚴格限定於「當前旅程同行人員 / 記帳分帳成員」
  const currentCompanions = useMemo(() => {
    const set = new Set<string>();
    const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];
    if (tripData.companions) {
      tripData.companions.split(/[\n,，]+/).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
      });
    }
    // 從記帳付款人與分帳人補充同行成員
    tripData.expenses.forEach((e) => {
      const p = (e.paidBy || '').trim();
      const s = (e.split || '').trim();
      if (p && !EXCLUDED_KEYWORDS.includes(p) && !p.includes(':') && !p.includes('：')) set.add(p);
      if (s && !EXCLUDED_KEYWORDS.includes(s) && !s.includes(':') && !s.includes('：')) set.add(s);
    });
    return Array.from(set).length > 0 ? Array.from(set) : ['Jo', 'Will'];
  }, [tripData.companions, tripData.expenses]);

  // 嚴格限定於「當前旅程攜帶人員」（只抓旅程同行設定 + 打包既有歷史人員，絕對不抓購物清單伴手禮對象）
  const currentPackingPersons = useMemo(() => {
    const set = new Set<string>();
    const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];
    if (tripData.companions) {
      tripData.companions.split(/[\n,，]+/).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
      });
    }
    tripData.packing.forEach((p) => {
      if (p.person && p.person !== '公用') {
        p.person.split(/[\n,，]+/).forEach((name) => {
          const trimmed = name.trim();
          if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
        });
      }
    });
    return Array.from(set).length > 0 ? Array.from(set) : ['Jo', 'Will'];
  }, [tripData.companions, tripData.packing]);

  // 嚴格限定於「當前旅程購物幫買/對象」（包含同行人員 + 購物清單歷史對象）
  const currentShoppingPersons = useMemo(() => {
    const set = new Set<string>();
    const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];
    if (tripData.companions) {
      tripData.companions.split(/[\n,，]+/).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
      });
    }
    tripData.shopping.forEach((s) => {
      if (s.forWhom && s.forWhom !== '公用') {
        s.forWhom.split(/[\n,，、+/]+/).forEach((name) => {
          const trimmed = name.trim();
          if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) set.add(trimmed);
        });
      }
    });
    return Array.from(set).length > 0 ? Array.from(set) : ['Jo', 'Will'];
  }, [tripData.companions, tripData.shopping]);

  // 跨旅程歷史打包類別（純歷史資料，過濾掉誤填為類別的位置或公用關鍵字）
  const currentPackingCategories = useMemo(() => {
    const set = new Set<string>();
    const INVALID_CATEGORIES = ['公用', '公用物品', '隨身', '行李', '託運', '托運', '手提', '穿著', '其他', '全部'];
    (tripData.historicalPackingCategories || []).forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !INVALID_CATEGORIES.includes(trimmed)) set.add(trimmed);
    });
    tripData.packing.forEach((p) => {
      const cat = (p.category || '').trim();
      if (cat && !INVALID_CATEGORIES.includes(cat)) {
        set.add(cat);
      }
    });
    return Array.from(set);
  }, [tripData.packing, tripData.historicalPackingCategories]);

  // 跨旅程歷史待辦分類（純歷史資料）
  const currentTodoCategories = useMemo(() => {
    const set = new Set<string>();
    const INVALID_CATEGORIES = ['其他', '全部'];
    (tripData.historicalTodoCategories || []).forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !INVALID_CATEGORIES.includes(trimmed)) set.add(trimmed);
    });
    tripData.todo.forEach((t) => {
      const cat = (t.category || '').trim();
      if (cat && !INVALID_CATEGORIES.includes(cat)) {
        set.add(cat);
      }
    });
    return Array.from(set);
  }, [tripData.todo, tripData.historicalTodoCategories]);

  // 嚴格限定於「當前旅程」的購物店家
  const currentShoppingStores = useMemo(() => {
    const set = new Set<string>();
    tripData.shopping.forEach((s) => {
      if (s.store) {
        s.store.split(/[\n,、+/]+/).forEach((store) => {
          const trimmed = store.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set);
  }, [tripData.shopping]);

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
      if (formData.batchItems && Array.isArray(formData.batchItems)) {
        const count = formData.batchItems.length;
        showToast(`正在儲存 ${count} 個打包項...`);
        for (const itemName of formData.batchItems) {
          await savePackingData({ ...formData, item: itemName, batchItems: undefined }, tripId);
        }
      } else {
        showToast('正在儲存打包項...');
        await savePackingData(formData, tripId);
      }
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
        customIcon={tripData.customIcon || tripData.svgIcon}
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
          customIcon={tripData.customIcon || tripData.svgIcon}
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
                  onOpenModal={(item, defaultPerson) => {
                    setActivePackingItem(item || null);
                    setDefaultPackingPerson(defaultPerson || '');
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
                  onOpenModal={(item, defaultStore, defaultForWhom) => {
                    setActiveShoppingItem(item || null);
                    setDefaultShoppingStore(defaultStore || '');
                    setDefaultShoppingPerson(defaultForWhom || 'Jo');
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
        existingCategories={currentTodoCategories}
        onClose={() => setTodoModalOpen(false)}
        onSave={handleSaveTodo}
        onDelete={handleDeleteTodo}
      />

      <PackingModal
        isOpen={packingModalOpen}
        item={activePackingItem}
        defaultPerson={defaultPackingPerson}
        existingCategories={currentPackingCategories}
        companionsList={currentPackingPersons}
        onClose={() => setPackingModalOpen(false)}
        onSave={handleSavePacking}
        onDelete={handleDeletePacking}
      />

      <ShoppingModal
        isOpen={shoppingModalOpen}
        item={activeShoppingItem}
        defaultStore={defaultShoppingStore}
        defaultForWhom={defaultShoppingPerson}
        existingStores={currentShoppingStores}
        companionsList={currentShoppingPersons}
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
          companionsList={currentCompanions}
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
