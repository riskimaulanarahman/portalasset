import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Input, Select, Textarea, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const assetSchema = z.object({
  reg_id:      z.string().min(1, 'Registration ID is required').max(10),
  asset_no:    z.string().max(25).optional().default(''),
  unit_id:     z.string().max(25).optional().default(''),
  date:        z.string().optional().default(''),
  serial_no:   z.string().optional().default(''),
  type_id:     z.coerce.number().min(1, 'Asset Type is required'),
  type:        z.string().min(1).max(25),
  manufacture: z.string().min(1).max(50),
  series:      z.string().min(1).max(25),
  section_id:  z.coerce.number().min(1, 'Section is required'),
  alokasi:     z.string().max(10).optional().default(''),
  keterangan:  z.string().optional().default(''),
  vendor_id:   z.coerce.number().optional().nullable(),
  estate_id:   z.coerce.number().min(1, 'Estate is required'),
  source:      z.string().max(20).optional().default(''),
  not_active:  z.boolean().default(false),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetReg {
  id: number;
  type?: string;
  manufacture?: string;
  series: string;
  asset_type?: {
    name?: string;
  };
  manufacturer?: {
    name?: string;
  };
}
interface Section {
  id: number;
  section: string;
  section_full: string;
}

interface AssetFormProps {
  initialData?: Record<string, unknown> | null;
  onSubmit: (data: AssetFormValues) => void;
  onCancel: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: assetRegs } = useQuery<AssetReg[]>({
    queryKey: ['asset-regs'],
    queryFn: async () => {
      const resp = await api.get('/asset-regs');
      return resp.data.data;
    },
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      const resp = await api.get('/sections');
      return resp.data.data;
    },
  });

  const { data: vendors } = useQuery<{ id: number, nama: string }[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const resp = await api.get('/vendors');
      return resp.data.data;
    },
  });

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema) as any,
    defaultValues: initialData
      ? {
          reg_id:      String(initialData.reg_id ?? ''),
          asset_no:    String(initialData.asset_no   ?? ''),
          unit_id:     String(initialData.unit_id    ?? ''),
          date:        String(initialData.date        ?? ''),
          serial_no:   String(initialData.serial_no  ?? ''),
          type_id:     Number(initialData.type_id),
          type:        String(initialData.type        ?? ''),
          manufacture: String(initialData.manufacture ?? ''),
          series:      String(initialData.series      ?? ''),
          section_id:  Number(initialData.section_id),
          alokasi:     String(initialData.alokasi    ?? ''),
          keterangan:  String(initialData.keterangan ?? ''),
          vendor_id:   initialData.vendor_id ? Number(initialData.vendor_id) : undefined,
          estate_id:   initialData.estate_id ? Number(initialData.estate_id) : 0,
          source:      String(initialData.source     ?? ''),
          not_active:  Boolean(initialData.not_active),
        }
      : {
          reg_id: '', asset_no: '', unit_id: '', date: '', serial_no: '',
          type_id: 0, type: '', manufacture: '', series: '',
          section_id: 0, alokasi: '', keterangan: '', vendor_id: undefined,
          estate_id: 0, source: '',
          not_active: false,
        },
  });

  const selectedTypeId = watch('type_id');

  useEffect(() => {
    if (selectedTypeId && assetRegs) {
      const reg = assetRegs.find((r) => r.id === Number(selectedTypeId));
      if (reg) {
        setValue('type', reg.asset_type?.name ?? reg.type ?? '');
        setValue('manufacture', reg.manufacturer?.name ?? reg.manufacture ?? '');
        setValue('series', reg.series);
      }
    }
  }, [selectedTypeId, assetRegs, setValue]);

  const regOptions = (assetRegs ?? []).map((r) => ({
    value: r.id,
    label: `${r.asset_type?.name ?? r.type ?? '-'} - ${r.manufacturer?.name ?? r.manufacture ?? '-'} (${r.series})`,
  }));

  const sectionOptions = (sections ?? []).map((s) => ({
    value: s.id,
    label: s.section_full ? `${s.section} — ${s.section_full}` : s.section,
  }));

  const vendorOptions = (vendors ?? []).map((v) => ({
    value: v.id,
    label: v.nama,
  }));

  const estateOptions = (estates ?? []).map((e: any) => ({
    value: e.id,
    label: `${e.estate} (${e.estate_id})`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* Hidden auto-filled fields */}
      <input type="hidden" {...register('type')} />
      <input type="hidden" {...register('manufacture')} />
      <input type="hidden" {...register('series')} />

      <FormGroup cols={2}>
        <Input
          label="Reg ID"
          {...register('reg_id')}
          required
          disabled={!!initialData}
          error={errors.reg_id?.message}
          placeholder="Unique Reg ID"
          className="font-mono"
        />
        <Input
          label="Asset No"
          {...register('asset_no')}
          placeholder="Asset number"
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Input
          label="Serial No"
          {...register('serial_no')}
          placeholder="Serial number"
        />
        <Input
          label="Registration Date"
          {...register('date')}
          type="date"
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Controller
          name="type_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Asset Registration Type"
              required
              options={regOptions}
              placeholder="Select type..."
              error={errors.type_id?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
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
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Controller
          name="section_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Section"
              required
              options={sectionOptions}
              placeholder="Select section..."
              error={errors.section_id?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Input
          label="Alokasi"
          {...register('alokasi')}
          placeholder="e.g. USER-1"
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
        <Input label="Source" {...register('source')} placeholder="Procurement source" />
      </FormGroup>

      <Textarea
        label="Description / Keterangan"
        {...register('keterangan')}
        rows={3}
        placeholder="Optional notes about this asset"
      />

      <Controller
        name="not_active"
        control={control}
        render={({ field }) => (
          <Checkbox
            label="Mark as Inactive"
            description="Check this if the asset is no longer in service"
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Save Changes' : 'Register Asset'}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;
