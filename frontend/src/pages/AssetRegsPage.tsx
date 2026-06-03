import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, Layers } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AssetRegForm from '../components/forms/AssetRegForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';


const AssetRegsPage: React.FC = () => {
    useTitle('Asset Types');
    const queryClient = useQueryClient();
    const { success, error: toastError } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['asset-regs'],
        queryFn: async () => {
            const response = await api.get('/asset-regs');
            return response.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: (newData: any) => api.post('/asset-regs', newData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-regs'] });
            handleCloseModal();
            success('Asset type registered');
        },
        onError: () => toastError('Registration failed')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/asset-regs/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-regs'] });
            handleCloseModal();
            success('Asset type updated');
        },
        onError: () => toastError('Update failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/asset-regs/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-regs'] });
            success('Asset type deleted');
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
        const result = await showConfirm(`Are you sure you want to delete asset registration type "${item.type}"?`);
        if (result.isConfirmed) {
            deleteMutation.mutate(item.id);
        }
    };

    const columns = [
        { key: 'id', label: 'ID', render: (val: any) => `#${val}` },
        { 
            key: 'asset_type', 
            label: 'Asset Type',
            render: (_: any, item: any) => item.asset_type?.name || '-'
        },
        { 
            key: 'manufacturer', 
            label: 'Manufacturer',
            render: (_: any, item: any) => item.manufacturer?.name || '-'
        },
        { key: 'series', label: 'Series' },
        { 
            key: 'section', 
            label: 'Section',
            render: (val: any) => val?.section || '-'
        },
        { 
            key: 'not_active', 
            label: 'Status',
            render: (val: any) => (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${val ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {val ? 'Inactive' : 'Active'}
                </span>
            )
        }
    ];

    if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading asset registration data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Asset Registrations</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Register and map sub-categories for assets</p>
                    </div>
                </div>
                <button 
                  onClick={handleOpenAdd}
                  className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Register New Type
                </button>
            </div>

            <DataTable 
                columns={columns} 
                data={data || []} 
                isLoading={isLoading} 
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                searchPlaceholder="Search types..."
            />

            <Modal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              title={selectedItem ? 'Edit Asset Type' : 'Register New Type'}
            >
              <AssetRegForm 
                initialData={selectedItem} 
                onSubmit={handleSubmit} 
                onCancel={handleCloseModal} 
              />
            </Modal>
        </div>
    );
};

export default AssetRegsPage;


