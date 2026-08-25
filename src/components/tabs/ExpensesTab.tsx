'use client';

import React, { useState, useEffect } from 'react';
import { ExpenseItem, ShoppingItem } from '@/types/trip';
import { getShoppingItemTotal } from '@/components/tabs/ShoppingTab';
import { Plus, Trash2, Banknote, DollarSign, Users } from 'lucide-react';

interface ExpensesTabProps {
  data: ExpenseItem[];
  shopping: ShoppingItem[];
  fxRate: number;
  foreignCurrency?: string;
  companions?: string;
  onAddExpense: (formData: any) => Promise<void>;
  onDeleteExpense: (rowIndex: number) => Promise<void>;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  '🍔': '美食',
  '✈️': '機票',
  '🛒': '購物',
  '🚗': '交通',
  '⚾': '球場',
  '🏨': '住宿',
  '❔': '其他',
};

/** 計算任一單位的換算台幣金額（自動支援正反向匯率，如 1 TWD = 5 JPY 或 1 JPY = 0.2 TWD） */
export function computeTwdAmount(amt: number, curr: string, fxRate: number, foreignCurrencyCode: string): number {
  if (!curr || curr === 'TWD') return amt;
  const numRate = Number(fxRate) || 1;
  const targetCode = (foreignCurrencyCode || 'USD').toUpperCase();
  const isReverseCurrency = ['JPY', 'KRW', 'VND', 'IDR'].includes(targetCode);

  if (isReverseCurrency) {
    if (numRate > 1) {
      // 使用者輸入 5.0 (代表 1 TWD = 5 JPY)
      return amt / numRate;
    } else {
      // 使用者輸入 0.20 (代表 1 JPY = 0.20 TWD)
      return amt * numRate;
    }
  } else {
    // USD / EUR / GBP 等強勢貨幣
    if (numRate < 1) {
      return amt / numRate;
    }
    return amt * numRate;
  }
}

/** 格式化外幣匯率提示標籤 */
export function formatFxRateLabel(fxRate: number, foreignCurrencyCode: string): string {
  const code = (foreignCurrencyCode || 'USD').toUpperCase();
  const numRate = Number(fxRate) || 1;
  const isReverseCurrency = ['JPY', 'KRW', 'VND', 'IDR'].includes(code);

  if (isReverseCurrency) {
    let twdToForeign = numRate > 1 ? numRate : (1 / numRate);
    twdToForeign = Number(parseFloat(twdToForeign.toFixed(4)));
    return `1 TWD ≈ ${twdToForeign} ${code}`;
  } else {
    let foreignToTwd = numRate < 1 ? (1 / numRate) : numRate;
    foreignToTwd = Number(parseFloat(foreignToTwd.toFixed(4)));
    return `1 ${code} ≈ ${foreignToTwd} TWD`;
  }
}

/** 解析 split 欄位，支援 '均分' / 'Both' / 'ALL' / 單人名 ('Jo') 或權重格式 ('Jo:2,Will:1') */
export function parseSplitWeights(splitStr: string, members: string[]): Record<string, number> {
  const weights: Record<string, number> = {};
  const trimmed = (splitStr || '').trim();
  const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];

  if (!trimmed || EXCLUDED_KEYWORDS.includes(trimmed)) {
    members.forEach((m) => { weights[m] = 1; });
    return weights;
  }

  if (trimmed.includes(':') || trimmed.includes('：')) {
    const parts = trimmed.split(/[,，]+/);
    parts.forEach((part) => {
      const [name, weightStr] = part.split(/[:：]/);
      const cleanName = (name || '').trim();
      const w = parseFloat(weightStr) || 1;
      if (cleanName) weights[cleanName] = w;
    });
    members.forEach((m) => {
      if (weights[m] === undefined) weights[m] = 0;
    });
    return weights;
  }

  // 單一人名 (例如 'Jo')
  members.forEach((m) => {
    weights[m] = m === trimmed ? 1 : 0;
  });
  return weights;
}

