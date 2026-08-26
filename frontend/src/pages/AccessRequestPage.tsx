import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Send } from 'lucide-react';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select, Textarea } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';

const AccessRequestPage: React.FC = () => {
  useTitle('Access Request');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [roleId, setRoleId] = useState('');
  const [estateId, setEstateId] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['access-request-options'],
    queryFn: async () => {
      const res = await api.get('/access-request/options');
      return res.data;
    },
  });

  React.useEffect(() => {
    if (!data) return;
    if (!roleId && data.user?.role_id) setRoleId(String(data.user.role_id));
    if (!estateId && data.user?.estate_id) setEstateId(String(data.user.estate_id));
  }, [data, roleId, estateId]);

  const mutation = useMutation({
    mutationFn: () => api.post('/access-requests', {
      role_id: Number(roleId),
      estate_id: Number(estateId),
      reason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-request-options'] });
      success('Request sent', 'Permintaan akses menunggu approval.');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? (Object.values(errors)[0] as string[] | undefined) : undefined;
      const message = firstError?.[0] ?? err.response?.data?.message;
      toastError('Failed', message || 'Tidak dapat mengirim request akses.');
    },
  });

  const pending = data?.pending_request;
  const currentRole = data?.user?.role?.name ?? 'N/A';
  const currentEstate = data?.user?.estate
    ? `${data.user.estate.estate_id} - ${data.user.estate.estate}`
    : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Access Request</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Ajukan role dan estate Portal Asset yang sesuai dengan tanggung jawab Anda.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Role Saat Ini</p>
            <p className="mt-1 font-semibold text-gray-900">{currentRole}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Estate Saat Ini</p>
            <p className="mt-1 font-semibold text-gray-900">{currentEstate}</p>
          </div>
          {data?.user?.access_setup_required && (
            <Badge variant="pending">Setup access required</Badge>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-24 bg-gray-100 rounded-xl" />
            </div>
          ) : pending ? (
            <div className="space-y-4">
              <Badge variant="pending">Pending Approval</Badge>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Requested Role</p>
                  <p className="font-semibold text-gray-900">{pending.requested_role?.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Requested Estate</p>
                  <p className="font-semibold text-gray-900">
                    {pending.requested_estate?.estate_id} - {pending.requested_estate?.estate}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <Select
                label="Requested Role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                options={(data?.roles ?? []).map((role: any) => ({ value: role.id, label: role.name }))}
                placeholder="Pilih role"
                required
              />
              <Select
                label="Requested Estate"
                value={estateId}
                onChange={(event) => setEstateId(event.target.value)}
                options={(data?.estates ?? []).map((estate: any) => ({
                  value: estate.id,
                  label: `${estate.estate_id} - ${estate.estate}`,
                }))}
                placeholder="Pilih estate"
                required
              />
              <Textarea
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Tuliskan alasan pengajuan akses..."
              />
              <div className="flex justify-end">
                <Button type="submit" loading={mutation.isPending} leftIcon={<Send className="h-4 w-4" />}>
                  Submit Request
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessRequestPage;
