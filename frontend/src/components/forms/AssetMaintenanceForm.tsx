import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';
import MemberPicker, { type MemberPickerItem } from '../MemberPicker';

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
}).superRefine((data, ctx) => {
  if (data.status !== 'Done') return;

  if (!data.selesai) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selesai'],
      message: 'Tanggal selesai wajib diisi saat status Done',
    });
  }

  if (!data.action_remark?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['action_remark'],
      message: 'Action remark wajib diisi saat status Done',
    });
  }
});

type FormData = z.infer<typeof schema>;

interface Props {
  regId:        string;
  initialData?: Partial<FormData>;
  onSubmit:     (data: FormData & { reg_id: string }) => void;
  onCancel:     () => void;
  isLoading?:   boolean;
  members?: MemberPickerItem[];
  isMembersLoading?: boolean;
}

const AssetMaintenanceForm: React.FC<Props> = ({
  regId,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  members = [],
  isMembersLoading = false,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      terima: today,
      status: 'Progress',
      ...initialData,
    },
  });

  const setPicMember = (slot: 1 | 2 | 3, sapId: string) => {
    const member = members.find((item) => item.sap_id === sapId);
    const sapKey = `sap${slot}` as const;
    const nameKey = `nama${slot}` as const;

    setValue(sapKey, sapId, { shouldDirty: true, shouldValidate: true });
    setValue(nameKey, member?.nama ?? '', { shouldDirty: true, shouldValidate: true });
  };

  const picFallbackLabel = (slot: 1 | 2 | 3) => {
    const sapId = watch(`sap${slot}` as const);
    const name = watch(`nama${slot}` as const);

    return sapId && name ? `${name} (${sapId})` : undefined;
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit({ ...data, reg_id: regId });
  };

  const status = watch('status');
  const conditionLabel = status === 'Done' ? 'Kondisi Setelah Maintenance' : 'Kondisi Aset';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormGroup cols={3}>
        <Input label="Tanggal Terima" type="date" required error={errors.terima?.message} {...register('terima')} />
        <Input label="Target Selesai" type="date" required error={errors.target?.message} {...register('target')} />
        <Input
          label="Tanggal Selesai"
          type="date"
          required={status === 'Done'}
          error={errors.selesai?.message}
          {...register('selesai')}
        />
      </FormGroup>

      <p className="text-xs font-semibold text-forest-800 uppercase tracking-wide">PIC Maintenance</p>
      <FormGroup cols={3}>
        <MemberPicker
          label="PIC 1"
          required
          value={watch('sap1')}
          members={members}
          isLoading={isMembersLoading}
          onChange={(sapId) => setPicMember(1, sapId)}
          error={errors.sap1?.message || errors.nama1?.message}
          disabled={isLoading}
          selectedFallbackLabel={picFallbackLabel(1)}
          modalTitle="Select PIC Maintenance"
          modalDescription="Search members, then choose Select for PIC 1."
          emptyMessage="No active members found"
        />
        <MemberPicker
          label="PIC 2"
          value={watch('sap2')}
          members={members}
          isLoading={isMembersLoading}
          onChange={(sapId) => setPicMember(2, sapId)}
          error={errors.sap2?.message || errors.nama2?.message}
          disabled={isLoading}
          selectedFallbackLabel={picFallbackLabel(2)}
          modalTitle="Select PIC Maintenance"
          modalDescription="Search members, then choose Select for PIC 2."
          emptyMessage="No active members found"
        />
        <MemberPicker
          label="PIC 3"
          value={watch('sap3')}
          members={members}
          isLoading={isMembersLoading}
          onChange={(sapId) => setPicMember(3, sapId)}
          error={errors.sap3?.message || errors.nama3?.message}
          disabled={isLoading}
          selectedFallbackLabel={picFallbackLabel(3)}
          modalTitle="Select PIC Maintenance"
          modalDescription="Search members, then choose Select for PIC 3."
          emptyMessage="No active members found"
        />
        <input type="hidden" {...register('sap1')} />
        <input type="hidden" {...register('nama1')} />
        <input type="hidden" {...register('sap2')} />
        <input type="hidden" {...register('nama2')} />
        <input type="hidden" {...register('sap3')} />
        <input type="hidden" {...register('nama3')} />
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
          label={conditionLabel}
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
      <Textarea
        label="Action Remark"
        rows={2}
        required={status === 'Done'}
        placeholder="Tindakan yang dilakukan..."
        error={errors.action_remark?.message}
        {...register('action_remark')}
      />

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
