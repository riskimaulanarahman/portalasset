import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Monitor, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { cn } from '../lib/utils';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import SoftwareForm from '../components/forms/SoftwareForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';
import { getStoredUser, isHeadOfficeUser } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';


interface Software {
  [key: string]: any;
  id:          number;
  name:        string;
  vendor?:     { nama?: string };
  license_key: string;
  expiry_date: string;
  estate?:     { estate?: string, estate_id?: string };
  asset?:      { reg_id?: string; type?: string; asset_no?: string }; // #19 FIX
  asset_id?:   string;
  status:      string;
}

const SoftwarePage: React.FC = () => {
  useTitle('Software');
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const isHoUser = isHeadOfficeUser(); // #22 FIX: use centralized helper
  const canCreateSoftware = hasStoredPermission('create-software');
  const canEditSoftware = hasStoredPermission('edit-software');
  const canDeleteSoftware = hasStoredPermission('delete-software');

  const toast = useToast();
  const [estateFilter, setEstateFilter] = useState<string>(!isHoUser && user.estate_id ? String(user.estate_id) : '');
  const [selectedItem, setSelectedItem] = useState<Software | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    }
  });

  const { data: softwares, isLoading, refetch } = useQuery<Software[]>({
    queryKey: ['software', estateFilter],
    queryFn: async () => {
      const params = estateFilter ? { estate_id: estateFilter } : {};
      const resp = await api.get('/software', { params });
      return resp.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: unknown) => api.post('/software', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software'] });
      handleCloseModal();
      toast.success('Software added successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add software'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/software/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software'] });
      handleCloseModal();
      toast.success('Software updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update software'),
  });

  const handleOpenAdd = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit = (software: Software) => {
    setSelectedItem(software);
    setIsModalOpen(true);
  };
    
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };

  const handleSubmit = (formData: any) => {
    if (selectedItem) updateMutation.mutate({ ...formData, id: selectedItem.id });
    else createMutation.mutate(formData);
  };
    
  const handleDelete = async (id: number) => {
    const result = await showConfirm('Are you sure you want to delete this software?');
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/software/${id}`);
      toast.success('Deleted', 'Software removed successfully');
      refetch();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to delete');
    }
  };
    
  const columns: Column<Software>[] = [
    { key: 'name', label: 'Software Name', sortable: true },
    {
      key: 'vendor',
      label: 'Vendor',
      render: (val) => String((val as Software['vendor'])?.nama ?? '-'),
    },
    { key: 'license_key', label: 'License Key' },
    {
      key: 'asset',
      label: 'Host Asset', // #19 FIX
      render: (val) => {
        const a = val as Software['asset'];
        if (!a?.reg_id) return <span className="text-gray-400">-</span>;
        return <span className="font-mono text-xs text-forest-700">{a.reg_id}</span>;
      },
    },
    {
      key: 'estate',
      label: 'Estate',
      render: (val) => String((val as Software['estate'])?.estate ?? '-'),
    },
    { key: 'expiry_date', label: 'Expiry Date', render: (val: any) => val ? new Date(val).toLocaleDateString() : '-' },
    {
      key: 'status',
      label: 'Status',
      render: (val: any) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
          val === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {String(val)}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: Software) => (
        <div className="flex justify-end gap-2">
          {canEditSoftware && (
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1 text-forest-400 hover:text-primary transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canDeleteSoftware && (
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Software Inventory</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">License and application management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
            disabled={!isHoUser}
          >
            {isHoUser && <option value="">All Estates</option>}
            {(estates ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>{e.estate} ({e.estate_id})</option>
            ))}
          </select>
          {canCreateSoftware && (
            <button 
              onClick={handleOpenAdd}
              className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Software
            </button>
          )}
        </div>
      </div>

      <DataTable
        data={softwares || []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search software..."
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedItem ? 'Edit Software' : 'Add New Software'}>
        <SoftwareForm initialData={selectedItem} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default SoftwarePage;
