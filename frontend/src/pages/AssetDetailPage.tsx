import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import {
  ArrowLeft, ArrowLeftRight, Calendar, MapPin, Tag, Briefcase, History,
  Wrench, Info, Plus, AlertTriangle, FileX, Download,
} from 'lucide-react';
import useTitle from '../hooks/useTitle';
import Modal from '../components/Modal';
import Badge, { kondisiBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import AssetConditionForm from '../components/forms/AssetConditionForm';
import AssetMaintenanceForm from '../components/forms/AssetMaintenanceForm';
import WriteOffForm from '../components/forms/WriteOffForm';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../lib/utils';
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

  const canCreateCondition   = hasStoredPermission('create-asset-conditions');
  const canCreateMaintenance = hasStoredPermission('create-asset-maintenances');
  const canCreateWriteOff    = hasStoredPermission('create-write-offs');

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', regId],
    queryFn: async () => {
      const response = await api.get(`/assets/${regId}`);
      return response.data.data;
    },
  });

  // Condition mutation
  const conditionMutation = useMutation({
    mutationFn: (data: any) => api.post('/asset-conditions', data),
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      queryClient.invalidateQueries({ queryKey: ['asset-conditions'] });
      setConditionModal(false);
      success('Kondisi tersimpan', 'Riwayat kondisi aset berhasil dicatat.');

      const kondisi = vars.kondisi;
      if (kondisi === 'Bad' || kondisi === 'Broken') {
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
          setPrefilledMaintenance({ kondisi });
          setMaintenanceModal(true);
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
    mutationFn: (data: any) => api.post('/asset-maintenances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', regId] });
      setMaintenanceModal(false);
      setPrefilledMaintenance(null);
      success('Maintenance dibuat', 'Request maintenance berhasil disimpan.');
    },
    onError: (err: any) => toastError('Gagal', err.response?.data?.message || 'Maintenance gagal disimpan.'),
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat detail aset...</div>;
  if (error || !asset) return (
    <div className="p-8 text-center text-red-500 bg-red-50 m-6 rounded-xl">
      Aset tidak ditemukan atau gagal dimuat.
    </div>
  );

  const latestKondisi = asset.latest_condition?.kondisi;
  const pendingWriteOff = (asset.write_off_requests ?? []).find(
    (wo: any) => wo.approval_requests?.some((ar: any) => ar.status === 'Pending')
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'info',        label: 'Informasi' },
    { id: 'kondisi',     label: 'Kondisi',     count: asset.conditions?.length ?? 0 },
    { id: 'maintenance', label: 'Maintenance', count: asset.maintenances?.length ?? 0 },
    { id: 'transaksi',   label: 'Riwayat Transfer', count: asset.transfer_history?.length ?? 0 },
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
          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${asset.not_active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {asset.not_active ? 'Inactive' : 'Active'}
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
                  <Field label="Alokasi" value={asset.alokasi} />
                  <Field icon={<Briefcase />} label="Vendor / Source" value={`${asset.vendor?.nama || '-'} ${asset.source ? `(${asset.source})` : ''}`} />
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
                    {canCreateCondition && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => setConditionModal(true)}
                      >
                        Catat Kondisi
                      </Button>
                    )}
                    {canCreateWriteOff && !asset.not_active && !pendingWriteOff && (
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
                    {asset.conditions.map((cond: any) => (
                      <div key={cond.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="shrink-0">{kondisiBadge(cond.kondisi)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">{cond.remarks || <span className="text-gray-400 italic">Tidak ada keterangan</span>}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(cond.date)} · {cond.create_by}</p>
                        </div>
                      </div>
                    ))}
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
                      onClick={() => { setPrefilledMaintenance(null); setMaintenanceModal(true); }}
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
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                          <span>PIC 1: <strong>{maint.nama1 || '-'}</strong> ({maint.sap1 || '-'})</span>
                          {maint.nama2 && <span>PIC 2: <strong>{maint.nama2}</strong></span>}
                          {maint.nama3 && <span>PIC 3: <strong>{maint.nama3}</strong></span>}
                          {maint.sent_ && <span>Tujuan: <strong>{maint.sent_}</strong></span>}
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
                {asset.transfer_history?.length > 0 ? (
                  asset.transfer_history.map((item: any) => {
                    const transfer = item.transfer;
                    const approvalReq = transfer?.approval_requests?.[0];
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
              <StatRow label="Riwayat Transfer" value={asset.transfer_history?.length ?? 0} />
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
                          onClick={() => window.open(`/api/write-offs/${wo.id}/berita-acara`, '_blank')}
                          className="text-xs text-forest-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> BA
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
      <Modal isOpen={conditionModal} onClose={() => setConditionModal(false)} title="Catat Kondisi Aset" size="md">
        <AssetConditionForm
          regId={regId!}
          onSubmit={(data) => conditionMutation.mutate(data)}
          onCancel={() => setConditionModal(false)}
          isLoading={conditionMutation.isPending}
        />
      </Modal>

      {/* Modal: Buat Maintenance */}
      <Modal isOpen={maintenanceModal} onClose={() => { setMaintenanceModal(false); setPrefilledMaintenance(null); }} title="Buat Maintenance Request" size="xl">
        <AssetMaintenanceForm
          regId={regId!}
          initialData={prefilledMaintenance}
          onSubmit={(data) => maintenanceMutation.mutate(data)}
          onCancel={() => { setMaintenanceModal(false); setPrefilledMaintenance(null); }}
          isLoading={maintenanceMutation.isPending}
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
