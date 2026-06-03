import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Plus, ShoppingCart, User, Phone, Mail, MapPin } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import VendorForm from '../components/forms/VendorForm';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

const VendorsPage: React.FC = () => {
    useTitle('Vendors');
    const queryClient = useQueryClient();
    const { success, error: toastError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const response = await api.get('/vendors');
            return response.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: (newData: any) => api.post('/vendors', newData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            handleCloseModal();
            success('Vendor created');
        },
        onError: () => toastError('Create failed')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/vendors/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            handleCloseModal();
            success('Vendor updated');
        },
        onError: () => toastError('Update failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/vendors/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            success('Vendor deleted');
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
        const result = await showConfirm(`Are you sure you want to delete vendor "${item.nama}"?`);
        if (result.isConfirmed) {
            deleteMutation.mutate(item.id);
        }
    };

    const columns = [
        { 
            key: 'nama', 
            label: 'Vendor Name', 
            render: (val: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 tracking-tight">{val}</span>
                </div>
            ) 
        },
        { 
            key: 'pic', 
            label: 'PIC / Contact Person', 
            render: (val: any) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-3.5 w-3.5 text-forest-500" />
                    <span className="text-sm font-medium">{val || '-'}</span>
                </div>
            ) 
        },
        { 
            key: 'contact', 
            label: 'Communication', 
            render: (_: any, row: any) => (
                <div className="flex flex-col gap-1">
                    {row.telepon && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone className="h-3 w-3 text-forest-500" />
                            <span>{row.telepon}</span>
                        </div>
                    )}
                    {row.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3 text-forest-500" />
                            <span className="text-primary-600 font-medium truncate max-w-[150px] underline decoration-primary-200">{row.email}</span>
                        </div>
                    )}
                    {!row.telepon && !row.email && <span className="text-gray-400">-</span>}
                </div>
            ) 
        },
        { 
            key: 'alamat', 
            label: 'Location', 
            render: (val: any) => (
                <div className="flex items-start gap-2 max-w-[200px]">
                    <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{val || '-'}</span>
                </div>
            ) 
        },
    ];

    if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100 shadow-sm">Error loading vendors data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl ring-4 ring-blue-50">
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Vendors Directory</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Manage supplier profiles and procurement contacts</p>
                    </div>
                </div>
                <button 
                  onClick={handleOpenAdd}
                  className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Vendor
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden ring-1 ring-gray-100">
                <DataTable 
                    columns={columns} 
                    data={data || []} 
                    isLoading={isLoading} 
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    searchPlaceholder="Search vendors by name, PIC, or location..."
                />
            </div>

            <Modal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              title={selectedItem ? 'Edit Vendor Details' : 'Onboard New Vendor'}
            >
              <div className="md:px-2 md:pb-2">
                <VendorForm 
                    initialData={selectedItem} 
                    onSubmit={handleSubmit} 
                    onCancel={handleCloseModal} 
                />
              </div>
            </Modal>
        </div>
    );
};

export default VendorsPage;
