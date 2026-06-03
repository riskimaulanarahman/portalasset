import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, ArrowLeftRight, Layers,
  Database, TrendingUp, Activity, Clock, BarChart3,
  Download, Upload, Box, MapPin, Play,
} from 'lucide-react';
import api from '../api/axios';
import StatsCard from '../components/ui/StatsCard';
import Badge, { txTypeBadge, statusBadge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { formatDate, formatNumber, truncate, getStoredUser } from '../lib/utils';
import useTitle from '../hooks/useTitle';

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface TransferStats {
  total:     number;
  pending:   number;
  approved:  number;
  rejected:  number;
  cancelled: number;
  recent: {
    id: number;
    transfer_code: string;
    status: string;
    transfer_date: string;
    from_estate?: { estate: string };
    to_estate?:   { estate: string };
  }[];
}

interface DashboardStats {
  total_assets:          number;
  active_assets:         number;
  total_materials:       number;
  total_transactions:    number;
  total_sections:        number;
  total_estates:         number;
  recent_transactions:   Transaction[];
  recent_assets:         Asset[];
  stock_alerts:          StockAlert[];
  transfer_stats?:       TransferStats;  // #20 FIX
}

interface Transaction {
  id:       number;
  date:     string;
  type:     'IN' | 'OUT';
  material?: { nama?: string };
  code:     string;
  qty:      number;
  section:  string;
  nama2:    string;
}

interface Asset {
  reg_id:     string;
  type:       string;
  manufacture:string;
  series:     string;
  alokasi:    string;
  not_active: boolean;
}

interface StockAlert {
  code:       string;
  nama:       string;
  stok:       number;
  unit:       string;
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
const MiniBar: React.FC<{ value: number; max: number; color?: string }> = ({
  value, max, color = 'bg-forest-500'
}) => (
  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }}
    />
  </div>
);

