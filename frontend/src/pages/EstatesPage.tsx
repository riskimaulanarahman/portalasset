import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Map } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import EstateForm from '../components/forms/EstateForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';


interface Estate {
  [key: string]: any;
  id:           number;
  estate_id:    string;
  estate:       string;
  region?:      string;
  business_unit?: { id: number; bu_code: string; bu_name: string };
}

const EstatesPage: React.FC = () => {
  useTitle('Estates');
  const queryClient = useQueryClient();

  const { success, error: toastError } = useToast();
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [selectedItem, setSelectedItem] = useState<Estate | null>(null);

  const { data, isLoading, error } = useQuery<Estate[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const response = await api.get('/estates');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: unknown) => api.post('/estates', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estates'] });
      handleCloseModal();
      success('Estate created', 'New estate has been added.');
    },
    onError: () => toastError('Create failed', 'Could not save the estate.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Estate) => api.put(`/estates/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estates'] });
      handleCloseModal();
      success('Estate updated', 'Changes saved successfully.');
    },
    onError: () => toastError('Update failed', 'Could not update the estate.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/estates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estates'] });
      success('Estate deleted', 'Record removed.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Could not remove the estate.';
      toastError('Delete failed', msg);
    },
  });

  const handleOpenAdd    = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit   = (item: Estate) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };

  const handleSubmit = (formData: any) => {
    if (selectedItem) updateMutation.mutate({ ...formData, id: selectedItem.id });
    else              createMutation.mutate(formData);
  };

  const handleDelete = async (item: Estate) => {
    const result = await showConfirm(`Delete estate "${item.estate}"?`);
    if (result.isConfirmed)
      deleteMutation.mutate(item.id);
  };

  const columns: Column<Estate>[] = [
    { key: 'estate_id', label: 'ID',     sortable: true },
    { key: 'estate',    label: 'Name',   sortable: true },
    { key: 'region',    label: 'Region', render: (_: any, row: Estate) => row.region || '-' },
    {
      key: 'business_unit',
      label: 'Business Unit',
      render: (_: any, row: Estate) =>
        row.business_unit
          ? `${row.business_unit.bu_code} - ${row.business_unit.bu_name}`
          : '-',
    },
  ];

  if (error)
    return (
      <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">
        Failed to load estates data.
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Estates</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Plantation estate units management</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Estate
        </button>
      </div>

      <DataTable<Estate>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['estate_id', 'estate']}
        searchPlaceholder="Search estates…"
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        rowKey={(item) => item.id}
        emptyMessage="No estates found"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? 'Edit Estate' : 'Add New Estate'}
      >
        <EstateForm
          initialData={selectedItem}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default EstatesPage;
