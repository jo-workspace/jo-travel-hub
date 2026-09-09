'use client';

import React, { useState, useEffect } from 'react';
import { ExpenseItem, ShoppingItem } from '@/types/trip';
import { getShoppingItemTotal, parseRecipientTags } from '@/components/tabs/ShoppingTab';
import { Plus, Trash2, Banknote, DollarSign, Users, HandCoins, Copy, Check, PieChart, ChevronDown, ChevronUp } from 'lucide-react';

interface ExpensesTabProps {
  data: ExpenseItem[];
  shopping: ShoppingItem[];
  fxRate: number;
  foreignCurrency?: string;
  companions?: string;
  onAddExpense: (formData: any) => Promise<void>;
  onDeleteExpense: (rowIndex: number, id?: string) => Promise<void>;
  onOpenModal?: (item?: ExpenseItem) => void;
  onUpdateShoppingPrice?: (rowIndex: number, newPrice: number) => Promise<void>;
  onToggleShopping?: (rowIndex: number, currentStatus: boolean, id?: string) => Promise<void> | void;
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

export interface ExpenseMeta {
  customTwd?: number;      // 刷卡折算台幣（網銀通知）
  customFx?: number;       // 實質匯率
  proxyAmount?: number;    // 代購總額 (外幣)
  proxyTwd?: number;       // 代購總額 (台幣)
  realAmount?: number;     // 自用淨額 (外幣)
  realTwd?: number;        // 自用淨額 (台幣)
  proxyShoppingRows?: number[]; // 關聯之購物清單 rowIndex
  cleanNote: string;
}

/** 解析記帳中繼資料（折算台幣、代購代墊款、實質匯率） */
export function parseExpenseMeta(rawNote?: string): ExpenseMeta {
  if (!rawNote) return { cleanNote: '' };

  const metaMatch = rawNote.match(/<!--(?:EXP_META:([^\->]+)|TWD:(\d+)(?:,FX:([\d.]+))?)-->/);

  let customTwd: number | undefined;
  let customFx: number | undefined;
  let proxyAmount: number | undefined;
  let proxyTwd: number | undefined;
  let realAmount: number | undefined;
  let realTwd: number | undefined;
  let proxyShoppingRows: number[] | undefined;

  if (metaMatch) {
    if (metaMatch[1]) {
      const pairs = metaMatch[1].split(',');
      pairs.forEach((p) => {
        const [k, v] = p.split('=');
        if (!k || !v) return;
        const key = k.trim().toUpperCase();
        const val = v.trim();
        if (key === 'TWD') customTwd = parseFloat(val);
        else if (key === 'FX') customFx = parseFloat(val);
        else if (key === 'PROXY_AMT') proxyAmount = parseFloat(val);
        else if (key === 'PROXY_TWD') proxyTwd = parseFloat(val);
        else if (key === 'REAL_AMT') realAmount = parseFloat(val);
        else if (key === 'REAL_TWD') realTwd = parseFloat(val);
        else if (key === 'PROXY_ROWS') {
          proxyShoppingRows = val.split(/[|;]/).map((n) => parseInt(n, 10)).filter(Boolean);
        }
      });
    } else if (metaMatch[2]) {
      customTwd = parseFloat(metaMatch[2]);
      if (metaMatch[3]) customFx = parseFloat(metaMatch[3]);
    }
  }

  const clean = rawNote
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[(?:折算|含代購|代購墊付)[^\]]*\]/g, '')
    .trim();

  return {
    customTwd: customTwd && !isNaN(customTwd) ? customTwd : undefined,
    customFx: customFx && !isNaN(customFx) ? customFx : undefined,
    proxyAmount: proxyAmount && !isNaN(proxyAmount) ? proxyAmount : undefined,
    proxyTwd: proxyTwd && !isNaN(proxyTwd) ? proxyTwd : undefined,
    realAmount: realAmount !== undefined && !isNaN(realAmount) ? realAmount : undefined,
    realTwd: realTwd !== undefined && !isNaN(realTwd) ? realTwd : undefined,
    proxyShoppingRows,
    cleanNote: clean,
  };
}

