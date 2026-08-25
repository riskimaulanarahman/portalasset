import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, Select, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const costCenterSchema = z.object({
  cost_center: z.string().min(1, 'Cost Center code is required').max(10),
  dept: z.string().min(1, 'Department is required').max(30),
  estate_id: z.coerce.number().min(1, 'Estate is required'),
});

type CostCenterFormValues = z.infer<typeof costCenterSchema>;

interface CostCenterInitialData {
  cost_center: string;
  dept: string;
  estate_id?: number | null;
  mapped_estate?: { id: number } | null;
}

interface CostCenterFormProps {
  initialData?: CostCenterInitialData | null;
  estates: { id: number; estate_id: string; estate: string }[];
  onSubmit: (data: CostCenterFormValues) => void;
  onCancel: () => void;
}

const CostCenterForm: React.FC<CostCenterFormProps> = ({ initialData, estates, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(costCenterSchema),
    defaultValues: initialData ? {
      cost_center: initialData.cost_center,
      dept: initialData.dept,
      estate_id: initialData.estate_id || initialData.mapped_estate?.id || '',
    } : {
      cost_center: '',
      dept: '',
      estate_id: '',
    }
  });

  const estateOptions = estates.map((estate) => ({
    value: estate.id,
    label: `${estate.estate_id} - ${estate.estate}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormGroup cols={2}>
        <Input
          label="Cost Center Code"
          {...register('cost_center')}
          error={errors.cost_center?.message}
          disabled={!!initialData}
          placeholder="e.g. 521010"
        />
        <Input
          label="Department"
          {...register('dept')}
          error={errors.dept?.message}
          placeholder="e.g. GENERAL WORKS"
        />
      </FormGroup>

      <Select
        label="Estate"
        {...register('estate_id')}
        error={errors.estate_id?.message}
        options={estateOptions}
        placeholder="Select estate"
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Cost Center' : 'Add Cost Center'}
        </Button>
      </div>
    </form>
  );
};

export default CostCenterForm;
