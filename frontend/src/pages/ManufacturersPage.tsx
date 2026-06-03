import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Factory } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import ManufacturerForm from '../components/forms/ManufacturerForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

interface Manufacturer {
  [key: string]: any;
  id: number;
  name: string;
}

const ManufacturersPage: React.FC = () => {
  useTitle('Manufacturers');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Manufacturer | null>(null);

  const { data, isLoading, error } = useQuery<Manufacturer[]>({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const response = await api.get('/manufacturers');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: any) => api.post('/manufacturers', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      handleCloseModal();
      success('Manufacturer added successfully');
    },
    onError: () => toastError('Failed to add manufacturer'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Manufacturer) => api.put(`/manufacturers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      handleCloseModal();
      success('Manufacturer updated successfully');
    },
    onError: () => toastError('Failed to update manufacturer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      success('Manufacturer deleted successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete manufacturer';
      toastError(msg);
    },
  });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Manufacturer) => {
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

  const handleDelete = async (item: Manufacturer) => {
    const result = await showConfirm(`Are you sure you want to delete manufacturer "${item.name}"?`);
    if (result.isConfirmed) {
      deleteMutation.mutate(item.id);
    }
  };

  const columns: Column<Manufacturer>[] = [
    { key: 'id', label: 'ID', render: (_val) => `#${_val}`, sortable: true },
    { key: 'name', label: 'Manufacturer Name', sortable: true },
  ];

  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading manufacturers.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Manufacturers</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage asset manufacturers/brands</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Manufacturer
        </button>
      </div>

      <DataTable<Manufacturer>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search manufacturers..."
        rowKey={(item) => item.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? 'Edit Manufacturer' : 'Add Manufacturer'}
      >
        <ManufacturerForm 
          initialData={selectedItem} 
          onSubmit={handleSubmit} 
          onCancel={handleCloseModal} 
        />
      </Modal>
    </div>
  );
};

export default ManufacturersPage;
