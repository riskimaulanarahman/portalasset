import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Input, Select, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

const materialSchema = z.object({
  code: z.string().min(1, 'Material code is required').max(20),
  nama: z.string().min(1, 'Material name is required').max(200),
  category_id: z.number().min(1, 'Category is required'),
  section_id: z.number().min(1, 'Section is required'),
  matcode: z.string().max(10).nullable().default(''),
  unit_id: z.number().min(1, 'Unit is required'),
  estate_id: z.number().min(1, 'Estate is required'),
  stock: z.number().default(0),
  min_stock: z.number().default(0),
  not_active: z.boolean().default(false),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  initialData?: any;
  onSubmit: (data: MaterialFormValues) => void;
  onCancel: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const resp = await api.get('/categories');
      return resp.data.data;
    }
  });

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const resp = await api.get('/sections');
      return resp.data.data;
    }
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const resp = await api.get('/units');
      return resp.data.data;
    }
  });

  const { data: estates } = useQuery<any[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData ? {
      code: initialData.code,
      nama: initialData.nama,
      category_id: Number(initialData.category_id ?? initialData.cat_id),
      section_id: Number(initialData.section_id),
      matcode: initialData.matcode || '',
      unit_id: Number(initialData.unit_id),
      estate_id: Number(initialData.estate_id),
      stock: Number(initialData.stock),
      min_stock: Number(initialData.min_stock),
      not_active: Boolean(initialData.not_active),
    } : {
      code: '',
      nama: '',
      category_id: 0,
      section_id: 0,
      matcode: '',
      unit_id: 0,
      estate_id: 0,
      stock: 0,
      min_stock: 0,
      not_active: false
    }
  });

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const handleGenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const resp = await api.get('/materials/generate-code');
      if (resp.data?.data?.code) {
        setValue('code', resp.data.data.code, { shouldValidate: true });
      }
    } catch (err) {
      console.error('Failed to generate code', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <FormGroup cols={2}>
        <Input
          label="Material Code"
          {...register('code')}
          required
          disabled={!!initialData}
          error={errors.code?.message}
          placeholder="Material code"
          rightIcon={
            !initialData && (
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGeneratingCode}
                className="text-[10px] font-bold text-forest-600 bg-forest-50 px-2 py-1 rounded border border-forest-200 hover:bg-forest-100 transition-colors disabled:opacity-50"
              >
                {isGeneratingCode ? '...' : 'AUTO'}
              </button>
            )
          }
        />
        <Input
          label="Matcode / Part Number"
          {...register('matcode')}
          error={errors.matcode?.message}
          placeholder="Part number (optional)"
        />
      </FormGroup>

      <Input
        label="Material Name"
        {...register('nama')}
        required
        error={errors.nama?.message}
        placeholder="Full material name"
      />

      <FormGroup cols={2}>
        <Select
          label="Category"
          {...register('category_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          required
          options={categories?.map((c: any) => ({ value: c.id, label: c.category })) || []}
          placeholder="Select Category"
          error={errors.category_id?.message}
        />
        <Select
          label="Estate"
          {...register('estate_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          required
          options={(estates ?? []).map((e: any) => ({ value: e.id, label: `${e.estate} (${e.estate_id})` }))}
          placeholder="Select Estate"
          error={errors.estate_id?.message}
        />
      </FormGroup>

      <FormGroup cols={1}>
        <Select
          label="Section"
          {...register('section_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          required
          options={sections?.map((s: any) => ({ value: s.id, label: s.section })) || []}
          placeholder="Select Section"
          error={errors.section_id?.message}
        />
      </FormGroup>

      <FormGroup cols={3}>
        <Select
          label="Unit"
          {...register('unit_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          required
          options={units?.map((u: any) => ({ value: u.id, label: u.nama })) || []}
          placeholder="Unit"
          error={errors.unit_id?.message}
        />
        <Input
          label="Stock"
          type="number"
          {...register('stock', { valueAsNumber: true })}
          error={errors.stock?.message}
        />
        <Input
          label="Min Stock"
          type="number"
          {...register('min_stock', { valueAsNumber: true })}
          error={errors.min_stock?.message}
        />
      </FormGroup>

      <Checkbox
        label="Inactive / Non-aktif"
        description="Check this if the material is no longer managed in inventory"
        {...register('not_active')}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Update Material' : 'Add Material'}
        </Button>
      </div>
    </form>
  );
};

export default MaterialForm;
