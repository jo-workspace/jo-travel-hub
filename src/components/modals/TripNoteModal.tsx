'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, FileText, Check } from 'lucide-react';

interface TripNoteModalProps {
  isOpen: boolean;
  initialNote: string;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}

export const TripNoteModal: React.FC<TripNoteModalProps> = ({
  isOpen,
  initialNote = '',
  onClose,
  onSave,
}) => {
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(note.trim());
      onClose();
    } catch (err) {
      console.error('儲存重要備註失敗:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📢</span>
            <h3 className="text-base font-extrabold text-slate-900">
              編輯重要備註
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">
              備註內容 / 須知公告
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={"例：\n**8/30 李政厚搖頭娃娃日 (1:05 PM)**\n[野火空氣品質](https://fire.airnow.gov)\n[加州即時路況](https://quickmap.dot.ca.gov)"}
              rows={6}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 text-[16px] sm:text-sm px-3.5 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium resize-none leading-relaxed"
              autoFocus
            />
          </div>

          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1">
              <span>💡</span>
              <span>排版小技巧</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              • 重點標註使用 <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold">**文字**</code> 可突顯粗體黃字。<br />
              • 實用網址使用 <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold">[名稱](網址)</code> 可自動生成快速開啟按鈕。
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>儲存中...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>儲存備註</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
