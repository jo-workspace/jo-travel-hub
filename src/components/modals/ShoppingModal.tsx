'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '@/types/trip';
import { X, Trash2 } from 'lucide-react';

interface ShoppingModalProps {
  isOpen: boolean;
  item?: ShoppingItem | null;
  defaultStore?: string;
  defaultForWhom?: string;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
}

export const ShoppingModal: React.FC<ShoppingModalProps> = ({
  isOpen,
  item,
  defaultStore = '',
  defaultForWhom = 'Jo',
  onClose,
  onSave,
  onDelete,
}) => {
  const [store, setStore] = useState('');
  const [forWhom, setForWhom] = useState('Jo');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setStore(item.store || '');
      setForWhom(item.forWhom || 'Jo');
      setItemName(item.item || '');
      setQuantity(item.quantity || '1');
      setPrice(item.price ? String(item.price) : '');
      setImage(item.image || '');
      setUrl(item.url || '');
      setNote(item.note || '');
    } else {
      setStore(defaultStore || '');
      setForWhom(defaultForWhom || 'Jo');
      setItemName('');
      setQuantity('1');
      setPrice('');
      setImage('');
      setUrl('');
      setNote('');
    }
  }, [item, isOpen, defaultStore, defaultForWhom]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        rowIndex: item?.rowIndex || 0,
        store: store.trim(),
        forWhom: forWhom.trim(),
        item: itemName.trim(),
        quantity: quantity.trim(),
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
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">購買地點/店家</label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="如 Walmart, Target"
                required
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">幫誰買 / 對象</label>
              <input
                type="text"
                value={forWhom}
                onChange={(e) => setForWhom(e.target.value)}
                placeholder="如 Jo, Will, 特特"
                required
                className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">價格</label>
            <input
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例如 19.99"
              className="w-full bg-slate-50 border border-slate-200 text-sm px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-semibold"
            />
          </div>

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
              <label className="block text-xs font-bold text-slate-500 mb-1">數量</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="如 1, 2"
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
