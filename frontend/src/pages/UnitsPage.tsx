import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, Ruler } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import UnitForm from '../components/forms/UnitForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

const UnitsPage: React.FC = () => {
    useTitle('Units');
    const queryClient = useQueryClient();
    const { success, error: toastError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const response = await api.get('/units');
            return response.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: (newData: any) => api.post('/units', newData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            handleCloseModal();
            success('Unit created');
        },
        onError: () => toastError('Create failed')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/units/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            handleCloseModal();
            success('Unit updated');
        },
        onError: () => toastError('Update failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/units/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            success('Unit deleted');
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || 'Delete failed';
            toastError(msg);
        }
    });

    const handleOpenAdd = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
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

    const handleDelete = async (item: any) => {
        const result = await showConfirm(`Are you sure you want to delete unit "${item.nama}"?`);
        if (result.isConfirmed) {
            deleteMutation.mutate(item.id);
        }
    };

    const columns = [
        { key: 'id', label: 'ID', render: (val: any) => `#${val}` },
        { key: 'nama', label: 'Unit Name', render: (val: any) => <span className="font-bold text-gray-900">{val}</span> },
        { key: 'keterangan', label: 'Description', render: (val: any) => <span className="text-gray-500 italic">{val || '-'}</span> },
    ];

    if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading units data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-forest-50 text-forest-600 rounded-xl">
                        <Ruler className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Units Management</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage unit of measures for materials & inventory</p>
                    </div>
                </div>
                <button 
                  onClick={handleOpenAdd}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-forest-700 transition-all shadow-lg shadow-forest-200 font-bold text-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <DataTable 
                    columns={columns} 
                    data={data || []} 
                    isLoading={isLoading} 
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    searchPlaceholder="Search units..."
                />
            </div>

            <Modal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              title={selectedItem ? 'Edit Unit' : 'Add New Unit'}
            >
              <UnitForm 
                initialData={selectedItem} 
                onSubmit={handleSubmit} 
                onCancel={handleCloseModal} 
              />
            </Modal>
        </div>
    );
};

export default UnitsPage;