/** 建構記帳備註中繼標記 */
export function buildExpenseNote(
  userNote: string,
  meta: {
    customTwd?: number;
    customFx?: number;
    proxyAmount?: number;
    proxyTwd?: number;
    realAmount?: number;
    realTwd?: number;
    proxyShoppingRows?: number[];
  }
): string {
  const metaParts: string[] = [];
  if (meta.customTwd !== undefined && meta.customTwd > 0) metaParts.push(`TWD=${meta.customTwd}`);
  if (meta.customFx !== undefined && meta.customFx > 0) metaParts.push(`FX=${meta.customFx.toFixed(4)}`);
  if (meta.proxyAmount !== undefined && meta.proxyAmount > 0) metaParts.push(`PROXY_AMT=${meta.proxyAmount}`);
  if (meta.proxyTwd !== undefined && meta.proxyTwd > 0) metaParts.push(`PROXY_TWD=${meta.proxyTwd}`);
  if (meta.realAmount !== undefined && meta.realAmount >= 0) metaParts.push(`REAL_AMT=${meta.realAmount}`);
  if (meta.realTwd !== undefined && meta.realTwd >= 0) metaParts.push(`REAL_TWD=${meta.realTwd}`);
  if (meta.proxyShoppingRows && meta.proxyShoppingRows.length > 0) {
    metaParts.push(`PROXY_ROWS=${meta.proxyShoppingRows.join('|')}`);
  }

  if (metaParts.length === 0) return userNote.trim();

  const commentTag = `<!--EXP_META:${metaParts.join(',')}-->`;

  let label = '';
  if (meta.customTwd && meta.proxyTwd) {
    label = `[折算 NT$${meta.customTwd} | 代購墊付 NT$${meta.proxyTwd}]`;
  } else if (meta.customTwd) {
    label = `[折算 NT$${meta.customTwd}]`;
  } else if (meta.proxyTwd) {
    label = `[代購墊付 NT$${meta.proxyTwd}]`;
  }

  const cleanUserNote = userNote.trim();
  const visiblePart = label ? (cleanUserNote ? `${label} ${cleanUserNote}` : label) : cleanUserNote;
  return `${commentTag}${visiblePart}`;
}

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

