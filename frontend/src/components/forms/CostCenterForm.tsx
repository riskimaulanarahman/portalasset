import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const costCenterSchema = z.object({
  cost_center: z.string().min(1, 'Cost Center code is required').max(10),
  dept: z.string().min(1, 'Department is required').max(30),
  estate: z.string().min(1, 'Estate code is required').max(10),
  join_estate: z.string().max(10).optional().default('HO'),
});

type CostCenterFormValues = z.infer<typeof costCenterSchema>;

interface CostCenterFormProps {
  initialData?: any;
  onSubmit: (data: CostCenterFormValues) => void;
  onCancel: () => void;
}

const CostCenterForm: React.FC<CostCenterFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(costCenterSchema),
    defaultValues: initialData ? {
      cost_center: initialData.cost_center,
      dept: initialData.dept,
      estate: initialData.estate,
      join_estate: initialData.join_estate || 'HO',
    } : {
      cost_center: '',
      dept: '',
      estate: '',
      join_estate: 'HO'
    }
  });

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

      <FormGroup cols={2}>
        <Input
          label="Estate"
          {...register('estate')}
          error={errors.estate?.message}
          placeholder="e.g. MNE"
        />
        <Input
          label="Join Estate"
          {...register('join_estate')}
          error={errors.join_estate?.message}
          placeholder="e.g. HO"
        />
      </FormGroup>

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
