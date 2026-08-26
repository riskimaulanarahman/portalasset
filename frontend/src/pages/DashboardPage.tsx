import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, ArrowLeftRight, Layers,
  Database, TrendingUp, Activity, Clock, BarChart3,
  Download, Upload, Box, MapPin, Play, ShieldAlert, CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import api from '../api/axios';
import StatsCard from '../components/ui/StatsCard';
import Badge, { txTypeBadge, statusBadge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { formatDate, formatNumber, truncate, getStoredUser } from '../lib/utils';
import useTitle from '../hooks/useTitle';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';

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

interface StockOpnameStats {
  total: number;
  pending: number;
  review: number;
  posted_this_month: number;
  variance_value_this_month: number;
  recent: {
    id: number;
    opname_code: string;
    status: string;
    opname_date: string;
    total_variance_qty: number;
    total_variance_value: number;
    estate?: { estate: string; estate_id?: string };
    section?: { section: string } | null;
  }[];
  pending_aging?: {
    id: number;
    opname_code: string;
    opname_date: string;
    submitted_at?: string | null;
    days_pending: number;
    total_variance_value: number;
    estate?: { estate: string; estate_id?: string };
    section?: { section: string } | null;
  }[];
  top_shortages_this_month?: {
    material_code: string;
    material_name: string;
    shortage_qty: number;
    shortage_value: number;
  }[];
}

interface AssetAssignmentReminder {
  transfer_id: number;
  transfer_code: string;
  transfer_date: string;
  receive_date?: string | null;
  asset_id: string;
  item_notes?: string | null;
  from_estate?: { estate: string; estate_id?: string };
  to_estate?: { estate: string; estate_id?: string };
  anggota_penerima?: {
    sap_id: string;
    nama: string;
    position?: string | null;
  };
}

interface AssetDamageReminder {
  reg_id: string;
  asset_no?: string | null;
  name?: string;
  estate?: { estate: string; estate_id?: string };
  kondisi?: string;
  remarks?: string | null;
  condition_date?: string | null;
}

interface MaintenanceReminder {
  id: number;
  reg_id: string;
  asset_no?: string | null;
  estate?: { estate: string; estate_id?: string };
  kondisi?: string;
  target?: string | null;
  sent_?: string | null;
  keterangan?: string | null;
  status?: string;
}

interface WriteOffPendingReminder {
  id: number;
  reg_id: string;
  asset_no?: string | null;
  estate?: { estate: string; estate_id?: string };
  kondisi?: string;
  keterangan?: string | null;
  date?: string | null;
  status?: string;
}

interface DashboardStats {
  total_assets:          number;
  asset_access_setup_required?: boolean;
  active_assets:         number;
  total_materials:       number;
  total_transactions:    number;
  total_sections:        number;
  total_estates:         number;
  recent_transactions:   Transaction[];
  recent_assets:         Asset[];
  stock_alerts:          StockAlert[];
  transfer_stats?:       TransferStats;  // #20 FIX
  stock_opname_stats?:   StockOpnameStats;
  asset_assignment_reminders?: AssetAssignmentReminder[];
  asset_damage_reminders?: AssetDamageReminder[];
  maintenance_reminders?: MaintenanceReminder[];
  write_off_pending_reminders?: WriteOffPendingReminder[];
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

interface EstateOption {
  id: number;
  estate_id: string;
  estate: string;
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
const ReminderPanel: React.FC<{
  title: string;
  count: number;
  tone: 'red' | 'amber' | 'gray';
  children: React.ReactNode;
}> = ({ title, count, tone, children }) => {
  const toneClass = {
    red: 'border-red-200 bg-red-50 text-red-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    gray: 'border-gray-200 bg-gray-50 text-gray-900',
  }[tone];

  return (
    <div className={`rounded-xl border overflow-hidden ${toneClass}`}>
      <div className="px-4 py-3 border-b border-current/10 flex items-center justify-between">
        <h2 className="text-xs font-black">{title}</h2>
        <Badge variant={tone === 'gray' ? 'inactive' : 'pending'}>{count}</Badge>
      </div>
      <div className="divide-y divide-current/10">{children}</div>
    </div>
  );
};

const ReminderRow: React.FC<{ title: string; subtitle: string; meta: string }> = ({ title, subtitle, meta }) => (
  <div className="px-4 py-3 text-xs">
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono font-black truncate">{title}</span>
      <span className="shrink-0 opacity-70">{meta}</span>
    </div>
    <p className="mt-1 font-semibold opacity-80 truncate">{subtitle}</p>
  </div>
);

const DashboardPage: React.FC = () => {
  useTitle('Dashboard');
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [selectedEstateId, setSelectedEstateId] = useState('');
  const [profileUser, setProfileUser] = useState(getStoredUser());

  const currentUser = profileUser;
  const isPendingActivation = Boolean(currentUser?.not_active);
  const needsEstateSelection = !isPendingActivation && !currentUser?.estate_id;
  const canLoadDashboardData = !isPendingActivation && !needsEstateSelection;
  const estateName  = currentUser?.estate?.estate ?? '—';
  const estateCode  = currentUser?.estate?.estate_id ?? '';

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
    enabled: canLoadDashboardData,
    refetchInterval: 60_000,
  });

  const { data: materialsData } = useQuery<{ data: StockAlert[] }>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data;
    },
    enabled: canLoadDashboardData,
  });

  const { data: estateOptions = [] } = useQuery<EstateOption[]>({
    queryKey: ['profile-estate-options'],
    queryFn: async () => {
      const res = await api.get('/profile/estate-options');
      return res.data.data ?? [];
    },
    enabled: needsEstateSelection,
  });

  const estateMutation = useMutation({
    mutationFn: async () => api.post('/profile/estate', { estate_id: Number(selectedEstateId) }),
    onSuccess: (response) => {
      const updatedUser = {
        ...response.data.user,
        permissions: response.data.permissions ?? [],
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Estate selected', 'Estate berhasil disimpan.');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? (Object.values(errors)[0] as string[] | undefined) : undefined;
      toast.error('Failed', firstError?.[0] || err.response?.data?.message || 'Tidak dapat menyimpan estate.');
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
  const stockOpnameStats = stats?.stock_opname_stats;
  const assetAssignmentReminders = stats?.asset_assignment_reminders ?? [];
  const assetDamageReminders = stats?.asset_damage_reminders ?? [];
  const maintenanceReminders = stats?.maintenance_reminders ?? [];
  const writeOffPendingReminders = stats?.write_off_pending_reminders ?? [];

  // ── Derived stats ────────────────────────────────────────────────────────────
  const inCount  = recent.filter((t) => t.type === 'IN').length;
  const outCount = recent.filter((t) => t.type === 'OUT').length;
  const utilRate = stats
    ? Math.round((stats.active_assets / (stats.total_assets || 1)) * 100)
    : 0;

  if (isPendingActivation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <div className="max-w-xl w-full bg-white rounded-2xl border border-amber-100 shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-4 ring-amber-50">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Akun anda belum diaktivasi oleh admin</h1>
          <p className="mt-3 text-sm font-medium text-gray-500">
            Login LDAP berhasil. Silakan tunggu admin mengaktifkan akun dan memilih role Anda.
          </p>
        </div>
      </div>
    );
  }

  if (needsEstateSelection) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <form
          className="max-w-xl w-full bg-white rounded-2xl border border-forest-100 shadow-sm p-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedEstateId) {
              toast.warning('Estate required', 'Silakan pilih estate terlebih dahulu.');
              return;
            }
            estateMutation.mutate();
          }}
        >
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 ring-4 ring-forest-50">
              <MapPin className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Pilih Estate Anda</h1>
            <p className="mt-3 text-sm font-medium text-gray-500">
              Akun sudah aktif. Pilih estate operasional Anda untuk membuka dashboard.
            </p>
          </div>

          <Select
            label="Estate"
            value={selectedEstateId}
            onChange={(event) => setSelectedEstateId(event.target.value)}
            options={estateOptions.map((estate) => ({
              value: estate.id,
              label: `${estate.estate_id} - ${estate.estate}`,
            }))}
            placeholder="Pilih estate"
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={estateMutation.isPending}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Simpan Estate
          </Button>
        </form>
      </div>
    );
  }

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
      {stats?.asset_access_setup_required && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          Akses department/divisi belum diatur oleh admin.
        </div>
      )}

      {assetAssignmentReminders.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-amber-900">Asset Member Update Reminder</h2>
              <p className="text-xs font-medium text-amber-700 mt-1">
                Asset transfer approved dengan penerima anggota perlu dipastikan/update pada data assignment asset.
              </p>
            </div>
            <Badge variant="pending">{assetAssignmentReminders.length}</Badge>
          </div>
          <div className="divide-y divide-amber-100">
            {assetAssignmentReminders.slice(0, 5).map((reminder) => (
              <div key={`${reminder.transfer_id}-${reminder.asset_id}`} className="px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-amber-950">{reminder.asset_id}</span>
                    <span className="text-amber-700">{reminder.transfer_code}</span>
                  </div>
                  <p className="text-amber-800 font-semibold mt-1 truncate">
                    {reminder.anggota_penerima?.nama ?? '-'} {reminder.anggota_penerima?.sap_id ? `(${reminder.anggota_penerima.sap_id})` : ''}
                  </p>
                  {reminder.item_notes && (
                    <p className="text-amber-700 mt-0.5 truncate">{reminder.item_notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-amber-700 shrink-0">
                  <span>{reminder.from_estate?.estate ?? '?'} {'->'} {reminder.to_estate?.estate ?? '?'}</span>
                  <span>{formatDate(reminder.receive_date || reminder.transfer_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(assetDamageReminders.length > 0 || maintenanceReminders.length > 0 || writeOffPendingReminders.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {assetDamageReminders.length > 0 && (
            <ReminderPanel title="Kondisi Aset Bermasalah" count={assetDamageReminders.length} tone="red">
              {assetDamageReminders.slice(0, 5).map((item) => (
                <ReminderRow
                  key={item.reg_id}
                  title={item.reg_id}
                  subtitle={`${item.kondisi ?? '-'} - ${item.name || item.asset_no || '-'}`}
                  meta={`${item.estate?.estate ?? '-'} - ${formatDate(item.condition_date || '')}`}
                />
              ))}
            </ReminderPanel>
          )}

          {maintenanceReminders.length > 0 && (
            <ReminderPanel title="Maintenance Progress" count={maintenanceReminders.length} tone="amber">
              {maintenanceReminders.slice(0, 5).map((item) => (
                <ReminderRow
                  key={item.id}
                  title={item.reg_id}
                  subtitle={`${item.sent_ ?? '-'} - ${item.kondisi ?? '-'}`}
                  meta={`${item.estate?.estate ?? '-'} - Target ${formatDate(item.target || '')}`}
                />
              ))}
            </ReminderPanel>
          )}

          {writeOffPendingReminders.length > 0 && (
            <ReminderPanel title="Pending Write-Off" count={writeOffPendingReminders.length} tone="gray">
              {writeOffPendingReminders.slice(0, 5).map((item) => (
                <ReminderRow
                  key={item.id}
                  title={item.reg_id}
                  subtitle={`${item.kondisi ?? '-'} - ${item.keterangan || item.asset_no || '-'}`}
                  meta={`${item.estate?.estate ?? '-'} - ${formatDate(item.date || '')}`}
                />
              ))}
            </ReminderPanel>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        <StatsCard
          title="Stock Opname"
          value={isLoading ? '-' : formatNumber(stockOpnameStats?.pending ?? 0)}
          subtitle={`${stockOpnameStats?.review ?? 0} review / ${stockOpnameStats?.posted_this_month ?? 0} posted`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          accent="purple"
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
                  { label: 'Opname Pending', val: stockOpnameStats?.pending ?? 0, icon: <ClipboardCheck className="h-3.5 w-3.5" />, color: 'text-violet-500' },
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
      {stockOpnameStats && (
        <div className="animate-fade-in delay-200">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold text-forest-800">Stock Opname Overview</h3>
            <Badge variant="pending">{stockOpnameStats.pending}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Total', val: stockOpnameStats.total, color: 'text-forest-700', bg: 'bg-forest-50' },
              { label: 'Pending', val: stockOpnameStats.pending, color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Review', val: stockOpnameStats.review, color: 'text-violet-700', bg: 'bg-violet-50' },
              { label: 'Posted Month', val: stockOpnameStats.posted_this_month, color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Variance Value', val: formatNumber(stockOpnameStats.variance_value_this_month), color: 'text-red-700', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg} border-0 text-center`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {stockOpnameStats.recent.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-forest-700">Recent Stock Opnames</span>
              </div>
              <div className="divide-y divide-gray-50">
                {stockOpnameStats.recent.map((opname) => (
                  <div key={opname.id} className="px-5 py-2.5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 md:items-center text-xs">
                    <span className="font-mono font-bold text-forest-800">{opname.opname_code}</span>
                    <span className="text-forest-500 truncate">
                      {opname.estate?.estate ?? '-'} / {opname.section?.section ?? 'All sections'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold justify-self-start ${
                      opname.status === 'Posted' ? 'bg-green-100 text-green-700' :
                      opname.status === 'Rejected' || opname.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      opname.status === 'Review' ? 'bg-violet-100 text-violet-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{opname.status}</span>
                    <span className="text-forest-400 md:text-right">{formatDate(opname.opname_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {((stockOpnameStats.pending_aging?.length ?? 0) > 0 || (stockOpnameStats.top_shortages_this_month?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {(stockOpnameStats.pending_aging?.length ?? 0) > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-forest-700">Pending Approval Aging</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(stockOpnameStats.pending_aging ?? []).map((opname) => (
                      <div key={opname.id} className="px-5 py-2.5 grid grid-cols-[1fr_auto] gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-forest-800 truncate">{opname.opname_code}</p>
                          <p className="text-forest-500 truncate">{opname.estate?.estate ?? '-'} / {opname.section?.section ?? 'All sections'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-orange-700">{opname.days_pending} days</p>
                          <p className="text-forest-400">{formatNumber(opname.total_variance_value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(stockOpnameStats.top_shortages_this_month?.length ?? 0) > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-forest-700">Top Shortages This Month</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(stockOpnameStats.top_shortages_this_month ?? []).map((item) => (
                      <div key={item.material_code} className="px-5 py-2.5 grid grid-cols-[1fr_auto] gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-forest-800 truncate">{item.material_name}</p>
                          <p className="font-mono text-forest-400 truncate">{item.material_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-700">{formatNumber(Number(item.shortage_qty ?? 0))}</p>
                          <p className="text-forest-400">{formatNumber(Number(item.shortage_value ?? 0))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
