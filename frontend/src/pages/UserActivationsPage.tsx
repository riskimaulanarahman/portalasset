import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import type { AxiosError } from 'axios';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { hasStoredPermission } from '../lib/access';
import { cn } from '../lib/utils';

type ActivationStatus = 'pending' | 'active' | 'all';

interface ActivationRole {
  id: number;
  name: string;
}

interface ActivationUser {
  [key: string]: unknown;
  id: number;
  name: string;
  username: string;
  email?: string | null;
  domain?: string | null;
  not_active: boolean;
  role_id?: number | null;
  role?: { id: number; name: string } | null;
  estate?: { id: number; estate_id: string; estate: string } | null;
  asset_departments?: { id: number; name: string }[];
  asset_divisions?: { id: number; name: string }[];
  employee?: {
    sap_id?: string | null;
    nama?: string | null;
    department?: string | null;
    cost_center?: string | null;
    company_code?: string | null;
  } | null;
}

interface ActivationResponse {
  data: ActivationUser[];
  roles: ActivationRole[];
}

interface ApiErrorData {
  message?: string;
  errors?: Record<string, string[]>;
}

const statusOptions: { value: ActivationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
];

const UserActivationsPage: React.FC = () => {
  useTitle('User Activation');

  const queryClient = useQueryClient();
  const toast = useToast();
  const canActivate = hasStoredPermission('edit-user-activations');
  const [status, setStatus] = useState<ActivationStatus>('pending');
  const [selectedUser, setSelectedUser] = useState<ActivationUser | null>(null);
  const [roleId, setRoleId] = useState('');

  const { data, isLoading, isFetching } = useQuery<ActivationResponse>({
    queryKey: ['user-activations', status],
    queryFn: async () => {
      const response = await api.get('/user-activations', { params: { status } });
      return response.data;
    },
  });

  const users = data?.data ?? [];
  const roleOptions = (data?.roles ?? []).map((role) => ({
    value: role.id,
    label: role.name.toUpperCase(),
  }));

  const visibleCountLabel = useMemo(
    () => `${users.length} ${status === 'all' ? 'users' : status}`,
    [status, users.length],
  );

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;

      return api.post(`/user-activations/${selectedUser.id}/activate`, {
        role_id: Number(roleId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activations'] });
      handleCloseModal();
      toast.success('User activated', 'Akun berhasil diaktivasi.');
    },
    onError: (err: unknown) => {
      toast.error('Activation failed', getErrorMessage(err));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (user: ActivationUser) => api.post(`/user-activations/${user.id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activations'] });
      toast.success('User deactivated', 'Akun berhasil dinonaktifkan.');
    },
    onError: (err: unknown) => {
      toast.error('Deactivate failed', getErrorMessage(err));
    },
  });

  const handleOpenActivate = (user: ActivationUser) => {
    setSelectedUser(user);
    setRoleId(user.role_id ? String(user.role_id) : '');
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setRoleId('');
  };

  const handleActivate = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUser || !roleId) {
      toast.warning('Incomplete data', 'Role wajib dipilih.');
      return;
    }

    activateMutation.mutate();
  };

  const columns: Column<ActivationUser>[] = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      className: 'font-semibold',
      render: (_value, row) => (
        <div className="min-w-48">
          <p className="text-sm font-black text-forest-900">{row.name || row.employee?.nama || '-'}</p>
          <p className="text-xs text-forest-500">{row.username}</p>
        </div>
      ),
    },
    {
      key: 'employee',
      label: 'Employee',
      render: (_value, row) => (
        <div className="min-w-52">
          <p className="text-sm font-semibold text-forest-900">{row.employee?.nama || '-'}</p>
          <p className="text-xs text-forest-500">{row.employee?.sap_id || row.email || '-'}</p>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (_value, row) => (
        <div className="min-w-44">
          <p className="text-sm font-semibold text-forest-900">{row.employee?.department || '-'}</p>
          <p className="text-xs text-forest-500">{row.employee?.cost_center || '-'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (_value, row) => row.role
        ? <Badge variant="forest">{row.role.name}</Badge>
        : <span className="text-xs text-gray-300">-</span>,
    },
    {
      key: 'estate',
      label: 'Estate',
      render: (_value, row) => row.estate
        ? <span className="text-xs font-bold text-forest-700">{row.estate.estate_id} - {row.estate.estate}</span>
        : <span className="text-xs text-gray-300">Belum dipilih</span>,
    },
    {
      key: 'asset_access',
      label: 'Asset Access',
      render: (_value, row) => {
        const departmentCount = row.asset_departments?.length ?? 0;
        const divisionCount = row.asset_divisions?.length ?? 0;
        return departmentCount || divisionCount
          ? <span className="text-xs font-bold text-forest-700">{departmentCount} dept / {divisionCount} divisi</span>
          : <span className="text-xs text-gray-300">Belum diatur</span>;
      },
    },
    {
      key: 'not_active',
      label: 'Status',
      sortable: true,
      render: (_value, row) => (
        <Badge variant={!row.not_active ? 'active' : 'pending'} dot>
          {!row.not_active ? 'Active' : 'Pending Activation'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_value, row) => (
        <div className="flex justify-end gap-2">
          {canActivate && row.not_active && (
            <Button
              type="button"
              size="xs"
              variant="primary"
              onClick={() => handleOpenActivate(row)}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Activate
            </Button>
          )}
          {canActivate && !row.not_active && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => deactivateMutation.mutate(row)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">User Activation</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Aktivasi akun LDAP dan pilih role operasional.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-forest-100 bg-forest-50 px-3 py-2 text-xs font-bold text-forest-800">
            <Clock className="h-3.5 w-3.5" />
            {visibleCountLabel}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['user-activations'] })}
            leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide transition-all',
              status === option.value
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-white text-forest-600 border border-gray-100 hover:bg-forest-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataTable<ActivationUser>
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchKeys={['name', 'username', 'email']}
        searchPlaceholder="Search users..."
        rowKey={(item) => item.id}
        emptyMessage="No users found"
      />

      <Modal
        isOpen={!!selectedUser}
        onClose={handleCloseModal}
        title="Activate User"
        description={selectedUser ? selectedUser.username : undefined}
        size="md"
        persistent={activateMutation.isPending}
      >
        <form onSubmit={handleActivate} className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-forest-500">User</p>
            <p className="mt-1 text-sm font-semibold text-forest-900">{selectedUser?.name || '-'}</p>
            <p className="text-xs text-forest-500">{selectedUser?.employee?.department || selectedUser?.email || '-'}</p>
          </div>

          <Select
            label="Role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            options={roleOptions}
            placeholder="Select role"
            required
          />

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Estate akan dipilih sendiri oleh user saat membuka dashboard setelah aktivasi.
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={activateMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={activateMutation.isPending}
              disabled={!roleId}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Activate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function getErrorMessage(err: unknown): string {
  const responseData = (err as AxiosError<ApiErrorData>).response?.data;
  const errors = responseData?.errors;

  if (errors) {
    const firstKey = Object.keys(errors)[0];
    const firstError = firstKey ? errors[firstKey]?.[0] : null;
    if (firstError) return firstError;
  }

  return responseData?.message || 'Request failed.';
}

export default UserActivationsPage;
