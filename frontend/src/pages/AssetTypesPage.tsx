import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import AssetTypeForm from '../components/forms/AssetTypeForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

interface AssetType {
  [key: string]: any;
  id: number;
  name: string;
}

const AssetTypesPage: React.FC = () => {
  useTitle('Asset Types');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssetType | null>(null);

  const { data, isLoading, error } = useQuery<AssetType[]>({
    queryKey: ['asset-types'],
    queryFn: async () => {
      const response = await api.get('/asset-types');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: any) => api.post('/asset-types', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      handleCloseModal();
      success('Asset type added successfully');
    },
    onError: () => toastError('Failed to add asset type'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: AssetType) => api.put(`/asset-types/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      handleCloseModal();
      success('Asset type updated successfully');
    },
    onError: () => toastError('Failed to update asset type'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/asset-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      success('Asset type deleted successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete asset type';
      toastError(msg);
    },
  });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AssetType) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleSubmit = (formData: any) => {
    if (selectedItem) {
      updateMutation.mutate({ ...formData, id: selectedItem.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (item: AssetType) => {
    const result = await showConfirm(`Are you sure you want to delete asset type "${item.name}"?`);
    if (result.isConfirmed) {
      deleteMutation.mutate(item.id);
    }
  };

  const columns: Column<AssetType>[] = [
    { key: 'id', label: 'ID', render: (_val) => `#${_val}`, sortable: true },
    { key: 'name', label: 'Asset Type Name', sortable: true },
  ];

  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading asset types.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Asset Types</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage asset categories/types</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Asset Type
        </button>
      </div>

      <DataTable<AssetType>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search asset types..."
        rowKey={(item) => item.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? 'Edit Asset Type' : 'Add Asset Type'}
      >
        <AssetTypeForm 
          initialData={selectedItem} 
          onSubmit={handleSubmit} 
          onCancel={handleCloseModal} 
        />
      </Modal>
    </div>
  );
};

export default AssetTypesPage;
