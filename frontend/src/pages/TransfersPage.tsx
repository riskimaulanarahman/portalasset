import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Trash2, Download, History, XCircle, Eye, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { Input, Textarea, FormGroup, SearchableSelect } from '../components/ui/FormFields';
import MemberPicker, { type MemberPickerItem } from '../components/MemberPicker';
import { cn, formatDate, getStoredUser, isHeadOfficeUser, parseBoolean } from '../lib/utils';
import { showConfirm } from '../utils/SwalUtils';

interface TransferItem {
  item_id: string;
  qty: number;
  item_type?: string;
  item_name?: string;
  current_stock?: number | null;
  projected_stock?: number | null;
}

interface Transfer extends Record<string, unknown> {
  id: number;
  transfer_code: string;
  type: 'Asset' | 'Material';
  from_estate_id: string;
  to_estate_id: string;
  from_estate?: { estate: string; estate_id: string };
  to_estate?: { estate: string; estate_id: string };
  anggota_id: string;
  anggota_penerima?: {
    sap_id: string;
    nama: string;
  };
  status: string;
  transfer_date: string;
  notes: string;
  items: TransferItem[];
  material_histories?: MaterialTransferHistory[];
  approval_requests?: ApprovalRequest[];
}

interface ApprovalLog {
  id: number;
  sequence: number;
  action: 'Approved' | 'Rejected';
  comment: string | null;
  created_at: string;
  user?: { name: string };
}

interface ApprovalStep {
  sequence: number;
  role_name: string | null;
  user_id: number | null;
  action_type: 'Reviewer' | 'Approver' | 'Acknowledgment';
  assignee_names?: string[];
  user?: { name: string };
}

interface ApprovalRequest {
  id: number;
  current_sequence: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  workflow?: {
    name: string;
    steps: ApprovalStep[];
  };
  logs: ApprovalLog[];
}

interface MaterialTransferHistory {
  id: number;
  source_material_code: string;
  destination_material_code: string;
  qty: string | number;
  destination_created: boolean;
  source_stock_before: string | number;
  source_stock_after: string | number;
  destination_stock_before: string | number;
  destination_stock_after: string | number;
  processed_by?: string;
  processed_at?: string;
  from_estate?: {
    estate?: string;
    estate_id?: string;
  };
  to_estate?: {
    estate?: string;
    estate_id?: string;
  };
}

interface EstateOption {
  id: number;
  estate: string;
  estate_id: string;
}

interface AnggotaOption {
  sap_id: string;
  login_name?: string | null;
  nama: string;
  position?: string | null;
  department?: string | null;
  company_code?: string | null;
  cost_center?: string | null;
  not_active?: boolean;
}

interface AssetOption {
  reg_id: string;
  asset_no?: string;
  type?: string;
  manufacture?: string;
  series?: string;
  not_active?: boolean;
  asset_department_id?: number | null;
  asset_division_id?: number | null;
  department?: { name?: string } | null;
  division?: { name?: string } | null;
}

interface MaterialOption {
  code: string;
  nama: string;
  stock?: number;
  not_active?: boolean;
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  Approver: 'Approver',
  Reviewer: 'Reviewer',
  Acknowledgment: 'Ack',
};

