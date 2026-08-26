import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import {
  ArrowLeft, ArrowLeftRight, Calendar, MapPin, Tag, Briefcase,
  Wrench, Info, Plus, AlertTriangle, FileX, Download, CheckCircle2, Pencil,
} from 'lucide-react';
import useTitle from '../hooks/useTitle';
import Modal from '../components/Modal';
import Badge, { kondisiBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MemberPicker, { type MemberPickerItem } from '../components/MemberPicker';
import AssetConditionForm from '../components/forms/AssetConditionForm';
import AssetMaintenanceForm from '../components/forms/AssetMaintenanceForm';
import WriteOffForm from '../components/forms/WriteOffForm';
import { useToast } from '../components/ui/Toast';
import { formatDate, parseBoolean } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';
import Swal from 'sweetalert2';

type TabId = 'info' | 'kondisi' | 'maintenance' | 'transaksi';

const AssetDetailPage: React.FC = () => {
  const { regId } = useParams<{ regId: string }>();
  useTitle(`Asset ${regId}`);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab]       = useState<TabId>('info');
  const [conditionModal, setConditionModal]     = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [writeOffModal, setWriteOffModal]       = useState(false);
  const [prefilledMaintenance, setPrefilledMaintenance] = useState<any>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);

  const canCreateCondition   = hasStoredPermission('create-asset-conditions');
  const canCreateMaintenance = hasStoredPermission('create-asset-maintenances');
  const canEditMaintenance   = hasStoredPermission('edit-asset-maintenances');
  const canCreateWriteOff    = hasStoredPermission('create-write-offs');
  const canCreateDamageReport = hasStoredPermission('create-asset-reports');
  const canRecordCondition    = canCreateCondition || canCreateDamageReport;
  const canAssignMember      = hasStoredPermission('assign-asset-members') || hasStoredPermission('edit-assets');
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', regId],
    queryFn: async () => {
      const response = await api.get(`/assets/${regId}`);
      return response.data.data;
    },
  });

  const { data: members = [], isFetching: isFetchingMembers } = useQuery<MemberPickerItem[]>({
    queryKey: ['asset-members'],
    queryFn: async () => {
      const response = await api.get('/anggotas');

      return (response.data.data ?? [])
        .filter((anggota: any) => !parseBoolean(anggota.not_active))
        .map((anggota: any) => ({
          sap_id: String(anggota.sap_id),
          login_name: anggota.login_name ?? null,
          nama: String(anggota.nama ?? ''),
          position: anggota.position ?? null,
          department: anggota.department ?? null,
          company_code: anggota.company_code ?? null,
          cost_center: anggota.cost_center ?? null,
        }));
    },
    enabled: canAssignMember || canCreateMaintenance || canEditMaintenance || canCreateDamageReport,
  });

  useEffect(() => {
    setSelectedMemberId(asset?.anggota_id ?? '');
  }, [asset?.reg_id, asset?.anggota_id]);

  // Condition mutation
  const conditionMutation = useMutation({
    mutationFn: async (data: any) => {
      const isDamaged = data.kondisi === 'Bad' || data.kondisi === 'Broken';

      if (canCreateDamageReport && isDamaged) {
        const formData = new FormData();
        formData.append('date', data.date);
        formData.append('kondisi', data.kondisi);
        formData.append('remarks', data.remarks ?? '');
        formData.append('create_maintenance', data.create_maintenance ? '1' : '0');

        if (data.create_maintenance) {
          ['terima', 'target', 'sap1', 'nama1', 'sent_', 'keterangan', 'action_remark'].forEach((key) => {
            if (data[key]) formData.append(key, data[key]);
          });
        }

        const file = data.attachment?.[0];
        if (file) {
          formData.append('attachment', file);
        }

        const response = await api.post(`/assets/${regId}/report-damage`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        return { response, usedDamageReport: true };
      }

      const response = await api.post('/asset-conditions', {
        reg_id: data.reg_id,
        kondisi: data.kondisi,
        date: data.date,
        remarks: data.remarks,
      });

      return { response, usedDamageReport: false };
    },
    onSuccess: async (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      queryClient.invalidateQueries({ queryKey: ['asset-conditions'] });
      queryClient.invalidateQueries({ queryKey: ['asset-maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setConditionModal(false);
      success('Kondisi tersimpan', 'Riwayat kondisi aset berhasil dicatat.');

      const kondisi = vars.kondisi;
      if (!result.usedDamageReport && canCreateMaintenance && (kondisi === 'Bad' || kondisi === 'Broken')) {
        const result = await Swal.fire({
          title: 'Buat Maintenance Request?',
          text: `Kondisi aset ${kondisi}. Ingin membuat request maintenance sekarang?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Ya, Buat Maintenance',
          cancelButtonText: 'Nanti',
          confirmButtonColor: '#1a4731',
        });
        if (result.isConfirmed) {
          openCreateMaintenanceModal({ kondisi });
        }
      }
      if (kondisi === 'Broken' && canCreateWriteOff) {
        const result = await Swal.fire({
          title: 'Ajukan Write-Off?',
          text: 'Aset dalam kondisi Broken. Ingin mengajukan Write-Off untuk menonaktifkan aset ini?',
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: 'Ya, Ajukan Write-Off',
          cancelButtonText: 'Tidak',
          confirmButtonColor: '#dc2626',
        });
        if (result.isConfirmed) {
          setWriteOffModal(true);
        }
      }
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Kondisi gagal disimpan.'),
  });

  // Maintenance mutation
  const maintenanceMutation = useMutation({
    mutationFn: (data: any) => {
      if (selectedMaintenance?.id) {
        return api.put(`/asset-maintenances/${selectedMaintenance.id}`, data);
      }

      return api.post('/asset-maintenances', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      queryClient.invalidateQueries({ queryKey: ['asset-maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setMaintenanceModal(false);
      setPrefilledMaintenance(null);
      setSelectedMaintenance(null);
      success(
        selectedMaintenance?.id ? 'Maintenance diperbarui' : 'Maintenance dibuat',
        selectedMaintenance?.id ? 'Status maintenance berhasil diperbarui.' : 'Request maintenance berhasil disimpan.',
      );
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const firstError = errors ? (Object.values(errors)[0] as string[] | undefined) : undefined;
      toastError('Gagal', firstError?.[0] || err.response?.data?.message || 'Maintenance gagal disimpan.');
    },
  });

  // Write-Off mutation
  const writeOffMutation = useMutation({
    mutationFn: (data: any) => api.post('/write-offs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      setWriteOffModal(false);
      success('Write-Off diajukan', 'Permohonan write-off berhasil dikirim untuk persetujuan.');
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Write-off gagal diajukan.'),
  });

  const assignMemberMutation = useMutation({
    mutationFn: () => api.post(`/assets/${regId}/assign-member`, {
      anggota_id: selectedMemberId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Assignment tersimpan', 'Assigned Member aset berhasil diperbarui.');
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Assignment member gagal disimpan.'),
  });

  const handleDownloadWriteOffBA = async (id: number) => {
    try {
      const response = await api.get(`/write-offs/${id}/berita-acara`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
    } catch (err: any) {
      toastError('Gagal', err.response?.data?.message || 'Berita Acara write-off belum bisa dibuat.');
    }
  };

  const todayInputValue = () => new Date().toISOString().split('T')[0];
  const dateInputValue = (value?: string | null) => value ? String(value).split('T')[0] : undefined;
  const maintenanceFormData = (maintenance: any, complete = false) => ({
    terima: dateInputValue(maintenance.terima),
    target: dateInputValue(maintenance.target),
    selesai: complete ? (dateInputValue(maintenance.selesai) ?? todayInputValue()) : dateInputValue(maintenance.selesai),
    sap1: maintenance.sap1 ?? '',
    nama1: maintenance.nama1 ?? '',
    sap2: maintenance.sap2 ?? '',
    nama2: maintenance.nama2 ?? '',
    sap3: maintenance.sap3 ?? '',
    nama3: maintenance.nama3 ?? '',
    sent_: maintenance.sent_ ?? '',
    kondisi: complete ? '' : (maintenance.kondisi ?? latestKondisi ?? ''),
    keterangan: maintenance.keterangan ?? '',
    action_remark: maintenance.action_remark ?? '',
    status: complete ? 'Done' : (maintenance.status ?? 'Progress'),
  });

  const openCreateMaintenanceModal = (initialData: any = null) => {
    setSelectedMaintenance(null);
    setPrefilledMaintenance(initialData);
    setMaintenanceModal(true);
  };

  const openEditMaintenanceModal = (maintenance: any, complete = false) => {
    setSelectedMaintenance(maintenance);
    setPrefilledMaintenance(maintenanceFormData(maintenance, complete));
    setMaintenanceModal(true);
  };

  const parseMaintenanceConditionRemark = (remarks?: string | null) => {
    const match = /^Maintenance #(\d+) selesai:\s*(.*)$/i.exec(remarks ?? '');

    return {
      isMaintenance: Boolean(match),
      maintenanceId: match?.[1],
      text: match ? match[2] : remarks,
    };
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat detail aset...</div>;
  if (error || !asset) return (
    <div className="p-8 text-center text-red-500 bg-red-50 m-6 rounded-xl">
      Aset tidak ditemukan atau gagal dimuat.
    </div>
  );

  const latestKondisi = asset.latest_condition?.kondisi;
  const isAssetInactive = parseBoolean(asset.not_active);
  const pendingWriteOff = (asset.write_off_requests ?? []).find(
    (wo: any) => wo.approval_requests?.some((ar: any) => ar.status === 'Pending')
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'info',        label: 'Informasi' },
    { id: 'kondisi',     label: 'Kondisi',     count: asset.conditions?.length ?? 0 },
    { id: 'maintenance', label: 'Maintenance', count: asset.maintenances?.length ?? 0 },
    { id: 'transaksi',   label: 'Riwayat Transfer', count: asset.transfer_histories?.length ?? asset.transfer_history?.length ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/assets')} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{asset.reg_id}</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              {[asset.type, asset.manufacture, asset.series].filter(Boolean).join(' — ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestKondisi && kondisiBadge(latestKondisi)}
          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${isAssetInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {isAssetInactive ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>

      {/* Write-Off pending banner */}
      {pendingWriteOff && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            Aset ini memiliki pengajuan <strong>Write-Off</strong> yang sedang menunggu persetujuan.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-100">
              <nav className="flex px-6 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-4 px-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-forest-600 text-forest-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1.5 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Field icon={<Tag />} label="Asset No" value={asset.asset_no} />
                  <Field icon={<Info />} label="Unit ID" value={asset.unit_id} />
                  <Field icon={<Calendar />} label="Tanggal Registrasi" value={formatDate(asset.date)} />
                  <Field label="Serial Number" value={asset.serial_no} mono />
                </div>
                <div className="space-y-4">
                  <Field label="Tipe / Merek / Seri" value={`${asset.type} — ${asset.manufacture} (${asset.series})`} />
                  <Field icon={<MapPin />} label="Section" value={asset.section?.section} />
                  <Field icon={<MapPin />} label="Estate" value={asset.estate?.estate} />
                  <Field label="Department" value={asset.department?.name} />
                  <Field label="Divisi" value={asset.division?.name} />
                  <Field label="Assigned Member" value={asset.anggota ? `${asset.anggota.nama} (${asset.anggota.sap_id})` : '-'} />
                  <Field label="Alokasi" value={asset.alokasi} />
                  <Field icon={<Briefcase />} label="Vendor / Source" value={`${asset.vendor?.nama || '-'} ${asset.source ? `(${asset.source})` : ''}`} />
                  {canAssignMember && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
                      <MemberPicker
                        label="Update Assigned Member"
                        value={selectedMemberId}
                        members={members}
                        isLoading={isFetchingMembers}
                        onChange={setSelectedMemberId}
                        selectedFallbackLabel={
                          asset.anggota ? `${asset.anggota.nama} (${asset.anggota.sap_id})` : undefined
                        }
                        disabled={assignMemberMutation.isPending}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => assignMemberMutation.mutate()}
                        loading={assignMemberMutation.isPending}
                      >
                        Save Assignment
                      </Button>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Keterangan</p>
                  <p className="text-sm text-gray-700">{asset.keterangan || 'Tidak ada keterangan.'}</p>
                </div>
              </div>
            )}

            {/* Tab: Kondisi */}
            {activeTab === 'kondisi' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Riwayat kondisi aset dari waktu ke waktu.</p>
                  <div className="flex gap-2">
                    {canRecordCondition && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => setConditionModal(true)}
                      >
                        Catat Kondisi
                      </Button>
                    )}
                    {canCreateWriteOff && !isAssetInactive && !pendingWriteOff && (
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<FileX className="h-3.5 w-3.5" />}
                        onClick={() => setWriteOffModal(true)}
                      >
                        Ajukan Write-Off
                      </Button>
                    )}
                  </div>
                </div>

                {asset.conditions?.length > 0 ? (
                  <div className="space-y-2">
                    {asset.conditions.map((cond: any) => {
                      const conditionRemark = parseMaintenanceConditionRemark(cond.remarks);

                      return (
                      <div key={cond.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="shrink-0">{kondisiBadge(cond.kondisi)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {conditionRemark.isMaintenance && (
                              <Badge variant="info" dot>
                                Maintenance #{conditionRemark.maintenanceId}
                              </Badge>
                            )}
                            <p className="text-sm text-gray-700">{conditionRemark.text || <span className="text-gray-400 italic">Tidak ada keterangan</span>}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(cond.date)} · {cond.create_by}</p>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm italic">Belum ada riwayat kondisi.</div>
                )}
              </div>
            )}

            {/* Tab: Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Daftar maintenance dan perbaikan aset.</p>
                  {canCreateMaintenance && (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => openCreateMaintenanceModal()}
                    >
                      Buat Maintenance
                    </Button>
                  )}
                </div>

                {asset.maintenances?.length > 0 ? (
                  <div className="space-y-3">
                    {asset.maintenances.map((maint: any) => (
                      <div key={maint.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-semibold text-gray-800">
                              Terima: {formatDate(maint.terima)} → Target: {formatDate(maint.target)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {maint.kondisi && kondisiBadge(maint.kondisi)}
                            <Badge variant={maint.status === 'Done' ? 'active' : 'pending'} dot>
                              {maint.status ?? 'Progress'}
                            </Badge>
                            {canEditMaintenance && (
                              <>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<Pencil className="h-3 w-3" />}
                                  onClick={() => openEditMaintenanceModal(maint)}
                                >
                                  Edit
                                </Button>
                                {maint.status !== 'Done' && (
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="success"
                                    leftIcon={<CheckCircle2 className="h-3 w-3" />}
                                    onClick={() => openEditMaintenanceModal(maint, true)}
                                  >
                                    Selesaikan
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                          <span>PIC 1: <strong>{maint.nama1 || '-'}</strong> ({maint.sap1 || '-'})</span>
                          {maint.nama2 && <span>PIC 2: <strong>{maint.nama2}</strong></span>}
                          {maint.nama3 && <span>PIC 3: <strong>{maint.nama3}</strong></span>}
                          {maint.sent_ && <span>Tujuan: <strong>{maint.sent_}</strong></span>}
                          {maint.selesai && <span>Selesai: <strong>{formatDate(maint.selesai)}</strong></span>}
                          {maint.update_by && <span>Update: <strong>{maint.update_by}</strong> {maint.update_date ? `- ${formatDate(maint.update_date)}` : ''}</span>}
                        </div>
                        {maint.keterangan && (
                          <p className="text-xs text-gray-600 italic">"{maint.keterangan}"</p>
                        )}
                        {maint.action_remark && (
                          <p className="text-xs text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2">
                            <span className="font-medium text-gray-500">Action:</span> {maint.action_remark}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm italic">Belum ada riwayat maintenance.</div>
                )}
              </div>
            )}

            {/* Tab: Riwayat Transfer */}
            {activeTab === 'transaksi' && (
              <div className="p-6 space-y-3">
                {asset.transfer_histories?.length > 0 ? (
                  asset.transfer_histories.map((history: any) => (
                    <div key={history.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4 text-forest-500 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 font-mono">
                            {history.transfer?.transfer_code ?? `Transfer #${history.transfer_id}`}
                          </span>
                        </div>
                        <Badge variant="active" dot>Processed</Badge>
                      </div>
                      <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                        <span>Dari: <strong>{history.from_estate?.estate ?? '-'}</strong></span>
                        <span>Ke: <strong>{history.to_estate?.estate ?? '-'}</strong></span>
                        <span>Unit Lama: {history.previous_unit_id ?? '-'}</span>
                        <span>Unit Baru: {history.new_unit_id ?? '-'}</span>
                        <span>Target Member: {history.target_anggota?.nama ?? history.target_anggota_id ?? '-'}</span>
                        <span>Diproses: {formatDate(history.processed_at)}</span>
                        {history.notes && <span className="col-span-2">Catatan: {history.notes}</span>}
                      </div>
                    </div>
                  ))
                ) : asset.transfer_history?.length > 0 ? (
                  asset.transfer_history.map((item: any) => {
                    const transfer = item.transfer;
                    return (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4 text-forest-500 shrink-0" />
                            <span className="text-sm font-semibold text-gray-800 font-mono">
                              {transfer?.transfer_code ?? '-'}
                            </span>
                          </div>
                          <Badge
                            variant={
                              transfer?.status === 'Approved' || transfer?.status === 'Received' ? 'active'
                              : transfer?.status === 'Rejected' || transfer?.status === 'Cancelled' ? 'inactive'
                              : 'pending'
                            }
                            dot
                          >
                            {transfer?.status ?? '-'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                          <span>Dari: <strong>{transfer?.from_estate?.estate ?? '-'}</strong></span>
                          <span>Ke: <strong>{transfer?.to_estate?.estate ?? '-'}</strong></span>
                          <span>Tgl Transfer: {formatDate(transfer?.transfer_date)}</span>
                          {transfer?.receive_date && (
                            <span>Tgl Terima: {formatDate(transfer.receive_date)}</span>
                          )}
                          <span>Dibuat: {transfer?.created_by ?? '-'}</span>
                          {item.notes && <span>Catatan: {item.notes}</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm italic">
                    Aset ini belum pernah ditransfer.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-linear-to-br from-forest-700 to-forest-900 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-base font-semibold mb-4 opacity-90">Ringkasan</h3>
            <div className="space-y-3">
              <StatRow label="Kondisi Terkini" value={
                latestKondisi
                  ? <span className={`font-bold ${latestKondisi === 'Good' ? 'text-emerald-300' : latestKondisi === 'Broken' ? 'text-red-300' : 'text-amber-300'}`}>{latestKondisi}</span>
                  : <span className="opacity-50 text-sm">Belum dicek</span>
              } />
              <StatRow label="Riwayat Kondisi" value={asset.conditions?.length ?? 0} />
              <StatRow label="Total Maintenance" value={asset.maintenances?.length ?? 0} />
              <StatRow label="Riwayat Transfer" value={asset.transfer_histories?.length ?? asset.transfer_history?.length ?? 0} />
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs opacity-70 mb-1">Dibuat Oleh</p>
                <p className="text-sm font-medium">{asset.create_by || 'system'}</p>
                <p className="text-[10px] opacity-60">{formatDate(asset.create_date)}</p>
              </div>
            </div>
          </div>

          {/* Write-Off section */}
          {asset.write_off_requests?.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <FileX className="h-4 w-4" /> Write-Off Request
              </h3>
              {asset.write_off_requests.map((wo: any) => {
                const approvalReq = wo.approval_requests?.[0];
                const isApproved  = approvalReq?.status === 'Approved';
                return (
                  <div key={wo.id} className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={isApproved ? 'active' : approvalReq?.status === 'Pending' ? 'pending' : 'inactive'} dot>
                        {approvalReq?.status ?? 'Pending'}
                      </Badge>
                      {isApproved && (
                        <button
                          onClick={() => handleDownloadWriteOffBA(wo.id)}
                          className="text-xs text-forest-600 hover:underline flex items-center gap-1"
                          title="Generate Berita Acara Write-Off (PDF)"
                        >
                          <Download className="h-3 w-3" /> Generate BA
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Kondisi: {wo.kondisi} · {formatDate(wo.date)}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{wo.keterangan}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Catat Kondisi */}
      <Modal isOpen={conditionModal} onClose={() => setConditionModal(false)} title="Catat Kondisi Aset" size="xl">
        <AssetConditionForm
          regId={regId!}
          onSubmit={(data) => conditionMutation.mutate(data)}
          onCancel={() => setConditionModal(false)}
          isLoading={conditionMutation.isPending}
          allowGood={canCreateCondition}
          enableDamageWorkflow={canCreateDamageReport}
          members={members}
          isMembersLoading={isFetchingMembers}
        />
      </Modal>

      {/* Modal: Buat Maintenance */}
      <Modal
        isOpen={maintenanceModal}
        onClose={() => { setMaintenanceModal(false); setPrefilledMaintenance(null); setSelectedMaintenance(null); }}
        title={selectedMaintenance?.id ? 'Update Maintenance Request' : 'Buat Maintenance Request'}
        size="xl"
      >
        <AssetMaintenanceForm
          regId={regId!}
          initialData={prefilledMaintenance}
          onSubmit={(data) => maintenanceMutation.mutate(data)}
          onCancel={() => { setMaintenanceModal(false); setPrefilledMaintenance(null); setSelectedMaintenance(null); }}
          isLoading={maintenanceMutation.isPending}
          members={members}
          isMembersLoading={isFetchingMembers}
        />
      </Modal>

      {/* Modal: Write-Off */}
      <Modal isOpen={writeOffModal} onClose={() => setWriteOffModal(false)} title="Ajukan Write-Off Aset" size="md">
        <WriteOffForm
          regId={regId!}
          assetNo={asset.asset_no}
          kondisi={latestKondisi ?? 'Broken'}
          onSubmit={(data) => writeOffMutation.mutate(data)}
          onCancel={() => setWriteOffModal(false)}
          isLoading={writeOffMutation.isPending}
        />
      </Modal>
    </div>
  );
};

// Helper sub-components
const Field: React.FC<{ label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean }> = ({ label, value, icon, mono }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
      {icon && React.cloneElement(icon as React.ReactElement, { className: 'h-3 w-3' })}
      {label}
    </label>
    <p className={`mt-1 text-gray-900 font-medium ${mono ? 'font-mono text-sm' : ''}`}>{value || '-'}</p>
  </div>
);

const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-center border-b border-white/10 pb-2">
    <span className="text-sm opacity-80">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

export default AssetDetailPage;