/** 格式化費用列表顯示之分擔標籤 (例如 "全體均分" 或 "Jo 2份, Will 1份") */
export function formatSplitLabel(splitStr: string, members: string[]): string {
  const weights = parseSplitWeights(splitStr, members);
  const activeMembers = Object.keys(weights).filter((m) => weights[m] > 0);

  if (activeMembers.length === 0) return '全體均分';

  const isAllEqual = activeMembers.length === members.length && activeMembers.every((m) => weights[m] === weights[activeMembers[0]]);
  if (isAllEqual) {
    if (weights[activeMembers[0]] > 1) {
      return `全體均分 (各 ${weights[activeMembers[0]]} 份)`;
    }
    return '全體均分';
  }

  if (activeMembers.length === 1) {
    return `${activeMembers[0]} 分擔`;
  }

  return activeMembers.map((m) => `${m} ${weights[m]}份`).join(', ');
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  data,
  shopping,
  fxRate = 32.5,
  foreignCurrency = 'USD',
  companions = 'Jo, Will',
  onAddExpense,
  onDeleteExpense,
}) => {
  const activeForeignCode = (foreignCurrency || 'USD').toUpperCase();
  const fxLabel = formatFxRateLabel(fxRate, activeForeignCode);
  const shoppingPlannedTwd = shopping.reduce(
    (total, item) => total + computeTwdAmount(getShoppingItemTotal(item), activeForeignCode, fxRate, activeForeignCode),
    0,
  );
  const shoppingActualTwd = data.reduce(
    (total, expense) => total + (expense.category === '🛒'
      ? computeTwdAmount(expense.amount || 0, expense.currency, fxRate, activeForeignCode)
      : 0),
    0,
  );

  // 解析同行人員清單（排除公用與分帳關鍵字）
  const companionSet = new Set<string>();
  const EXCLUDED_KEYWORDS = ['公用', '公用錢包', '均分', 'Both', 'ALL', '全體均分', '僅公用'];

  if (companions) {
    companions.split(/[\n,，]+/).forEach((p) => {
      const trimmed = p.trim();
      if (trimmed && !EXCLUDED_KEYWORDS.includes(trimmed)) {
        companionSet.add(trimmed);
      }
    });
  }
  // 如果舊資料有非清單內的人員，自動補充進去（排除公用與關鍵字，並排除帶有冒號權重之字串）
  data.forEach((exp) => {
    const p = (exp.paidBy || '').trim();
    const s = (exp.split || '').trim();
    if (p && !EXCLUDED_KEYWORDS.includes(p) && !p.includes(':') && !p.includes('：')) companionSet.add(p);
    if (s && !EXCLUDED_KEYWORDS.includes(s) && !s.includes(':') && !s.includes('：')) companionSet.add(s);
  });
  const members = Array.from(companionSet).length > 0 ? Array.from(companionSet) : ['Jo', 'Will'];

  // Form states
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>(activeForeignCode);
  const [category, setCategory] = useState('🍔');
  const [paidBy, setPaidBy] = useState<string>(members[0] || 'Jo');
  const [splitMode, setSplitMode] = useState<'weighted' | 'single'>('weighted');
  const [selectedSingleMember, setSelectedSingleMember] = useState<string>(members[0] || 'Jo');
  const [memberWeights, setMemberWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    members.forEach((m) => { initial[m] = 1; });
    return initial;
  });
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當外幣設定變更時同步預設外幣代碼
  useEffect(() => {
    setCurrency(activeForeignCode);
  }, [activeForeignCode]);

  // 當同行人員改變時，若目前選擇的付款人不符，重置為第一個，並更新權重物件
  useEffect(() => {
    if (!members.includes(paidBy)) {
      setPaidBy(members[0] || 'Jo');
    }
    setMemberWeights((prev) => {
      const next: Record<string, number> = {};
      members.forEach((m) => {
        next[m] = prev[m] ?? 1;
      });
      return next;
    });
  }, [companions]);

  // 動態多人群體分帳計算
  let totalTWD = 0;
  const paidTWD: Record<string, number> = {};
  const shareTWD: Record<string, number> = {};
  const settlementOffsetTWD: Record<string, number> = {};

  members.forEach((m) => {
    paidTWD[m] = 0;
    shareTWD[m] = 0;
    settlementOffsetTWD[m] = 0;
  });

  data.forEach((exp) => {
    let amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    let amtTWD = computeTwdAmount(amt, exp.currency, fxRate, activeForeignCode);

    // 處理系統結清對沖紀錄
    if (exp.item && exp.item.includes('系統結清')) {
      if (exp.paidBy && settlementOffsetTWD[exp.paidBy] !== undefined) {
        settlementOffsetTWD[exp.paidBy] += amtTWD;
      }
      if (exp.split && settlementOffsetTWD[exp.split] !== undefined) {
        settlementOffsetTWD[exp.split] -= amtTWD;
      }
      return;
    }

    totalTWD += amtTWD;

    // 累計付款金額（如果付款人是「公用」，代表由公用金支付，不計入個人墊付款）
    const payer = exp.paidBy ? exp.paidBy.trim() : members[0];
    if (paidTWD[payer] !== undefined) {
      paidTWD[payer] += amtTWD;
    }

    // 累計應分攤金額（按人頭權重解析進行精確分配）
    const splitTarget = exp.split ? exp.split.trim() : '均分';
    const weights = parseSplitWeights(splitTarget, members);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    if (totalWeight > 0) {
      members.forEach((m) => {
        const w = weights[m] || 0;
        const memberShare = amtTWD * (w / totalWeight);
        shareTWD[m] = (shareTWD[m] || 0) + memberShare;
      });
    }
  });

  // 計算每人淨餘額 (+ 表示溢付/應收，- 表示欠款/應付)
  const netBalances: Record<string, number> = {};
  members.forEach((m) => {
    netBalances[m] = (paidTWD[m] || 0) - (shareTWD[m] || 0) + (settlementOffsetTWD[m] || 0);
  });

  // 生成結算指示 (債務撮合演算法)
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  members.forEach((m) => {
    const bal = Math.round(netBalances[m] || 0);
    if (bal < -1) debtors.push({ name: m, amount: Math.abs(bal) });
    else if (bal > 1) creditors.push({ name: m, amount: bal });
  });

  const settlementInstructions: string[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 1) {
      settlementInstructions.push(`${debtor.name} 應給 ${creditor.name} $${settleAmt.toLocaleString()}`);
    }

    debtor.amount -= settleAmt;
    creditor.amount -= settleAmt;

    if (debtor.amount <= 1) dIdx++;
    if (creditor.amount <= 1) cIdx++;
  }

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !amount || parseFloat(amount) <= 0) return;

    let finalSplit = '均分';
    if (splitMode === 'single') {
      finalSplit = selectedSingleMember;
    } else {
      // 權重分攤模式
      const activeWeights = members.map((m) => `${m}:${memberWeights[m] || 1}`);
      const isAllOnes = members.every((m) => (memberWeights[m] || 1) === 1);
      if (isAllOnes) {
        finalSplit = '均分';
      } else {
        finalSplit = activeWeights.join(',');
      }
    }

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        item: item.trim(),
        currency,
        amount: parseFloat(amount),
        paidBy,
        split: finalSplit,
        note: note.trim(),
      });
      setItem('');
      setAmount('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSettlement = async () => {
    if (settlementInstructions.length === 0) return;
    const firstInstr = settlementInstructions[0];
    const match = firstInstr.match(/(.+) 應給 (.+) \$([\d,]+)/);
    if (!match) return;

    const [, debtorName, creditorName, amtStr] = match;
    const amountVal = parseInt(amtStr.replace(/,/g, ''), 10);

    if (!confirm(`確認進行結清清算？將新增一筆 ${debtorName} 支付 ${creditorName} $${amountVal} TWD 的系統紀錄。`)) return;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category: '💵',
        item: `系統結清: ${debtorName} 支付 ${creditorName}`,
        currency: 'TWD',
        amount: amountVal,
        paidBy: debtorName,
        split: creditorName,
        note: '點擊一鍵結清產生的對沖紀錄',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const liveTwdEst = Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settlement Dashboard & Quick Input Form */}
        <div className="md:col-span-5 space-y-4">
          {/* Settlement Banner */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-700/50 text-center space-y-2">
            <div className="flex items-center justify-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>分帳結算 (同行 {members.length} 人 · {fxLabel})</span>
            </div>

            <div className="space-y-1">
              {settlementInstructions.length === 0 ? (
                <div className="text-lg font-extrabold text-emerald-400 tracking-tight">
                  目前帳目兩不相欠！✨
                </div>
              ) : (
                settlementInstructions.map((instr, idx) => (
                  <div key={idx} className="text-lg font-extrabold text-amber-400 tracking-tight">
                    {instr}
                  </div>
                ))
              )}
            </div>

            {settlementInstructions.length > 0 && (
              <button
                onClick={handleClearSettlement}
                disabled={isSubmitting}
                className="mt-2 px-4 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center space-x-1"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>一鍵結清</span>
              </button>
            )}
          </div>

          {/* User Spend Breakdown Grid */}
          <div className={`grid gap-2.5 ${members.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {members.map((m) => {
              const share = Math.round(shareTWD[m] || 0);
              const paid = Math.round(paidTWD[m] || 0);
              return (
                <div key={m} className="bg-white border border-slate-100 p-3 rounded-2xl text-center shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    {m} 應負擔
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 mt-0.5 block truncate">
                    ${share.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                    已付 ${paid.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">購物預估</span>
              <span className="text-sm font-mono font-black text-slate-900 mt-0.5 block">${Math.round(shoppingPlannedTwd).toLocaleString()} TWD</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">實際已購</span>
              <span className="text-sm font-mono font-black text-emerald-700 mt-0.5 block">${Math.round(shoppingActualTwd).toLocaleString()} TWD</span>
            </div>
          </div>

          {/* Quick Expense Form */}
          <form
            onSubmit={handleQuickSubmit}
            className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4 border border-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-extrabold text-amber-400 flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4" />
                <span>新增記帳項目</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">{fxLabel}</span>
            </div>

            {/* Item Title & Amount */}
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
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

            {/* Live FX Calculation Preview */}
            {parsedAmount > 0 && currency !== 'TWD' && (
              <div className="text-[11px] font-bold text-amber-300 px-1 font-mono">
                ≈ 約合 TWD ${liveTwdEst.toLocaleString()}
              </div>
            )}

            {/* Category Emoji Selector */}
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

            {/* PaidBy & Split Selector */}
            <div className="space-y-2.5 text-xs font-bold">
              {/* Paid By Selection */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">付款人</label>
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
                  {members.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaidBy(m)}
                      className={`flex-1 min-w-[50px] py-1.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                        paidBy === m ? 'bg-slate-100 text-slate-900 font-extrabold shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split Selection */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">分攤對象</label>
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSplitMode('weighted')}
                    className={`flex-1 min-w-[50px] py-1.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                      splitMode === 'weighted' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    分攤
                  </button>
                  {members.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSplitMode('single');
                        setSelectedSingleMember(m);
                      }}
                      className={`flex-1 min-w-[50px] py-1.5 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                        splitMode === 'single' && selectedSingleMember === m ? 'bg-slate-100 text-slate-900 font-extrabold shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      僅 {m}
                    </button>
                  ))}
                </div>

                {/* 人頭/權重微調控制區 (當選擇「按人頭/權重分攤」時顯示) */}
                {splitMode === 'weighted' && (
                  <div className="mt-2 bg-slate-800/90 border border-slate-700/60 p-2.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <span>調整成員負擔人頭 (如攜帶家人代付)</span>
                      <span className="font-mono text-amber-300">
                        總份數: {Object.values(memberWeights).reduce((a, b) => a + b, 0)} 份
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {members.map((m) => {
                        const currentWeight = memberWeights[m] || 1;
                        return (
                          <div key={m} className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-xs font-bold text-slate-200 truncate">{m}</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setMemberWeights(prev => ({ ...prev, [m]: Math.max(1, (prev[m] || 1) - 1) }))}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs cursor-pointer select-none active:scale-95"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-black text-amber-400 w-4 text-center">
                                {currentWeight}
                              </span>
                              <button
                                type="button"
                                onClick={() => setMemberWeights(prev => ({ ...prev, [m]: (prev[m] || 1) + 1 }))}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs cursor-pointer select-none active:scale-95"
                              >
                                +
                              </button>
                              <span className="text-[10px] text-slate-500 font-bold">人份</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="相關備註 (選填)..."
              className="w-full bg-slate-800 text-white text-xs px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all border border-slate-700 placeholder:text-slate-500"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '處理中...' : '送出記帳'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Expense History List */}
        <div className="md:col-span-7 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-between">
            <span>費用明細 (共 {data.length} 筆)</span>
            <span className="font-mono text-slate-600">總計: ${Math.round(totalTWD).toLocaleString()} TWD</span>
          </h3>

          {data.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              目前無記帳紀錄 💵
            </div>
          )}

          <div className="space-y-2">
            {data.map((exp) => {
              const isSettlement = exp.item && exp.item.includes('系統結清');
              const amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
              const expCurr = (exp.currency || activeForeignCode).toUpperCase();
              const amtTWD = Math.round(computeTwdAmount(amt, expCurr, fxRate, activeForeignCode));

              return (
                <div
                  key={exp.rowIndex}
                  className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                    isSettlement
                      ? 'bg-amber-50/60 border-amber-200/80'
                      : 'bg-white border-slate-100 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                    <span className="text-2xl select-none flex-shrink-0">
                      {exp.category || '🍔'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-x-2">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">
                          {exp.item}
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {exp.paidBy || members[0]} 付 ({formatSplitLabel(exp.split, members)})
                        </span>
                      </div>
                      {exp.note && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{exp.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Amount & Delete */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-slate-900">
                        ${amt.toLocaleString()} {expCurr}
                      </div>
                      {expCurr !== 'TWD' && (
                        <div className="text-[10px] font-bold font-mono text-slate-400">
                          ≈ ${amtTWD.toLocaleString()} TWD
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`確定要刪除「${exp.item}」這筆記帳嗎？`)) {
                          onDeleteExpense(exp.rowIndex);
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer active:scale-90"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
