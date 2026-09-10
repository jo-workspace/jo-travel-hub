'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseItem, ShoppingItem } from '@/types/trip';
import {
  computeTwdAmount,
  formatFxRateLabel,
  parseExpenseMeta,
  buildExpenseNote,
} from '@/components/tabs/ExpensesTab';
import { parseRecipientTags } from '@/components/tabs/ShoppingTab';
import { getTodayInTimezone } from '@/lib/tripDate';
import { X, Trash2, DollarSign } from 'lucide-react';

export const CATEGORY_EMOJIS: Record<string, string> = {
  '🍔': '美食',
  '✈️': '機票',
  '🛒': '購物',
  '🚗': '交通',
  '⚾': '球場',
  '🏨': '住宿',
  '❔': '其他',
};

interface ExpenseModalProps {
  isOpen: boolean;
  item?: ExpenseItem | null;
  companionsList?: string[];
  foreignCurrency?: string;
  fxRate?: number;
  shopping?: ShoppingItem[];
  timezone?: string;
  onToggleShopping?: (rowIndex: number, currentStatus: boolean, id?: string) => Promise<void> | void;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number, id?: string) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  item,
  companionsList = [],
  foreignCurrency = 'USD',
  fxRate = 32.5,
  shopping = [],
  timezone,
  onToggleShopping,
  onClose,
  onSave,
  onDelete,
}) => {
  const activeForeignCode = (foreignCurrency || 'USD').toUpperCase();
  const fxLabel = formatFxRateLabel(fxRate, activeForeignCode);

  const companionSet = new Set<string>();
  const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];

  companionsList.forEach((p) => {
    const trimmed = (p || '').trim();
    if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) {
      companionSet.add(trimmed);
    }
  });
  const members = Array.from(companionSet).length > 0 ? Array.from(companionSet) : ['Jo', 'Will'];

  const availableProxyItems = useMemo(() => {
    const list: {
      rowIndex: number;
      id?: string;
      itemName: string;
      personName: string;
      quantity: number;
      price: number;
      totalForeign: number;
      isDone: boolean;
    }[] = [];

    shopping.forEach((s) => {
      const tags = parseRecipientTags(s.forWhom);
      const price = s.price || 0;
      tags.forEach((tag) => {
        if (tag.isProxy) {
          const qty = tag.quantity || 1;
          list.push({
            rowIndex: s.rowIndex,
            id: s.id,
            itemName: s.item,
            personName: tag.name,
            quantity: qty,
            price: price,
            totalForeign: price * qty,
            isDone: !!s.isDone,
          });
        }
      });
    });
    return list;
  }, [shopping]);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>(activeForeignCode);
  const [category, setCategory] = useState('🍔');
  const [paidBy, setPaidBy] = useState<string>(members[0] || 'Jo');
  const [splitMode, setSplitMode] = useState<'equal' | 'weighted' | 'exact' | 'single'>('equal');
  const [selectedSingleMember, setSelectedSingleMember] = useState<string>(members[0] || 'Jo');
  const [memberWeights, setMemberWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    members.forEach((m) => { initial[m] = 1; });
    return initial;
  });
  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>({});
  const [customTwd, setCustomTwd] = useState('');
  const [hasProxy, setHasProxy] = useState(false);
  const [selectedProxyRows, setSelectedProxyRows] = useState<number[]>([]);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.item || '');
      setAmount(item.amount !== undefined && item.amount !== null ? String(item.amount) : '');
      const itemCurr = (item.currency || activeForeignCode).toUpperCase();
      setCurrency(itemCurr);
      setCategory(item.category || '🍔');
      setPaidBy(item.paidBy || members[0] || 'Jo');

      const meta = parseExpenseMeta(item.note);
      setNote(meta.cleanNote || '');
      setDate(item.date || meta.date || getTodayInTimezone(timezone));
      setCustomTwd(meta.customTwd ? String(meta.customTwd) : '');

      if (meta.proxyShoppingRows && meta.proxyShoppingRows.length > 0) {
        setHasProxy(true);
        setSelectedProxyRows(meta.proxyShoppingRows);
      } else if (meta.proxyAmount && meta.proxyAmount > 0) {
        setHasProxy(true);
        setSelectedProxyRows([]);
      } else {
        setHasProxy(false);
        setSelectedProxyRows([]);
      }

      const splitStr = (item.split || '').trim();
      if (!splitStr || EXCLUDED_KEYWORDS.includes(splitStr)) {
        setSplitMode('equal');
        setSelectedSingleMember(members[0] || 'Jo');
      } else if (members.includes(splitStr)) {
        setSplitMode('single');
        setSelectedSingleMember(splitStr);
      } else if (splitStr.includes(':') || splitStr.includes('：')) {
        const parts = splitStr.split(/[,，]+/);
        const weights: Record<string, number> = {};
        const amounts: Record<string, string> = {};
        let hasLargeNum = false;
        parts.forEach((p) => {
          const [n, v] = p.split(/[:：]/);
          const cleanName = (n || '').trim();
          const num = parseFloat(v) || 0;
          if (cleanName) {
            weights[cleanName] = num;
            amounts[cleanName] = String(num);
            if (num >= 10 || !Number.isInteger(num)) hasLargeNum = true;
          }
        });
        if (hasLargeNum) {
          setSplitMode('exact');
          setMemberAmounts(amounts);
        } else {
          setSplitMode('weighted');
          setMemberWeights((prev) => ({ ...prev, ...weights }));
        }
      } else {
        setSplitMode('equal');
      }
    } else {
      setTitle('');
      setAmount('');
      setCurrency(activeForeignCode);
      setCategory('🍔');
      setPaidBy(members[0] || 'Jo');
      setSplitMode('equal');
      setSelectedSingleMember(members[0] || 'Jo');
      const initialWeights: Record<string, number> = {};
      members.forEach((m) => { initialWeights[m] = 1; });
      setMemberWeights(initialWeights);
      setMemberAmounts({});
      setCustomTwd('');
      setHasProxy(false);
      setSelectedProxyRows([]);
      setNote('');
      setDate(getTodayInTimezone(timezone));
    }
  }, [item, isOpen, timezone]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const customTwdNum = parseFloat(customTwd) || 0;
  const selectedProxyItems = availableProxyItems.filter((p) => selectedProxyRows.includes(p.rowIndex));
  const proxyForeignTotal = hasProxy ? selectedProxyItems.reduce((sum, p) => sum + p.totalForeign, 0) : 0;
  const effectiveFx = customTwdNum > 0 && parsedAmount > 0 ? (customTwdNum / parsedAmount) : 0;

  let proxyTwdTotal = 0;
  if (hasProxy && proxyForeignTotal > 0) {
    if (customTwdNum > 0 && parsedAmount > 0) {
      proxyTwdTotal = Math.round(proxyForeignTotal * effectiveFx);
    } else {
      proxyTwdTotal = Math.round(computeTwdAmount(proxyForeignTotal, currency, fxRate, activeForeignCode));
    }
  }

  const rawTotalTwd = customTwdNum > 0 ? customTwdNum : Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));
  const realAmount = Math.max(0, Math.round((parsedAmount - proxyForeignTotal) * 100) / 100);
  const realTwd = Math.max(0, rawTotalTwd - proxyTwdTotal);
  const liveTwdEst = Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (parsedAmount <= 0) {
      alert('請輸入有效金額');
      return;
    }
    if (hasProxy && proxyForeignTotal > parsedAmount) {
      alert(`代購金額 ($${proxyForeignTotal}) 大於消費總額 ($${parsedAmount})，請確認勾選品項與金額。`);
      return;
    }

    let finalSplit = '均分';
    if (splitMode === 'single') {
      finalSplit = selectedSingleMember;
    } else if (splitMode === 'weighted') {
      finalSplit = members.map((m) => `${m}:${memberWeights[m] ?? 1}`).join(',');
    } else if (splitMode === 'exact') {
      const targetTotal = hasProxy ? realAmount : parsedAmount;
      const totalAllocated = members.reduce((sum, m) => sum + (parseFloat(memberAmounts[m]) || 0), 0);
      if (Math.abs(targetTotal - totalAllocated) > 0.01) {
        if (!confirm(`各人指定自用分擔總和 ($${totalAllocated}) 與自用總額 ($${targetTotal}) 不符，確定仍要送出嗎？`)) {
          return;
        }
      }
      finalSplit = members.map((m) => `${m}:${parseFloat(memberAmounts[m]) || 0}`).join(',');
    }

    const finalNote = buildExpenseNote(note, {
      customTwd: customTwdNum > 0 ? customTwdNum : undefined,
      customFx: effectiveFx > 0 ? effectiveFx : undefined,
      proxyAmount: hasProxy && proxyForeignTotal > 0 ? proxyForeignTotal : undefined,
      proxyTwd: hasProxy && proxyTwdTotal > 0 ? proxyTwdTotal : undefined,
      realAmount: hasProxy && proxyForeignTotal > 0 ? realAmount : undefined,
      realTwd: hasProxy && proxyTwdTotal > 0 ? realTwd : undefined,
      proxyShoppingRows: hasProxy && selectedProxyRows.length > 0 ? selectedProxyRows : undefined,
      date: date || undefined,
    });

    setIsSubmitting(true);
    try {
      await onSave({
        id: item?.id,
        rowIndex: item?.rowIndex || 0,
        item: title.trim(),
        amount: parsedAmount,
        currency,
        category,
        paidBy,
        split: finalSplit,
        note: finalNote,
        date: date || undefined,
      });

      if (hasProxy && selectedProxyRows.length > 0 && onToggleShopping) {
        for (const pRow of selectedProxyRows) {
          const sItem = shopping.find((s) => s.rowIndex === pRow);
          if (sItem && !sItem.isDone) {
            try {
              await onToggleShopping(sItem.rowIndex, false, sItem.id);
            } catch (err) {
              console.error('Failed to toggle shopping item status', err);
            }
          }
        }
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex < 2) return;
    if (!confirm(`確定要刪除「${item.item}」這筆記帳嗎？`)) return;
    setIsSubmitting(true);
    try {
      await onDelete(item.rowIndex, item.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 w-full max-w-lg shadow-2xl border border-slate-800 max-h-[92vh] overflow-y-auto no-scrollbar space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-amber-400 flex items-center space-x-1.5">
              <DollarSign className="w-4 h-4" />
              <span>{item ? '編輯記帳項目' : '新增記帳項目'}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{fxLabel}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="品項名稱 (如: 晚餐)"
              required
              className="col-span-3 bg-slate-800 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all border border-slate-700 placeholder:text-slate-500"
            />
            <div className="col-span-2 relative flex items-center">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="金額"
                required
                className="w-full bg-slate-800 text-white text-sm font-bold pl-3 pr-12 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all border border-slate-700 placeholder:text-slate-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setCurrency(currency === activeForeignCode ? 'TWD' : activeForeignCode)}
                className="absolute right-1 text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-1 rounded-lg cursor-pointer select-none active:scale-95 transition-all"
              >
                {currency}
              </button>
            </div>
          </div>

          {/* 折合台幣與含代購合併單列 */}
          <div className="flex items-center gap-2">
            {/* 折合台幣 (外幣時顯示輸入框) */}
            {currency !== 'TWD' ? (
              <div className="flex-1 relative flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-all min-w-0">
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mr-1.5 select-none flex-shrink-0">
                  折合台幣
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={customTwd}
                  onChange={(e) => setCustomTwd(e.target.value)}
                  placeholder={`約 $${liveTwdEst.toLocaleString()}`}
                  className="w-full bg-transparent text-white text-xs font-bold font-mono outline-none placeholder:text-slate-500 min-w-0"
                />
                {customTwdNum > 0 && effectiveFx > 0 && (
                  <span className="text-[9px] font-black font-mono text-amber-400 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded whitespace-nowrap ml-1 flex-shrink-0">
                    1 {currency} ≈ {effectiveFx.toFixed(2)}
                  </span>
                )}
              </div>
            ) : null}

            {/* 含代購核取方塊 */}
            <label className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all whitespace-nowrap flex-shrink-0 ${
              hasProxy
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white'
            }`}>
              <input
                type="checkbox"
                checked={hasProxy}
                onChange={(e) => {
                  const nextVal = e.target.checked;
                  setHasProxy(nextVal);
                  if (!nextVal) setSelectedProxyRows([]);
                }}
                className="w-3.5 h-3.5 rounded text-amber-400 bg-slate-800 border-slate-600 focus:ring-amber-400 cursor-pointer"
              />
              <span>含代購</span>
              {hasProxy && proxyForeignTotal > 0 && (
                <span className="text-[10px] font-mono font-black text-amber-400 ml-0.5">
                  (${proxyForeignTotal.toLocaleString()})
                </span>
              )}
            </label>
          </div>

          {/* Collapsible Proxy Items Selection List */}
          {hasProxy && (
            <div className="bg-slate-800/90 p-3 rounded-xl border border-amber-400/30 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-700 pb-1.5">
                <span>選擇本次刷卡的代購品項</span>
                <span>自用旅費: <span className="font-mono text-emerald-400 font-black">${realAmount.toLocaleString()} {currency} (NT${realTwd.toLocaleString()})</span></span>
              </div>
                {availableProxyItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">購物清單中目前無標記 (代購) 的品項 🛍️</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                    {availableProxyItems.map((p) => {
                      const isChecked = selectedProxyRows.includes(p.rowIndex);
                      return (
                        <label
                          key={`${p.rowIndex}-${p.personName}`}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-400/15 border-amber-400/50 text-white'
                              : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProxyRows((prev) => [...prev, p.rowIndex]);
                                } else {
                                  setSelectedProxyRows((prev) => prev.filter((r) => r !== p.rowIndex));
                                }
                              }}
                              className="rounded text-amber-400 bg-slate-800 border-slate-600 focus:ring-amber-400"
                            />
                            <span className="font-bold truncate">{p.itemName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-400/20 whitespace-nowrap">
                              {p.personName} ×{p.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-amber-400 text-xs ml-2 whitespace-nowrap">
                            ${p.totalForeign.toLocaleString()} {currency}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-800/80 p-1.5 rounded-xl grid grid-cols-7 gap-1">
            {Object.keys(CATEGORY_EMOJIS).map((catEmoji) => {
              const isSelected = category === catEmoji;
              return (
                <button
                  key={catEmoji}
                  type="button"
                  onClick={() => setCategory(catEmoji)}
                  className={`h-9 flex items-center justify-center text-base rounded-lg transition-all cursor-pointer ${
                    isSelected ? 'bg-amber-400 scale-105 shadow-xs' : 'hover:bg-slate-700/60'
                  }`}
                  title={CATEGORY_EMOJIS[catEmoji]}
                >
                  {catEmoji}
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5 text-xs font-bold">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase mb-1">付款人</label>
              <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {members.map((m) => (
                  <button
                    key={`paidBy-${m}`}
                    type="button"
                    onClick={() => setPaidBy(m)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap ${
                      paidBy === m
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'equal'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  均分
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('weighted')}
                  className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'weighted'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  比例
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('exact')}
                  className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'exact'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  自訂金額
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('single')}
                  className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    splitMode === 'single'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  單人
                </button>
              </div>

              {splitMode === 'single' ? (
                <div className="flex items-center space-x-1.5 bg-slate-800/60 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
                  {members.map((m) => (
                    <button
                      key={`single-${m}`}
                      type="button"
                      onClick={() => setSelectedSingleMember(m)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                        selectedSingleMember === m
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'text-slate-400 hover:text-white bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : splitMode === 'weighted' ? (
                <div className="bg-slate-800/60 p-2.5 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {members.map((m) => {
                      const currentWeight = memberWeights[m] ?? 1;
                      return (
                        <div
                          key={`weight-${m}`}
                          className="flex items-center justify-between bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50"
                        >
                          <span className="text-xs font-bold text-slate-200 truncate mr-2">{m}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (currentWeight > 0) {
                                  setMemberWeights((prev) => ({ ...prev, [m]: currentWeight - 1 }));
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-white font-bold text-base cursor-pointer active:scale-95 transition-all select-none"
                            >
                              -
                            </button>
                            <span className="font-mono text-amber-400 font-black text-sm w-4 text-center">
                              {currentWeight}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMemberWeights((prev) => ({ ...prev, [m]: currentWeight + 1 }));
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-white font-bold text-base cursor-pointer active:scale-95 transition-all select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : splitMode === 'exact' ? (
                <div className="space-y-2 bg-slate-800/60 p-2.5 rounded-xl">
                  {(() => {
                    const targetTotal = hasProxy ? realAmount : parsedAmount;
                    const totalAllocated = members.reduce((sum, m) => sum + (parseFloat(memberAmounts[m]) || 0), 0);
                    const remaining = Math.round((targetTotal - totalAllocated) * 100) / 100;
                    return (
                      <>
                        <div className="flex items-center justify-between text-[11px] px-1 font-bold">
                          <span className="text-slate-400">
                            各人自用分擔 ({currency}) {hasProxy ? `(待分擔: $${targetTotal})` : ''}
                          </span>
                          <span
                            className={
                              Math.abs(remaining) < 0.01 && targetTotal > 0
                                ? 'text-emerald-400 font-mono font-black'
                                : remaining > 0
                                ? 'text-amber-300 font-mono'
                                : 'text-rose-400 font-mono'
                            }
                          >
                            {targetTotal <= 0
                              ? '請先輸入金額'
                              : Math.abs(remaining) < 0.01
                              ? '✓ 金額完全吻合'
                              : remaining > 0
                              ? `未分配: $${remaining.toLocaleString()}`
                              : `超出總額: $${Math.abs(remaining).toLocaleString()}`}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {members.map((m) => {
                            const currentVal = memberAmounts[m] || '';
                            return (
                              <div key={`exact-${m}`} className="flex items-center justify-between bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50 gap-2">
                                <span className="text-xs font-bold text-slate-300 truncate min-w-[50px]">{m}</span>
                                <div className="flex items-center space-x-1.5 flex-1 justify-end">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setMemberAmounts((prev) => ({ ...prev, [m]: val }));
                                    }}
                                    placeholder="0"
                                    className="w-24 bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg outline-none border border-slate-700 focus:border-amber-400 text-right"
                                  />
                                  {remaining > 0 && (!currentVal || parseFloat(currentVal) === 0) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMemberAmounts((prev) => ({
                                          ...prev,
                                          [m]: String(remaining),
                                        }));
                                      }}
                                      className="text-[11px] font-bold bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      填入剩餘
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>

          {/* Date & Note Inputs */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mr-1 select-none flex-shrink-0">
                📅
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-white text-xs font-bold font-mono outline-none cursor-pointer [color-scheme:dark] w-28"
                title="消費日期"
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="備註說明 (選填)..."
              className="flex-1 bg-slate-800 text-white text-xs px-3.5 py-2 rounded-xl outline-none focus:ring-1 focus:ring-amber-400 transition-all border border-slate-700 placeholder:text-slate-500 min-w-0"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            {item && item.rowIndex >= 2 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>刪除</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm py-2.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <DollarSign className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? '儲存中...' : item ? '儲存修改' : '送出記帳'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
