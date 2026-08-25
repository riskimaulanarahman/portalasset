import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus } from 'lucide-react';
import api from '../../api/axios';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ui/Toast';
import useTitle from '../../hooks/useTitle';
import RoleForm from '../../components/forms/RoleForm';
import { showConfirm } from '../../utils/SwalUtils';

const AdminRolesPage: React.FC = () => {
  useTitle('Role Management');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: rolesData, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/roles', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      success('Success', 'Role created successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save role.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/roles/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      success('Success', 'Role updated successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save role.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      success('Deleted', 'Role has been removed.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not delete role.');
    },
  });

  const handleOpenModal = (role: any = null) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (selectedRole) {
      updateMutation.mutate({ ...data, id: selectedRole.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (role: any) => {
    if (['admin', 'estate', 'manager', 'guest'].includes(role.name)) {
       toastError('Protected', 'Built-in system roles cannot be deleted.');
       return;
    }
    const result = await showConfirm(
      'Delete Role',
      `Are you sure you want to delete role "${role.name}"? This might affect users assigned to it.`,
      'Yes, delete'
    );
    if (result.isConfirmed) {
      deleteMutation.mutate(role.id);
    }
  };

  const columns: Column<any>[] = [
    { 
       key: 'name', 
       label: 'Role Name', 
       sortable: true, 
       render: (val: any) => (
         <span className="font-bold uppercase tracking-wider text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
           {val}
         </span>
       )
    },
    { key: 'guard_name', label: 'Guard', sortable: true, className: 'text-gray-400 font-mono text-[10px]' },
    { key: 'created_at', label: 'Created At', sortable: true, render: (val: any) => new Date(val).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Role Management</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Define access levels and permission groups using Spatie Roles.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </button>
      </div>

      <DataTable<any>
        columns={columns}
        data={rolesData?.data ?? []}
        isLoading={isLoading}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        searchKeys={['name']}
        searchPlaceholder="Search roles..."
        rowKey={(item) => item.id}
        pageSize={10}
        emptyMessage="No roles defined"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRole ? 'Edit Role' : 'Create New Role'}
        description="Specify a unique name for this permission group."
        size="md"
      >
        <RoleForm
          initialData={selectedRole}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default AdminRolesPage;
