import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const assetRegSchema = z.object({
  asset_type_id: z.number().min(1, 'Type is required'),
  manufacturer_id: z.number().min(1, 'Manufacturer is required'),
  series: z.string().min(1, 'Series / Model is required').max(25),
  section_id: z.number().min(1, 'Section is required'),
  not_active: z.boolean().default(false),
});

type AssetRegFormValues = z.infer<typeof assetRegSchema>;

interface AssetRegFormProps {
  initialData?: any;
  onSubmit: (data: AssetRegFormValues) => void;
  onCancel: () => void;
}

const AssetRegForm: React.FC<AssetRegFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const resp = await api.get('/sections');
      return resp.data.data;
    }
  });

  const { data: assetTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: async () => {
      const resp = await api.get('/asset-types');
      return resp.data.data;
    }
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const resp = await api.get('/manufacturers');
      return resp.data.data;
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(assetRegSchema),
    defaultValues: initialData ? {
      asset_type_id: Number(initialData.asset_type_id),
      manufacturer_id: Number(initialData.manufacturer_id),
      series: initialData.series,
      section_id: Number(initialData.section_id),
      not_active: Boolean(initialData.not_active),
    } : {
      asset_type_id: 0,
      manufacturer_id: 0,
      series: '',
      section_id: 0,
      not_active: false
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Asset Type</label>
        <select
          {...register('asset_type_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Select Type</option>
          {assetTypes?.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {errors.asset_type_id && <p className="mt-1 text-xs text-red-600">{errors.asset_type_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
          <select
            {...register('manufacturer_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select Manufacturer</option>
            {manufacturers?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {errors.manufacturer_id && <p className="mt-1 text-xs text-red-600">{errors.manufacturer_id.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Series / Model</label>
          <input
            {...register('series')}
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g. XPS 13, PC200"
          />
          {errors.series && <p className="mt-1 text-xs text-red-600">{errors.series.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Section</label>
        <select
          {...register('section_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Select Section</option>
          {sections?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.section}</option>
          ))}
        </select>
        {errors.section_id && <p className="mt-1 text-xs text-red-600">{errors.section_id.message}</p>}
      </div>

      <div className="flex items-center">
        <input
          {...register('not_active')}
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Inactive / Non-aktif
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default AssetRegForm;
