import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Download } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import AssetForm from '../components/forms/AssetForm';
import Badge, { kondisiBadge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

import { formatDate, getStoredUser, exportToCSV, isHeadOfficeUser, parseBoolean } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';

interface Asset {
  [key: string]: unknown;
  reg_id:           string;
  asset_no:         string;
  type:             string;
  manufacture:      string;
  series:           string;
  vendor?:          { nama?: string };
  estate?:          { estate?: string, estate_id?: string };
  department?:      { name?: string; code?: string | null } | null;
  division?:        { name?: string; code?: string | null } | null;
  anggota?:         { sap_id?: string; nama?: string } | null;
  anggota_id?:      string | null;
  asset_department_id?: number | null;
  asset_division_id?: number | null;
  alokasi:          string;
  not_active:       boolean;
  date?:            string;
  latest_condition?: { kondisi?: string; date?: string } | null;
}

interface EstateOption {
  id: number;
  estate: string;
  estate_id: string;
}

const getApiMessage = (err: unknown, fallback: string) => {
  const apiError = err as { response?: { data?: { message?: string } } };

  return apiError.response?.data?.message || fallback;
};

const AssetsPage: React.FC = () => {
  useTitle('Physical Assets');
  const navigate = useNavigate();
  const user = getStoredUser();
  const isHoUser = isHeadOfficeUser(); // #22 FIX: use centralized helper
  const isAdminUser = user.role?.name === 'admin';
  const needsAssetAccessSetup = !isHoUser
    && !isAdminUser
    && (user.asset_departments?.length ?? 0) === 0
    && (user.asset_divisions?.length ?? 0) === 0;
  const canCreateAsset = hasStoredPermission('create-assets');
  const canEditAsset = hasStoredPermission('edit-assets');
  const canDeleteAsset = hasStoredPermission('delete-assets');

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [estateFilter, setEstateFilter] = useState<string>(!isHoUser && user.estate_id ? String(user.estate_id) : '');
  const [selectedItem, setSelectedItem] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: estates } = useQuery<EstateOption[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    }
  });

  const { data, isLoading, error } = useQuery<Asset[]>({
    queryKey: ['assets', estateFilter],
    queryFn: async () => {
      const params = estateFilter ? { estate_id: estateFilter } : {};
      const response = await api.get('/assets', { params });
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newData: unknown) => api.post('/assets', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      handleCloseModal();
      success('Asset created', 'Physical asset has been registered.');
    },
    onError: () => toastError('Create failed', 'Could not save the asset.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown & { reg_id: string }) =>
      api.put(`/assets/${(data as Asset).reg_id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      handleCloseModal();
      success('Asset updated', 'Changes have been saved.');
    },
    onError: () => toastError('Update failed', 'Could not update the asset.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (regId: string) => api.delete(`/assets/${regId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      success('Asset deleted', 'Record removed successfully.');
    },
    onError: (err: unknown) => {
      const msg = getApiMessage(err, 'Could not remove the asset.');
      toastError('Delete failed', msg);
    },
  });

  const handleOpenAdd   = () => { setSelectedItem(null);  setIsModalOpen(true); };
  const handleOpenEdit  = (item: Asset) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };

  const handleSubmit = (formData: unknown) => {
    if (selectedItem) updateMutation.mutate(formData as Asset & { reg_id: string });
    else              createMutation.mutate(formData);
  };

  const handleDelete = async (item: Asset) => {
    const result = await showConfirm(`Delete asset "${item.reg_id}"? This cannot be undone.`);
    if (result.isConfirmed)
      deleteMutation.mutate(item.reg_id);
  };

  // #12 FIX: Export asset list ke CSV
  const handleExportCSV = () => {
    const rows = (data ?? []).map((a) => ({
      reg_id:      a.reg_id,
      asset_no:    a.asset_no ?? '',
      type:        a.type ?? '',
      manufacture: a.manufacture ?? '',
      series:      a.series ?? '',
      vendor:      a.vendor?.nama ?? '',
      estate:      a.estate?.estate ?? '',
      department:  a.department?.name ?? '',
      division:    a.division?.name ?? '',
      assigned_member: a.anggota?.nama ?? '',
      alokasi:     a.alokasi ?? '',
      date:        a.date ?? '',
      status:      parseBoolean(a.not_active) ? 'Inactive' : 'Active',
    }));
    exportToCSV(rows, [
      { key: 'reg_id',      label: 'Reg ID' },
      { key: 'asset_no',    label: 'Asset No' },
      { key: 'type',        label: 'Tipe' },
      { key: 'manufacture', label: 'Manufaktur' },
      { key: 'series',      label: 'Series' },
      { key: 'vendor',      label: 'Vendor' },
      { key: 'estate',      label: 'Estate' },
      { key: 'department',  label: 'Department' },
      { key: 'division',    label: 'Divisi' },
      { key: 'assigned_member', label: 'Assigned Member' },
      { key: 'alokasi',     label: 'Alokasi' },
      { key: 'date',        label: 'Tanggal' },
      { key: 'status',      label: 'Status' },
    ], `assets-${new Date().toISOString().split('T')[0]}`);
  };

  const columns: Column<Asset>[] = [
    {
      key: 'reg_id',
      label: 'Reg ID',
      sortable: true,
      render: (val) => (
        <button
          onClick={() => navigate(`/assets/${val}`)}
          className="font-mono text-[11px] font-bold text-forest-700 hover:text-forest-900 hover:underline"
        >
          {String(val)}
        </button>
      ),
    },
    { key: 'asset_no',    label: 'Asset No',    sortable: true },
    { key: 'type',        label: 'Type',        sortable: true },
    { key: 'manufacture', label: 'Manufacturer',sortable: true },
    { key: 'series',      label: 'Series' },
    {
      key: 'vendor',
      label: 'Vendor',
      render: (val) => String((val as Asset['vendor'])?.nama ?? '-'),
    },
    {
      key: 'estate',
      label: 'Estate',
      render: (val) => String((val as Asset['estate'])?.estate ?? '-'),
    },
    {
      key: 'department',
      label: 'Department',
      render: (val) => String((val as Asset['department'])?.name ?? '-'),
    },
    {
      key: 'division',
      label: 'Divisi',
      render: (val) => String((val as Asset['division'])?.name ?? '-'),
    },
    {
      key: 'anggota',
      label: 'Assigned Member',
      render: (val) => String((val as Asset['anggota'])?.nama ?? '-'),
    },
    { key: 'alokasi', label: 'Alokasi' },
    { key: 'date',    label: 'Date', render: (val) => formatDate(String(val ?? '')) },
    {
      key: 'latest_condition',
      label: 'Kondisi',
      render: (val) => kondisiBadge((val as Asset['latest_condition'])?.kondisi),
    },
    {
      key: 'not_active',
      label: 'Status',
      render: (val) =>
        parseBoolean(val) ? (
          <Badge variant="inactive" dot>Inactive</Badge>
        ) : (
          <Badge variant="active" dot>Active</Badge>
        ),
    },
  ];

  if (error)
    return (
      <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">
        Failed to load asset data. Check your API connection.
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Physical Assets</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Registered physical equipment & machinery inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
            disabled={!isHoUser}
          >
            {isHoUser && <option value="">All Estates</option>}
            {(estates ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.estate} ({e.estate_id})</option>
            ))}
          </select>
          {/* #12 FIX: Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!data?.length}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl flex items-center text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          {canCreateAsset && (
            <button
              onClick={handleOpenAdd}
              className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </button>
          )}
        </div>
      </div>

      {needsAssetAccessSetup && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          Akses department/divisi belum diatur oleh admin.
        </div>
      )}

      <DataTable<Asset>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['reg_id', 'asset_no', 'type', 'manufacture', 'series', 'alokasi']}
        searchPlaceholder="Search assets by ID, type, manufacturer…"
        onView={(item) => navigate(`/assets/${item.reg_id}`)}
        onEdit={canEditAsset ? handleOpenEdit : undefined}
        onDelete={canDeleteAsset ? handleDelete : undefined}
        rowKey={(item) => item.reg_id}
        pageSize={10}
        emptyMessage={needsAssetAccessSetup ? 'Akses department/divisi belum diatur oleh admin' : 'No assets registered yet'}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? 'Edit Physical Asset' : 'Register New Asset'}
        description="Fill in the asset details below."
        size="lg"
      >
        <AssetForm
          initialData={selectedItem}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default AssetsPage;
