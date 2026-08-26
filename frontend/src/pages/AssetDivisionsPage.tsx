import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Plus } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/ui/Badge';
import AssetDivisionForm from '../components/forms/AssetDivisionForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

interface AssetDivision {
  [key: string]: any;
  id: number;
  asset_department_id: number;
  code?: string | null;
  name: string;
  not_active: boolean;
  department?: { name?: string; code?: string | null };
}

const AssetDivisionsPage: React.FC = () => {
  useTitle('Asset Divisions');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [selectedItem, setSelectedItem] = useState<AssetDivision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: departments } = useQuery<any[]>({
    queryKey: ['asset-departments'],
    queryFn: async () => {
      const response = await api.get('/asset-departments');
      return response.data.data;
    },
  });

  const { data, isLoading, error } = useQuery<AssetDivision[]>({
    queryKey: ['asset-divisions'],
    queryFn: async () => {
      const response = await api.get('/asset-divisions');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: unknown) => api.post('/asset-divisions', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-divisions'] }); queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); handleClose(); success('Division created'); },
    onError: (err: any) => toastError('Create failed', err.response?.data?.message || 'Could not save division.'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: AssetDivision) => api.put(`/asset-divisions/${payload.id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-divisions'] }); queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); handleClose(); success('Division updated'); },
    onError: (err: any) => toastError('Update failed', err.response?.data?.message || 'Could not save division.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/asset-divisions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-divisions'] }); queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); success('Division deleted'); },
    onError: (err: any) => toastError('Delete failed', err.response?.data?.message || 'Could not delete division.'),
  });

  const handleOpenAdd = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit = (item: AssetDivision) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleClose = () => { setSelectedItem(null); setIsModalOpen(false); };
  const handleSubmit = (formData: any) => selectedItem
    ? updateMutation.mutate({ ...formData, id: selectedItem.id })
    : createMutation.mutate(formData);
  const handleDelete = async (item: AssetDivision) => {
    const result = await showConfirm(`Delete division "${item.name}"?`);
    if (result.isConfirmed) deleteMutation.mutate(item.id);
  };

  const columns: Column<AssetDivision>[] = [
    { key: 'code', label: 'Code', sortable: true, render: (value) => String(value ?? '-') },
    { key: 'name', label: 'Division', sortable: true, className: 'font-semibold' },
    { key: 'department', label: 'Department', render: (value) => String((value as AssetDivision['department'])?.name ?? '-') },
    {
      key: 'not_active',
      label: 'Status',
      render: (value) => value ? <Badge variant="inactive" dot>Inactive</Badge> : <Badge variant="active" dot>Active</Badge>,
    },
  ];

  if (error) return <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">Failed to load asset divisions.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Asset Divisions</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Ownership divisions grouped under asset departments.</p>
          </div>
        </div>
        <button onClick={handleOpenAdd} className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" />
          Add Division
        </button>
      </div>

      <DataTable<AssetDivision>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['code', 'name']}
        searchPlaceholder="Search asset divisions..."
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        rowKey={(item) => item.id}
      />

      <Modal isOpen={isModalOpen} onClose={handleClose} title={selectedItem ? 'Edit Asset Division' : 'Add Asset Division'}>
        <AssetDivisionForm initialData={selectedItem} departments={departments ?? []} onSubmit={handleSubmit} onCancel={handleClose} />
      </Modal>
    </div>
  );
};

export default AssetDivisionsPage;
