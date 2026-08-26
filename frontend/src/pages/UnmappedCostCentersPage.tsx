import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Wallet } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { hasStoredPermission } from '../lib/access';
import { cn } from '../lib/utils';

type QueueStatus = 'pending' | 'resolved' | 'ignored' | 'all';

interface UnmappedCostCenter {
  [key: string]: unknown;
  id: number;
  cost_center: string;
  employee_sap_id?: string | null;
  employee_name?: string | null;
  login_name?: string | null;
  source: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolved_at?: string | null;
  last_seen_at?: string | null;
  notes?: string | null;
  resolved_by?: {
    id: number;
    name?: string | null;
    username?: string | null;
  } | null;
}

interface Estate {
  id: number;
  estate_id: string;
  estate: string;
}

interface ApiErrorData {
  message?: string;
  errors?: Record<string, string[]>;
}

const statusOptions: { value: QueueStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'all', label: 'All' },
];

const UnmappedCostCentersPage: React.FC = () => {
  useTitle('Unmapped Cost Centers');

  const queryClient = useQueryClient();
  const toast = useToast();
  const canResolve = hasStoredPermission('create-cost-centers');
  const [status, setStatus] = useState<QueueStatus>('pending');
  const [selectedItem, setSelectedItem] = useState<UnmappedCostCenter | null>(null);
  const [dept, setDept] = useState('');
  const [estateId, setEstateId] = useState('');

  const { data: unmappedRows = [], isLoading, isFetching } = useQuery<UnmappedCostCenter[]>({
    queryKey: ['unmapped-cost-centers', status],
    queryFn: async () => {
      const response = await api.get('/unmapped-cost-centers', { params: { status } });
      return response.data.data ?? [];
    },
  });

  const { data: estates = [] } = useQuery<Estate[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const response = await api.get('/estates');
      return response.data.data ?? [];
    },
  });

  const visibleCountLabel = useMemo(
    () => `${unmappedRows.length} ${status === 'all' ? 'records' : status}`,
    [status, unmappedRows.length],
  );

  const estateOptions = estates.map((estate) => ({
    value: estate.id,
    label: `${estate.estate_id} - ${estate.estate}`,
  }));

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;

      return api.post(`/unmapped-cost-centers/${selectedItem.id}/resolve`, {
        estate_id: Number(estateId),
        dept,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmapped-cost-centers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      handleCloseModal();
      toast.success('Cost center resolved', 'Mapping berhasil dibuat.');
    },
    onError: (err: unknown) => {
      toast.error('Failed to resolve', getErrorMessage(err));
    },
  });

  const handleOpenResolve = (item: UnmappedCostCenter) => {
    setSelectedItem(item);
    setDept('');
    setEstateId('');
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setDept('');
    setEstateId('');
  };

  const handleResolve = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedItem || !dept.trim() || !estateId) {
      toast.warning('Incomplete data', 'Department dan Estate wajib diisi.');
      return;
    }

    resolveMutation.mutate();
  };

  const columns: Column<UnmappedCostCenter>[] = [
    {
      key: 'cost_center',
      label: 'Cost Center',
      sortable: true,
      className: 'font-bold',
      render: (_value, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-forest-900">{row.cost_center}</span>
          <span className="text-[11px] font-medium text-forest-400">{row.source}</span>
        </div>
      ),
    },
    {
      key: 'employee_name',
      label: 'Employee',
      sortable: true,
      render: (_value, row) => (
        <div className="min-w-44">
          <p className="text-sm font-semibold text-forest-900">{row.employee_name || '-'}</p>
          <p className="text-xs text-forest-500">{row.login_name || row.employee_sap_id || '-'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_value, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'last_seen_at',
      label: 'Last Seen',
      sortable: true,
      render: (value) => formatDate(value as string | null | undefined),
    },
    {
      key: 'notes',
      label: 'Reason',
      render: (value) => <span className="text-xs text-forest-600">{formatReason(value as string | null | undefined)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (_value, row) => (
        <div className="flex justify-end">
          {canResolve && row.status !== 'resolved' && (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => handleOpenResolve(row)}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Resolve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl ring-4 ring-amber-50">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Unmapped Cost Centers</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">LDAP login cost center queue</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            {visibleCountLabel}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['unmapped-cost-centers'] })}
            leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide transition-all',
              status === option.value
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-white text-forest-600 border border-gray-100 hover:bg-forest-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataTable<UnmappedCostCenter>
        columns={columns}
        data={unmappedRows}
        isLoading={isLoading}
        searchKeys={['cost_center', 'employee_name', 'login_name', 'employee_sap_id', 'status']}
        searchPlaceholder="Search unmapped cost centers..."
        rowKey={(item) => item.id}
        emptyMessage="No unmapped cost centers found"
      />

      <Modal
        isOpen={!!selectedItem}
        onClose={handleCloseModal}
        title="Resolve Cost Center"
        description={selectedItem ? selectedItem.cost_center : undefined}
        size="md"
        persistent={resolveMutation.isPending}
      >
        <form onSubmit={handleResolve} className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-forest-500">Employee</p>
            <p className="mt-1 text-sm font-semibold text-forest-900">{selectedItem?.employee_name || '-'}</p>
            <p className="text-xs text-forest-500">{selectedItem?.login_name || selectedItem?.employee_sap_id || '-'}</p>
          </div>

          <Input
            label="Department"
            value={dept}
            onChange={(event) => setDept(event.target.value)}
            maxLength={30}
            placeholder="e.g. Corporate IT"
            required
          />

          <Select
            label="Estate"
            value={estateId}
            onChange={(event) => setEstateId(event.target.value)}
            options={estateOptions}
            placeholder="Select estate"
            required
          />

          {selectedItem && selectedItem.cost_center.length > 10 && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              Kode Cost Center melebihi 10 karakter.
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={resolveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={resolveMutation.isPending}
              disabled={!dept.trim() || !estateId || Boolean(selectedItem && selectedItem.cost_center.length > 10)}
              leftIcon={<Wallet className="h-4 w-4" />}
            >
              Resolve
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const StatusBadge: React.FC<{ status: UnmappedCostCenter['status'] }> = ({ status }) => {
  const style = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    ignored: 'bg-gray-50 text-gray-600 border-gray-100',
  }[status];

  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide', style)}>
      {status}
    </span>
  );
};

function formatDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatReason(value?: string | null): string {
  if (!value) return '-';

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.reason === 'string') {
      return parsed.reason.replace(/_/g, ' ');
    }
  } catch {
    return value;
  }

  return value;
}

function getErrorMessage(err: unknown): string {
  const responseData = (err as AxiosError<ApiErrorData>).response?.data;
  const errors = responseData?.errors;

  if (errors) {
    const firstKey = Object.keys(errors)[0];
    const firstError = firstKey ? errors[firstKey]?.[0] : null;
    if (firstError) return firstError;
  }

  return responseData?.message || 'Request failed.';
}

export default UnmappedCostCentersPage;
