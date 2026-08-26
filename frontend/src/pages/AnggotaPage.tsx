import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { cn, getStoredUser, parseBoolean } from '../lib/utils';
import DataTable, { Column } from '../components/DataTable';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';

interface Anggota {
  [key: string]: any;
  sap_id:          string;
  login_name:      string | null;
  nama:            string;
  company_code:    string | null;
  cost_center:     string | null;
  department:      string | null;
  supervisor:      string | null;
  contract_status: string | null;
  estate?:         { id: number; estate_id: string; estate: string };
  not_active:      boolean;
}

const AnggotaPage: React.FC = () => {
  useTitle('Members');
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const isHoUser = user.estate?.estate_id === 'HO' || user.username === 'admin' || user.role?.name === 'admin';

  const { success, error: toastError } = useToast();
  const [isSyncing, setIsSyncing]       = useState(false);

  const { data: anggotas, isLoading } = useQuery<Anggota[]>({
    queryKey: ['anggotas'],
    queryFn: async () => {
      const resp = await api.get('/anggotas');
      return resp.data.data;
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const resp = await api.post('/anggotas/sync');
      queryClient.invalidateQueries({ queryKey: ['anggotas'] });
      success(resp.data.message ?? 'Sync selesai');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Sync gagal');
    } finally {
      setIsSyncing(false);
    }
  };

  const columns: Column<Anggota>[] = [
    { key: 'sap_id', label: 'SAP ID', sortable: true, className: 'font-mono text-xs' },
    {
      key: 'login_name',
      label: 'Login',
      render: (val: any) => val
        ? <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{val}</span>
        : <span className="text-gray-300 text-xs">—</span>,
    },
    { key: 'nama', label: 'Name', sortable: true },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (val: any) => val || <span className="text-gray-300 text-xs">â€”</span>,
    },
    {
      key: 'company_code',
      label: 'Company',
      render: (val: any) => val
        ? <span className="font-mono text-xs font-semibold">{val}</span>
        : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'cost_center',
      label: 'Cost Center',
      render: (val: any) => val || <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'supervisor',
      label: 'Supervisor',
      render: (val: any) => val || <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'contract_status',
      label: 'Contract',
      render: (val: any) => val
        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700">{val}</span>
        : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'estate.estate_id',
      label: 'Estate',
      render: (_: any, row: Anggota) =>
        row.estate ? (
          <span className="font-mono text-xs font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded">
            {row.estate.estate_id}
          </span>
        ) : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: 'not_active',
      label: 'Status',
      render: (val: any) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
          !parseBoolean(val) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {!parseBoolean(val) ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ].filter((column) => column.key !== 'estate.estate_id');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Members (Anggota)</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Data karyawan dari ERP — sync untuk memperbarui</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isHoUser && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl flex items-center shadow-sm transition-all font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync from ERP'}
            </button>
          )}
        </div>
      </div>

      <DataTable<Anggota>
        columns={columns}
        data={anggotas || []}
        isLoading={isLoading}
        searchPlaceholder="Search members..."
      />
    </div>
  );
};

export default AnggotaPage;
