'use client';

import React, { useState } from 'react';
import { ShoppingItem } from '@/types/trip';
import { Check, PackageX, X } from 'lucide-react';

interface ShoppingCheckoutModalProps {
  isOpen: boolean;
  store: string | null;
  items: ShoppingItem[];
  currency: string;
  companionsList?: string[];
  onClose: () => void;
  onConfirm: (data: {
    store: string;
    amount: number;
    paidBy?: string;
    split?: string;
    purchasedRowIndexes: number[];
    outOfStockRowIndexes: number[];
  }) => Promise<void>;
}

export const ShoppingCheckoutModal: React.FC<ShoppingCheckoutModalProps> = ({
  isOpen,
  store,
  items,
  currency,
  companionsList = [],
  onClose,
  onConfirm,
}) => {
  const members = companionsList.length > 0 ? companionsList : ['Jo', 'Will'];
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>(members[0] || 'Jo');
  const [splitMode, setSplitMode] = useState<'all' | 'single'>('all');
  const [splitMember, setSplitMember] = useState<string>(members[0] || 'Jo');
  const [purchased, setPurchased] = useState<Set<number>>(() => new Set(items.map((item) => item.rowIndex)));
  const [outOfStock, setOutOfStock] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !store) return null;

  const togglePurchased = (rowIndex: number) => {
    setPurchased((current) => {
      const next = new Set(current);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
    setOutOfStock((current) => {
      const next = new Set(current);
      next.delete(rowIndex);
      return next;
    });
  };

  const toggleOutOfStock = (rowIndex: number) => {
    setOutOfStock((current) => {
      const next = new Set(current);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
    setPurchased((current) => {
      const next = new Set(current);
      next.delete(rowIndex);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        store,
        amount: parsedAmount,
        paidBy,
        split: splitMode === 'all' ? '均分' : splitMember,
        purchasedRowIndexes: Array.from(purchased),
        outOfStockRowIndexes: Array.from(outOfStock),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{store} 結帳確認</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">將自動更新購買狀態並建立一筆記帳項目</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer" aria-label="關閉">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">實際結帳金額</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                required
                className="w-full bg-slate-50 border border-slate-200 text-lg font-black font-mono px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">{currency}</span>
            </div>
          </div>

          {/* 付款人與分攤對象選擇 */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5">付款人</label>
              <div className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaidBy(m)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                      paidBy === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5">分攤對象</label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSplitMode('all')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                    splitMode === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  全體均分
                </button>
                {members.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSplitMode('single');
                      setSplitMember(m);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                      splitMode === 'single' && splitMember === m
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    僅 {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500">本次購買品項</label>
              <span className="text-[10px] font-bold text-slate-400">預設全選，可取消或標記缺貨</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const isPurchased = purchased.has(item.rowIndex);
                const isOutOfStock = outOfStock.has(item.rowIndex);
                return (
                  <div key={item.rowIndex} className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${isOutOfStock ? 'border-amber-200 bg-amber-50' : isPurchased ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                    <button type="button" onClick={() => togglePurchased(item.rowIndex)} className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${isPurchased ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 text-transparent'}`} aria-label={`標示 ${item.item} 已購`}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <span className={`flex-1 min-w-0 text-sm font-bold ${isOutOfStock ? 'text-amber-800 line-through' : 'text-slate-800'}`}>{item.item}</span>
                    <button type="button" onClick={() => toggleOutOfStock(item.rowIndex)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${isOutOfStock ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700'}`}>
                      <PackageX className="w-3 h-3 inline mr-0.5" />缺貨
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">取消</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50">
              {isSubmitting ? '儲存中…' : '確認結帳並記帳'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
