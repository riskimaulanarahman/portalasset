import React from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Checkbox, FormGroup, Input, Select, Textarea } from '../ui/FormFields';
import Button from '../ui/Button';
import MemberPicker, { type MemberPickerItem } from '../MemberPicker';

const schema = z.object({
  kondisi: z.enum(['Good', 'Bad', 'Broken'], { message: 'Kondisi wajib dipilih' }),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  remarks: z.string().max(1000).optional(),
  create_maintenance: z.boolean().default(true),
  terima: z.string().optional(),
  target: z.string().optional(),
  sap1: z.string().max(15).optional(),
  nama1: z.string().max(50).optional(),
  sent_: z.string().optional(),
  keterangan: z.string().max(1000).optional(),
  action_remark: z.string().max(1000).optional(),
  attachment: z.any().optional(),
}).superRefine((data, ctx) => {
  const isDamaged = data.kondisi === 'Bad' || data.kondisi === 'Broken';

  if (isDamaged && !data.remarks?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remarks'],
      message: 'Keterangan kondisi wajib diisi',
    });
  }

  if (!isDamaged || !data.create_maintenance) return;

  ([
    ['terima', 'Tanggal terima maintenance wajib diisi'],
    ['target', 'Target selesai wajib diisi'],
    ['sap1', 'SAP PIC wajib diisi'],
    ['nama1', 'Nama PIC wajib diisi'],
    ['sent_', 'Tujuan maintenance wajib dipilih'],
  ] as const).forEach(([field, message]) => {
    if (!data[field]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  });
});

type FormData = z.infer<typeof schema>;

interface Props {
  regId: string;
  onSubmit: (data: FormData & { reg_id: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  allowGood?: boolean;
  enableDamageWorkflow?: boolean;
  members?: MemberPickerItem[];
  isMembersLoading?: boolean;
}

const SENT_OPTIONS = [
  { value: 'GIS', label: 'GIS' },
  { value: 'PH', label: 'PH' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Vendor', label: 'Vendor' },
  { value: 'Internal', label: 'Internal' },
];

const AssetConditionForm: React.FC<Props> = ({
  regId,
  onSubmit,
  onCancel,
  isLoading,
  allowGood = true,
  enableDamageWorkflow = false,
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
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      date: today,
      terima: today,
      target: today,
      create_maintenance: true,
      sent_: 'Internal',
    },
  });

  const kondisi = watch('kondisi');
  const createMaintenance = watch('create_maintenance');
  const isDamaged = kondisi === 'Bad' || kondisi === 'Broken';
  const kondisiOptions = [
    ...(allowGood ? [{ value: 'Good', label: 'Good - Baik' }] : []),
    { value: 'Bad', label: 'Bad - Kurang baik' },
    { value: 'Broken', label: 'Broken - Rusak' },
  ];

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      create_maintenance: enableDamageWorkflow && isDamaged && data.create_maintenance,
      reg_id: regId,
    });
  };

  const setPicMember = (sapId: string) => {
    const member = members.find((item) => item.sap_id === sapId);

    setValue('sap1', sapId, { shouldDirty: true, shouldValidate: true });
    setValue('nama1', member?.nama ?? '', { shouldDirty: true, shouldValidate: true });
  };

  const selectedSap1 = watch('sap1');
  const selectedName1 = watch('nama1');
  const picFallbackLabel = selectedSap1 && selectedName1 ? `${selectedName1} (${selectedSap1})` : undefined;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormGroup cols={2}>
        <Select
          label="Kondisi"
          required
          options={kondisiOptions}
          placeholder="Pilih kondisi..."
          error={errors.kondisi?.message}
          {...register('kondisi')}
        />
        <Input
          label="Tanggal Kondisi"
          type="date"
          required
          error={errors.date?.message}
          {...register('date')}
        />
      </FormGroup>

      <Textarea
        label="Keterangan / Remarks"
        rows={3}
        placeholder="Deskripsikan kondisi aset secara singkat..."
        error={errors.remarks?.message}
        {...register('remarks')}
      />

      {enableDamageWorkflow && isDamaged && (
        <>
          <Checkbox
            label="Buat maintenance request"
            {...register('create_maintenance')}
          />

          {createMaintenance && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <FormGroup cols={2}>
                <Input label="Tanggal Terima" type="date" required error={errors.terima?.message} {...register('terima')} />
                <Input label="Target Selesai" type="date" required error={errors.target?.message} {...register('target')} />
              </FormGroup>

              <FormGroup cols={3}>
                <MemberPicker
                  label="PIC Maintenance"
                  required
                  value={selectedSap1}
                  members={members}
                  isLoading={isMembersLoading}
                  onChange={setPicMember}
                  error={errors.sap1?.message || errors.nama1?.message}
                  disabled={isLoading}
                  selectedFallbackLabel={picFallbackLabel}
                  modalTitle="Select PIC Maintenance"
                  modalDescription="Search members, then choose Select for maintenance PIC."
                  emptyMessage="No active members found"
                />
                <input type="hidden" {...register('sap1')} />
                <input type="hidden" {...register('nama1')} />
                <Select
                  label="Tujuan"
                  required
                  options={SENT_OPTIONS}
                  error={errors.sent_?.message}
                  {...register('sent_')}
                />
              </FormGroup>

              <Textarea label="Keterangan Maintenance" rows={2} error={errors.keterangan?.message} {...register('keterangan')} />
              <Textarea label="Action Remark" rows={2} error={errors.action_remark?.message} {...register('action_remark')} />
              <Input label="Attachment" type="file" accept=".jpg,.jpeg,.png,.pdf" {...register('attachment')} />
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          Simpan Kondisi
        </Button>
      </div>
    </form>
  );
};

export default AssetConditionForm;
