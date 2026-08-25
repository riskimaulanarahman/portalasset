import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Download } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import AssetConditionForm from '../components/forms/AssetConditionForm';
import { kondisiBadge } from '../components/ui/Badge';
import { SearchableSelect } from '../components/ui/FormFields';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';
import { formatDate, getStoredUser, isHeadOfficeUser, exportToCSV } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';

interface Condition {
  [key: string]: unknown;
  id:          number;
  reg_id:      string;
  kondisi:     string;
  date:        string;
  remarks?:    string;
  create_by:   string;
  asset?: {
    reg_id:     string;
    asset_no?:  string;
    type?:      string;
    estate?:    { estate?: string };
    section?:   { section?: string };
  };
}

const AssetConditionsPage: React.FC = () => {
  useTitle('Kondisi Aset');
  const navigate      = useNavigate();
  const user          = getStoredUser();
  const isHoUser      = isHeadOfficeUser();
  const queryClient   = useQueryClient();
  const { success, error: toastError } = useToast();

  const canCreate = hasStoredPermission('create-asset-conditions');
  const canDelete = hasStoredPermission('delete-asset-conditions');

  const [estateFilter,   setEstateFilter]   = useState<string>(!isHoUser && user?.estate_id ? String(user.estate_id) : '');
  const [kondisiFilter,  setKondisiFilter]  = useState<string>('');
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [selectedAsset,  setSelectedAsset]  = useState<any>(null);

  const { data: allAssets } = useQuery<any[]>({
    queryKey: ['assets-for-condition', estateFilter],
    queryFn:  async () => {
      const params: Record<string, string> = { all: '1' };
      if (estateFilter) params.estate_id = estateFilter;
      return (await api.get('/assets', { params })).data.data ?? [];
    },
    enabled: isModalOpen,
  });

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn:  async () => (await api.get('/estates')).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['asset-conditions', estateFilter, kondisiFilter],
    queryFn:  async () => {
      const params: Record<string, string> = {};
      if (estateFilter)  params.estate_id = estateFilter;
      if (kondisiFilter) params.kondisi   = kondisiFilter;
      params.all = '1';
      const resp = await api.get('/asset-conditions', { params });
      return resp.data.data as Condition[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/asset-conditions', d),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['asset-conditions'] });
      setIsModalOpen(false);
      success('Kondisi disimpan', 'Riwayat kondisi berhasil dicatat.');
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Kondisi gagal disimpan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/asset-conditions/${id}`),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['asset-conditions'] });
      success('Dihapus', 'Catatan kondisi berhasil dihapus.');
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Gagal menghapus.'),
  });

  const handleDelete = async (item: Condition) => {
    const result = await showConfirm(`Hapus catatan kondisi aset ${item.reg_id}?`);
    if (result.isConfirmed) deleteMutation.mutate(item.id);
  };

  const handleExportCSV = () => {
    const rows = (data ?? []).map((c) => ({
      reg_id:    c.reg_id,
      asset_no:  c.asset?.asset_no ?? '',
      type:      c.asset?.type ?? '',
      estate:    c.asset?.estate?.estate ?? '',
      section:   c.asset?.section?.section ?? '',
      kondisi:   c.kondisi,
      tanggal:   c.date,
      remarks:   c.remarks ?? '',
      dicatat_oleh: c.create_by,
    }));
    exportToCSV(rows, [
      { key: 'reg_id',       label: 'Reg ID' },
      { key: 'asset_no',     label: 'Asset No' },
      { key: 'type',         label: 'Tipe' },
      { key: 'estate',       label: 'Estate' },
      { key: 'section',      label: 'Section' },
      { key: 'kondisi',      label: 'Kondisi' },
      { key: 'tanggal',      label: 'Tanggal' },
      { key: 'remarks',      label: 'Keterangan' },
      { key: 'dicatat_oleh', label: 'Dicatat Oleh' },
    ], `kondisi-aset-${new Date().toISOString().split('T')[0]}`);
  };

  const columns: Column<Condition>[] = [
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
    {
      key: 'asset',
      label: 'Asset No / Tipe',
      render: (val: any) => (
        <div>
          <p className="font-medium text-gray-800 text-sm">{val?.asset_no || '-'}</p>
          <p className="text-xs text-gray-500">{val?.type || '-'}</p>
        </div>
      ),
    },
    {
      key: 'kondisi',
      label: 'Kondisi',
      sortable: true,
      render: (val) => kondisiBadge(String(val)),
    },
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (val) => formatDate(String(val ?? '')),
    },
    {
      key: 'remarks',
      label: 'Keterangan',
      render: (val) => (
        <span className="text-sm text-gray-600 line-clamp-1">{val ? String(val) : <span className="italic text-gray-400">-</span>}</span>
      ),
    },
    {
      key: 'create_by',
      label: 'Dicatat Oleh',
      render: (val) => <span className="text-xs text-gray-500">{String(val ?? '')}</span>,
    },
    ...(isHoUser ? [{
      key: 'asset',
      label: 'Estate',
      render: (val: any) => <span className="text-xs text-gray-600">{val?.estate?.estate || '-'}</span>,
    }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl ring-4 ring-amber-50">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Kondisi Aset</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Riwayat kondisi fisik aset dari seluruh estate</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter kondisi */}
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={kondisiFilter}
            onChange={(e) => setKondisiFilter(e.target.value)}
          >
            <option value="">Semua Kondisi</option>
            <option value="Good">Good</option>
            <option value="Bad">Bad</option>
            <option value="Broken">Broken</option>
          </select>

          {/* Filter estate (HO only) */}
          {isHoUser && (
            <select
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
              value={estateFilter}
              onChange={(e) => setEstateFilter(e.target.value)}
            >
              <option value="">Semua Estate</option>
              {(estates ?? []).map((e: any) => (
                <option key={e.id} value={e.id}>{e.estate} ({e.estate_id})</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            disabled={!data?.length}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl flex items-center text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>

          {canCreate && (
            <button
              onClick={() => { setSelectedAsset(null); setIsModalOpen(true); }}
              className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Catat Kondisi
            </button>
          )}
        </div>
      </div>

      <DataTable<Condition>
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchKeys={['reg_id', 'kondisi', 'create_by']}
        searchPlaceholder="Cari berdasarkan Reg ID, kondisi, atau petugas..."
        onView={(item) => navigate(`/assets/${item.reg_id}`)}
        onDelete={canDelete ? handleDelete : undefined}
        rowKey={(item) => item.id}
        pageSize={15}
        emptyMessage="Belum ada catatan kondisi aset"
      />

      {/* Modal: catat kondisi baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedAsset(null); }}
        title="Catat Kondisi Aset"
        size="md"
      >
        <div className="space-y-4">
          {/* Searchable dropdown pilih aset */}
          <SearchableSelect
            label="Pilih Aset"
            required
            placeholder="Cari berdasarkan Reg ID atau Asset No..."
            value={selectedAsset?.reg_id ?? ''}
            onChange={(val) => {
              const asset = (allAssets ?? []).find((a: any) => a.reg_id === String(val));
              setSelectedAsset(asset ?? null);
            }}
            options={(allAssets ?? []).map((a: any) => ({
              value: a.reg_id,
              label: [
                a.reg_id,
                a.asset_no,
                [a.type, a.manufacture, a.series].filter(Boolean).join(' '),
              ].filter(Boolean).join(' — '),
            }))}
            noOptionsText="Aset tidak ditemukan"
          />

          {/* Info aset yang dipilih + kondisi terakhir */}
          {selectedAsset && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{selectedAsset.reg_id}</p>
                  <p className="text-xs text-gray-500">
                    {[selectedAsset.type, selectedAsset.manufacture, selectedAsset.series].filter(Boolean).join(' — ')}
                  </p>
                  <p className="text-xs text-gray-500">{selectedAsset.estate?.estate ?? ''}</p>
                </div>
                {selectedAsset.latest_condition && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Kondisi terakhir</p>
                    {kondisiBadge(selectedAsset.latest_condition?.kondisi)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form kondisi hanya tampil setelah aset dipilih */}
          {selectedAsset && (
            <AssetConditionForm
              regId={selectedAsset.reg_id}
              onSubmit={(d) => createMutation.mutate(d)}
              onCancel={() => { setIsModalOpen(false); setSelectedAsset(null); }}
              isLoading={createMutation.isPending}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AssetConditionsPage;