/** 格式化費用列表顯示之分擔標籤 (例如 "全體均分"、"Jo $9,200, Will $5,800" 或 "Jo 2份, Will 1份") */
export function formatSplitLabel(splitStr: string, members: string[]): string {
  const weights = parseSplitWeights(splitStr, members);
  const activeMembers = Object.keys(weights).filter((m) => weights[m] > 0);

  if (activeMembers.length === 0) return '全體均分';

  // 判斷是否為實際指定金額格式（任一數值 >= 10 或含小數）
  const isAmountFormat = activeMembers.some((m) => weights[m] >= 10 || !Number.isInteger(weights[m]));
  if (isAmountFormat) {
    return activeMembers.map((m) => `${m} $${weights[m].toLocaleString()}`).join(', ');
  }

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
  onOpenModal,
  onUpdateShoppingPrice,
  onToggleShopping,
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

  // 提取購物清單中所有代購品項
  const availableProxyItems = React.useMemo(() => {
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
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

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
  // 類別 × 旅伴花費透視統計 (Category x Person Breakdown)
  const categoryPersonShares: Record<string, Record<string, number>> = {};
  const categoryTotals: Record<string, number> = {};

  members.forEach((m) => {
    paidTWD[m] = 0;
    shareTWD[m] = 0;
    settlementOffsetTWD[m] = 0;
  });

  data.forEach((exp) => {
    let amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    const expCurr = (exp.currency || activeForeignCode).toUpperCase();
    const meta = parseExpenseMeta(exp.note);

    // 處理系統結清對沖紀錄
    if (exp.item && exp.item.includes('系統結清')) {
      const settleAmtTWD = meta.customTwd || computeTwdAmount(amt, expCurr, fxRate, activeForeignCode);
      if (exp.paidBy && settlementOffsetTWD[exp.paidBy] !== undefined) {
        settlementOffsetTWD[exp.paidBy] += settleAmtTWD;
      }
      if (exp.split && settlementOffsetTWD[exp.split] !== undefined) {
        settlementOffsetTWD[exp.split] -= settleAmtTWD;
      }
      return;
    }

    const rawBillTwd = meta.customTwd || computeTwdAmount(amt, expCurr, fxRate, activeForeignCode);
    // 自用真實旅費金額（若有代購扣除，只計算自用旅費 realTwd）：
    const realTripTwd = meta.realTwd !== undefined ? meta.realTwd : rawBillTwd;

    // 累計全旅程總花費：只計算自用真實旅費，徹底與外人代購代墊款脫鉤
    totalTWD += realTripTwd;

    // 累計付款金額（付款人墊付的旅費，扣除外人代購墊付款，外人代購由代購請款區向委託人請款）
    const payer = exp.paidBy ? exp.paidBy.trim() : members[0];
    if (paidTWD[payer] !== undefined) {
      paidTWD[payer] += realTripTwd;
    }

    // 累計應分攤金額（各旅伴只分攤自用真實旅費 realTripTwd）
    const splitTarget = exp.split ? exp.split.trim() : '均分';
    const weights = parseSplitWeights(splitTarget, members);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    // 累計類別 × 旅伴真實自用花費
    if (realTripTwd > 0) {
      const cat = exp.category || '❔';
      if (!categoryPersonShares[cat]) {
        categoryPersonShares[cat] = {};
        members.forEach((m) => { categoryPersonShares[cat][m] = 0; });
        categoryTotals[cat] = 0;
      }
      categoryTotals[cat] += realTripTwd;

      if (totalWeight > 0) {
        members.forEach((m) => {
          const w = weights[m] || 0;
          const memberShare = realTripTwd * (w / totalWeight);
          categoryPersonShares[cat][m] = (categoryPersonShares[cat][m] || 0) + memberShare;
        });
      }
    }

    if (totalWeight > 0) {
      members.forEach((m) => {
        const w = weights[m] || 0;
        const memberShare = realTripTwd * (w / totalWeight);
        shareTWD[m] = (shareTWD[m] || 0) + memberShare;
      });
    }
  });

  // 依消費總額由大到小排序類別
  const sortedCategories = Object.keys(categoryTotals).sort(
    (a, b) => (categoryTotals[b] || 0) - (categoryTotals[a] || 0)
  );

  // 支援依類別與成員個人花費篩選下方明細，並將最新的記帳排在最上面 (最新在前)
  const filteredExpenses = data
    .filter((exp) => {
      if (exp.item && exp.item.includes('系統結清')) return false;

      // 類別篩選
      if (selectedCategoryFilter && (exp.category || '❔') !== selectedCategoryFilter) {
        return false;
      }

      // 成員個人花費篩選 (含僅該人或分攤中有該人份額)
      if (selectedMemberFilter) {
        const amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
        const expCurr = (exp.currency || activeForeignCode).toUpperCase();
        const meta = parseExpenseMeta(exp.note);
        const rawBillTwd = meta.customTwd || computeTwdAmount(amt, expCurr, fxRate, activeForeignCode);
        const realTripTwd = meta.realTwd !== undefined ? meta.realTwd : rawBillTwd;
        if (realTripTwd <= 0) return false;

        const splitTarget = exp.split ? exp.split.trim() : '均分';
        const weights = parseSplitWeights(splitTarget, members);
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        const memberWeight = weights[selectedMemberFilter] || 0;
        if (memberWeight <= 0 || totalWeight <= 0) return false;
      }

      return true;
    })
    .slice()
    .reverse();

  // 計算目前篩選條件下的總額 (若篩選成員，顯示該成員在篩選條件下的負擔總額)
  let filteredSubtotalTwd = totalTWD;
  if (selectedMemberFilter && selectedCategoryFilter) {
    filteredSubtotalTwd = Math.round(categoryPersonShares[selectedCategoryFilter]?.[selectedMemberFilter] || 0);
  } else if (selectedMemberFilter) {
    filteredSubtotalTwd = Math.round(shareTWD[selectedMemberFilter] || 0);
  } else if (selectedCategoryFilter) {
    filteredSubtotalTwd = Math.round(categoryTotals[selectedCategoryFilter] || 0);
  }

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

  // 解析購物清單中所有代購項目（含已買與待買）
  interface ProxyReceivableItem {
    rowIndex: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalForeign: number;
    totalTwd: number;
    isDone: boolean;
    hasLinkedFx?: boolean;
    payer?: string;
  }

  const [copiedPerson, setCopiedPerson] = useState<string | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<string>('');
  const proxyReceivables: Record<string, ProxyReceivableItem[]> = {};
  let totalProxyTwd = 0;
  let totalProxyForeign = 0;
  let purchasedProxyTwd = 0;
  let purchasedProxyForeign = 0;
  let personalShoppingPlannedTwd = 0;

  // 建立代購品項與實際刷卡匯率的對照表 (從已記帳項目中提取)
  const proxyItemEffectiveFxMap = new Map<number, { customFx?: number; payer?: string }>();
  data.forEach((exp) => {
    const meta = parseExpenseMeta(exp.note);
    if (meta.proxyShoppingRows && meta.proxyShoppingRows.length > 0) {
      meta.proxyShoppingRows.forEach((rowIdx) => {
        proxyItemEffectiveFxMap.set(rowIdx, {
          customFx: meta.customFx,
          payer: exp.paidBy,
        });
      });
    }
  });

  shopping.forEach((sItem) => {
    const tags = parseRecipientTags(sItem.forWhom);
    const price = sItem.price || 0;

    tags.forEach((tag) => {
      const itemForeign = price * tag.quantity;
      const linkedExpenseFx = proxyItemEffectiveFxMap.get(sItem.rowIndex);
      const hasLinkedFx = !!(linkedExpenseFx && linkedExpenseFx.customFx);
      const itemTwd = hasLinkedFx
        ? Math.round(itemForeign * linkedExpenseFx.customFx!)
        : Math.round(computeTwdAmount(itemForeign, activeForeignCode, fxRate, activeForeignCode));

      if (tag.isProxy) {
        const personName = tag.name.trim();
        if (!personName) return;

        if (!proxyReceivables[personName]) {
          proxyReceivables[personName] = [];
        }

        proxyReceivables[personName].push({
          rowIndex: sItem.rowIndex,
          itemName: sItem.item,
          quantity: tag.quantity,
          unitPrice: price,
          totalForeign: itemForeign,
          totalTwd: itemTwd,
          isDone: !!sItem.isDone,
          hasLinkedFx,
          payer: linkedExpenseFx?.payer,
        });

        totalProxyForeign += itemForeign;
        totalProxyTwd += itemTwd;
        if (sItem.isDone) {
          purchasedProxyForeign += itemForeign;
          purchasedProxyTwd += itemTwd;
        }
      } else {
        personalShoppingPlannedTwd += itemTwd;
      }
    });
  });

  const hasProxyItems = Object.keys(proxyReceivables).length > 0;

  const handleCopyProxyMessage = (personName: string, items: ProxyReceivableItem[]) => {
    const purchasedItems = items.filter((i) => i.isDone);
    const targetItems = purchasedItems.length > 0 ? purchasedItems : items;
    const personForeignTotal = targetItems.reduce((s, i) => s + i.totalForeign, 0);
    const personTwdTotal = targetItems.reduce((s, i) => s + i.totalTwd, 0);

    const hasAnyLinked = targetItems.some((i) => i.hasLinkedFx);
    const lines = [
      `【代購請款明細 - ${personName}】`,
      ...targetItems.map(
        (i, idx) =>
          `${idx + 1}. ${i.itemName} ×${i.quantity} = ${i.totalForeign.toLocaleString()} ${activeForeignCode} (約 $${i.totalTwd.toLocaleString()} TWD${i.hasLinkedFx ? ' / 刷卡實質匯率' : ''})${i.isDone ? ' [已買✓]' : ' [待購]'}`
      ),
      `───────────────`,
      `合計應付：$${personTwdTotal.toLocaleString()} TWD (${personForeignTotal.toLocaleString()} ${activeForeignCode})${hasAnyLinked ? ' (含刷卡實質匯率結算)' : ''}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPerson(personName);
    setTimeout(() => setCopiedPerson(null), 2500);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const customTwdNum = parseFloat(customTwd) || 0;

  // 勾選的代購品項外幣加總
  const selectedProxyItems = availableProxyItems.filter((p) => selectedProxyRows.includes(p.rowIndex));
  const proxyForeignTotal = hasProxy ? selectedProxyItems.reduce((sum, p) => sum + p.totalForeign, 0) : 0;

  // 實質匯率 (若有折算台幣且有金額)
  const effectiveFx = customTwdNum > 0 && parsedAmount > 0 ? (customTwdNum / parsedAmount) : 0;

  // 代購折算台幣
  let proxyTwdTotal = 0;
  if (hasProxy && proxyForeignTotal > 0) {
    if (customTwdNum > 0 && parsedAmount > 0) {
      proxyTwdTotal = Math.round(proxyForeignTotal * effectiveFx);
    } else {
      proxyTwdTotal = Math.round(computeTwdAmount(proxyForeignTotal, currency, fxRate, activeForeignCode));
    }
  }

  // 帳單總換算台幣 (未扣除代購)
  const rawTotalTwd = customTwdNum > 0 ? customTwdNum : Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));

  // 自用真實外幣與台幣
  const realAmount = Math.max(0, Math.round((parsedAmount - proxyForeignTotal) * 100) / 100);
  const realTwd = Math.max(0, rawTotalTwd - proxyTwdTotal);

  const liveTwdEst = Math.round(computeTwdAmount(parsedAmount, currency, fxRate, activeForeignCode));

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !amount || parseFloat(amount) <= 0) return;

    // 驗證自用金額不可小於 0
    if (hasProxy && proxyForeignTotal > parsedAmount) {
      alert(`代購金額 ($${proxyForeignTotal}) 大於消費總額 ($${parsedAmount})，請確認勾選品項與金額。`);
      return;
    }

    let finalSplit = '均分';
    if (splitMode === 'equal') {
      finalSplit = '均分';
    } else if (splitMode === 'single') {
      finalSplit = selectedSingleMember;
    } else if (splitMode === 'exact') {
      // 實際指定金額分攤模式
      const activeAmounts = members
        .filter((m) => (parseFloat(memberAmounts[m]) || 0) > 0)
        .map((m) => `${m}:${parseFloat(memberAmounts[m]) || 0}`);

      if (activeAmounts.length === 0) {
        alert('請至少填寫一位成員的分攤金額');
        return;
      }
      finalSplit = activeAmounts.join(',');
    } else {
      // 權重/比例分攤模式
      const activeWeights = members.map((m) => `${m}:${memberWeights[m] || 1}`);
      const isAllOnes = members.every((m) => (memberWeights[m] || 1) === 1);
      if (isAllOnes) {
        finalSplit = '均分';
      } else {
        finalSplit = activeWeights.join(',');
      }
    }

    const finalNote = buildExpenseNote(note, {
      customTwd: customTwdNum > 0 ? customTwdNum : undefined,
      customFx: effectiveFx > 0 ? effectiveFx : undefined,
      proxyAmount: hasProxy && proxyForeignTotal > 0 ? proxyForeignTotal : undefined,
      proxyTwd: hasProxy && proxyTwdTotal > 0 ? proxyTwdTotal : undefined,
      realAmount: hasProxy && proxyForeignTotal > 0 ? realAmount : undefined,
      realTwd: hasProxy && proxyTwdTotal > 0 ? realTwd : undefined,
      proxyShoppingRows: hasProxy && selectedProxyRows.length > 0 ? selectedProxyRows : undefined,
    });

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        item: item.trim(),
        currency,
        amount: parsedAmount,
        paidBy,
        split: finalSplit,
        note: finalNote,
      });

      // 同步將勾選的代購品項標記為已買
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

      setItem('');
      setAmount('');
      setCustomTwd('');
      setHasProxy(false);
      setSelectedProxyRows([]);
      setMemberAmounts({});
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
              return (
                <div key={m} className="bg-white border border-slate-100 p-3 rounded-2xl text-center shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    {m} 應負擔
                  </span>
                  <span className="text-base font-mono font-black text-slate-900 mt-0.5 block truncate">
                    ${share.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Expense Form (Directly below Jo/Will breakdown) */}
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
                            key={p.rowIndex}
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

              {/* Split Mode Selector (4 Full-width Direct Tabs) */}
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

                {/* Conditional Sub-panel */}
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

            {/* Note Input */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="備註說明 (選填)..."
              className="w-full bg-slate-800 text-white text-xs px-3.5 py-2 rounded-xl outline-none focus:ring-1 focus:ring-amber-400 transition-all border border-slate-700 placeholder:text-slate-500"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm py-2.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? '新增中...' : '送出記帳'}</span>
            </button>
          </form>

          {/* Proxy Receivables Settlement Section (代購請款清冊 - 置於表單下方) */}
          {hasProxyItems && (
            <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-extrabold text-xs">
                  代購請款清冊
                </span>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-900 font-mono">
                    已買待收 ${purchasedProxyTwd.toLocaleString()}
                  </span>
                  {totalProxyTwd > purchasedProxyTwd && (
                    <span className="text-[10px] text-amber-600/80 font-bold block">
                      (預估共 ${totalProxyTwd.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(proxyReceivables).map(([personName, pItems]) => {
                  const purchasedList = pItems.filter((i) => i.isDone);
                  const personTwd = pItems.reduce((s, i) => s + i.totalTwd, 0);
                  const personPurchasedTwd = purchasedList.reduce((s, i) => s + i.totalTwd, 0);
                  const isCopied = copiedPerson === personName;

                  return (
                    <div key={personName} className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black text-slate-900">{personName}</span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                            {purchasedList.length}/{pItems.length} 已買
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black font-mono text-amber-950">
                            ${personPurchasedTwd.toLocaleString()} TWD
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyProxyMessage(personName, pItems)}
                            className={`p-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="複製此人請款明細（可直接貼至 LINE）"
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? '已複製' : '請款'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Items breakdown with click-to-edit unit price */}
                      <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                        {pItems.map((pItem, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className={`truncate flex-1 min-w-0 ${pItem.isDone ? 'text-slate-900 font-semibold' : 'text-slate-400 line-through'}`}>
                              {pItem.isDone ? '✓ ' : '⏳ '}{pItem.itemName} ×{pItem.quantity}
                            </span>

                            {editingRowIndex === pItem.rowIndex ? (
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const num = parseFloat(editPriceVal);
                                  if (!isNaN(num) && num >= 0 && onUpdateShoppingPrice) {
                                    await onUpdateShoppingPrice(pItem.rowIndex, num);
                                  }
                                  setEditingRowIndex(null);
                                }}
                                className="inline-flex items-center space-x-1 flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="number"
                                  autoFocus
                                  min="0"
                                  step="any"
                                  value={editPriceVal}
                                  onChange={(e) => setEditPriceVal(e.target.value)}
                                  onBlur={async () => {
                                    const num = parseFloat(editPriceVal);
                                    if (!isNaN(num) && num >= 0 && onUpdateShoppingPrice) {
                                      await onUpdateShoppingPrice(pItem.rowIndex, num);
                                    }
                                    setEditingRowIndex(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setEditingRowIndex(null);
                                  }}
                                  className="w-18 bg-amber-50 border border-amber-400 rounded px-1.5 py-0.5 text-xs font-mono font-black text-amber-950 outline-none shadow-2xs text-right"
                                />
                                <span className="text-[10px] text-slate-400">{activeForeignCode}</span>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRowIndex(pItem.rowIndex);
                                  setEditPriceVal(String(pItem.unitPrice || ''));
                                }}
                                className="font-mono text-slate-700 flex-shrink-0 text-[10px] hover:text-amber-950 hover:bg-amber-100/80 px-1.5 py-0.5 rounded transition-all cursor-pointer select-none"
                                title={pItem.hasLinkedFx ? '已同步刷卡實質匯率 (點擊可修改單價)' : '點擊直接修改實際單價'}
                              >
                                {pItem.totalForeign.toLocaleString()} {activeForeignCode} (約 ${pItem.totalTwd.toLocaleString()}{pItem.hasLinkedFx ? ' 💳' : ''})
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Category Breakdown & Expense History List */}
        <div className="md:col-span-7 space-y-4">
          {/* 類別 × 旅伴花費交叉統計透視表 (Category x Person Pivot Table) */}
          {sortedCategories.length > 0 && totalTWD > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                  className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
                >
                  <PieChart className="w-4 h-4 text-amber-500" />
                  <span>類別 × 旅伴花費統計</span>
                  {isMatrixOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60">
                  全旅程自用 NT$ {Math.round(totalTWD).toLocaleString()}
                </span>
              </div>

              {isMatrixOpen && (
                <div className="space-y-1.5">
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 no-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200/80">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap">消費類別</th>
                          {members.map((m) => {
                            const isColActive = selectedMemberFilter === m;
                            return (
                              <th
                                key={`th-${m}`}
                                onClick={() => setSelectedMemberFilter(isColActive ? null : m)}
                                className={`py-2.5 px-3 text-right font-mono whitespace-nowrap cursor-pointer transition-colors select-none ${
                                  isColActive
                                    ? 'bg-amber-100 text-amber-950 font-black ring-1 ring-amber-400'
                                    : 'text-slate-700 hover:text-amber-700 hover:bg-slate-100/70'
                                }`}
                                title={isColActive ? `點擊取消篩選 ${m}` : `點擊篩選 ${m} 的全部花費 (含獨享與分攤)`}
                              >
                                <div className="flex items-center justify-end space-x-1">
                                  <span>{m} 應負擔</span>
                                  {isColActive && (
                                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded">
                                      已選
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                          <th className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">類別總計</th>
                          <th className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">佔比</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sortedCategories.map((cat) => {
                          const catTotal = categoryTotals[cat] || 0;
                          const percentage = totalTWD > 0 ? ((catTotal / totalTWD) * 100).toFixed(1) : '0';
                          const isCatSelected = selectedCategoryFilter === cat;

                          return (
                            <tr
                              key={`tr-${cat}`}
                              className={`transition-colors select-none ${
                                isCatSelected
                                  ? 'bg-amber-50/90 font-bold text-slate-900'
                                  : 'hover:bg-slate-50/70 text-slate-700'
                              }`}
                            >
                              <td
                                onClick={() => setSelectedCategoryFilter(isCatSelected ? null : cat)}
                                className={`py-2.5 px-3 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer transition-colors ${
                                  isCatSelected ? 'text-amber-950 font-black' : 'hover:text-amber-700'
                                }`}
                                title={isCatSelected ? '點擊取消類別篩選' : '點擊篩選此類別明細'}
                              >
                                <span className="text-sm">{cat}</span>
                                <span className="font-bold">{CATEGORY_EMOJIS[cat] || '其他'}</span>
                                {isCatSelected && (
                                  <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded ml-1">
                                    篩選中
                                  </span>
                                )}
                              </td>
                              {members.map((m) => {
                                const mShare = Math.round(categoryPersonShares[cat]?.[m] || 0);
                                const isCellSelected = selectedCategoryFilter === cat && selectedMemberFilter === m;
                                const isColSelected = selectedMemberFilter === m;

                                return (
                                  <td
                                    key={`td-${cat}-${m}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCellSelected) {
                                        setSelectedCategoryFilter(null);
                                        setSelectedMemberFilter(null);
                                      } else {
                                        setSelectedCategoryFilter(cat);
                                        setSelectedMemberFilter(m);
                                      }
                                    }}
                                    className={`py-2.5 px-3 text-right font-mono whitespace-nowrap cursor-pointer transition-colors ${
                                      isCellSelected
                                        ? 'bg-amber-200/90 font-black text-amber-950 ring-2 ring-amber-400 shadow-2xs'
                                        : isColSelected
                                        ? 'bg-amber-100/70 font-bold text-amber-900'
                                        : isCatSelected
                                        ? 'bg-amber-50/40 text-slate-900'
                                        : 'hover:bg-amber-50/60 text-slate-700'
                                    }`}
                                    title={
                                      isCellSelected
                                        ? '點擊取消篩選'
                                        : `點擊鎖定篩選【${m}】在【${CATEGORY_EMOJIS[cat] || cat}】的花費`
                                    }
                                  >
                                    ${mShare.toLocaleString()}
                                  </td>
                                );
                              })}
                              <td
                                onClick={() => setSelectedCategoryFilter(isCatSelected ? null : cat)}
                                className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap cursor-pointer"
                                title={isCatSelected ? '點擊取消類別篩選' : '點擊篩選此類別明細'}
                              >
                                ${Math.round(catTotal).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                                {percentage}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-amber-50/60 font-black border-t-2 border-amber-200/80 text-slate-900">
                        <tr>
                          <td className="py-2.5 px-3 whitespace-nowrap">個人總花費</td>
                          {members.map((m) => {
                            const isColActive = selectedMemberFilter === m;
                            return (
                              <td
                                key={`tf-${m}`}
                                onClick={() => setSelectedMemberFilter(isColActive ? null : m)}
                                className={`py-2.5 px-3 text-right font-mono whitespace-nowrap cursor-pointer transition-colors ${
                                  isColActive
                                    ? 'bg-amber-200 text-amber-950 font-black ring-1 ring-amber-400'
                                    : 'text-amber-900 hover:bg-amber-100/70'
                                }`}
                                title={isColActive ? `點擊取消篩選 ${m}` : `點擊篩選 ${m} 的全部花費 (含獨享與分攤)`}
                              >
                                ${Math.round(shareTWD[m] || 0).toLocaleString()}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-right font-mono text-amber-950 font-black whitespace-nowrap">
                            ${Math.round(totalTWD).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-700 whitespace-nowrap">
                            100%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 text-right pr-1 select-none">
                    💡 點擊類別列篩選類別 · 點擊成員標題篩選個人 · 點擊金額儲存格精確篩選
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Filter Banner */}
          {(selectedCategoryFilter || selectedMemberFilter) && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center flex-wrap gap-1.5 font-bold text-amber-900">
                <span className="text-amber-700 font-medium">正在篩選：</span>
                {selectedMemberFilter && (
                  <span className="bg-amber-400/25 text-amber-950 px-2 py-0.5 rounded-md border border-amber-400/40 flex items-center space-x-1">
                    <span>👤 {selectedMemberFilter} 的個人花費</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemberFilter(null);
                      }}
                      className="ml-1 text-amber-700 hover:text-amber-950 font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedCategoryFilter && (
                  <span className="bg-amber-400/25 text-amber-950 px-2 py-0.5 rounded-md border border-amber-400/40 flex items-center space-x-1">
                    <span>{selectedCategoryFilter}</span>
                    <span>{CATEGORY_EMOJIS[selectedCategoryFilter] || '其他'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategoryFilter(null);
                      }}
                      className="ml-1 text-amber-700 hover:text-amber-950 font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="text-amber-700 font-normal">
                  （共 {filteredExpenses.length} 筆，
                  {selectedMemberFilter ? `${selectedMemberFilter} 應負擔` : '小計'} NT$ {filteredSubtotalTwd.toLocaleString()}）
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter(null);
                  setSelectedMemberFilter(null);
                }}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100/80 transition-all cursor-pointer whitespace-nowrap ml-2 flex-shrink-0"
              >
                清除全部 ×
              </button>
            </div>
          )}

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-between">
            <span>費用明細 (共 {filteredExpenses.length} 筆)</span>
            <span className="font-mono text-slate-600">
              {selectedCategoryFilter || selectedMemberFilter
                ? `篩選小計: $${filteredSubtotalTwd.toLocaleString()} TWD`
                : `總計: $${Math.round(totalTWD).toLocaleString()} TWD`}
            </span>
          </h3>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              {selectedCategoryFilter ? '該類別尚無記帳紀錄 💵' : '目前無記帳紀錄 💵'}
            </div>
          )}

          <div className="space-y-2">
            {filteredExpenses.map((exp) => {
              const isSettlement = exp.item && exp.item.includes('系統結清');
              const amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
              const expCurr = (exp.currency || activeForeignCode).toUpperCase();
              const meta = parseExpenseMeta(exp.note);
              const amtTWD = Math.round(computeTwdAmount(amt, expCurr, fxRate, activeForeignCode));

              return (
                <div
                  key={exp.rowIndex}
                  onClick={() => {
                    if (onOpenModal && !isSettlement) {
                      onOpenModal(exp);
                    }
                  }}
                  className={`border rounded-2xl p-4 flex items-center justify-between transition-all ${
                    isSettlement
                      ? 'bg-amber-50/60 border-amber-200/80'
                      : 'bg-white border-slate-100 shadow-2xs hover:shadow-xs hover:border-slate-200 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                    <span className="text-2xl select-none flex-shrink-0">
                      {exp.category || '🍔'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">
                          {exp.item}
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {exp.paidBy || members[0]} 付 ({formatSplitLabel(exp.split, members)})
                        </span>
                        {meta.customTwd !== undefined && (
                          <span className="text-[10px] font-black font-mono bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.2 rounded whitespace-nowrap">
                            💳 刷卡 NT${meta.customTwd.toLocaleString()}
                          </span>
                        )}
                        {meta.proxyTwd !== undefined && (
                          <span className="text-[10px] font-black font-mono bg-purple-50 text-purple-700 border border-purple-200/80 px-1.5 py-0.2 rounded whitespace-nowrap">
                            🛍️ 代墊 NT${meta.proxyTwd.toLocaleString()}
                          </span>
                        )}
                        {selectedMemberFilter && (
                          (() => {
                            const rawBill = meta.customTwd || computeTwdAmount(amt, expCurr, fxRate, activeForeignCode);
                            const realTrip = meta.realTwd !== undefined ? meta.realTwd : rawBill;
                            const splitTarget = exp.split ? exp.split.trim() : '均分';
                            const weights = parseSplitWeights(splitTarget, members);
                            const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
                            const mWeight = weights[selectedMemberFilter] || 0;
                            const mShare = totalW > 0 ? realTrip * (mWeight / totalW) : 0;
                            const isSole = mWeight > 0 && mWeight === totalW;

                            if (mShare <= 0) return null;

                            return (
                              <span className="text-[10px] font-black font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded whitespace-nowrap">
                                👤 {selectedMemberFilter} {isSole ? '獨自負擔' : '應負擔'} NT${Math.round(mShare).toLocaleString()}
                              </span>
                            );
                          })()
                        )}
                      </div>
                      {meta.cleanNote && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{meta.cleanNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Amount & Delete */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-slate-900">
                        ${amt.toLocaleString()} {expCurr}
                      </div>
                      {expCurr !== 'TWD' ? (
                        <div className="text-[10px] font-bold font-mono text-slate-400">
                          {meta.realTwd !== undefined
                            ? `自用實質 NT$${meta.realTwd.toLocaleString()}`
                            : meta.customTwd !== undefined
                            ? `折算 NT$${meta.customTwd.toLocaleString()}`
                            : `≈ $${amtTWD.toLocaleString()} TWD`}
                        </div>
                      ) : meta.realTwd !== undefined ? (
                        <div className="text-[10px] font-bold font-mono text-slate-400">
                          自用 NT${meta.realTwd.toLocaleString()}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`確定要刪除「${exp.item}」這筆記帳嗎？`)) {
                          onDeleteExpense(exp.rowIndex, exp.id);
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
