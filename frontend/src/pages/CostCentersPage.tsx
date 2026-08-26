import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, Edit, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import CostCenterForm from '../components/forms/CostCenterForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';
import { hasStoredPermission } from '../lib/access';


interface CostCenter {
  [key: string]: unknown;
  id:          number;
  cost_center: string;
  dept:        string;
  estate:      string;
  join_estate: string;
  estate_id?:  number | null;
  mapped_estate?: Estate | null;
}

interface Estate {
  id: number;
  estate_id: string;
  estate: string;
}

interface CostCenterPayload {
  cost_center: string;
  dept: string;
  estate_id: number;
}

type CostCenterUpdatePayload = CostCenterPayload & { id: number };

interface ApiErrorData {
  message?: string;
  errors?: Record<string, string[]>;
}

const CostCentersPage: React.FC = () => {
  useTitle('Cost Centers');
  const queryClient = useQueryClient();
  const canCreateCostCenter = hasStoredPermission('create-cost-centers');
  const canEditCostCenter = hasStoredPermission('edit-cost-centers');
  const canDeleteCostCenter = hasStoredPermission('delete-cost-centers');

  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CostCenter | null>(null);

  const { data: costCenters, isLoading, refetch } = useQuery<CostCenter[]>({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const resp = await api.get('/cost-centers');
      return resp.data.data;
    },
  });

  const { data: estates = [] } = useQuery<Estate[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: CostCenterPayload) => api.post('/cost-centers', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      handleCloseModal();
      toast.success('Cost center created successfully');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || 'Failed to create cost center'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CostCenterUpdatePayload) => api.put(`/cost-centers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      handleCloseModal();
      toast.success('Cost center updated successfully');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || 'Failed to update cost center'),
  });

  const handleOpenAdd = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit = (cc: CostCenter) => {
    setSelectedItem(cc);
    setIsModalOpen(true);
  };
    
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };

  const handleSubmit = (formData: CostCenterPayload) => {
    if (selectedItem) updateMutation.mutate({ ...formData, id: selectedItem.id });
    else createMutation.mutate(formData);
  };
    
  const handleDelete = async (id: number) => {
    const result = await showConfirm('Are you sure you want to delete this cost center?');
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/cost-centers/${id}`);
      toast.success('Deleted', 'Cost center removed successfully');
      refetch();
    } catch (err: unknown) {
      toast.error('Error', getErrorMessage(err) || 'Failed to delete');
    }
  };
    
  const columns: Column<CostCenter>[] = [
    { key: 'cost_center', label: 'Code', sortable: true, className: 'font-bold' },
    { key: 'dept', label: 'Department', sortable: true },
    { key: 'estate', label: 'Estate', sortable: true },
    { key: 'join_estate', label: 'Join Estate' },
    {
      key: 'actions',
      label: '',
      render: (_value: unknown, row: CostCenter) => (
        <div className="flex justify-end gap-2">
          {canEditCostCenter && (
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1 text-forest-400 hover:text-primary transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canDeleteCostCenter && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1 text-forest-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  if (isLoading && !costCenters) return <div className="text-gray-600 bg-gray-50 p-5 rounded-xl">Loading cost centers...</div>;
  if (!isLoading && !costCenters) return <div className="text-red-600 bg-red-50 p-5 rounded-xl">Failed to load cost centers.</div>;


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Cost Centers</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Financial allocation management</p>
          </div>
        </div>
        {canCreateCostCenter && (
          <button 
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Center
          </button>
        )}
      </div>

      <DataTable<CostCenter>
        columns={columns}
        data={costCenters || []}
        isLoading={isLoading}
        searchKeys={['cost_center', 'dept', 'estate']}
        searchPlaceholder="Search cost centers..."
        rowKey={(item) => item.id}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedItem ? 'Edit Cost Center' : 'Add New Cost Center'}>
        <CostCenterForm initialData={selectedItem} estates={estates} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

function getErrorMessage(err: unknown): string | undefined {
  const responseData = (err as AxiosError<ApiErrorData>).response?.data;
  const errors = responseData?.errors;

  if (errors) {
    const firstKey = Object.keys(errors)[0];
    const firstError = firstKey ? errors[firstKey]?.[0] : null;
    if (firstError) return firstError;
  }

  return responseData?.message;
}

export default CostCentersPage;
