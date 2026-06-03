import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const vendorSchema = z.object({
  nama: z.string().min(1, 'Vendor name is required').max(150),
  alamat: z.string().optional().nullable().or(z.literal('')),
  telepon: z.string().max(20).optional().nullable().or(z.literal('')),
  email: z.string().max(100).optional().nullable().or(z.literal('')), // Optional email check for more flexibility
  pic: z.string().max(100).optional().nullable().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  initialData?: any;
  onSubmit: (data: VendorFormValues) => void;
  onCancel: () => void;
}

const VendorForm: React.FC<VendorFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: initialData ? {
      nama: initialData.nama,
      alamat: initialData.alamat || '',
      telepon: initialData.telepon || '',
      email: initialData.email || '',
      pic: initialData.pic || '',
    } : {
      nama: '',
      alamat: '',
      telepon: '',
      email: '',
      pic: '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <Input
        label="Vendor Name"
        {...register('nama')}
        required
        error={errors.nama?.message}
        placeholder="Full vendor name"
      />

      <Input
        label="Address"
        {...register('alamat')}
        error={errors.alamat?.message}
        placeholder="Vendor address"
      />

      <FormGroup cols={2}>
        <Input
          label="Phone"
          {...register('telepon')}
          error={errors.telepon?.message}
          placeholder="Contact number"
        />
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="vendor@example.com"
        />
      </FormGroup>

      <Input
        label="PIC (Person In Charge)"
        {...register('pic')}
        error={errors.pic?.message}
        placeholder="Contact person name"
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Vendor' : 'Add Vendor'}
        </Button>
      </div>
    </form>
  );
};

export default VendorForm;
