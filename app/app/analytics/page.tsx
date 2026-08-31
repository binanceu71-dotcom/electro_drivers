'use client';

import React, { useState } from 'react';
import { 
  BarChart3, Zap, TrendingUp, Award, Leaf, 
  Calendar, ArrowUpRight, ShieldCheck, Download
} from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function AnalyticsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'year'>('7d');

  const hourlyData = [
    { hour: '00:00', load: 45, kwh: 120 },
    { hour: '04:00', load: 80, kwh: 260 }, // Night depot charge
    { hour: '08:00', load: 160, kwh: 480 },
    { hour: '12:00', load: 240, kwh: 720 },
    { hour: '16:00', load: 310, kwh: 940 }, // Peak
    { hour: '20:00', load: 220, kwh: 680 },
  ];

  const driverLeaderboard = [
    { rank: 1, name: 'Дмитрий Ковалев', telegram: '@cyber_driver_77', efficiency: '14.8 kWh/100km', score: 98, car: 'Zeekr 001' },
    { rank: 2, name: 'Артем Савельев', telegram: '@artem_speed', efficiency: '15.2 kWh/100km', score: 95, car: 'Tesla Model Y' },
    { rank: 3, name: 'Константин Белов', telegram: '@k_belov', efficiency: '15.9 kWh/100km', score: 92, car: 'Li Auto L9' },
    { rank: 4, name: 'Ольга Васильева', telegram: '@olga_ev', efficiency: '16.4 kWh/100km', score: 89, car: 'Voyah Free' },
  ];

  const handleExportReport = () => {
    toast.success('Отчет сформирован', 'Файл analytics_report_electrodrivers.csv скачан');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>SAAS МОДУЛЬ АНАЛИТИКИ & KPI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Аналитика энергопотребления и флота
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Сводные метрики эффективности, пиковые нагрузки зарядных хабов и рейтинг водителей
          </p>
        </div>

        {/* Period filter + Export */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
            {[
              { id: 'today', label: 'Сегодня' },
              { id: '7d', label: '7 дней' },
              { id: '30d', label: '30 дней' },
              { id: 'year', label: '2026 год' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  period === p.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white"
            title="Экспорт отчета"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Суммарный объем зарядки</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-100 font-mono">
            42,850 <span className="text-xs font-normal text-slate-400">кВт·ч</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% по сравнению с прошлым периодом</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Пройденная дистанция</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-100 font-mono">
            218,400 <span className="text-xs font-normal text-slate-400">км</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+8.7% пробега</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Средний расход парка</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            15.4 <span className="text-xs font-normal text-slate-400">кВт·ч / 100 км</span>
          </div>
          <div className="text-[11px] text-cyan-400">
            Высокая энергоэффективность
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span>Экологический эффект (CO2)</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono">
            -28.6 <span className="text-xs font-normal text-emerald-400/80">тонн CO2</span>
          </div>
          <div className="text-[11px] text-emerald-400">
            Предотвращено выбросов
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Load Curve Chart (8 cols) */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Суточный профиль потребления мощности (кВт)
              </h2>
              <p className="text-xs text-slate-400">
                Пики нагрузки сети и ночные сессии депо
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Мощность (kW)
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-3 pt-8 pb-2 border-b border-white/10">
            {hourlyData.map((d, i) => {
              const heightPercent = Math.round((d.load / 350) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.load} kW
                  </div>
                  <div
                    className="w-full max-w-[48px] bg-gradient-to-t from-cyan-500/40 via-blue-500 to-indigo-500 rounded-t-lg group-hover:brightness-125 transition-all relative overflow-hidden"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-300" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {d.hour}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Максимальный пик: 16:30 (310 кВт)</span>
            <span>Оптимальное окно ночной зарядки: 01:00 - 05:00 (Тариф 1/3)</span>
          </div>
        </div>

        {/* Driver Efficiency Leaderboard (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Лидеры эффективности</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {driverLeaderboard.map(d => (
              <div
                key={d.rank}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg font-bold text-[11px] flex items-center justify-center font-mono ${
                    d.rank === 1 ? 'bg-amber-500 text-slate-950 font-extrabold' :
                    d.rank === 2 ? 'bg-slate-300 text-slate-950' :
                    d.rank === 3 ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{d.rank}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{d.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{d.car}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-slate-200 font-bold">{d.efficiency}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">{d.score} pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
