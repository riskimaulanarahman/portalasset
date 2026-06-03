import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Eye, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { Textarea } from '../components/ui/FormFields';
import { formatDate, cn } from '../lib/utils';

interface ApprovalRequest extends Record<string, unknown> {
  id: number;
  reference_table: string;
  reference_id: number;
  current_sequence: number;
  status: string;
  created_at: string;
  workflow: {
    name: string;
    module_name: string;
  };
  requester?: {
    name: string;
  };
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

interface TransferDetail {
  id: number;
  transfer_code: string;
  type: string;
  from_estate_id: string;
  to_estate_id: string;
  from_estate?: { estate: string; estate_id: string };
  to_estate?: { estate: string; estate_id: string };
  status: string;
  transfer_date: string;
  notes: string;
  items: {
    item_id: string;
    qty: number;
    item_type?: string;
    item_name?: string;
    current_stock?: number | null;
    projected_stock?: number | null;
  }[];
  approval_requests?: {
    id: number;
    current_sequence: number;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    workflow?: { name: string; steps: ApprovalStep[] };
    logs: ApprovalLog[];
  }[];
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  Approver: 'Approver',
  Reviewer: 'Reviewer',
  Acknowledgment: 'Ack',
};

type ApprovalRequestItem = NonNullable<TransferDetail['approval_requests']>[number];

const ApprovalAccordion: React.FC<{ request: ApprovalRequestItem }> = ({ request }) => {
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
                  <div className="shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mt-0.5">
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

const ApprovalsPage: React.FC = () => {
  useTitle('My Approvals');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<'Approve' | 'Reject' | null>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading } = useQuery<{ data: ApprovalRequest[] }>({
    queryKey: ['my-approvals'],
    queryFn: async () => {
      const response = await api.get('/approvals/my-approvals');
      return response.data;
    },
  });

  const { data: transferDetailData, isLoading: isDetailLoading } = useQuery<{ data: TransferDetail }>({
    queryKey: ['approval-transfer-detail', selectedRequest?.reference_id],
    enabled: selectedRequest !== null && selectedRequest.reference_table === 'transfers',
    queryFn: async () => {
      const res = await api.get(`/transfers/${selectedRequest!.reference_id}`);
      return res.data;
    },
  });
  const transferDetail = transferDetailData?.data ?? null;

  const mutation = useMutation({
    mutationFn: (payload: { id: number; action: 'Approve' | 'Reject'; comment?: string }) => {
      const route = payload.action === 'Approve' ? 'approve' : 'reject';
      return api.post(`/approvals/${payload.id}/${route}`, { comment: payload.comment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['notification-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedRequest(null);
      setPendingAction(null);
      success('Success', `Request has been ${variables.action.toLowerCase()}ed.`);
    },
    onError: (err: any) => {
      toastError('Action failed', err.response?.data?.message || 'Could not process the request.');
    },
  });

  const closeModal = () => {
    setSelectedRequest(null);
    setPendingAction(null);
  };

  const columns: Column<ApprovalRequest>[] = [
    { key: 'created_at', label: 'Date Requested', sortable: true, render: (val) => formatDate(String(val ?? '')) },
    { key: 'workflow', label: 'Workflow', render: (_, row) => row.workflow?.name },
    { key: 'reference', label: 'Ref ID', render: (_, row) => `${row.workflow?.module_name} #${row.reference_id}` },
    { key: 'requester', label: 'Requester', render: (_, row) => row.requester?.name || 'System' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={String(val) === 'Approved' ? 'active' : String(val) === 'Rejected' ? 'inactive' : 'pending'}>
          {String(val)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex justify-end pr-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); }}
            className="text-forest-700 hover:text-forest-800 bg-forest-50 p-1.5 rounded-lg border border-forest-100 transition-colors"
            title="Review & Tindak Lanjuti"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">My Approvals</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Review and approve pending requests demanding your attention.</p>
          </div>
        </div>
      </div>

      <DataTable<ApprovalRequest>
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKeys={['reference_id', 'workflow.name', 'requester.name']}
        searchPlaceholder="Search by workflow or requester..."
        rowKey={(item) => item.id}
        pageSize={10}
        emptyMessage="No pending approvals"
      />

      {/* Unified detail + action modal */}
      <Modal
        isOpen={selectedRequest !== null}
        onClose={closeModal}
        title={selectedRequest ? `Review — ${selectedRequest.workflow?.module_name} #${selectedRequest.reference_id}` : ''}
        description={selectedRequest ? `Workflow: ${selectedRequest.workflow?.name}` : ''}
        size="lg"
      >
        {isDetailLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-32 bg-gray-100 rounded" />
          </div>
        ) : transferDetail ? (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Kode Transfer</p>
                <p className="font-semibold text-gray-900">{transferDetail.transfer_code}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tipe</p>
                <p className="font-semibold text-gray-900">{transferDetail.type}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Dari Estate</p>
                <p className="font-semibold text-gray-900">{transferDetail.from_estate?.estate ?? transferDetail.from_estate_id}</p>
                {transferDetail.from_estate?.estate_id && <p className="text-[11px] text-gray-400">{transferDetail.from_estate.estate_id}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Ke Estate</p>
                <p className="font-semibold text-gray-900">{transferDetail.to_estate?.estate ?? transferDetail.to_estate_id}</p>
                {transferDetail.to_estate?.estate_id && <p className="text-[11px] text-gray-400">{transferDetail.to_estate.estate_id}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</p>
                <span className={cn(
                  'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                  transferDetail.status === 'Approved'  ? 'bg-green-100 text-green-800'  :
                  transferDetail.status === 'Rejected'  ? 'bg-red-100 text-red-800'      :
                  transferDetail.status === 'Cancelled' ? 'bg-gray-100 text-gray-500'    :
                  'bg-orange-100 text-orange-800'
                )}>
                  {transferDetail.status}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tanggal</p>
                <p className="font-semibold text-gray-900">{formatDate(transferDetail.transfer_date ?? '')}</p>
              </div>
            </div>

            {transferDetail.notes && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Catatan</p>
                <p className="text-gray-700">{transferDetail.notes}</p>
              </div>
            )}

            {/* Items */}
            {(transferDetail.items ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Item Transfer</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Stok Saat Ini</th>
                        <th className="px-4 py-2 text-right">Proyeksi Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transferDetail.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-800">{item.item_name ?? item.item_id}</p>
                            {item.item_name && <p className="text-[11px] text-gray-400 font-mono">{item.item_id}</p>}
                          </td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Approval chain accordion */}
            {(transferDetail.approval_requests ?? []).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Status Persetujuan</p>
                {transferDetail.approval_requests!.map((req) => (
                  <ApprovalAccordion key={req.id} request={req} />
                ))}
              </div>
            )}

            {/* Action area */}
            {selectedRequest?.status === 'Pending' && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {pendingAction === null ? (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="danger"
                      leftIcon={<XCircle className="h-4 w-4" />}
                      onClick={() => setPendingAction('Reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      onClick={() => setPendingAction('Approve')}
                    >
                      Approve
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const comment = fd.get('comment') as string;
                      if (selectedRequest) {
                        mutation.mutate({ id: selectedRequest.id, action: pendingAction, comment });
                      }
                    }}
                    className="space-y-3"
                  >
                    <Textarea
                      label={pendingAction === 'Reject' ? 'Alasan Penolakan' : 'Komentar (Opsional)'}
                      name="comment"
                      rows={3}
                      required={pendingAction === 'Reject'}
                      placeholder={pendingAction === 'Reject' ? 'Berikan alasan penolakan...' : 'Catatan opsional...'}
                    />
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" type="button" onClick={() => setPendingAction(null)}>
                        Batal
                      </Button>
                      <Button
                        variant={pendingAction === 'Approve' ? 'success' : 'danger'}
                        type="submit"
                        loading={mutation.isPending}
                        leftIcon={pendingAction === 'Approve' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      >
                        Confirm {pendingAction}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : !isDetailLoading && selectedRequest ? (
          <p className="text-sm text-gray-400 text-center py-4">Gagal memuat detail transfer.</p>
        ) : null}
      </Modal>
    </div>
  );
};

export default ApprovalsPage;
