'use client';

import React, { useState } from 'react';
import { ShoppingItem } from '@/types/trip';
import { computeTwdAmount } from '@/components/tabs/ExpensesTab';
import { Plus, Edit3, Link as LinkIcon } from 'lucide-react';

interface ShoppingTabProps {
  data: ShoppingItem[];
  foreignCurrency?: string;
  fxRate: number;
  hideDone: boolean;
  onToggleShopping: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: ShoppingItem, defaultStore?: string) => void;
  onOpenLightbox: (imageUrl: string) => void;
  onCheckoutStore: (store: string, items: ShoppingItem[]) => void;
}

const ALL_STORES = '__all__';
const splitTokens = (value: string) => value.split(/[\n,、+/]/).map((token) => token.trim()).filter(Boolean);

export const parseShoppingQuantity = (quantity?: string): number => {
  if (!quantity) return 1;
  const parsed = parseFloat(quantity.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const getShoppingItemTotal = (item: ShoppingItem): number => {
  return (item.price || 0) * parseShoppingQuantity(item.quantity);
};

export const ShoppingTab: React.FC<ShoppingTabProps> = ({
  data,
  foreignCurrency = 'USD',
  fxRate,
  hideDone,
  onToggleShopping,
  onOpenModal,
  onOpenLightbox,
  onCheckoutStore,
}) => {
  const [selectedStore, setSelectedStore] = useState(ALL_STORES);
  const storeList = Array.from(new Set(data.flatMap((item) => splitTokens(item.store))));
  const isAllStores = selectedStore === ALL_STORES;
  const filteredItems = data.filter((item) => {
    if (hideDone && item.isDone) return false;
    return isAllStores || splitTokens(item.store).includes(selectedStore);
  });
  const storePendingItems = isAllStores
    ? []
    : data.filter((item) => splitTokens(item.store).includes(selectedStore) && !item.isDone && item.purchaseStatus !== 'out_of_stock');
  const plannedTotal = data.reduce((total, item) => total + getShoppingItemTotal(item), 0);
  const plannedTotalTwd = Math.round(computeTwdAmount(plannedTotal, foreignCurrency, fxRate, foreignCurrency));
  const selectedEstimate = data.reduce((total, item) => total + (item.isDone ? getShoppingItemTotal(item) : 0), 0);

  return (
    <div className="space-y-4 pb-20">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">購物預估</p>
          <p className="mt-1 text-base font-black font-mono text-slate-900">{plannedTotal.toLocaleString()} {foreignCurrency}</p>
          <p className="mt-0.5 text-[10px] font-bold font-mono text-slate-400">約 ${plannedTotalTwd.toLocaleString()} TWD</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">已勾選預估</p>
          <p className="mt-1 text-base font-black font-mono text-emerald-700">{selectedEstimate.toLocaleString()} {foreignCurrency}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {[ALL_STORES, ...storeList].map((store) => (
            <button
              key={store}
              onClick={() => setSelectedStore(store)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${selectedStore === store ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {store === ALL_STORES ? '全部' : store}
            </button>
          ))}
        </div>
        <button
          onClick={() => onOpenModal(undefined, isAllStores ? undefined : selectedStore)}
          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer select-none whitespace-nowrap shadow-xs transition-all active:scale-95 flex items-center space-x-1 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增</span>
        </button>
      </div>

      {!isAllStores && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-emerald-900 truncate">{selectedStore}</p>
            <p className="text-[11px] font-bold text-emerald-700">{storePendingItems.length} 項待購可結帳</p>
          </div>
          <button onClick={() => onCheckoutStore(selectedStore, storePendingItems)} disabled={storePendingItems.length === 0} className="px-3 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer disabled:bg-emerald-200 disabled:cursor-not-allowed whitespace-nowrap">
            結帳
          </button>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">目前沒有購物清單</div>
      )}

      <div className="space-y-2.5">
        {filteredItems.map((item) => {
          const stores = splitTokens(item.store);
          const people = splitTokens(item.forWhom);
          const isOutOfStock = item.purchaseStatus === 'out_of_stock';
          const itemQty = parseShoppingQuantity(item.quantity);
          const itemTotal = getShoppingItemTotal(item);
          return (
            <div key={item.rowIndex} className={`bg-white border rounded-2xl p-4 flex justify-between items-center transition-all duration-200 ${isOutOfStock ? 'border-amber-200 bg-amber-50' : item.isDone ? 'border-slate-100 opacity-40 bg-slate-50' : 'border-slate-100 shadow-2xs hover:shadow-xs'}`}>
              <div className="flex-1 pr-4 min-w-0">
                <div className="flex items-start">
                  <div className="relative flex-shrink-0 mr-3.5 select-none">
                    {item.image && item.image.startsWith('http') ? (
                      /* eslint-disable-next-next/no-img-element */
                      <img src={item.image} onClick={() => onOpenLightbox(item.image!)} className="w-14 h-14 object-cover rounded-xl shadow-2xs cursor-zoom-in hover:scale-105 active:scale-95 transition-all" alt={item.item} />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100/80 flex items-center justify-center text-xl text-slate-400">🛍️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {stores.map((store, idx) => <span key={`${store}-${idx}`} className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-full whitespace-nowrap">{store}</span>)}
                      {people.map((person, idx) => <span key={`${person}-${idx}`} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-full tracking-wider whitespace-nowrap">{person}</span>)}
                    </div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <h3 className={`text-base font-extrabold text-slate-900 leading-tight ${item.isDone || isOutOfStock ? 'line-through text-slate-400' : ''}`}>{item.item}</h3>
                      {item.quantity && item.quantity !== '1' && <span className="text-xs font-extrabold text-slate-800 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded font-mono">×{item.quantity}</span>}
                      {item.price !== undefined && item.price > 0 && (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                          {item.price.toLocaleString()} {foreignCurrency}
                          {itemQty > 1 && (
                            <span className="text-[10px] text-emerald-600/80 font-bold ml-1">
                              (共 {itemTotal.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )}
                      {isOutOfStock && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">缺貨</span>}
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700 transition-colors" title="商品連結"><LinkIcon className="w-4 h-4 ml-0.5 inline-block" /></a>}
                    </div>
                    {item.note && <div className="text-xs text-slate-500 font-medium mt-1 leading-relaxed whitespace-pre-line">{item.note.replace(/<br\s*\/?>/gi, '\n')}</div>}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button onClick={() => onOpenModal(item)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90" title="編輯"><Edit3 className="w-4 h-4" /></button>
                {isOutOfStock && <button onClick={() => onToggleShopping(item.rowIndex, true)} className="text-[10px] font-bold text-amber-700 hover:text-amber-900" title="恢復為待購">恢復</button>}
                <input type="checkbox" checked={item.isDone} disabled={isOutOfStock} onChange={() => onToggleShopping(item.rowIndex, item.isDone)} className="w-5 h-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer transition-transform active:scale-90 disabled:cursor-not-allowed" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
