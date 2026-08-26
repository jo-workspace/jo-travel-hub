'use client';

import React, { useState } from 'react';
import { ShoppingItem } from '@/types/trip';
import { computeTwdAmount } from '@/components/tabs/ExpensesTab';
import { Plus, Edit3, Link as LinkIcon, User, HandCoins } from 'lucide-react';

interface ShoppingTabProps {
  data: ShoppingItem[];
  foreignCurrency?: string;
  fxRate: number;
  hideDone: boolean;
  onToggleShopping: (rowIndex: number, currentStatus: boolean) => void;
  onOpenModal: (item?: ShoppingItem, defaultStore?: string, defaultForWhom?: string) => void;
  onOpenLightbox: (imageUrl: string) => void;
  onCheckoutStore: (store: string, items: ShoppingItem[]) => void;
}

export interface RecipientTag {
  name: string;
  isProxy: boolean;
  quantity: number;
}

export const parseRecipientTags = (forWhomStr?: string): RecipientTag[] => {
  if (!forWhomStr) return [{ name: 'Jo', isProxy: false, quantity: 1 }];
  const tokens = forWhomStr.split(/[\n,、+/]/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return [{ name: 'Jo', isProxy: false, quantity: 1 }];

  return tokens.map((token) => {
    // 檢查代購標記：例如 媽媽(代購)、小明(代購*2)
    const proxyMatch = token.match(/\((代購|代)(?:[*x×](\d+))?\)/);
    if (proxyMatch) {
      const cleanName = token.replace(/\((代購|代)(?:[*x×](\d+))?\)/, '').trim();
      const qty = proxyMatch[2] ? parseInt(proxyMatch[2], 10) : 1;
      return { name: cleanName || token, isProxy: true, quantity: qty > 0 ? qty : 1 };
    }
    // 檢查純數量標記：例如 同事(2)
    const qtyMatch = token.match(/\((?:[*x×]?(\d+))\)/);
    if (qtyMatch) {
      const cleanName = token.replace(/\((?:[*x×]?(\d+))\)/, '').trim();
      const qty = parseInt(qtyMatch[1], 10);
      return { name: cleanName || token, isProxy: false, quantity: qty > 0 ? qty : 1 };
    }
    return { name: token, isProxy: false, quantity: 1 };
  });
};

export const serializeRecipientTags = (tags: RecipientTag[]): string => {
  return tags
    .map((t) => {
      const cleanName = t.name.trim();
      if (!cleanName) return '';
      if (t.isProxy) {
        return t.quantity > 1 ? `${cleanName}(代購*${t.quantity})` : `${cleanName}(代購)`;
      }
      return t.quantity > 1 ? `${cleanName}(${t.quantity})` : cleanName;
    })
    .filter(Boolean)
    .join(', ');
};

const ALL_STORES = '__all__';
const ALL_PEOPLE = '__all__';
const splitTokens = (value: string) => value.split(/[\n,、+/]/).map((token) => token.trim()).filter(Boolean);

export const parseShoppingQuantity = (quantity?: string): number => {
  if (!quantity) return 1;
  const parsed = parseFloat(quantity.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const getShoppingItemTotal = (item: ShoppingItem): number => {
  const tags = parseRecipientTags(item.forWhom);
  const tagQtySum = tags.reduce((sum, t) => sum + t.quantity, 0);
  const explicitQty = parseShoppingQuantity(item.quantity);
  const finalQty = Math.max(explicitQty, tagQtySum);
  return (item.price || 0) * finalQty;
};

export const sortShoppingItemsByPriceDesc = (a: ShoppingItem, b: ShoppingItem): number => {
  if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
  const aOutOfStock = a.purchaseStatus === 'out_of_stock';
  const bOutOfStock = b.purchaseStatus === 'out_of_stock';
  if (aOutOfStock !== bOutOfStock) return aOutOfStock ? 1 : -1;
  const totalA = getShoppingItemTotal(a);
  const totalB = getShoppingItemTotal(b);
  if (totalB !== totalA) return totalB - totalA;
  const priceA = a.price || 0;
  const priceB = b.price || 0;
  if (priceB !== priceA) return priceB - priceA;
  return (a.rowIndex || 0) - (b.rowIndex || 0);
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
  const [selectedPerson, setSelectedPerson] = useState(ALL_PEOPLE);

  const storeList = Array.from(new Set(data.flatMap((item) => splitTokens(item.store))));
  const personList = Array.from(
    new Set(data.flatMap((item) => parseRecipientTags(item.forWhom).map((t) => t.name)))
  );

  const isAllStores = selectedStore === ALL_STORES;
  const isAllPeople = selectedPerson === ALL_PEOPLE;

  const filteredItems = data
    .filter((item) => {
      if (hideDone && item.isDone) return false;
      const matchStore = isAllStores || splitTokens(item.store).includes(selectedStore);
      const recipientNames = parseRecipientTags(item.forWhom).map((t) => t.name);
      const matchPerson = isAllPeople || recipientNames.includes(selectedPerson);
      return matchStore && matchPerson;
    })
    .sort(sortShoppingItemsByPriceDesc);

  const storePendingItems = isAllStores
    ? []
    : data.filter((item) => splitTokens(item.store).includes(selectedStore) && !item.isDone && item.purchaseStatus !== 'out_of_stock');

  // 計算自用伴手禮 vs 代購金額
  let personalPlannedTotal = 0;
  let proxyPlannedTotal = 0;
  let selectedEstimate = 0;

  data.forEach((item) => {
    const price = item.price || 0;
    const tags = parseRecipientTags(item.forWhom);
    const itemTotal = getShoppingItemTotal(item);

    let itemProxyAmount = 0;
    let itemPersonalAmount = 0;

    tags.forEach((t) => {
      if (t.isProxy) {
        itemProxyAmount += price * t.quantity;
      } else {
        itemPersonalAmount += price * t.quantity;
      }
    });

    // 如果沒有 tags 且有總價
    if (itemProxyAmount === 0 && itemPersonalAmount === 0) {
      itemPersonalAmount = itemTotal;
    }

    personalPlannedTotal += itemPersonalAmount;
    proxyPlannedTotal += itemProxyAmount;

    if (item.isDone) {
      selectedEstimate += itemTotal;
    }
  });

  const personalPlannedTwd = Math.round(computeTwdAmount(personalPlannedTotal, foreignCurrency, fxRate, foreignCurrency));
  const proxyPlannedTwd = Math.round(computeTwdAmount(proxyPlannedTotal, foreignCurrency, fxRate, foreignCurrency));

  return (
    <div className="space-y-4 pb-20">
      {/* Top Stat Cards: 自用伴手禮預估 vs 代購代墊預估 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-white border border-slate-200/70 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="text-xs">🛍️</span>
            <p className="text-[10px] font-bold uppercase tracking-wider">伴手禮/自用</p>
          </div>
          <p className="mt-1 text-base font-black font-mono text-slate-900">{personalPlannedTotal.toLocaleString()} {foreignCurrency}</p>
          <p className="mt-0.5 text-[10px] font-bold font-mono text-slate-400">約 ${personalPlannedTwd.toLocaleString()} TWD</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center space-x-1 text-amber-700">
            <HandCoins className="w-3.5 h-3.5" />
            <p className="text-[10px] font-bold uppercase tracking-wider">代購待請款</p>
          </div>
          <p className="mt-1 text-base font-black font-mono text-amber-900">{proxyPlannedTotal.toLocaleString()} {foreignCurrency}</p>
          <p className="mt-0.5 text-[10px] font-bold font-mono text-amber-600/90">約 ${proxyPlannedTwd.toLocaleString()} TWD</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 shadow-2xs flex sm:block items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">已購買勾選</p>
            <p className="mt-0.5 sm:mt-1 text-base font-black font-mono text-emerald-700">{selectedEstimate.toLocaleString()} {foreignCurrency}</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 sm:hidden bg-emerald-100/60 px-2 py-0.5 rounded-full">
            約 ${Math.round(computeTwdAmount(selectedEstimate, foreignCurrency, fxRate, foreignCurrency)).toLocaleString()} TWD
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* 1st Layer: Store Filter + Add Button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {[ALL_STORES, ...storeList].map((store) => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${selectedStore === store ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                {store === ALL_STORES ? '全部店家' : store}
              </button>
            ))}
          </div>
          <button
            onClick={() => onOpenModal(undefined, isAllStores ? undefined : selectedStore, isAllPeople ? undefined : selectedPerson)}
            className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer select-none whitespace-nowrap shadow-xs transition-all active:scale-95 flex items-center space-x-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增</span>
          </button>
        </div>

        {/* 2nd Layer: Recipient / Person Filter */}
        {personList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-400 pl-1 pr-1 flex-shrink-0 select-none">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>對象</span>
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              {[ALL_PEOPLE, ...personList].map((person) => {
                const isSelected = selectedPerson === person;
                return (
                  <button
                    key={person}
                    onClick={() => setSelectedPerson(person)}
                    className={`px-2.5 py-1 text-xs font-extrabold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-indigo-50/70 text-indigo-700 border border-indigo-100/60 hover:bg-indigo-100'
                    }`}
                  >
                    {person === ALL_PEOPLE ? '全部' : person}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">目前沒有符合條件的購物清單</div>
      )}

      <div className="space-y-2.5">
        {filteredItems.map((item) => {
          const stores = splitTokens(item.store);
          const recipientTags = parseRecipientTags(item.forWhom);
          const isOutOfStock = item.purchaseStatus === 'out_of_stock';
          const totalQty = recipientTags.reduce((sum, t) => sum + t.quantity, 0) || parseShoppingQuantity(item.quantity);
          const itemTotal = (item.price || 0) * totalQty;

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
                    {/* Store & Multi-Recipient Capsules */}
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                      {stores.map((store, idx) => (
                        <span key={`${store}-${idx}`} className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {store}
                        </span>
                      ))}
                      {recipientTags.map((tag, idx) => (
                        <span
                          key={`${tag.name}-${idx}`}
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider whitespace-nowrap flex items-center space-x-0.5 ${
                            tag.isProxy
                              ? 'bg-amber-100 text-amber-900 border border-amber-300/80 shadow-2xs'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100/60'
                          }`}
                        >
                          {tag.isProxy && <span className="mr-0.5">🤝</span>}
                          <span>{tag.name}</span>
                          {tag.quantity > 1 && <span className="font-mono text-[9px] opacity-80">×{tag.quantity}</span>}
                          {tag.isProxy && <span className="text-[9px] font-normal opacity-75">(代購)</span>}
                        </span>
                      ))}
                    </div>

                    {/* Item Name, Quantity & Price */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <h3 className={`text-base font-extrabold text-slate-900 leading-tight ${item.isDone || isOutOfStock ? 'line-through text-slate-400' : ''}`}>
                        {item.item}
                      </h3>
                      {totalQty > 1 && (
                        <span className="text-xs font-extrabold text-slate-800 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded font-mono">
                          ×{totalQty}
                        </span>
                      )}
                      {item.price !== undefined && item.price > 0 && (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                          {item.price.toLocaleString()} {foreignCurrency}
                          {totalQty > 1 && (
                            <span className="text-[10px] text-emerald-600/80 font-bold ml-1">
                              (共 {itemTotal.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )}
                      {isOutOfStock && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">缺貨</span>}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700 transition-colors" title="商品連結">
                          <LinkIcon className="w-4 h-4 ml-0.5 inline-block" />
                        </a>
                      )}
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
