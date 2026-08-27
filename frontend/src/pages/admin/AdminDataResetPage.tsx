import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2, ShieldAlert, Loader2, DatabaseBackup } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ui/Toast';
import useTitle from '../../hooks/useTitle';
import Button from '../../components/ui/Button';
import { Input, Checkbox } from '../../components/ui/FormFields';
import { cn } from '../../lib/utils';

interface DomainPreview {
  label: string;
  tables: Record<string, number>;
  total: number;
}

interface PreviewResponse {
  is_production: boolean;
  domains: Record<string, DomainPreview>;
}

const CONFIRM_PHRASE = 'RESET DATA UAT';

const DOMAIN_META: { key: string; description: string }[] = [
  { key: 'assets', description: 'Aset, riwayat kondisi, maintenance, dan write-off.' },
  { key: 'materials', description: 'Material, stok, transaksi IN/OUT, riwayat transfer stok.' },
  { key: 'transfers', description: 'Transfer antar-estate beserta seluruh approval — termasuk definisi workflow & step-nya.' },
  { key: 'software', description: 'Data software / lisensi.' },
  { key: 'anggota', description: 'Data karyawan. Aman dihapus karena bisa disinkronkan ulang dari ERP.' },
  { key: 'log_sistem', description: 'Audit log dan seluruh sesi login — semua user (termasuk Anda) akan ter-logout.' },
  { key: 'master_data', description: 'Estate, business unit, section, kategori, unit, vendor, cost center, tipe aset, asset reg, manufacturer. Sistem akan kosong total tanpa data organisasi.' },
];

