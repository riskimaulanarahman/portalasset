import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Download } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import MaterialForm from '../components/forms/MaterialForm';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';
import { showConfirm } from '../utils/SwalUtils';

import { formatNumber, getStoredUser, exportToCSV, isHeadOfficeUser } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';

interface Material {
  [key: string]: any;
  code:       string;
  nama:       string;
  category?:  { category?: string };
  unit?:      { nama?: string };
  estate?:    { estate?: string, estate_id?: string };
  stock:      number;
  not_active: boolean;
}

const MaterialsPage: React.FC = () => {
  useTitle('Materials');
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const isHoUser = isHeadOfficeUser(); // #22 FIX: use centralized helper
  const canCreateMaterial = hasStoredPermission('create-materials');
  const canEditMaterial = hasStoredPermission('edit-materials');
  const canDeleteMaterial = hasStoredPermission('delete-materials');

  const { success, error: toastError } = useToast();
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [estateFilter, setEstateFilter] = useState<string>(!isHoUser && user.estate_id ? String(user.estate_id) : '');
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  // #13 FIX: Server-side pagination state
  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(15);

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    }
  });

  // #13 FIX: Server-side paginated query
  const { data: pagedData, isLoading, error } = useQuery<{ data: Material[]; meta: { current_page: number; per_page: number; total: number; last_page: number } }>({
    queryKey: ['materials', estateFilter, page, perPage],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: perPage };
      if (estateFilter) params.estate_id = estateFilter;
      const response = await api.get('/materials', { params });
      return response.data;
    },
  });

  const data = pagedData?.data ?? [];
  const meta = pagedData?.meta;

  const createMutation = useMutation({
    mutationFn: (newData: unknown) => api.post('/materials', newData),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); handleCloseModal(); success('Material created'); },
    onError: (err: any) => toastError(err?.response?.data?.message || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Material) => api.put(`/materials/${data.code}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); handleCloseModal(); success('Material updated'); },
    onError: (err: any) => toastError(err?.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => api.delete(`/materials/${code}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); success('Material deleted'); },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Delete failed';
      toastError(msg);
    },
  });

  const handleOpenAdd    = () => { setSelectedItem(null); setIsModalOpen(true); };
  const handleOpenEdit   = (item: Material) => { setSelectedItem(item); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(null); };
  const handleSubmit = (formData: any) => {
    if (selectedItem) updateMutation.mutate(formData);
    else              createMutation.mutate(formData);
  };
  const handleDelete = async (item: Material) => {
    const result = await showConfirm(`Delete material "${item.nama}"?`);
    if (result.isConfirmed)
      deleteMutation.mutate(item.code);
  };

  // #12 FIX: Export material list ke CSV — pakai ?all=1 untuk ambil semua baris
  const handleExportCSV = async () => {
    const params: Record<string, unknown> = { all: 1 };
    if (estateFilter) params.estate_id = estateFilter;
    const response = await api.get('/materials', { params });
    const allData: Material[] = response.data.data ?? [];
    const rows = allData.map((m) => ({
      code:     m.code,
      nama:     m.nama,
      category: m.category?.category ?? '',
      unit:     m.unit?.nama ?? '',
      estate:   m.estate?.estate ?? '',
      stock:    m.stock,
      status:   m.not_active ? 'Inactive' : 'Active',
    }));
    exportToCSV(rows, [
      { key: 'code',     label: 'Kode' },
      { key: 'nama',     label: 'Nama Material' },
      { key: 'category', label: 'Kategori' },
      { key: 'unit',     label: 'Satuan' },
      { key: 'estate',   label: 'Estate' },
      { key: 'stock',    label: 'Stok' },
      { key: 'status',   label: 'Status' },
    ], `materials-${new Date().toISOString().split('T')[0]}`);
  };

  const columns: Column<Material>[] = [
    { key: 'code', label: 'Code',     sortable: true, render: (val) => <span className="font-mono text-[11px] font-bold text-forest-700">{String(val)}</span> },
    { key: 'nama', label: 'Name',     sortable: true },
    {
      key: 'category',
      label: 'Category',
      render: (val) => String((val as Material['category'])?.category ?? '-'),
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (val) => String((val as Material['unit'])?.nama ?? '-'),
    },
    {
      key: 'estate',
      label: 'Estate',
      render: (val) => String((val as Material['estate'])?.estate ?? '-'),
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true,
      render: (val) => {
        const n = Number(val);
        return (
          <span className={`font-bold ${n < 5 ? 'text-red-600' : n < 20 ? 'text-amber-600' : 'text-forest-800'}`}>
            {formatNumber(n)}
          </span>
        );
      },
    },
    {
      key: 'not_active',
      label: 'Status',
      render: (val) => val
        ? <Badge variant="inactive" dot>Inactive</Badge>
        : <Badge variant="active"   dot>Active</Badge>,
    },
  ];

  if (error)
    return <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-5">Failed to load materials.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Materials</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Material inventory & stock management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-forest-500 focus:border-forest-500 block p-2.5"
            value={estateFilter}
            onChange={(e) => { setEstateFilter(e.target.value); setPage(1); }}
            disabled={!isHoUser}
          >
            {isHoUser && <option value="">All Estates</option>}
            {(estates ?? []).map((e: any) => (
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
          {canCreateMaterial && (
            <button
              onClick={handleOpenAdd}
              className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </button>
          )}
        </div>
      </div>

      {/* #13 FIX: Server-side pagination */}
      <DataTable<Material>
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search materials by code or name…"
        onSearch={() => {
          // Ketika user mengetik, reset ke halaman 1 (search ditangani server via query param)
          setPage(1);
        }}
        onEdit={canEditMaterial ? handleOpenEdit : undefined}
        onDelete={canDeleteMaterial ? handleDelete : undefined}
        rowKey={(item) => item.code}
        emptyMessage="No materials in inventory"
        serverPagination={meta ? {
          totalItems:    meta.total,
          currentPage:   meta.current_page,
          perPage:       meta.per_page,
          onPageChange:  (p) => setPage(p),
          onPerPageChange: (pp) => { setPerPage(pp); setPage(1); },
        } : undefined}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedItem ? 'Edit Material' : 'Add New Material'}>
        <MaterialForm initialData={selectedItem} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default MaterialsPage;
