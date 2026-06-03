import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { Textarea } from '../components/ui/FormFields';
import { formatDate } from '../lib/utils';

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

const ApprovalsPage: React.FC = () => {
  useTitle('My Approvals');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'Approve' | 'Reject'>('Approve');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading } = useQuery<{ data: ApprovalRequest[] }>({
    queryKey: ['my-approvals'],
    queryFn: async () => {
      const response = await api.get('/approvals/my-approvals');
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: { id: number; action: 'Approve' | 'Reject'; comment?: string }) => {
      const route = payload.action === 'Approve' ? 'approve' : 'reject';
      return api.post(`/approvals/${payload.id}/${route}`, { comment: payload.comment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      setSelectedRequest(null);
      success('Success', `Request has been ${variables.action.toLowerCase()}ed.`);
    },
    onError: (err: any) => {
      toastError('Action failed', err.response?.data?.message || 'Could not process the request.');
    },
  });

  const openActionModal = (req: ApprovalRequest, mode: 'Approve' | 'Reject') => {
    setSelectedRequest(req);
    setActionType(mode);
    setIsModalOpen(true);
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
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); openActionModal(row, 'Approve'); }} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); openActionModal(row, 'Reject'); }} leftIcon={<XCircle className="h-4 w-4" />}>
            Reject
          </Button>
        </div>
      )
    }
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${actionType} Request`}
        description={`You are about to ${actionType.toLowerCase()} ${selectedRequest?.workflow?.name} #${selectedRequest?.reference_id}`}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const comment = fd.get('comment') as string;
            if (selectedRequest) {
              mutation.mutate({ id: selectedRequest.id, action: actionType, comment });
            }
          }}
          className="space-y-4"
        >
          {actionType === 'Reject' && (
            <Textarea
              label="Reason for Rejection"
              name="comment"
              rows={3}
              required
              placeholder="Please provide a reason..."
            />
          )}

          {actionType === 'Approve' && (
            <Textarea
              label="Comments (Optional)"
              name="comment"
              rows={3}
              placeholder="Optional notes..."
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'Approve' ? 'success' : 'danger'}
              type="submit"
              loading={mutation.isPending}
            >
              Confirm {actionType}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ApprovalsPage;
