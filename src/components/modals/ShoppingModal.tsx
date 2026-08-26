'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '@/types/trip';
import { parseRecipientTags, serializeRecipientTags, RecipientTag } from '@/components/tabs/ShoppingTab';
import { X, Trash2, Plus, User, HandCoins } from 'lucide-react';

interface ShoppingModalProps {
  isOpen: boolean;
  item?: ShoppingItem | null;
  defaultStore?: string;
  defaultForWhom?: string;
  existingStores?: string[];
  companionsList?: string[];
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
}

export const ShoppingModal: React.FC<ShoppingModalProps> = ({
  isOpen,
  item,
  defaultStore = '',
  defaultForWhom = 'Jo',
  existingStores = [],
  companionsList = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [store, setStore] = useState('');
  const [recipientTags, setRecipientTags] = useState<RecipientTag[]>([{ name: 'Jo', isProxy: false, quantity: 1 }]);
  const [customPerson, setCustomPerson] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當前旅程店家清單（去重）
  const storePresets = Array.from(
    new Set(existingStores.map((s) => s.trim()).filter(Boolean))
  );

  // 當前旅程同行人員 / 曾買對象清單（去重）
  const personPresets = Array.from(
    new Set([...companionsList.map((p) => p.trim()).filter(Boolean), 'Jo', 'Will', '媽媽', '小明'].filter(Boolean))
  );

  useEffect(() => {
    if (item) {
      setStore(item.store || '');
      setRecipientTags(parseRecipientTags(item.forWhom || defaultForWhom || 'Jo'));
      setItemName(item.item || '');
      setPrice(item.price ? String(item.price) : '');
      setImage(item.image || '');
      setUrl(item.url || '');
      setNote(item.note || '');
    } else {
      setStore(defaultStore || '');
      setRecipientTags(parseRecipientTags(defaultForWhom || 'Jo'));
      setItemName('');
      setPrice('');
      setImage('');
      setUrl('');
      setNote('');
    }
  }, [item, isOpen, defaultStore, defaultForWhom]);

  if (!isOpen) return null;

  const totalQuantity = recipientTags.reduce((sum, t) => sum + t.quantity, 0) || 1;

  const handleAddPerson = (name: string, isProxy = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRecipientTags((prev) => {
      const existingIdx = prev.findIndex((t) => t.name === trimmed);
      if (existingIdx !== -1) {
        // 若已存在，增加數量 1
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, { name: trimmed, isProxy, quantity: 1 }];
    });
    setCustomPerson('');
  };

  const handleToggleProxy = (index: number) => {
    setRecipientTags((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isProxy: !updated[index].isProxy };
      return updated;
    });
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setRecipientTags((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const handleRemoveTag = (index: number) => {
    setRecipientTags((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const finalForWhom = serializeRecipientTags(recipientTags.length > 0 ? recipientTags : [{ name: 'Jo', isProxy: false, quantity: 1 }]);

    setIsSubmitting(true);
    try {
      await onSave({
        rowIndex: item?.rowIndex || 0,
        store: store.trim(),
        forWhom: finalForWhom,
        item: itemName.trim(),
        quantity: String(totalQuantity),
        price: price.trim(),
        purchaseStatus: item?.purchaseStatus || (item?.isDone ? 'purchased' : 'pending'),
        image: image.trim(),
        url: url.trim(),
        note: note.trim(),
        isDone: item?.isDone || false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.rowIndex || item.rowIndex <= 1) return;
    if (!confirm('確定要刪除此購物項目嗎？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(item.rowIndex);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {item ? '編輯購物項目' : '新增購物項目'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Store Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">購買地點/店家</label>
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="輸入或點選下方店家..."
              required
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold mb-1.5"
            />
            {storePresets.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5">
                {storePresets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStore(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                      store === s
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Recipient Tag Manager */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>購買對象 (可多人 / 點擊 🤝 切換代購)</span>
              </label>
              <span className="text-[11px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/70">
                總數量：<strong className="text-slate-900 font-mono text-xs">{totalQuantity}</strong>
              </span>
            </div>

            {/* Selected Recipient Pills */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
              {recipientTags.length === 0 && (
                <span className="text-xs text-slate-400">尚未選擇對象（點擊下方加入）</span>
              )}
              {recipientTags.map((tag, idx) => (
                <div
                  key={`${tag.name}-${idx}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                    tag.isProxy
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                >
                  {/* Toggle Proxy Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleProxy(idx)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer select-none flex items-center space-x-0.5 ${
                      tag.isProxy
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={tag.isProxy ? '點擊切換為自用/伴手禮' : '點擊標記為幫人代購'}
                  >
                    <span>🤝</span>
                    <span>{tag.isProxy ? '代購' : '自用'}</span>
                  </button>

                  <span className="font-bold">{tag.name}</span>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-0.5 bg-slate-200/60 rounded px-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(idx, -1)}
                      className="text-slate-600 hover:text-slate-900 font-mono text-xs px-0.5 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-extrabold px-0.5">{tag.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(idx, 1)}
                      className="text-slate-600 hover:text-slate-900 font-mono text-xs px-0.5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Add Companion Pills & Custom Input */}
            <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">快速加入：</span>
              {personPresets.map((p) => {
                const isSelected = recipientTags.some((t) => t.name === p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleAddPerson(p)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer select-none font-bold ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + {p}
                  </button>
                );
              })}

              {/* Custom Person Input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customPerson}
                  onChange={(e) => setCustomPerson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPerson(customPerson);
                    }
                  }}
                  placeholder="+ 自訂對象名..."
                  className="bg-white border border-slate-200 text-xs px-2 py-0.5 rounded-lg outline-none w-24 focus:w-32 focus:ring-1 focus:ring-slate-900 transition-all"
                />
                {customPerson.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddPerson(customPerson)}
                    className="p-1 bg-slate-900 text-white rounded-lg text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Item Name & Single Price */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">商品名稱</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="想要購買的商品..."
                required
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">單價</label>
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="例如 5000"
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">圖片 URL</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/item.jpg"
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">商品參考連結 URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.target.com/..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">備註</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="規格、顏色或代購細節..."
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

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
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '處理中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
