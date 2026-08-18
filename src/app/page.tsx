'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TripConfig } from '@/config/trips';
import { getTripsList, createTrip } from '@/lib/supabase-client';
import { Compass, ArrowRight, Plus, MapPin, X, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [tripList, setTripList] = useState<TripConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTrips = async () => {
    try {
      const trips = await getTripsList();
      setTripList(trips);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const id = `trip-${Date.now().toString(36)}`;
      await createTrip({
        id,
        title: title.trim(),
        dates: dates.trim() || '2026',
        description: description.trim() || '個人精彩隨身旅程',
        badgeText: '籌備中',
        coverGradient: 'from-indigo-600 to-purple-800',
      });
      setTitle('');
      setDates('');
      setDescription('');
      setIsModalOpen(false);
      await loadTrips();
    } catch (err) {
      alert('建立失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-amber-400 selection:text-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-white text-slate-950 font-black text-lg flex items-center justify-center shadow-md p-1">
              <img src="/hub-logo.png" alt="Jo Travel Hub" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                Jo Travel Hub
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增旅程</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Trip Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tripList.map((trip) => (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="group bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 transition-all duration-300 hover:border-amber-400/80 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-900/90 text-amber-400 border border-amber-400/20 font-mono">
                    {trip.dates || '2026'}
                  </span>
                  <span className="text-xs font-bold text-slate-300 bg-slate-700/60 px-2.5 py-0.5 rounded-full">
                    {trip.badgeText || '進行中'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                    <span>{trip.title}</span>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </h3>
                  {trip.description && (
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {trip.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-700/50 mt-6 flex items-center justify-between text-xs text-slate-400 font-semibold relative z-10">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>進入專屬助理</span>
                </span>
                <span className="text-amber-400 font-extrabold group-hover:underline">
                  開啟網頁 →
                </span>
              </div>
            </Link>
          ))}

          {/* Card: Add Trip Action */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900/40 border border-dashed border-slate-700/80 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-amber-400/60 transition-all text-left group cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 group-hover:bg-amber-400/20 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-white group-hover:text-amber-400 transition-all">
                建立新旅程
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                點擊一鍵開立全新旅程！免去繁瑣的 Google Sheet 腳本與 API 部署。
              </p>
            </div>
          </button>
        </div>
      </main>

      {/* Add Trip Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>開啟全新旅程</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  旅程名稱 *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：2026 東京賞櫻自駕遊"
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  預計月份 / 日期
                </label>
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="例如：2026/04"
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  旅程簡述
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="寫下簡短的旅程主題或備註..."
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? '建立中...' : '確認建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-medium">
        Jo Travel Hub &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}

