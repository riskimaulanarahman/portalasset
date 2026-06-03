import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../ui/FormFields';
import Button from '../ui/Button';

const businessUnitSchema = z.object({
  bu_code: z.string().min(1, 'BU Code is required').max(20),
  bu_name: z.string().min(1, 'Business Unit name is required').max(100),
});

type BusinessUnitFormValues = z.infer<typeof businessUnitSchema>;

interface BusinessUnitFormProps {
  initialData?: any;
  onSubmit: (data: BusinessUnitFormValues) => void;
  onCancel: () => void;
}

const BusinessUnitForm: React.FC<BusinessUnitFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(businessUnitSchema),
    defaultValues: initialData ? {
      bu_code: initialData.bu_code,
      bu_name: initialData.bu_name,
    } : {
      bu_code: '',
      bu_name: '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <Input
        label="BU Code"
        {...register('bu_code')}
        required
        error={errors.bu_code?.message}
        placeholder="e.g. BU001"
      />

      <Input
        label="Business Unit Name"
        {...register('bu_name')}
        required
        error={errors.bu_name?.message}
        placeholder="e.g. PT Perkebunan Nusantara"
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Business Unit' : 'Add Business Unit'}
        </Button>
      </div>
    </form>
  );
};

export default BusinessUnitForm;
