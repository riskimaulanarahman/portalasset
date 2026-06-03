import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus } from 'lucide-react';
import api from '../../api/axios';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ui/Toast';
import useTitle from '../../hooks/useTitle';
import UserForm from '../../components/forms/UserForm';
import { showConfirm } from '../../utils/SwalUtils';
import Badge from '../../components/ui/Badge';

const AdminUsersPage: React.FC = () => {
  useTitle('User Management');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: usersData, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const { data: rolesData } = useQuery<{ data: any[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  const { data: estatesData } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const res = await api.get('/estates');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      success('Success', 'User created successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save user.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/users/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      success('Success', 'User updated successfully.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not save user.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('Deleted', 'User has been removed.');
    },
    onError: (err: any) => {
      toastError('Failed', err.response?.data?.message || 'Could not delete user.');
    },
  });

  const handleOpenModal = (user: any = null) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (selectedUser) {
      updateMutation.mutate({ ...data, id: selectedUser.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (user: any) => {
    const result = await showConfirm(
      'Delete User',
      `Are you sure you want to delete user "${user.name}"?`,
      'Yes, delete'
    );
    if (result.isConfirmed) {
      deleteMutation.mutate(user.id);
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, className: 'font-semibold' },
    { key: 'username', label: 'Username', sortable: true },
    { key: 'estate_id', label: 'Estate', sortable: true },
    {
      key: 'role',
      label: 'Role',
      render: (_: any, row: any) => (
         <span className="font-semibold px-2 py-0.5 rounded-full text-xs uppercase bg-purple-100 text-purple-700 border border-purple-200">
           {row.role?.name || 'N/A'}
         </span>
      ),
    },
    {
      key: 'not_active',
      label: 'Status',
      render: (val: any) => (
        <Badge variant={!val ? 'active' : 'inactive'} dot>
          {!val ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">User Management</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Manage application users, assign operational estates, and configure Spatie roles.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      <DataTable<any>
        columns={columns}
        data={usersData?.data ?? []}
        isLoading={isLoading}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        searchKeys={['name', 'username', 'email']}
        searchPlaceholder="Search users..."
        rowKey={(item: any) => item.id}
        pageSize={15}
        emptyMessage="No users found"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Edit User' : 'Create New User'}
        description="Configure standard user profile and set their permission role."
        size="lg"
      >
        <UserForm
          initialData={selectedUser}
          roles={rolesData?.data ?? []}
          estates={estatesData ?? []}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
