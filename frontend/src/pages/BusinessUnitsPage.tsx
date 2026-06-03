import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, Building2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import BusinessUnitForm from '../components/forms/BusinessUnitForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

const BusinessUnitsPage: React.FC = () => {
    useTitle('Business Units');
    const queryClient = useQueryClient();
    const { success, error: toastError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['business-units'],
        queryFn: async () => {
            const response = await api.get('/business-units');
            return response.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: (newData: any) => api.post('/business-units', newData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-units'] });
            handleCloseModal();
            success('Business unit created');
        },
        onError: () => toastError('Create failed')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/business-units/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-units'] });
            handleCloseModal();
            success('Business unit updated');
        },
        onError: () => toastError('Update failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/business-units/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-units'] });
            success('Business unit deleted');
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
        const result = await showConfirm(`Are you sure you want to delete business unit "${item.bu_name}"?`);
        if (result.isConfirmed) {
            deleteMutation.mutate(item.id);
        }
    };

    const columns = [
        { key: 'id', label: 'ID', render: (val: any) => `#${val}` },
        { key: 'bu_code', label: 'BU Code', render: (val: any) => <span className="font-mono font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded-md text-xs">{val}</span> },
        { key: 'bu_name', label: 'Business Unit Name', render: (val: any) => <span className="font-bold text-gray-900">{val}</span> },
    ];

    if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading business units data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-forest-50 text-forest-600 rounded-xl">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Business Units</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage business units for estate organization</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-forest-700 transition-all shadow-lg shadow-forest-200 font-bold text-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Business Unit
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data || []}
                    isLoading={isLoading}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    searchPlaceholder="Search business units..."
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedItem ? 'Edit Business Unit' : 'Add New Business Unit'}
            >
                <BusinessUnitForm
                    initialData={selectedItem}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
};

export default BusinessUnitsPage;
