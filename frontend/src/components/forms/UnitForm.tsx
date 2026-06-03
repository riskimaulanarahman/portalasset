import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../ui/FormFields';
import Button from '../ui/Button';

const unitSchema = z.object({
  nama: z.string().min(1, 'Unit name is required').max(50),
  keterangan: z.string().max(150).optional().nullable().or(z.literal('')),
});

type UnitFormValues = z.infer<typeof unitSchema>;

interface UnitFormProps {
  initialData?: any;
  onSubmit: (data: UnitFormValues) => void;
  onCancel: () => void;
}

const UnitForm: React.FC<UnitFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: initialData ? {
      nama: initialData.nama,
      keterangan: initialData.keterangan || '',
    } : {
      nama: '',
      keterangan: '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <Input
        label="Unit Name"
        {...register('nama')}
        required
        error={errors.nama?.message}
        placeholder="e.g. PCS, Unit, Meter"
      />

      <Input
        label="Description"
        {...register('keterangan')}
        error={errors.keterangan?.message}
        placeholder="Optional description"
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Unit' : 'Add Unit'}
        </Button>
      </div>
    </form>
  );
};

export default UnitForm;
