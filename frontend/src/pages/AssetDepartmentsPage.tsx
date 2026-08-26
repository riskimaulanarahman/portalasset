import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/ui/Badge';
import AssetDepartmentForm from '../components/forms/AssetDepartmentForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

interface AssetDepartment {
  [key: string]: any;
  id: number;
  code?: string | null;
  name: string;
  not_active: boolean;
  divisions?: unknown[];
}

const AssetDepartmentsPage: React.FC = () => {
  useTitle('Asset Departments');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [selectedItem, setSelectedItem] = useState<AssetDepartment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery<AssetDepartment[]>({
    queryKey: ['asset-departments'],
    queryFn: async () => {
      const response = await api.get('/asset-departments');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: unknown) => api.post('/asset-departments', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); handleClose(); success('Department created'); },
    onError: (err: any) => toastError('Create failed', err.response?.data?.message || 'Could not save department.'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: AssetDepartment) => api.put(`/asset-departments/${payload.id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); handleClose(); success('Department updated'); },
    onError: (err: any) => toastError('Update failed', err.response?.data?.message || 'Could not save department.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/asset-departments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['asset-departments'] }); success('Department deleted'); },
    onError: (err: any) => toastError('Delete failed', err.response?.data?.message || 'Could not delete department.'),
  });

  const handleOpenAdd = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit = (item: AssetDepartment) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleClose = () => { setSelectedItem(null); setIsModalOpen(false); };
  const handleSubmit = (formData: any) => selectedItem
    ? updateMutation.mutate({ ...formData, id: selectedItem.id })
    : createMutation.mutate(formData);
  const handleDelete = async (item: AssetDepartment) => {
    const result = await showConfirm(`Delete department "${item.name}"?`);
    if (result.isConfirmed) deleteMutation.mutate(item.id);
  };

  const columns: Column<AssetDepartment>[] = [
    { key: 'code', label: 'Code', sortable: true, render: (value) => String(value ?? '-') },
    { key: 'name', label: 'Department', sortable: true, className: 'font-semibold' },
    { key: 'divisions', label: 'Divisions', render: (value) => Array.isArray(value) ? value.length : 0 },
    {
      key: 'not_active',
      label: 'Status',
      render: (value) => value ? <Badge variant="inactive" dot>Inactive</Badge> : <Badge variant="active" dot>Active</Badge>,
    },
  ];

  if (error) return <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">Failed to load asset departments.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Asset Departments</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Ownership departments for physical assets.</p>
          </div>
        </div>
        <button onClick={handleOpenAdd} className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </button>
      </div>

      <DataTable<AssetDepartment>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['code', 'name']}
        searchPlaceholder="Search asset departments..."
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        rowKey={(item) => item.id}
      />

      <Modal isOpen={isModalOpen} onClose={handleClose} title={selectedItem ? 'Edit Asset Department' : 'Add Asset Department'}>
        <AssetDepartmentForm initialData={selectedItem} onSubmit={handleSubmit} onCancel={handleClose} />
      </Modal>
    </div>
  );
};

export default AssetDepartmentsPage;
