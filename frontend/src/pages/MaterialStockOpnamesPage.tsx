import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Download,
  FileCheck2,
  ListChecks,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Send,
  Upload,
  XCircle,
} from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { FormGroup, Input, Select, Textarea } from '../components/ui/FormFields';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';
import { cn, formatDate, formatNumber, getStoredUser, isHeadOfficeUser } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';

type OpnameStatus = 'Draft' | 'Counting' | 'Review' | 'Pending Approval' | 'Rejected' | 'Posted' | 'Cancelled';
type ItemStatus = 'Open' | 'Counted' | 'Need Recount' | 'Reviewed' | 'Posted' | 'Skipped';

interface EstateOption {
  id: number;
  estate: string;
  estate_id: string;
}

interface SectionOption {
  id: number;
  section: string;
  section_full?: string;
}

interface StockOpname extends Record<string, unknown> {
  id: number;
  opname_code: string;
  estate_id: number;
  section_id?: number | null;
  opname_date: string;
  snapshot_at: string;
  status: OpnameStatus;
  total_items: number;
  counted_items: number;
  total_variance_qty: number;
  total_variance_value: number;
  notes?: string | null;
  posted_at?: string | null;
  estate?: EstateOption;
  section?: SectionOption | null;
  items?: StockOpnameItem[];
  logs?: StockOpnameLog[];
  approval_requests?: StockOpnameApprovalRequest[];
}

interface StockOpnameItem extends Record<string, unknown> {
  id: number;
  opname_id: number;
  material_code: string;
  material_name: string;
  system_stock_snapshot: number;
  physical_stock?: number | null;
  recount_stock?: number | null;
  final_physical_stock?: number | null;
  variance_qty: number;
  variance_value: number;
  variance_type: 'Match' | 'Surplus' | 'Shortage';
  variance_reason?: string | null;
  condition_note?: string | null;
  status: ItemStatus;
  unit?: { nama?: string } | null;
  section?: SectionOption | null;
  transaction_id?: number | null;
}