// ── Activity timeline dot ──────────────────────────────────────────────────────
const TimelineDot: React.FC<{ type: 'IN' | 'OUT' }> = ({ type }) => (
  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${type === 'IN' ? 'bg-emerald-500' : 'bg-red-400'}`} />
);

// ── Dashboard Page ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  useTitle('Dashboard');
  const [tab, setTab] = useState('overview');

  const currentUser = getStoredUser();
  const estateName  = currentUser?.estate?.estate ?? '—';
  const estateCode  = currentUser?.estate?.estate_id ?? '';

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const { data: materialsData } = useQuery<{ data: StockAlert[] }>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data;
    },
  });

  const topMaterials = (materialsData?.data ?? []).slice(0, 5).map((m: any) => ({
    ...m,
    stok: m.stock !== undefined ? m.stock : m.stok,
    unitName: typeof m.unit === 'string' ? m.unit : (m.unit?.nama || '')
  }));
  const maxStock     = Math.max(...topMaterials.map((m) => m.stok || 0), 1);

  const recent     = stats?.recent_transactions ?? [];
  const recentAssets = stats?.recent_assets ?? [];
  const alerts     = stats?.stock_alerts ?? [];

  // ── Derived stats ────────────────────────────────────────────────────────────
  const inCount  = recent.filter((t) => t.type === 'IN').length;
  const outCount = recent.filter((t) => t.type === 'OUT').length;
  const utilRate = stats
    ? Math.round((stats.active_assets / (stats.total_assets || 1)) * 100)
    : 0;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Dashboard</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Industrial Forest Asset Overview — Updated {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl border border-emerald-100 shadow-sm shrink-0">
          <Activity className="h-4 w-4 text-emerald-500" />
          Live Data
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="My Estate"
          value={estateName}
          subtitle={estateCode}
          icon={<MapPin className="h-4 w-4" />}
          accent="green"
          loading={false}
          className="animate-fade-in"
        />
        <StatsCard
          title="Total Assets"
          value={isLoading ? '—' : formatNumber(stats?.total_assets ?? 0)}
          subtitle={`${stats?.active_assets ?? 0} active`}
          icon={<Package className="h-4 w-4" />}
          accent="teal"
          trend={2.4}
          trendLabel="vs last month"
          loading={isLoading}
          className="animate-fade-in delay-75"
        />
        <StatsCard
          title="Transactions"
          value={isLoading ? '—' : formatNumber(stats?.total_transactions ?? 0)}
          subtitle={`${inCount} IN · ${outCount} OUT`}
          icon={<ArrowLeftRight className="h-4 w-4" />}
          accent="wood"
          trend={11}
          trendLabel="this month"
          loading={isLoading}
          className="animate-fade-in delay-100"
        />
        <StatsCard
          title="Materials"
          value={isLoading ? '—' : formatNumber(stats?.total_materials ?? 0)}
          subtitle="inventory items"
          icon={<Box className="h-4 w-4" />}
          accent="blue"
          trend={-3}
          trendLabel="vs last month"
          loading={isLoading}
          className="animate-fade-in delay-150"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList>
          <TabsTrigger value="overview"      icon={<BarChart3   className="h-3.5 w-3.5" />}>Overview</TabsTrigger>
          <TabsTrigger value="transactions"  icon={<ArrowLeftRight className="h-3.5 w-3.5" />}>Recent Transactions</TabsTrigger>
          <TabsTrigger value="assets"        icon={<Package     className="h-3.5 w-3.5" />}>Recent Assets</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Asset utilisation */}
            <div className="card p-6 space-y-4 lg:col-span-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-forest-800">Asset Utilisation</h3>
                <span className="text-2xl font-black text-forest-900">{utilRate}%</span>
              </div>

              {/* Donut-like visual */}
              <div className="relative flex items-center justify-center py-4">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e8f2f1" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke="#0d7171" strokeWidth="4"
                    strokeDasharray={`${(utilRate / 100) * 87.96} 87.96`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xl font-black text-forest-900">{utilRate}%</p>
                  <p className="text-[10px] text-forest-500 font-semibold">UTILISED</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-forest-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-forest-600" />
                    Active
                  </span>
                  <span className="font-bold text-forest-900">{stats?.active_assets ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-red-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Inactive
                  </span>
                  <span className="font-bold text-forest-900">
                    {(stats?.total_assets ?? 0) - (stats?.active_assets ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top materials stock */}
            <div className="card p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-forest-800">Top Material Stock</h3>
                <Badge variant="forest">Inventory</Badge>
              </div>
              {topMaterials.length === 0 ? (
                <p className="text-xs text-forest-400 italic text-center py-6">No material data</p>
              ) : (
                <div className="space-y-3">
                  {topMaterials.map((m, i) => (
                    <div key={m.code} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-forest-400 font-mono w-4 shrink-0">{i + 1}.</span>
                          <span className="font-semibold text-forest-800 truncate">{m.nama}</span>
                          <span className="font-mono text-forest-400 shrink-0 hidden sm:block">[{m.code}]</span>
                        </div>
                        <span className="font-bold text-forest-900 shrink-0 ml-2">
                          {formatNumber(m.stok)} <span className="text-forest-500 font-normal">{m.unitName}</span>
                        </span>
                      </div>
                      <MiniBar
                        value={m.stok}
                        max={maxStock}
                        color={m.stok < 10 ? 'bg-red-400' : m.stok < 50 ? 'bg-amber-400' : 'bg-forest-500'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity timeline */}
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-forest-800">Activity Timeline</h3>
                <div className="flex items-center gap-3 text-xs text-forest-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />IN</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />OUT</span>
                </div>
              </div>
              {recent.length === 0 ? (
                <p className="text-xs text-forest-400 italic text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {recent.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3">
                      <TimelineDot type={tx.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-forest-800 truncate">
                            {tx.material?.nama ?? tx.code}
                          </p>
                          {txTypeBadge(tx.type)}
                        </div>
                        <p className="text-[11px] text-forest-500 mt-0.5">
                          <span className="font-medium">{tx.type === 'IN' ? '+' : '-'}{tx.qty}</span>
                          {' · '}
                          {tx.section}
                          {tx.nama2 && ` · ${truncate(tx.nama2, 20)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-forest-400 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDate(tx.date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats box */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold text-forest-800">Quick Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Sections', val: stats?.total_sections ?? 0, icon: <Database className="h-3.5 w-3.5" />, color: 'text-forest-500' },
                  { label: 'Estates',        val: stats?.total_estates ?? 0,  icon: <MapPin className="h-3.5 w-3.5" />,    color: 'text-blue-500'   },
                  { label: 'Material IN',    val: inCount,                     icon: <Upload className="h-3.5 w-3.5" />,   color: 'text-emerald-500'},
                  { label: 'Material OUT',   val: outCount,                    icon: <Download className="h-3.5 w-3.5" />, color: 'text-red-400'   },
                  { label: 'Low Stock',      val: alerts.length,               icon: <Layers className="h-3.5 w-3.5" />,   color: 'text-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 font-medium text-forest-600 ${item.color.replace('text-', 'text-')}`}>
                      <span className={item.color}>{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="font-black text-forest-900">{formatNumber(item.val)}</span>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-bold text-forest-500 uppercase tracking-wide">Transaction Ratio</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-emerald-600 font-bold">{inCount}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                      style={{ width: `${inCount + outCount ? (inCount / (inCount + outCount)) * 100 : 50}%` }}
                    />
                    <div
                      className="h-full bg-red-400 rounded-r-full transition-all duration-700"
                      style={{ width: `${inCount + outCount ? (outCount / (inCount + outCount)) * 100 : 50}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-red-500 font-bold">{outCount}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Recent Transactions tab ──────────────────────────────────────── */}
        <TabsContent value="transactions" className="mt-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-forest-800">Recent Material Transactions</h3>
              <TrendingUp className="h-4 w-4 text-forest-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Section</th>
                    <th>Receiver/Sender</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-forest-300 text-xs italic">
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    recent.slice(0, 15).map((tx) => (
                      <tr key={tx.id}>
                        <td className="font-mono text-[11px]">{formatDate(tx.date)}</td>
                        <td>{txTypeBadge(tx.type)}</td>
                        <td className="font-medium">{tx.material?.nama ?? tx.code}</td>
                        <td className={`font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.type === 'IN' ? '+' : '-'}{tx.qty}
                        </td>
                        <td>{tx.section ?? '-'}</td>
                        <td className="text-forest-500">{tx.nama2 ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Recent Assets tab ────────────────────────────────────────────── */}
        <TabsContent value="assets" className="mt-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-forest-800">Recent Physical Assets</h3>
              <Package className="h-4 w-4 text-forest-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Reg ID</th>
                    <th>Type</th>
                    <th>Manufacturer</th>
                    <th>Series</th>
                    <th>Alokasi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-forest-300 text-xs italic">
                        No asset records
                      </td>
                    </tr>
                  ) : (
                    recentAssets.slice(0, 15).map((asset) => (
                      <tr key={asset.reg_id}>
                        <td className="font-mono text-[11px] font-bold text-forest-700">{asset.reg_id}</td>
                        <td>{asset.type}</td>
                        <td>{asset.manufacture}</td>
                        <td className="text-forest-500">{asset.series}</td>
                        <td>{asset.alokasi || '-'}</td>
                        <td>{statusBadge(asset.not_active)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Transfer Stats ─────────────────────────────────────────────────── */}
      {/* #20 FIX: Transfer overview di dashboard */}
      {stats?.transfer_stats && (
        <div className="animate-fade-in delay-200">
          <div className="flex items-center gap-2 mb-3">
            <Play className="h-4 w-4 text-forest-500" />
            <h3 className="text-sm font-bold text-forest-800">Transfer Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Total',    val: stats.transfer_stats.total,     color: 'text-forest-700',  bg: 'bg-forest-50' },
              { label: 'Pending',  val: stats.transfer_stats.pending,   color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Approved', val: stats.transfer_stats.approved,  color: 'text-green-700',  bg: 'bg-green-50'  },
              { label: 'Rejected', val: stats.transfer_stats.rejected,  color: 'text-red-700',    bg: 'bg-red-50'    },
              { label: 'Cancelled',val: stats.transfer_stats.cancelled, color: 'text-gray-500',   bg: 'bg-gray-50'   },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg} border-0 text-center`}>
                <p className={`text-2xl font-black ${s.color}`}>{formatNumber(s.val)}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {stats.transfer_stats.recent.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-forest-700">Recent Transfers</span>
              </div>
              <div className="divide-y divide-gray-50">
                {stats.transfer_stats.recent.map((t) => (
                  <div key={t.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-forest-800">{t.transfer_code}</span>
                    <span className="text-forest-500">
                      {t.from_estate?.estate ?? '?'} → {t.to_estate?.estate ?? '?'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.status === 'Approved'  ? 'bg-green-100 text-green-700'  :
                      t.status === 'Rejected'  ? 'bg-red-100 text-red-700'      :
                      t.status === 'Cancelled' ? 'bg-gray-100 text-gray-500'    :
                      'bg-orange-100 text-orange-700'
                    }`}>{t.status}</span>
                    <span className="text-forest-400">{formatDate(t.transfer_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stock Alerts ─────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="animate-fade-in delay-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold text-forest-800">Low Stock Alerts</h3>
            <Badge variant="pending">{alerts.length}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {alerts.map((alert) => (
              <div key={alert.code} className="card p-4 border-l-4 border-amber-400 card-accent-wood">
                <p className="text-xs font-bold text-forest-800 truncate">{alert.nama}</p>
                <p className="font-mono text-[10px] text-forest-400 mt-0.5">{alert.code}</p>
                <p className="mt-2 text-xl font-black text-amber-600">
                  {alert.stok}
                  <span className="text-xs font-normal text-forest-500 ml-1">{alert.unit}</span>
                </p>
                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠ Low Stock</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