const AdminDataResetPage: React.FC = () => {
  useTitle('Reset Data UAT');
  const { success, error: toastError, warning } = useToast();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [includeUsers, setIncludeUsers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [productionAck, setProductionAck] = useState(false);
  const [backupFailure, setBackupFailure] = useState<string | null>(null);

  const { data: preview, isLoading } = useQuery<PreviewResponse>({
    queryKey: ['admin-data-reset-preview'],
    queryFn: async () => {
      const res = await api.get('/admin/data-reset/preview');
      return res.data;
    },
  });

  const toggleDomain = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const activeDomains = [...selected, ...(includeUsers ? ['users_testing'] : [])];
  const selectedTotal = preview
    ? activeDomains.reduce((sum, key) => sum + (preview.domains[key]?.total ?? 0), 0)
    : 0;

  const executeMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/admin/data-reset', payload),
    onSuccess: (res) => {
      success('Reset Berhasil', `${res.data.data.total_deleted} baris data telah dihapus.`);
      if (res.data.data.log_saved === false) {
        warning('Audit Log Gagal Tersimpan', 'Reset sudah berhasil, tapi catatan log-nya gagal disimpan. Cek log server.');
      }
      closeModal();
      setSelected([]);
      setIncludeUsers(false);
      queryClient.invalidateQueries({ queryKey: ['admin-data-reset-preview'] });
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data?.requires_backup_override) {
        setBackupFailure(data.message);
        return;
      }
      toastError('Gagal', data?.message || 'Reset tidak dapat dijalankan.');
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setPhrase('');
    setPassword('');
    setProductionAck(false);
    setBackupFailure(null);
  };

  const submit = (forceWithoutBackup = false) => {
    executeMutation.mutate({
      domains: activeDomains,
      confirm_phrase: phrase,
      password,
      production_ack: productionAck,
      force_without_backup: forceWithoutBackup,
    });
  };

  const canOpenConfirm = activeDomains.length > 0;
  const canSubmit =
    phrase === CONFIRM_PHRASE &&
    password.length > 0 &&
    (!preview?.is_production || productionAck) &&
    !backupFailure;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="p-3 bg-red-50 text-red-600 rounded-xl ring-4 ring-red-50">
          <Trash2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Reset Data UAT</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Hapus data pengujian sebelum go-live. Tindakan ini permanen — backup otomatis dibuat sebelum eksekusi.
          </p>
        </div>
      </div>

      {preview?.is_production && (
        <div className="flex items-start gap-3 bg-red-600 text-white p-4 rounded-2xl shadow-lg shadow-red-200">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm font-semibold">
            Environment ini terdeteksi <span className="font-black">PRODUCTION</span>. Pastikan Anda benar-benar ingin
            menghapus data pada environment produksi sebelum melanjutkan.
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm font-medium">
          Data master (estate, section, kategori, dll) yang tidak dipilih di bawah akan tetap ada. Domain yang dicentang
          akan dihapus <span className="font-bold">permanen</span> dari database, hanya dapat dipulihkan lewat backup.
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Domain Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DOMAIN_META.map(({ key, description }) => {
            const domain = preview?.domains[key];
            const isChecked = selected.includes(key);
            return (
              <label
                key={key}
                htmlFor={`domain-${key}`}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
                  isChecked ? 'border-red-300 bg-red-50/60' : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <input
                  id={`domain-${key}`}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                  checked={isChecked}
                  onChange={() => toggleDomain(key)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900">{domain?.label ?? key}</span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {isLoading ? '…' : `${domain?.total ?? 0} baris`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-orange-200 p-6">
        <label htmlFor="domain-users" className="flex items-start gap-3 cursor-pointer">
          <input
            id="domain-users"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
            checked={includeUsers}
            onChange={() => setIncludeUsers((v) => !v)}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-900">
                {preview?.domains.users_testing?.label ?? 'User Testing (non-admin)'}
              </span>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                {isLoading ? '…' : `${preview?.domains.users_testing?.total ?? 0} user`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Menghapus semua akun user <span className="font-semibold">kecuali</span> yang memiliki role{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">admin</span>. Dipisah dari domain lain karena
              berdampak langsung ke akses login.
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between bg-forest-950 text-white p-5 rounded-2xl shadow-lg sticky bottom-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-forest-300 font-semibold">Total dipilih</p>
          <p className="text-2xl font-black">{selectedTotal.toLocaleString('id-ID')} baris</p>
        </div>
        <Button
          variant="danger"
          size="lg"
          leftIcon={<Trash2 className="h-4 w-4" />}
          disabled={!canOpenConfirm}
          onClick={() => setModalOpen(true)}
        >
          Lanjutkan Reset
        </Button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Konfirmasi Reset Data UAT"
        description="Tindakan ini tidak dapat dibatalkan setelah dijalankan."
        size="md"
        persistent
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={executeMutation.isPending}>
              Batal
            </Button>
            {backupFailure ? (
              <Button
                variant="danger"
                onClick={() => submit(true)}
                loading={executeMutation.isPending}
                leftIcon={<DatabaseBackup className="h-4 w-4" />}
              >
                Lanjutkan Tanpa Backup
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => submit(false)}
                disabled={!canSubmit}
                loading={executeMutation.isPending}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Hapus Sekarang
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Domain terpilih:{' '}
            <span className="font-bold text-gray-900">
              {activeDomains.map((k) => preview?.domains[k]?.label ?? k).join(', ')}
            </span>{' '}
            — total <span className="font-bold text-red-600">{selectedTotal.toLocaleString('id-ID')} baris</span> akan
            dihapus permanen.
          </div>

          {backupFailure && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Backup otomatis gagal</p>
                <p className="mt-0.5">{backupFailure}</p>
                <p className="mt-1 text-xs">
                  Anda bisa tetap melanjutkan tanpa backup, atau batalkan dan pastikan <code>mysqldump</code> tersedia
                  di server.
                </p>
              </div>
            </div>
          )}

          <Input
            label={`Ketik "${CONFIRM_PHRASE}" untuk konfirmasi`}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />

          <Input
            label="Password Anda"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password login Anda"
            autoComplete="current-password"
          />

          {preview?.is_production && (
            <Checkbox
              label="Saya sadar ini environment PRODUCTION dan tindakan ini tidak bisa dibatalkan"
              checked={productionAck}
              onChange={(e) => setProductionAck(e.target.checked)}
            />
          )}

          {executeMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Membuat backup dan menghapus data, mohon tunggu...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDataResetPage;
