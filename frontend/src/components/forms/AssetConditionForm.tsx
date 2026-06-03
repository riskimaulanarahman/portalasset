import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const schema = z.object({
  kondisi: z.enum(['Good', 'Bad', 'Broken'], { required_error: 'Kondisi wajib dipilih' }),
  date:    z.string().min(1, 'Tanggal wajib diisi'),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  regId:       string;
  onSubmit:    (data: FormData & { reg_id: string }) => void;
  onCancel:    () => void;
  isLoading?:  boolean;
}

const AssetConditionForm: React.FC<Props> = ({ regId, onSubmit, onCancel, isLoading }) => {
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: today },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({ ...data, reg_id: regId });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormGroup cols={2}>
        <Select
          label="Kondisi"
          required
          options={[
            { value: 'Good',   label: 'Good — Baik' },
            { value: 'Bad',    label: 'Bad — Kurang Baik' },
            { value: 'Broken', label: 'Broken — Rusak' },
          ]}
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
