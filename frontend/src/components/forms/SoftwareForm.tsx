import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, Select, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const softwareSchema = z.object({
  name:        z.string().min(1, 'Software name is required').max(50),
  vendor_id:   z.coerce.number().optional().nullable(),
  estate_id:   z.coerce.number().min(1, 'Estate is required'),
  asset_id:    z.string().optional().nullable(),  // #19 FIX: FK ke asset host
  license_key: z.string().max(50).optional().default(''),
  expiry_date: z.string().optional().default(''),
  status:      z.string().max(20).optional().default('Active'),
});

type SoftwareFormValues = z.infer<typeof softwareSchema>;

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Inactive', label: 'Inactive' },
];

interface SoftwareFormProps {
  initialData?: any;
  onSubmit: (data: SoftwareFormValues) => void;
  onCancel: () => void;
}

const SoftwareForm: React.FC<SoftwareFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: vendors } = useQuery<{ id: number, nama: string }[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const resp = await api.get('/vendors');
      return resp.data.data;
    },
  });

  // #19 FIX: Load assets for the asset_id selector
  const { data: assetsData } = useQuery<{ data: { reg_id: string; type: string; asset_no?: string }[] }>({
    queryKey: ['assets-for-software'],
    queryFn: async () => {
      const resp = await api.get('/assets');
      return resp.data;
    },
  });
  const assetOptions = [
    { value: '', label: 'None (standalone)' },
    ...(assetsData?.data ?? []).map((a) => ({
      value: a.reg_id,
      label: `${a.reg_id}${a.type ? ` — ${a.type}` : ''}${a.asset_no ? ` (${a.asset_no})` : ''}`,
    })),
  ];

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    },
  });

  const vendorOptions = (vendors ?? []).map((v) => ({
    value: v.id,
    label: v.nama,
  }));

  const estateOptions = (estates ?? []).map((e: any) => ({
    value: e.id,
    label: `${e.estate} (${e.estate_id})`,
  }));
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<SoftwareFormValues>({
    resolver: zodResolver(softwareSchema) as any,
    defaultValues: initialData ? {
      name:        initialData.name,
      vendor_id:   initialData.vendor_id ? Number(initialData.vendor_id) : undefined,
      estate_id:   initialData.estate_id ? Number(initialData.estate_id) : undefined,
      asset_id:    initialData.asset_id || '',  // #19 FIX
      license_key: initialData.license_key || '',
      expiry_date: initialData.expiry_date || '',
      status:      initialData.status || 'Active',
    } : {
      name:        '',
      vendor_id:   undefined,
      estate_id:   undefined,
      asset_id:    '',
      license_key: '',
      expiry_date: '',
      status:      'Active',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormGroup cols={2}>
        <Input
          label="Software Name"
          {...register('name')}
          required
          error={errors.name?.message}
          placeholder="e.g. Microsoft Office 2021"
        />
        <Controller
          name="estate_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Estate"
              required
              options={estateOptions}
              placeholder="Select estate..."
              error={errors.estate_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Controller
          name="vendor_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Vendor"
              options={vendorOptions}
              placeholder="Select vendor..."
              error={errors.vendor_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
        <Input
          label="License Key"
          {...register('license_key')}
          error={errors.license_key?.message}
          placeholder="XXXXX-XXXXX-XXXXX"
        />
      </FormGroup>

      {/* #19 FIX: Host Asset selector */}
      <Controller
        name="asset_id"
        control={control}
        render={({ field }) => (
          <Select
            label="Host Asset (Opsional)"
            options={assetOptions}
            placeholder="Pilih asset host..."
            error={errors.asset_id?.message}
            value={field.value ?? ''}
            onChange={field.onChange}
          />
        )}
      />

      <FormGroup cols={2}>
        <Input
          label="Expiry Date"
          {...register('expiry_date')}
          type="date"
          error={errors.expiry_date?.message}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="Status"
              options={statusOptions}
              error={errors.status?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormGroup>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Software' : 'Add Software'}
        </Button>
      </div>
    </form>
  );
};

export default SoftwareForm;
