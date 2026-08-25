import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '../ui/FormFields';
import Button from '../ui/Button';
import { kondisiBadge } from '../ui/Badge';

const schema = z.object({
  keterangan: z.string().min(10, 'Alasan write-off minimal 10 karakter').max(500),
});

type FormData = z.infer<typeof schema>;

interface Props {
  regId:      string;
  assetNo?:   string;
  kondisi:    string;
  onSubmit:   (data: { reg_id: string; kondisi: string; keterangan: string }) => void;
  onCancel:   () => void;
  isLoading?: boolean;
}

const WriteOffForm: React.FC<Props> = ({ regId, assetNo, kondisi, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({ reg_id: regId, kondisi, keterangan: data.keterangan });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-red-800">Informasi Aset yang Diajukan Write-Off</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-red-700">
          <div><span className="font-medium">Reg ID:</span> {regId}</div>
          {assetNo && <div><span className="font-medium">Asset No:</span> {assetNo}</div>}
          <div className="flex items-center gap-2"><span className="font-medium">Kondisi:</span> {kondisiBadge(kondisi)}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800 font-medium">
          ⚠️ Pengajuan ini akan melalui proses persetujuan. Setelah disetujui, aset akan dinonaktifkan secara permanen dan tidak dapat digunakan kembali.
        </p>
      </div>

      <Textarea
        label="Alasan Write-Off"
        required
        rows={4}
        placeholder="Jelaskan alasan mengapa aset ini diajukan untuk write-off (min. 10 karakter)..."
        error={errors.keterangan?.message}
        {...register('keterangan')}
      />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button type="submit" variant="danger" loading={isLoading}>
          Ajukan Write-Off
        </Button>
      </div>
    </form>
  );
};

export default WriteOffForm;
