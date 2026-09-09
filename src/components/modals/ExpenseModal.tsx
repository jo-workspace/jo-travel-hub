'use client';

import React, { useState, useEffect } from 'react';
import { ExpenseItem } from '@/types/trip';
import { computeTwdAmount, formatFxRateLabel } from '@/components/tabs/ExpensesTab';
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
  onClose,
  onSave,
  onDelete,
}) => {
  const activeForeignCode = (foreignCurrency || 'USD').toUpperCase();
  const fxLabel = formatFxRateLabel(fxRate, activeForeignCode);

  // 解析旅程成員名單
  const companionSet = new Set<string>();
  const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];

  companionsList.forEach((p) => {
    const trimmed = (p || '').trim();
    if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) {
      companionSet.add(trimmed);
    }
  });
  const members = Array.from(companionSet).length > 0 ? Array.from(companionSet) : ['Jo', 'Will'];

  // Form states
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
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當 item 變更或彈窗開啟時初始化表單
  useEffect(() => {
    if (item) {
      setTitle(item.item || '');
      setAmount(item.amount !== undefined && item.amount !== null ? String(item.amount) : '');
      const itemCurr = (item.currency || activeForeignCode).toUpperCase();
      setCurrency(itemCurr);
      setCategory(item.category || '🍔');
      setPaidBy(item.paidBy || members[0] || 'Jo');
      setNote(item.note || '');

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
            if (num >= 10 || !Number.isInteger(num)) {
              hasLargeNum = true;
            }
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
      // 新增模式
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
      setNote('');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const liveTwdEst = Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (parsedAmount <= 0) {
      alert('請輸入有效金額');
      return;
    }

    let finalSplit = '均分';
    if (splitMode === 'single') {
      finalSplit = selectedSingleMember;
    } else if (splitMode === 'weighted') {
      finalSplit = members.map((m) => `${m}:${memberWeights[m] ?? 1}`).join(',');
    } else if (splitMode === 'exact') {
      const totalAllocated = members.reduce((sum, m) => sum + (parseFloat(memberAmounts[m]) || 0), 0);
      if (Math.abs(parsedAmount - totalAllocated) > 0.01) {
        if (!confirm(`各人指定分擔總和 ($${totalAllocated}) 與消費總額 ($${parsedAmount}) 不符，確定仍要送出嗎？`)) {
          return;
        }
      }
      finalSplit = members.map((m) => `${m}:${parseFloat(memberAmounts[m]) || 0}`).join(',');
    }

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
        note: note.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex <= 1) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-1.5">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span>{item ? '編輯記帳項目' : '新增記帳項目'}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{fxLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* 品項與金額 */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">品項名稱</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如: 晚餐"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">金額與幣別</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl pl-3 pr-12 py-2 text-sm font-bold font-mono outline-none transition-all placeholder:text-slate-400 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setCurrency(currency === activeForeignCode ? 'TWD' : activeForeignCode)}
                  className="absolute right-1 text-[10px] font-black bg-amber-400 hover:bg-amber-500 text-slate-950 px-2 py-1 rounded-lg cursor-pointer select-none active:scale-95 transition-all shadow-2xs"
                >
                  {currency}
                </button>
              </div>
            </div>
          </div>

          {/* 即時換算預覽 */}
          {parsedAmount > 0 && currency !== 'TWD' && (
            <div className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-1.5 font-mono flex items-center justify-between">
              <span>約合台幣</span>
              <span className="font-black text-xs">${liveTwdEst.toLocaleString()} TWD</span>
            </div>
          )}

          {/* 類別 Emoji 選擇 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">消費類別</label>
            <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-2xl grid grid-cols-7 gap-1">
              {Object.keys(CATEGORY_EMOJIS).map((catEmoji) => {
                const isSelected = category === catEmoji;
                return (
                  <button
                    key={catEmoji}
                    type="button"
                    onClick={() => setCategory(catEmoji)}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-xl cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs scale-105'
                        : 'hover:bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    <span className="text-lg">{catEmoji}</span>
                    <span className="text-[9px] font-bold mt-0.5">{CATEGORY_EMOJIS[catEmoji]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 付款人 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">由誰付款</label>
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              {members.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaidBy(m)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                    paidBy === m
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {m} 付
                </button>
              ))}
            </div>
          </div>

          {/* 分帳模式 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">分帳方式</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-2">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'equal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                均分
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('single')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                單人
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('weighted')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'weighted' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                權重
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('exact')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'exact' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                金額
              </button>
            </div>

            {/* 子設定面板 */}
            {splitMode === 'single' ? (
              <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                {members.map((m) => (
                  <button
                    key={`single-${m}`}
                    type="button"
                    onClick={() => setSelectedSingleMember(m)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer whitespace-nowrap ${
                      selectedSingleMember === m
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : splitMode === 'weighted' ? (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => {
                    const currentWeight = memberWeights[m] ?? 1;
                    return (
                      <div
                        key={`weight-${m}`}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200"
                      >
                        <span className="text-xs font-bold text-slate-700 truncate mr-2">{m}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentWeight > 0) {
                                setMemberWeights((prev) => ({ ...prev, [m]: currentWeight - 1 }));
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-sm cursor-pointer active:scale-95 transition-all select-none"
                          >
                            -
                          </button>
                          <span className="font-mono text-slate-900 font-black text-sm w-4 text-center">
                            {currentWeight}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMemberWeights((prev) => ({ ...prev, [m]: currentWeight + 1 }));
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-sm cursor-pointer active:scale-95 transition-all select-none"
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
              <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {(() => {
                  const totalAllocated = members.reduce((sum, m) => sum + (parseFloat(memberAmounts[m]) || 0), 0);
                  const remaining = Math.round((parsedAmount - totalAllocated) * 100) / 100;
                  return (
                    <>
                      <div className="flex items-center justify-between text-[11px] px-1 font-bold">
                        <span className="text-slate-500">各人分擔金額 ({currency})</span>
                        <span
                          className={
                            Math.abs(remaining) < 0.01 && parsedAmount > 0
                              ? 'text-emerald-600 font-mono font-black'
                              : remaining > 0
                              ? 'text-amber-600 font-mono'
                              : 'text-rose-600 font-mono'
                          }
                        >
                          {parsedAmount <= 0
                            ? '請先輸入總額'
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
                            <div key={`exact-${m}`} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 gap-2">
                              <span className="text-xs font-bold text-slate-700 truncate min-w-[50px]">{m}</span>
                              <div className="flex items-center space-x-1.5 flex-1 justify-end">
                                <input
                                  type="number"
                                  step="any"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMemberAmounts((prev) => ({ ...prev, [m]: val }));
                                  }}
                                  placeholder="0"
                                  className="w-24 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right outline-none text-slate-900"
                                />
                                <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
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

          {/* 備註 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">備註說明</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如: 包含小費或特定明細..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all placeholder:text-slate-400 text-slate-900"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            {item && item.rowIndex > 1 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>刪除</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? '處理中...' : item ? '儲存修改' : '新增記帳'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