interface StockOpnameLog extends Record<string, unknown> {
  id: number;
  action: string;
  actor?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

interface StockOpnameApprovalLog extends Record<string, unknown> {
  id: number;
  sequence: number;
  action: string;
  comment?: string | null;
  created_at?: string | null;
  user?: { name?: string; username?: string } | null;
}

interface StockOpnameApprovalRequest extends Record<string, unknown> {
  id: number;
  status: string;
  current_sequence: number;
  created_at?: string | null;
  requester?: { name?: string; username?: string } | null;
  workflow?: { name?: string; module_name?: string } | null;
  logs?: StockOpnameApprovalLog[];
}

interface PagedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

interface CountDraft {
  physical_stock: string;
  recount_stock: string;
  variance_reason: string;
  condition_note: string;
}

const editableStatuses: OpnameStatus[] = ['Draft', 'Counting', 'Review'];

const MaterialStockOpnamesPage: React.FC = () => {
  useTitle('Stock Opname');

  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement>(null);
  const user = getStoredUser();
  const isHoUser = isHeadOfficeUser();
  const { success, error: toastError, warning } = useToast();

  const canCreate = hasStoredPermission('create-material-stock-opnames');
  const canCount = hasStoredPermission('count-material-stock-opnames');
  const canReview = hasStoredPermission('review-material-stock-opnames');
  const canSubmit = hasStoredPermission('submit-material-stock-opnames');
  const canCancel = hasStoredPermission('cancel-material-stock-opnames');
  const canExport = hasStoredPermission('export-material-stock-opnames');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [estateFilter, setEstateFilter] = useState<string>(!isHoUser && user.estate_id ? String(user.estate_id) : '');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState('items');
  const [itemSearch, setItemSearch] = useState('');
  const [itemDrafts, setItemDrafts] = useState<Record<number, CountDraft>>({});

  const { data: estates } = useQuery<EstateOption[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const res = await api.get('/estates');
      return res.data.data ?? [];
    },
  });

  const { data: sections } = useQuery<SectionOption[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.data.data ?? [];
    },
  });

  const { data: pagedData, isLoading } = useQuery<PagedResponse<StockOpname>>({
    queryKey: ['material-stock-opnames', estateFilter, statusFilter, search, page, perPage],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: perPage };
      if (estateFilter) params.estate_id = estateFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/material-stock-opnames', { params });
      return res.data;
    },
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery<{ data: StockOpname }>({
    queryKey: ['material-stock-opname-detail', selectedId],
    enabled: selectedId !== null,
    queryFn: async () => {
      const res = await api.get(`/material-stock-opnames/${selectedId}`);
      return res.data;
    },
  });

  const selectedOpname = detailData?.data ?? null;
  const items = selectedOpname?.items ?? [];
  const filteredItems = items.filter((item) => {
    const needle = itemSearch.trim().toLowerCase();
    if (!needle) return true;

    return item.material_code.toLowerCase().includes(needle)
      || item.material_name.toLowerCase().includes(needle)
      || (item.section?.section ?? '').toLowerCase().includes(needle);
  });
  const varianceItems = filteredItems.filter((item) => Number(item.variance_qty ?? 0) !== 0);
  const approvalRequests = selectedOpname?.approval_requests ?? [];
  const logs = selectedOpname?.logs ?? [];
  const hasVariance = items.some((item) => Number(item.variance_qty) !== 0);
  const pendingCount = items.filter((item) => item.status === 'Open' || item.status === 'Need Recount').length;

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/material-stock-opnames', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opnames'] });
      setCreateOpen(false);
      setSelectedId(res.data.data.id);
      success('Stock opname created', 'Snapshot material has been generated.');
    },
    onError: (err: any) => toastError('Create failed', err.response?.data?.message || 'Could not create stock opname.'),
  });

  const countMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: Record<string, unknown> }) =>
      api.put(`/material-stock-opnames/${selectedId}/items/${itemId}/count`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opname-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-opnames'] });
      setItemDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.itemId];
        return next;
      });
      success('Count saved');
    },
    onError: (err: any) => toastError('Save failed', err.response?.data?.message || 'Could not save count.'),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action }: { action: 'start-counting' | 'submit-review' | 'submit-approval' | 'generate-items' | 'cancel' }) =>
      api.post(`/material-stock-opnames/${selectedId}/${action}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opname-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-opnames'] });
      queryClient.invalidateQueries({ queryKey: ['notification-approvals'] });
      success('Action completed', variables.action.replace('-', ' '));
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;
      toastError('Action failed', String(firstError || err.response?.data?.message || 'Could not process action.'));
    },
  });

  const markRecountMutation = useMutation({
    mutationFn: ({ itemId, reason }: { itemId: number; reason: string }) =>
      api.post(`/material-stock-opnames/${selectedId}/items/${itemId}/mark-recount`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opname-detail', selectedId] });
      warning('Recount requested');
    },
    onError: (err: any) => toastError('Recount failed', err.response?.data?.message || 'Could not request recount.'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/material-stock-opnames/${selectedId}/import-counts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opname-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-opnames'] });
      setItemDrafts({});
      success('CSV imported', `${res.data.imported ?? 0} rows imported.`);
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;
      toastError('Import failed', String(firstError || err.response?.data?.message || 'Could not import CSV.'));
    },
  });

  const bulkCountMutation = useMutation({
    mutationFn: (counts: Record<string, unknown>[]) => api.post(`/material-stock-opnames/${selectedId}/bulk-counts`, { counts }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['material-stock-opname-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-opnames'] });
      setItemDrafts({});
      success('Counts saved', `${res.data.imported ?? 0} rows saved.`);
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;
      toastError('Bulk save failed', String(firstError || err.response?.data?.message || 'Could not save counts.'));
    },
  });

  const columns: Column<StockOpname>[] = [
    {
      key: 'opname_code',
      label: 'Code',
      sortable: true,
      render: (val) => <span className="font-mono text-[11px] font-bold text-forest-700">{String(val)}</span>,
    },
    { key: 'opname_date', label: 'Date', sortable: true, render: (val) => formatDate(String(val ?? '')) },
    { key: 'estate', label: 'Estate', render: (_, row) => row.estate ? `${row.estate.estate_id} - ${row.estate.estate}` : '-' },
    { key: 'section', label: 'Section', render: (_, row) => row.section?.section ?? 'All' },
    {
      key: 'counted_items',
      label: 'Progress',
      render: (_, row) => `${formatNumber(Number(row.counted_items ?? 0))}/${formatNumber(Number(row.total_items ?? 0))}`,
    },
    {
      key: 'total_variance_qty',
      label: 'Variance',
      render: (val) => {
        const n = Number(val ?? 0);
        return <span className={cn('font-bold', n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-700' : 'text-gray-500')}>{formatNumber(n)}</span>;
      },
    },
    { key: 'status', label: 'Status', render: (val) => statusBadge(String(val)) },
  ];

  const openDetail = (opname: StockOpname) => {
    setSelectedId(opname.id);
    setDetailTab('items');
    setItemSearch('');
    setItemDrafts({});
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetailTab('items');
    setItemSearch('');
    setItemDrafts({});
  };

  const setDraft = (item: StockOpnameItem, patch: Partial<CountDraft>) => {
    const current = itemDrafts[item.id] ?? {
      physical_stock: String(item.physical_stock ?? ''),
      recount_stock: String(item.recount_stock ?? ''),
      variance_reason: item.variance_reason ?? '',
      condition_note: item.condition_note ?? '',
    };

    setItemDrafts((prev) => ({
      ...prev,
      [item.id]: {
        ...current,
        ...patch,
      },
    }));
  };

  const draftFor = (item: StockOpnameItem): CountDraft => itemDrafts[item.id] ?? {
    physical_stock: String(item.physical_stock ?? ''),
    recount_stock: String(item.recount_stock ?? ''),
    variance_reason: item.variance_reason ?? '',
    condition_note: item.condition_note ?? '',
  };

  const saveItem = (item: StockOpnameItem) => {
    const draft = draftFor(item);
    if (draft.physical_stock === '') {
      toastError('Validation', 'Physical stock is required.');
      return;
    }

    countMutation.mutate({
      itemId: item.id,
      payload: {
        physical_stock: Number(draft.physical_stock),
        recount_stock: draft.recount_stock === '' ? null : Number(draft.recount_stock),
        variance_reason: draft.variance_reason,
        condition_note: draft.condition_note,
      },
    });
  };

  const submitCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    if (!isHoUser && user.estate_id) {
      payload.estate_id = user.estate_id;
    }

    createMutation.mutate(payload);
  };

  const confirmAction = async (action: 'submit-review' | 'submit-approval' | 'cancel' | 'generate-items') => {
    const labels: Record<typeof action, string> = {
      'submit-review': 'Submit review',
      'submit-approval': 'Submit approval',
      cancel: 'Cancel session',
      'generate-items': 'Regenerate snapshot',
    };
    const result = await showConfirm(labels[action], 'Are you sure you want to continue?', labels[action]);
    if (result.isConfirmed) {
      actionMutation.mutate({ action });
    }
  };

  const exportOpname = async () => {
    if (!selectedOpname) return;
    const res = await api.get(`/material-stock-opnames/${selectedOpname.id}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedOpname.opname_code}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadBeritaAcara = async () => {
    if (!selectedOpname) return;
    const res = await api.get(`/material-stock-opnames/${selectedOpname.id}/berita-acara`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Berita_Acara_Stock_Opname_${selectedOpname.opname_code}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    importMutation.mutate(file);
  };

  const downloadImportTemplate = () => {
    if (!selectedOpname) return;

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = [
      ['material_code', 'physical_stock', 'variance_reason', 'condition_note'],
      ...items.map((item) => [item.material_code, '', '', item.condition_note ?? '']),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedOpname.opname_code}_count_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const saveDraftCounts = () => {
    const counts: Record<string, unknown>[] = [];
    Object.entries(itemDrafts).forEach(([itemId, draft]) => {
      const item = items.find((candidate) => candidate.id === Number(itemId));
      if (!item || draft.physical_stock === '') return;

      counts.push({
        material_code: item.material_code,
        physical_stock: Number(draft.physical_stock),
        recount_stock: draft.recount_stock === '' ? null : Number(draft.recount_stock),
        variance_reason: draft.variance_reason,
        condition_note: draft.condition_note,
      });
    });

    if (counts.length === 0) {
      warning('No draft counts', 'Isi atau ubah physical stock terlebih dahulu.');
      return;
    }

    bulkCountMutation.mutate(counts);
  };

  const canEditDetail = selectedOpname ? editableStatuses.includes(selectedOpname.status) : false;
  const canImportDetail = selectedOpname && canCount && canEditDetail;
  const canDownloadBeritaAcara = selectedOpname && canExport && selectedOpname.status === 'Posted';
  const canSubmitReview = selectedOpname && canReview && ['Counting', 'Review'].includes(selectedOpname.status);
  const canSubmitApproval = selectedOpname && canSubmit && selectedOpname.status === 'Review';
  const canCancelDetail = selectedOpname && canCancel && !['Posted', 'Cancelled'].includes(selectedOpname.status);

  const statusOptions = useMemo(() => [
    { value: '', label: 'All Status' },
    ...['Draft', 'Counting', 'Review', 'Pending Approval', 'Rejected', 'Posted', 'Cancelled'].map((status) => ({ value: status, label: status })),
  ], []);

  const renderItemsTable = (visibleItems: StockOpnameItem[]) => (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left">Material</th>
            <th className="px-3 py-2 text-right">System</th>
            <th className="px-3 py-2 text-left">Physical</th>
            <th className="px-3 py-2 text-left">Recount</th>
            <th className="px-3 py-2 text-right">Variance</th>
            <th className="px-3 py-2 text-left">Reason</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibleItems.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-400 italic">
                No items to display.
              </td>
            </tr>
          ) : visibleItems.map((item) => {
            const draft = draftFor(item);
            const currentVariance = draft.physical_stock === ''
              ? Number(item.variance_qty ?? 0)
              : Number(draft.recount_stock || draft.physical_stock) - Number(item.system_stock_snapshot ?? 0);
            const rowEditable = canEditDetail && canCount;

            return (
              <tr key={item.id} className={cn(item.status === 'Need Recount' && 'bg-amber-50/50')}>
                <td className="px-3 py-2">
                  <p className="font-semibold text-gray-900">{item.material_name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{item.material_code}</p>
                </td>
                <td className="px-3 py-2 text-right font-bold text-gray-700">
                  {formatNumber(Number(item.system_stock_snapshot ?? 0))}
                  <span className="ml-1 text-[11px] text-gray-400">{item.unit?.nama ?? ''}</span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={!rowEditable}
                    className="w-28 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm disabled:opacity-60"
                    value={draft.physical_stock}
                    onChange={(e) => setDraft(item, { physical_stock: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={!rowEditable}
                    className="w-28 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm disabled:opacity-60"
                    value={draft.recount_stock}
                    onChange={(e) => setDraft(item, { recount_stock: e.target.value })}
                  />
                </td>
                <td className={cn('px-3 py-2 text-right font-black', varianceClass(currentVariance))}>
                  {formatNumber(Number(currentVariance.toFixed(1)))}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    disabled={!rowEditable}
                    className="w-64 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm disabled:opacity-60"
                    value={draft.variance_reason}
                    onChange={(e) => setDraft(item, { variance_reason: e.target.value })}
                    placeholder={currentVariance !== 0 ? 'Required for variance' : 'Optional'}
                  />
                </td>
                <td className="px-3 py-2">{itemStatusBadge(item.status)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    {rowEditable && (
                      <Button size="xs" leftIcon={<Save className="h-3.5 w-3.5" />} loading={countMutation.isPending} onClick={() => saveItem(item)}>
                        Save
                      </Button>
                    )}
                    {canReview && ['Counted', 'Reviewed'].includes(item.status) && selectedOpname?.status !== 'Posted' && (
                      <button
                        type="button"
                        title="Request recount"
                        className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100"
                        onClick={() => markRecountMutation.mutate({ itemId: item.id, reason: draft.variance_reason || 'Recount requested' })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Stock Opname</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Material count sessions, variance review, and adjustment approval.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={estateFilter}
            onChange={(e) => { setEstateFilter(e.target.value); setPage(1); }}
            disabled={!isHoUser}
          >
            {isHoUser && <option value="">All Estates</option>}
            {(estates ?? []).map((estate) => (
              <option key={estate.id} value={estate.id}>{estate.estate} ({estate.estate_id})</option>
            ))}
          </select>
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {canCreate && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New Session
            </Button>
          )}
        </div>
      </div>

      <DataTable<StockOpname>
        columns={columns}
        data={pagedData?.data ?? []}
        isLoading={isLoading}
        rowKey={(item) => item.id}
        onView={openDetail}
        searchPlaceholder="Search opname code or notes..."
        onSearch={(val) => { setSearch(val); setPage(1); }}
        emptyMessage="No stock opname sessions"
        serverPagination={pagedData?.meta ? {
          totalItems: pagedData.meta.total,
          currentPage: pagedData.meta.current_page,
          perPage: pagedData.meta.per_page,
          onPageChange: setPage,
          onPerPageChange: (pp) => { setPerPage(pp); setPage(1); },
        } : undefined}
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Stock Opname" size="md">
        <form onSubmit={submitCreate} className="space-y-4">
          <FormGroup cols={2}>
            {isHoUser && (
              <Select
                name="estate_id"
                label="Estate"
                required
                placeholder="Select estate"
                options={(estates ?? []).map((estate) => ({ value: estate.id, label: `${estate.estate_id} - ${estate.estate}` }))}
              />
            )}
            <Input name="opname_date" label="Opname Date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </FormGroup>
          <Select
            name="section_id"
            label="Section"
            placeholder="All sections"
            options={(sections ?? []).map((section) => ({ value: section.id, label: `${section.section} - ${section.section_full ?? ''}` }))}
          />
          <Textarea name="notes" label="Notes" rows={3} />
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} leftIcon={<PackageCheck className="h-4 w-4" />}>
              Create Snapshot
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={selectedId !== null}
        onClose={closeDetail}
        title={selectedOpname ? selectedOpname.opname_code : 'Stock Opname'}
        description={selectedOpname ? `${selectedOpname.estate?.estate_id ?? ''} - ${formatDate(selectedOpname.opname_date)}` : undefined}
        size="full"
      >
        {isDetailLoading || !selectedOpname ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/3" />
            <div className="h-40 bg-gray-100 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <InfoBox label="Status" value={statusBadge(selectedOpname.status)} />
              <InfoBox label="Progress" value={`${selectedOpname.counted_items}/${selectedOpname.total_items}`} />
              <InfoBox label="Section" value={selectedOpname.section?.section ?? 'All'} />
              <InfoBox label="Variance Qty" value={<span className={varianceClass(selectedOpname.total_variance_qty)}>{formatNumber(Number(selectedOpname.total_variance_qty ?? 0))}</span>} />
              <InfoBox label="Pending Items" value={String(pendingCount)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedOpname.status === 'Draft' && canCount && (
                <Button size="sm" variant="secondary" leftIcon={<ListChecks className="h-4 w-4" />} onClick={() => actionMutation.mutate({ action: 'start-counting' })}>
                  Start Counting
                </Button>
              )}
              {selectedOpname.status === 'Draft' && canCreate && (
                <Button size="sm" variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => confirmAction('generate-items')}>
                  Regenerate Snapshot
                </Button>
              )}
              {canSubmitReview && (
                <Button size="sm" variant="wood" leftIcon={<FileCheck2 className="h-4 w-4" />} onClick={() => confirmAction('submit-review')}>
                  Submit Review
                </Button>
              )}
              {canSubmitApproval && (
                <Button size="sm" variant="success" leftIcon={<Send className="h-4 w-4" />} onClick={() => confirmAction('submit-approval')}>
                  Submit Approval
                </Button>
              )}
              {canExport && (
                <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportOpname}>
                  Export CSV
                </Button>
              )}
              {canDownloadBeritaAcara && (
                <Button size="sm" variant="outline" leftIcon={<FileCheck2 className="h-4 w-4" />} onClick={downloadBeritaAcara}>
                  Berita Acara
                </Button>
              )}
              {canImportDetail && (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Upload className="h-4 w-4" />}
                    loading={importMutation.isPending}
                    onClick={() => importInputRef.current?.click()}
                  >
                    Import CSV
                  </Button>
                </>
              )}
              {canCancelDetail && (
                <Button size="sm" variant="danger" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => confirmAction('cancel')}>
                  Cancel
                </Button>
              )}
            </div>

            {hasVariance && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Variance exists. Each variance item must have a reason before review submission.
              </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <Input
                label="Search Items"
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Material code, name, or section"
                wrapperClassName="md:max-w-md"
              />
              <div className="flex flex-wrap gap-2">
                {canImportDetail && (
                  <>
                    <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={downloadImportTemplate}>
                      Template CSV
                    </Button>
                    <Button size="sm" variant="secondary" leftIcon={<Save className="h-4 w-4" />} loading={bulkCountMutation.isPending} onClick={saveDraftCounts}>
                      Save Drafts
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Tabs value={detailTab} onValueChange={setDetailTab} variant="underline">
              <TabsList className="overflow-x-auto">
                <TabsTrigger value="items" icon={<ListChecks className="h-4 w-4" />}>Items</TabsTrigger>
                <TabsTrigger value="variance" icon={<FileCheck2 className="h-4 w-4" />}>Variance</TabsTrigger>
                <TabsTrigger value="approval" icon={<Send className="h-4 w-4" />}>Approval</TabsTrigger>
                <TabsTrigger value="log" icon={<RotateCcw className="h-4 w-4" />}>Log</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-4">
                {renderItemsTable(filteredItems)}
              </TabsContent>

              <TabsContent value="variance" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <InfoBox label="Variance Items" value={String(varianceItems.length)} />
                  <InfoBox label="Shortage" value={String(varianceItems.filter((item) => item.variance_type === 'Shortage').length)} />
                  <InfoBox label="Surplus" value={String(varianceItems.filter((item) => item.variance_type === 'Surplus').length)} />
                  <InfoBox label="Variance Value" value={<span className={varianceClass(selectedOpname.total_variance_value)}>{formatNumber(Number(selectedOpname.total_variance_value ?? 0))}</span>} />
                </div>
                {renderItemsTable(varianceItems)}
              </TabsContent>

              <TabsContent value="approval" className="mt-4">
                {approvalRequests.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
                    Approval has not been submitted.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvalRequests.map((request) => (
                      <div key={request.id} className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-black text-gray-900">{request.workflow?.name ?? 'Approval Workflow'}</p>
                            <p className="text-xs text-gray-500">
                              Requester: {request.requester?.name ?? request.requester?.username ?? '-'} / Sequence {request.current_sequence}
                            </p>
                          </div>
                          <Badge variant={request.status === 'Approved' ? 'active' : request.status === 'Rejected' ? 'inactive' : 'pending'} dot>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {(request.logs ?? []).length === 0 ? (
                            <div className="px-4 py-4 text-sm text-gray-400 italic">No approval action yet.</div>
                          ) : (request.logs ?? []).map((log) => (
                            <div key={log.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[80px_1fr_140px] gap-2 text-sm">
                              <div className="font-mono text-xs text-gray-500">Seq {log.sequence}</div>
                              <div>
                                <p className="font-semibold text-gray-900">{log.user?.name ?? log.user?.username ?? 'System'} - {log.action}</p>
                                <p className="text-xs text-gray-500">{log.comment || '-'}</p>
                              </div>
                              <div className="text-xs text-gray-400 md:text-right">{formatDate(log.created_at || '')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="log" className="mt-4">
                {logs.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-400 italic">
                    No stock opname activity log.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {logs.map((log) => (
                      <div key={log.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr_160px] gap-2 text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{log.actor ?? 'system'}{log.notes ? ` / ${log.notes}` : ''}</p>
                        </div>
                        <div className="text-xs text-gray-400 md:text-right">{formatDate(log.created_at || '')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Modal>
    </div>
  );
};

const InfoBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-xl p-3 space-y-1">
    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <div className="font-semibold text-gray-900">{value}</div>
  </div>
);

function varianceClass(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (n < 0) return 'text-red-600';
  if (n > 0) return 'text-emerald-700';
  return 'text-gray-500';
}

function statusBadge(status: string): React.ReactNode {
  if (status === 'Posted') return <Badge variant="active" dot>Posted</Badge>;
  if (status === 'Rejected' || status === 'Cancelled') return <Badge variant="inactive" dot>{status}</Badge>;
  if (status === 'Pending Approval') return <Badge variant="pending" dot>Pending Approval</Badge>;
  if (status === 'Review') return <Badge variant="wood" dot>Review</Badge>;
  if (status === 'Counting') return <Badge variant="info" dot>Counting</Badge>;
  return <Badge variant="default" dot>{status}</Badge>;
}

function itemStatusBadge(status: ItemStatus): React.ReactNode {
  if (status === 'Posted' || status === 'Reviewed') return <Badge variant="active" dot>{status}</Badge>;
  if (status === 'Need Recount') return <Badge variant="pending" dot>Need Recount</Badge>;
  if (status === 'Counted') return <Badge variant="info" dot>Counted</Badge>;
  if (status === 'Skipped') return <Badge variant="inactive" dot>Skipped</Badge>;
  return <Badge variant="default" dot>Open</Badge>;
}

export default MaterialStockOpnamesPage;
