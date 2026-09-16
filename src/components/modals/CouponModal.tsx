'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CouponItem } from '@/types/trip';
import { X, Trash2, Upload, Ticket, Sparkles, Calendar, FileText, Check } from 'lucide-react';

interface CouponModalProps {
  isOpen: boolean;
  coupon?: CouponItem | null;
  existingStores?: string[];
  onClose: () => void;
  onSave: (couponData: Partial<CouponItem>) => Promise<void>;
  onDelete?: (couponId: string) => Promise<void>;
}

const DEFAULT_STORE_PRESETS = ['BicCamera', '唐吉訶德', '松本清', '大國藥妝', 'Sundrug', '機場免稅店', 'Uniqlo', 'Loft'];
const DISCOUNT_PRESETS = ['免稅 10% + 7%', '免稅 10% + 5%', '現折 5%', '現折 7%', '滿額折抵', '95折'];

export function compressCouponImage(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const CouponModal: React.FC<CouponModalProps> = ({
  isOpen,
  coupon,
  existingStores = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [store, setStore] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [note, setNote] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [inputUrl, setInputUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 店家推薦清單 (合併既有與預設)
  const storeOptions = Array.from(
    new Set([...existingStores.filter(Boolean), ...DEFAULT_STORE_PRESETS])
  );

  useEffect(() => {
    if (coupon) {
      setTitle(coupon.title || '');
      setStore(coupon.store || '');
      setDiscount(coupon.discount || '');
      setExpiryDate(coupon.expiryDate || '');
      setImageUrl(coupon.imageUrl || '');
      setNote(coupon.note || '');
      if (coupon.imageUrl?.startsWith('http')) {
        setImageMode('url');
        setInputUrl(coupon.imageUrl);
      } else {
        setImageMode('upload');
        setInputUrl('');
      }
    } else {
      setTitle('');
      setStore('');
      setDiscount('');
      setExpiryDate('');
      setImageUrl('');
      setNote('');
      setImageMode('upload');
      setInputUrl('');
    }
  }, [coupon, isOpen]);

  // 支援全域剪貼簿貼上 (Ctrl+V / Cmd+V) 截圖
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setIsCompressing(true);
            try {
              const compressed = await compressCouponImage(file);
              setImageUrl(compressed);
              setImageMode('upload');
            } catch (err) {
              console.error('Failed to compress pasted image:', err);
            } finally {
              setIsCompressing(false);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressCouponImage(file);
      setImageUrl(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (inputUrl.trim()) {
      setImageUrl(inputUrl.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: coupon?.id,
        title: title.trim(),
        store: store.trim() || undefined,
        discount: discount.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        imageUrl: imageUrl.trim(),
        note: note.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!coupon?.id || !onDelete) return;
    if (!confirm('確定要刪除這張優惠券 / 票券嗎？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(coupon.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {coupon ? '編輯優惠券' : '新增優惠券'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">支援截圖與條碼，結帳可全螢幕出示</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload / URL Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <span>圖片 / 條碼</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    imageMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  上傳 / 貼上
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    imageMode === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  圖片網址
                </button>
              </div>
            </div>

            {imageMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="relative group border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-3 flex items-center space-x-4">
                    {/* eslint-disable-next-next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Coupon preview"
                      className="w-20 h-20 object-contain bg-white rounded-xl border border-slate-200 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>圖片已就緒</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">支援離線出示</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
                        >
                          更換
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          清除
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 group-hover:scale-105 transition-transform flex items-center justify-center">
                      {isCompressing ? (
                        <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">
                        {isCompressing ? '壓縮圖片中...' : '選擇圖片或截圖'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        支援相簿截圖或直接貼上 (Ctrl+V)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://example.com/coupon.jpg"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer flex-shrink-0 shadow-xs"
                  >
                    套用
                  </button>
                </div>
                {imageUrl && (
                  <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {/* eslint-disable-next-next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="w-12 h-12 object-contain rounded-lg bg-white border border-slate-200" />
                    <span className="text-xs text-slate-600 truncate flex-1 font-mono">{imageUrl}</span>
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setInputUrl(''); }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1 mb-1">
              <span>名稱</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例：BicCamera 免稅 10% + 7% 折價券"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300"
            />
          </div>

          {/* Store Selector & Presets */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">店家</label>
            <input
              type="text"
              placeholder="例：BicCamera 或 唐吉訶德"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300 mb-2"
            />
            {storeOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {storeOptions.slice(0, 8).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStore(preset)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      store === preset
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discount Highlight & Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>折扣</span>
              </label>
              <input
                type="text"
                placeholder="例：免稅 10% + 7%"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300 mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {DISCOUNT_PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscount(p)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>效期</span>
              </label>
              <input
                type="text"
                placeholder="例：2026/12/31 或 長期有效"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>使用條件與備註</span>
            </label>
            <textarea
              rows={2}
              placeholder="例：結帳前須出示護照，酒類與任天堂遊戲機不適用..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300 leading-relaxed resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {coupon?.id && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="刪除優惠券"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !imageUrl.trim()}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>儲存票券</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