const ApprovalAccordion: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
  const [isOpen, setIsOpen] = useState(true);
  const steps = [...(request.workflow?.steps ?? [])].sort((a, b) => a.sequence - b.sequence);
  const logs = request.logs ?? [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-800"
      >
        <span>Rantai Approval — {request.workflow?.name ?? 'Workflow'}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-all duration-300', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="divide-y divide-gray-100">
            {steps.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400 italic">Tidak ada workflow step yang dikonfigurasi.</p>
            )}
            {steps.map((step) => {
              const log = logs.find((l) => l.sequence === step.sequence);
              const isCurrent = request.status === 'Pending' && step.sequence === request.current_sequence;
              const isApproved = log?.action === 'Approved';
              const isRejected = log?.action === 'Rejected';

              let statusBadge: React.ReactNode;
              if (isApproved) {
                statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>;
              } else if (isRejected) {
                statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>;
              } else if (isCurrent) {
                statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 animate-pulse">Menunggu</span>;
              } else {
                statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Belum Giliran</span>;
              }

              const assigneeLabel = step.assignee_names?.length
                ? step.assignee_names.join(', ')
                : (step.user?.name ?? step.role_name ?? '—');
              const approverName = log?.user?.name ?? assigneeLabel;

              return (
                <div key={step.sequence} className={cn('flex items-start gap-3 px-4 py-3', isCurrent && 'bg-orange-50/50')}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mt-0.5">
                    {step.sequence}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{approverName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-forest-50 text-forest-700 border border-forest-100">
                        {ACTION_TYPE_LABEL[step.action_type] ?? step.action_type}
                      </span>
                      {statusBadge}
                    </div>
                    {log?.comment && (
                      <p className="mt-1 text-xs text-gray-500 italic">"{log.comment}"</p>
                    )}
                    {log?.created_at && (
                      <p className="mt-0.5 text-[11px] text-gray-400">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const TransfersPage: React.FC = () => {
  useTitle('Transfers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'Asset' | 'Material'>('Material');
  const [items, setItems] = useState<TransferItem[]>([{ item_id: '', qty: 1 }]);
  const [isCheckingWorkflow, setIsCheckingWorkflow] = useState(false);
  const [selectedHistoryTransferId, setSelectedHistoryTransferId] = useState<number | null>(null);
  const [detailTransferId, setDetailTransferId] = useState<number | null>(null);

  // Auth user state
  const user = getStoredUser();
  const userEstateId = user?.estate_id ? String(user.estate_id) : '';
  const isHoUser = isHeadOfficeUser(); // #22 FIX: use centralized helper
  const [sourceEstateId, setSourceEstateId] = useState<string>(isHoUser ? '' : userEstateId);
  const [toEstateId, setToEstateId]         = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: detailData, isLoading: isDetailLoading } = useQuery<{ data: Transfer }>({
    queryKey: ['transfers', detailTransferId],
    enabled: detailTransferId !== null,
    queryFn: async () => {
      const response = await api.get(`/transfers/${detailTransferId}`);
      return response.data;
    },
  });
  const detailTransfer = detailData?.data ?? null;

  const { data: historyData, isLoading: isHistoryLoading } = useQuery<{ data: Transfer }>({
    queryKey: ['transfers', selectedHistoryTransferId, 'history'],
    enabled: selectedHistoryTransferId !== null,
    queryFn: async () => {
      const response = await api.get(`/transfers/${selectedHistoryTransferId}`);
      return response.data;
    },
    staleTime: 0,
  });
  const selectedHistoryTransfer = historyData?.data ?? null;

  const { data, isLoading } = useQuery<{ data: Transfer[] }>({
    queryKey: ['transfers'],
    queryFn: async () => {
      const response = await api.get('/transfers');
      return response.data;
    },
  });

  const { data: estatesData } = useQuery<EstateOption[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const response = await api.get('/estates');
      return response.data.data;
    },
  });

  const { data: destinationEstatesData } = useQuery<{ data: EstateOption[] }>({
    queryKey: ['estates', 'transfer-destination'],
    queryFn: async () => {
      const response = await api.get('/estates', {
        params: { context: 'transfer-destination' },
      });
      return response.data;
    },
  });
  
  const { data: anggotasData, isFetching: isFetchingAnggotas } = useQuery<{ data: AnggotaOption[] }>({
    queryKey: ['anggotas'],
    queryFn: async () => {
      const response = await api.get('/anggotas');
      return response.data;
    },
  });

  const { data: assetOptionsData, isLoading: isLoadingAssets } = useQuery<{ data: AssetOption[] }>({
    queryKey: ['transfer-asset-options', sourceEstateId],
    enabled: transferType === 'Asset' && !!sourceEstateId,
    queryFn: async () => {
      const response = await api.get('/assets', {
        params: { all: 1, estate_id: sourceEstateId },
      });
      return response.data;
    },
  });

  const { data: materialOptionsData, isLoading: isLoadingMaterials } = useQuery<{ data: MaterialOption[] }>({
    queryKey: ['transfer-material-options', sourceEstateId],
    enabled: transferType === 'Material' && !!sourceEstateId,
    queryFn: async () => {
      const response = await api.get('/materials', { params: { all: 1, estate_id: sourceEstateId } });
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      setItems([{ item_id: '', qty: 1 }]);
      setToEstateId('');
      setSelectedRecipientId('');
      if (isHoUser) setSourceEstateId('');
      success('Transfer created', 'The transfer has been submitted for approval.');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? (Object.values(errors)[0] as string[] | undefined)?.[0] : null;
      toastError('Submission failed', firstError || err.response?.data?.message || 'Could not process the transfer.');
    },
  });

  // #18 FIX: Cancel transfer mutation
  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/transfers/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      success('Transfer dibatalkan', 'Status transfer telah diubah menjadi Cancelled.');
    },
    onError: (err: any) => {
      toastError('Gagal membatalkan', err.response?.data?.message || 'Terjadi kesalahan.');
    },
  });

  const handleCancelTransfer = async (transfer: Transfer) => {
    const result = await showConfirm(
      `Batalkan transfer "${transfer.transfer_code}"?`,
      'Transfer yang sudah dibatalkan tidak dapat diproses kembali.'
    );
    if (result.isConfirmed) {
      cancelMutation.mutate(transfer.id);
    }
  };

  const addItemRow = () => setItems([...items, { item_id: '', qty: 1 }]);
  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  const updateItemRow = (index: number, field: keyof TransferItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  useEffect(() => {
    setItems([{ item_id: '', qty: 1 }]);
  }, [transferType]);

  const itemOptions = useMemo(() => {
    if (transferType === 'Asset') {
      return (assetOptionsData?.data ?? [])
        .filter((asset) => !asset.not_active)
        .map((asset) => ({
          value: asset.reg_id,
          label: [
            asset.reg_id,
            asset.type ? `- ${asset.type}` : '',
            asset.manufacture ? asset.manufacture : '',
            asset.series ? `(${asset.series})` : '',
            asset.department?.name ? `| ${asset.department.name}` : '',
            asset.division?.name ? `/ ${asset.division.name}` : '',
            !asset.asset_department_id || !asset.asset_division_id ? '| Lengkapi dept/divisi' : '',
            asset.asset_no ? `| ${asset.asset_no}` : '',
          ]
            .filter(Boolean)
            .join(' '),
        }));
    }

    return (materialOptionsData?.data ?? [])
      .filter((material) => !material.not_active)
      .map((material) => ({
        value: material.code,
        label: `${material.code} - ${material.nama}${typeof material.stock === 'number' ? ` (Stock: ${material.stock})` : ''}`,
      }));
  }, [assetOptionsData?.data, materialOptionsData?.data, transferType]);

  const isItemOptionsLoading = transferType === 'Asset' ? isLoadingAssets : isLoadingMaterials;
  const itemSearchPlaceholder = transferType === 'Asset' ? 'Search asset by reg ID, type, or serial...' : 'Search material by code or name...';
  const activeMembers: MemberPickerItem[] = useMemo(
    () => (anggotasData?.data ?? [])
      .filter((anggota) => !parseBoolean(anggota.not_active))
      .map((anggota) => ({
        sap_id: String(anggota.sap_id),
        login_name: anggota.login_name ?? null,
        nama: String(anggota.nama ?? ''),
        position: anggota.position ?? null,
        department: anggota.department ?? null,
        company_code: anggota.company_code ?? null,
        cost_center: anggota.cost_center ?? null,
      })),
    [anggotasData],
  );

  // #21 FIX: Helper untuk mendapatkan stok tersedia sebuah material
  const getMaterialStock = (materialCode: string): number | null => {
    if (transferType !== 'Material') return null;
    const mat = (materialOptionsData?.data ?? []).find((m) => m.code === materialCode);
    return typeof mat?.stock === 'number' ? mat.stock : null;
  };

  // Validasi qty vs stok sebelum submit
  const validateItemQtys = (): string | null => {
    if (transferType !== 'Material') return null;
    for (const item of items) {
      if (!item.item_id) continue;
      const available = getMaterialStock(item.item_id);
      if (available !== null && Number(item.qty) > available) {
        return `Qty material "${item.item_id}" (${item.qty}) melebihi stok tersedia (${available}).`;
      }
    }
    return null;
  };

  const validateAssetOwnership = (): string | null => {
    if (transferType !== 'Asset') return null;

    for (const item of items) {
      if (!item.item_id) continue;

      const asset = (assetOptionsData?.data ?? []).find((candidate) => candidate.reg_id === item.item_id);
      if (asset && (!asset.asset_department_id || !asset.asset_division_id)) {
        return `Asset "${item.item_id}" belum memiliki Department dan Divisi. Lengkapi ownership asset sebelum transfer/distribusi.`;
      }
    }

    return null;
  };

  const handleDownloadBA = async (id: number) => {
    try {
      const response = await api.get(`/transfers/${id}/berita-acara`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Optional: revoke the URL after a small delay to free memory, but the browser handles it mostly if tab stays open.
    } catch (err: any) {
      toastError('Error', 'Could not open the Berita Acara document.');
    }
  };

  const columns: Column<Transfer>[] = [
    { key: 'transfer_code', label: 'Transfer Code', sortable: true },
    { key: 'type', label: 'Type' },
    {
      key: 'from_estate_id', label: 'From',
      render: (_, item) => item.from_estate
        ? <span>{item.from_estate.estate} <span className="text-xs text-gray-400">({item.from_estate.estate_id})</span></span>
        : <span>{String(item.from_estate_id)}</span>,
    },
    {
      key: 'to_estate_id', label: 'To',
      render: (_, item) => item.to_estate
        ? <span>{item.to_estate.estate} <span className="text-xs text-gray-400">({item.to_estate.estate_id})</span></span>
        : <span>{String(item.to_estate_id)}</span>,
    },
    { key: 'anggota_penerima.nama', label: 'Recipient', render: (_, item) => item.anggota_penerima?.nama || '-' },
    { key: 'transfer_date', label: 'Date', render: (val) => formatDate(String(val ?? '')) },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-semibold",
          val === 'Approved'  ? 'bg-green-100 text-green-800'  :
          val === 'Rejected'  ? 'bg-red-100 text-red-800'      :
          val === 'Cancelled' ? 'bg-gray-100 text-gray-500'    :
          'bg-orange-100 text-orange-800'
        )}>
          {String(val)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, item) => (
        <div className="flex justify-end gap-2 pr-2">
          <button
            onClick={() => setDetailTransferId(item.id)}
            className="text-forest-700 hover:text-forest-800 bg-forest-50 p-1.5 rounded-lg border border-forest-100 transition-colors"
            title="Lihat Detail Transfer"
          >
            <Eye className="h-4 w-4" />
          </button>
          {item.status === 'Approved' && item.type === 'Material' && (
            <button
              onClick={() => setSelectedHistoryTransferId(item.id)}
              className="text-sky-700 hover:text-sky-800 bg-sky-50 p-1.5 rounded-lg border border-sky-100 transition-colors"
              title="View Material Transfer History"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          {item.status === 'Approved' && (
            <button
              onClick={() => handleDownloadBA(item.id)}
              className="text-primary hover:text-forest-700 bg-forest-50 p-1.5 rounded-lg border border-forest-100 transition-colors"
              title="View Berita Acara (PDF)"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {/* #18 FIX: Cancel button — hanya untuk Draft/Pending Approval */}
          {['Draft', 'Pending Approval'].includes(String(item.status)) && (
            <button
              onClick={() => handleCancelTransfer(item)}
              disabled={cancelMutation.isPending}
              className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100 transition-colors disabled:opacity-40"
              title="Batalkan Transfer"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Transfers</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage asset and material transfers between estates.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </button>
      </div>

      <DataTable<Transfer>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKeys={['transfer_code', 'from_estate.estate_id', 'to_estate.estate_id']}
        searchPlaceholder="Search by code or estate..."
        rowKey={(item) => item.id}
        pageSize={15}
        emptyMessage="No transfers recorded yet"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setToEstateId('');
          setSelectedRecipientId('');
          if (isHoUser) setSourceEstateId('');
        }}
        title="Create Transfer Request"
        description="Submit a new transfer request for approval"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              type: transferType,
              from_estate_id: fd.get('from_estate_id') as string,
              to_estate_id: fd.get('to_estate_id') as string,
              anggota_id: selectedRecipientId,
              notes: fd.get('notes') as string,
              items: items
                .filter(i => i.item_id.trim() !== '')
                .map((item) => transferType === 'Asset'
                  ? { item_id: item.item_id }
                  : { item_id: item.item_id, qty: item.qty }
                )
            };

            // #21 FIX: Validasi qty vs stok tersedia sebelum submit
            const qtyError = validateItemQtys();
            if (qtyError) {
              toastError('Validasi Qty', qtyError);
              return;
            }

            const ownershipError = validateAssetOwnership();
            if (ownershipError) {
              toastError('Ownership belum lengkap', ownershipError);
              return;
            }

            // Check workflow before submitting
            const checkWorkflow = async () => {
              setIsCheckingWorkflow(true);
              try {
                const res = await api.get('/approval-workflows/check', {
                  params: { module_name: 'Transfer', estate_id: payload.to_estate_id }
                });
                if (res.data.exists && res.data.ready !== false) {
                  mutation.mutate(payload);
                } else {
                  toastError(
                    'Workflow belum dikonfigurasi',
                    res.data.message || 'Transfer tidak dapat dibuat sebelum workflow approval aktif tersedia untuk destination estate atau global.'
                  );
                }
              } catch (err) {
                console.error("Workflow check failed", err);
                toastError('Workflow check gagal', 'Transfer tidak dikirim karena status workflow tidak dapat dipastikan.');
              } finally {
                setIsCheckingWorkflow(false);
              }
            };

            checkWorkflow();
          }}
          className="space-y-4"
        >
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="Material" checked={transferType === 'Material'} onChange={() => setTransferType('Material')} />
              Material
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="Asset" checked={transferType === 'Asset'} onChange={() => setTransferType('Asset')} />
              Asset
            </label>
          </div>

          <FormGroup cols={2}>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-forest-900">Source Estate <span className="text-red-500">*</span></label>
              <select 
                name="from_estate_id" 
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed" 
                required 
                value={sourceEstateId}
                onChange={(e) => {
                  setSourceEstateId(e.target.value);
                  setItems((current) => current.map((row) => ({ ...row, item_id: '' })));
                }}
                disabled={!isHoUser && !!userEstateId}
              >
                <option value="">Select Estate...</option>
                {(estatesData ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.estate} ({e.estate_id})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-forest-900">Destination Estate <span className="text-red-500">*</span></label>
              <select
                name="to_estate_id"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                required
                value={toEstateId}
                onChange={(e) => setToEstateId(e.target.value)}
              >
                <option value="">Select Estate...</option>
                {(destinationEstatesData?.data ?? []).filter((e) => String(e.id) !== sourceEstateId).map((e) => (
                  <option key={e.id} value={e.id}>{e.estate} ({e.estate_id})</option>
                ))}
              </select>
            </div>
          </FormGroup>

          <MemberPicker
            label="Member / Recipient (Anggota)"
            value={selectedRecipientId}
            members={activeMembers}
            isLoading={isFetchingAnggotas}
            onChange={setSelectedRecipientId}
            modalTitle="Select Recipient Member"
            modalDescription="Search members, then choose Select on the matching row."
            searchPlaceholder="Search by SAP ID, name, department, position..."
            emptyMessage="No active members found"
          />

          {/* Transfer Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-2">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-forest-900 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 font-bold">{transferType} Code / ID *</th>
                  {transferType === 'Material' && (
                    <th className="px-4 py-2 font-bold w-32">Qty *</th>
                  )}
                  <th className="px-4 py-2 font-bold w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <SearchableSelect
                        options={itemOptions}
                        value={item.item_id}
                        onChange={(value) => updateItemRow(idx, 'item_id', String(value))}
                        placeholder={
                          !sourceEstateId
                            ? 'Select source estate first...'
                            : isItemOptionsLoading
                              ? 'Loading options...'
                              : itemSearchPlaceholder
                        }
                        disabled={!sourceEstateId || isItemOptionsLoading}
                        noOptionsText={sourceEstateId ? `No ${transferType.toLowerCase()} available` : 'Select source estate first'}
                      />
                    </td>
                    {transferType === 'Material' && (
                    <td className="px-4 py-2">
                      {/* #21 FIX: Tampilkan stok tersedia dan highlight jika qty melebihi stok */}
                      {(() => {
                        const available = getMaterialStock(item.item_id);
                        const exceedsStock = available !== null && Number(item.qty) > available;
                        return (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              name={`item_${idx}_qty`}
                              value={item.qty}
                              onChange={(e) => updateItemRow(idx, 'qty', Number(e.target.value))}
                              min="1"
                              required
                              className={`py-1 ${exceedsStock ? 'border-red-400 ring-red-200' : ''}`}
                            />
                            {available !== null && item.item_id && (
                              <p className={`text-[10px] font-semibold ${exceedsStock ? 'text-red-500' : 'text-forest-500'}`}>
                                Stok: {available}{exceedsStock ? ' ⚠ melebihi stok' : ''}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    )}
                    <td className="px-4 py-2 text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-center">
               <button type="button" onClick={addItemRow} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                  <Plus className="h-3 w-3" /> Add Item
               </button>
            </div>
          </div>

          <Textarea label="Notes" name="notes" rows={2} placeholder="Optional notes about this transfer" />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setToEstateId('');
                setSelectedRecipientId('');
                if (isHoUser) setSourceEstateId('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={mutation.isPending || isCheckingWorkflow}>Submit Transfer</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={detailTransferId !== null}
        onClose={() => setDetailTransferId(null)}
        title={`Detail Transfer${detailTransfer ? `: ${detailTransfer.transfer_code}` : ''}`}
        description="Informasi lengkap dan status pengajuan transfer"
        size="lg"
      >
        {isDetailLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ) : detailTransfer ? (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Kode Transfer</p>
                <p className="font-semibold text-gray-900">{detailTransfer.transfer_code}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tipe</p>
                <p className="font-semibold text-gray-900">{String(detailTransfer.type)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Dari Estate</p>
                <p className="font-semibold text-gray-900">{detailTransfer.from_estate?.estate ?? String(detailTransfer.from_estate_id)}</p>
                {detailTransfer.from_estate?.estate_id && <p className="text-[11px] text-gray-400">{detailTransfer.from_estate.estate_id}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Ke Estate</p>
                <p className="font-semibold text-gray-900">{detailTransfer.to_estate?.estate ?? String(detailTransfer.to_estate_id)}</p>
                {detailTransfer.to_estate?.estate_id && <p className="text-[11px] text-gray-400">{detailTransfer.to_estate.estate_id}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</p>
                <span className={cn(
                  'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                  detailTransfer.status === 'Approved'  ? 'bg-green-100 text-green-800'  :
                  detailTransfer.status === 'Rejected'  ? 'bg-red-100 text-red-800'      :
                  detailTransfer.status === 'Cancelled' ? 'bg-gray-100 text-gray-500'    :
                  'bg-orange-100 text-orange-800'
                )}>
                  {String(detailTransfer.status)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tanggal</p>
                <p className="font-semibold text-gray-900">{formatDate(String(detailTransfer.transfer_date ?? ''))}</p>
              </div>
            </div>

            {detailTransfer.notes && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Catatan</p>
                <p className="text-gray-700">{String(detailTransfer.notes)}</p>
              </div>
            )}

            {/* Items */}
            {(detailTransfer.items ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Item Transfer</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        {detailTransfer.type === 'Material' && (
                          <>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Stok Saat Ini</th>
                            <th className="px-4 py-2 text-right">Proyeksi Sisa</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(detailTransfer.items as TransferItem[]).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-800">{item.item_name ?? item.item_id}</p>
                            {item.item_name && <p className="text-[11px] text-gray-400 font-mono">{item.item_id}</p>}
                          </td>
                          {detailTransfer.type === 'Material' && (
                            <>
                          <td className="px-4 py-2 text-right text-gray-700">{item.qty}</td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            {item.current_stock !== null && item.current_stock !== undefined ? item.current_stock : '—'}
                          </td>
                          <td className={cn('px-4 py-2 text-right font-semibold',
                            item.projected_stock !== null && item.projected_stock !== undefined
                              ? item.projected_stock < 0 ? 'text-red-600' : 'text-green-700'
                              : 'text-gray-400'
                          )}>
                            {item.projected_stock !== null && item.projected_stock !== undefined ? item.projected_stock : '—'}
                          </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Approval accordion */}
            {(detailTransfer.approval_requests ?? []).length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Status Persetujuan</p>
                {(detailTransfer.approval_requests as ApprovalRequest[]).map((req) => (
                  <ApprovalAccordion key={req.id} request={req} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400 text-center">
                Tidak ada workflow approval terkait. Transfer baru tidak dapat dibuat tanpa workflow aktif.
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={selectedHistoryTransferId !== null}
        onClose={() => setSelectedHistoryTransferId(null)}
        title={`Transfer History${selectedHistoryTransfer ? `: ${selectedHistoryTransfer.transfer_code}` : ''}`}
        description="Material stock movement created after final approval"
        size="lg"
      >
        {isHistoryLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ) : selectedHistoryTransfer?.type !== 'Material' ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
            History mutasi stok hanya berlaku untuk transfer material.
          </div>
        ) : (selectedHistoryTransfer?.material_histories?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
            Belum ada riwayat mutasi. Ini biasanya berarti transfer belum final approved atau data lama belum punya history.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedHistoryTransfer?.material_histories?.map((history) => (
              <div key={history.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {history.source_material_code} <span className="text-gray-400">→</span> {history.destination_material_code}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {history.from_estate?.estate_id ?? '-'} to {history.to_estate?.estate_id ?? '-'} • Qty {String(history.qty)}
                    </p>
                  </div>
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    history.destination_created ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  )}>
                    {history.destination_created ? 'New code created' : 'Stock moved to existing code'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-rose-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Source Stock</p>
                    <p className="mt-1 text-sm text-rose-900">
                      {String(history.source_stock_before)} → {String(history.source_stock_after)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Destination Stock</p>
                    <p className="mt-1 text-sm text-emerald-900">
                      {String(history.destination_stock_before)} → {String(history.destination_stock_after)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span>Processed by {history.processed_by ?? 'system'}</span>
                  <span>{history.processed_at ? formatDate(history.processed_at) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TransfersPage;
