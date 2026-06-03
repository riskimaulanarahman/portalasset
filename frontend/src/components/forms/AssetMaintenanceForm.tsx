import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const SENT_OPTIONS = [
  { value: 'GIS',       label: 'GIS' },
  { value: 'PH',        label: 'PH' },
  { value: 'Workshop',  label: 'Workshop' },
  { value: 'Vendor',    label: 'Vendor' },
  { value: 'Internal',  label: 'Internal' },
];

const KONDISI_OPTIONS = [
  { value: 'Good',   label: 'Good' },
  { value: 'Bad',    label: 'Bad' },
  { value: 'Broken', label: 'Broken' },
];

const schema = z.object({
  terima:        z.string().min(1, 'Tanggal terima wajib diisi'),
  target:        z.string().min(1, 'Tanggal target wajib diisi'),
  selesai:       z.string().optional(),
  sap1:          z.string().min(1, 'SAP PIC 1 wajib diisi').max(15),
  nama1:         z.string().min(1, 'Nama PIC 1 wajib diisi').max(50),
  sap2:          z.string().max(15).optional(),
  nama2:         z.string().max(50).optional(),
  sap3:          z.string().max(15).optional(),
  nama3:         z.string().max(50).optional(),
  sent_:         z.string().min(1, 'Tujuan maintenance wajib dipilih'),
  kondisi:       z.string().min(1, 'Kondisi wajib diisi'),
  keterangan:    z.string().optional(),
  action_remark: z.string().optional(),
  status:        z.enum(['Progress', 'Done']).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  regId:        string;
  initialData?: Partial<FormData>;
  onSubmit:     (data: FormData & { reg_id: string }) => void;
  onCancel:     () => void;
  isLoading?:   boolean;
}

const AssetMaintenanceForm: React.FC<Props> = ({ regId, initialData, onSubmit, onCancel, isLoading }) => {
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      terima: today,
      status: 'Progress',
      ...initialData,
    },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({ ...data, reg_id: regId });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormGroup cols={3}>
        <Input label="Tanggal Terima" type="date" required error={errors.terima?.message} {...register('terima')} />
        <Input label="Target Selesai" type="date" required error={errors.target?.message} {...register('target')} />
        <Input label="Tanggal Selesai" type="date" error={errors.selesai?.message} {...register('selesai')} />
      </FormGroup>

      <p className="text-xs font-semibold text-forest-800 uppercase tracking-wide">PIC Maintenance</p>
      <FormGroup cols={2}>
        <Input label="SAP ID PIC 1" required maxLength={15} error={errors.sap1?.message} {...register('sap1')} />
        <Input label="Nama PIC 1"   required maxLength={50} error={errors.nama1?.message} {...register('nama1')} />
        <Input label="SAP ID PIC 2" maxLength={15} error={errors.sap2?.message} {...register('sap2')} />
        <Input label="Nama PIC 2"   maxLength={50} error={errors.nama2?.message} {...register('nama2')} />
        <Input label="SAP ID PIC 3" maxLength={15} error={errors.sap3?.message} {...register('sap3')} />
        <Input label="Nama PIC 3 (Konfirmasi)" maxLength={50} error={errors.nama3?.message} {...register('nama3')} />
      </FormGroup>

      <FormGroup cols={3}>
        <Select
          label="Tujuan Maintenance"
          required
          options={SENT_OPTIONS}
          placeholder="Pilih tujuan..."
          error={errors.sent_?.message}
          {...register('sent_')}
        />
        <Select
          label="Kondisi Aset"
          required
          options={KONDISI_OPTIONS}
          placeholder="Pilih kondisi..."
          error={errors.kondisi?.message}
          {...register('kondisi')}
        />
        <Select
          label="Status"
          options={[{ value: 'Progress', label: 'In Progress' }, { value: 'Done', label: 'Done' }]}
          error={errors.status?.message}
          {...register('status')}
        />
      </FormGroup>

      <Textarea label="Keterangan" rows={2} placeholder="Deskripsi masalah..." {...register('keterangan')} />
      <Textarea label="Action Remark" rows={2} placeholder="Tindakan yang dilakukan..." {...register('action_remark')} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          Simpan Maintenance
        </Button>
      </div>
    </form>
  );
};

export default AssetMaintenanceForm;
