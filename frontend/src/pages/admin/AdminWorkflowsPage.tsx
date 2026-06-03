import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus } from 'lucide-react';
import api from '../../api/axios';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ui/Toast';
import useTitle from '../../hooks/useTitle';
import WorkflowForm from '../../components/forms/WorkflowForm';
import { showConfirm } from '../../utils/SwalUtils';
import Badge from '../../components/ui/Badge';

const AdminWorkflowsPage: React.FC = () => {
  useTitle('Approval Workflows');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: workflowsData, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['approval-workflows'],
    queryFn: async () => {
      const response = await api.get('/approval-workflows');
      return response.data;
    },
  });

  const { data: rolesData } = useQuery<{ data: any[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles');
      return response.data;
    },
  });

  const { data: estatesData } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const response = await api.get('/estates');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/approval-workflows', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      setIsModalOpen(false);
      success('Success', 'Approval workflow created successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save workflow.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/approval-workflows/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      setIsModalOpen(false);
      success('Success', 'Approval workflow updated successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save workflow.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/approval-workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      success('Deleted', 'Approval workflow has been removed.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not delete workflow.');
    },
  });

  const handleOpenModal = (workflow: any = null) => {
    setSelectedWorkflow(workflow);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (selectedWorkflow) {
      updateMutation.mutate({ ...data, id: selectedWorkflow.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (workflow: any) => {
    const result = await showConfirm(
      'Delete Workflow',
      `Are you sure you want to delete workflow "${workflow.name}"?`,
      'Yes, delete it'
    );
    if (result.isConfirmed) {
      deleteMutation.mutate(workflow.id);
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Workflow Name', sortable: true, className: 'font-semibold' },
    { key: 'module_name', label: 'Module', sortable: true },
    { 
      key: 'estate', 
      label: 'Estate Scope', 
      render: (val: any) => val ? <span className="text-forest-600 font-bold">{val.estate}</span> : <span className="text-gray-400 italic">Global</span> 
    },
    {
      key: 'steps',
      label: 'Approval Steps',
      render: (_: any, row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.steps?.map((step: any, i: number) => (
            <div key={i} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
              <span className="font-bold text-gray-400">{step.sequence}.</span> 
              <span className="font-semibold uppercase tracking-wide text-forest-700">{step.role_name}</span>
            </div>
          ))}
          {(!row.steps || row.steps.length === 0) && <span className="text-xs text-gray-400">No steps defined</span>}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val: any) => (
        <Badge variant={val ? 'active' : 'inactive'} dot>
          {val ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Workflow className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Approval Workflows</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Define dynamic routing and steps for document approvals across modules.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </button>
      </div>

      <DataTable<any>
        columns={columns}
        data={workflowsData?.data ?? []}
        isLoading={isLoading}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        searchKeys={['name', 'module_name']}
        searchPlaceholder="Search workflows..."
        rowKey={(item: any) => item.id}
        pageSize={15}
        emptyMessage="No workflows configured yet"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
        description="Configure workflow name, target module, and routing sequence."
        size="lg"
      >
        <WorkflowForm
          initialData={selectedWorkflow}
          roles={rolesData?.data ?? []}
          estates={estatesData ?? []}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default AdminWorkflowsPage;
