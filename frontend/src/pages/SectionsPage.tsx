import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Database } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import SectionForm from '../components/forms/SectionForm';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';


interface Section {
  [key: string]: any;
  id:           number;
  section:      string;
  section_full: string;
  not_active:   boolean;
}

const SectionsPage: React.FC = () => {
  useTitle('Sections');
  const queryClient = useQueryClient();

  const { success, error: toastError } = useToast();
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [selectedItem, setSelectedItem] = useState<Section | null>(null);

  const { data, isLoading, error } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      const response = await api.get('/sections');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: unknown) => api.post('/sections', newData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sections'] }); handleCloseModal(); success('Section created'); },
    onError: () => toastError('Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Section) => api.put(`/sections/${data.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sections'] }); handleCloseModal(); success('Section updated'); },
    onError: () => toastError('Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sections/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sections'] }); success('Section deleted'); },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Delete failed';
      toastError(msg);
    },
  });

  const handleOpenAdd    = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit   = (item: Section) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };
  const handleSubmit = (formData: any) => {
    if (selectedItem) updateMutation.mutate({ ...formData, id: selectedItem.id });
    else              createMutation.mutate(formData);
  };
  const handleDelete = async (item: Section) => {
    const result = await showConfirm(`Delete section "${item.section}"?`);
    if (result.isConfirmed)
      deleteMutation.mutate(item.id);
  };

  const columns: Column<Section>[] = [
    { key: 'id',           label: 'ID',        render: (val) => `#${val}`, sortable: true },
    { key: 'section',      label: 'Code',       sortable: true },
    { key: 'section_full', label: 'Full Name',  sortable: true },
    {
      key: 'not_active',
      label: 'Status',
      render: (val) => val
        ? <Badge variant="inactive" dot>Inactive</Badge>
        : <Badge variant="active"   dot>Active</Badge>,
    },
  ];

  if (error)
    return <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">Failed to load sections.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Sections</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Plantation section management</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </button>
      </div>

      <DataTable<Section>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['section', 'section_full']}
        searchPlaceholder="Search sections…"
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        rowKey={(item) => item.id}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedItem ? 'Edit Section' : 'Add New Section'}>
        <SectionForm initialData={selectedItem} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default SectionsPage;
