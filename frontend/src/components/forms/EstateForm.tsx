import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const estateSchema = z.object({
  estate_id:        z.string().min(1, 'Estate ID is required').max(3),
  estate:           z.string().min(1, 'Estate name is required').max(30),
  region:           z.string().max(30).optional().default(''),
  business_unit_id: z.coerce.number().nullable().optional(),
});

type EstateFormValues = z.infer<typeof estateSchema>;

interface BusinessUnit {
  id: number;
  bu_code: string;
  bu_name: string;
}

interface EstateFormProps {
  initialData?: any;
  onSubmit: (data: EstateFormValues) => void;
  onCancel: () => void;
}

const EstateForm: React.FC<EstateFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const resp = await api.get('/business-units');
      return resp.data.data;
    },
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<EstateFormValues>({
    resolver: zodResolver(estateSchema),
    defaultValues: initialData ? {
      estate_id:        initialData.estate_id,
      estate:           initialData.estate,
      region:           initialData.region || '',
      business_unit_id: initialData.business_unit_id ?? null,
    } : {
      estate_id:        '',
      estate:           '',
      region:           '',
      business_unit_id: null,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estate ID (Short)</label>
          <input
            {...register('estate_id')}
            disabled={!!initialData}
            className={`mt-1 block w-full border ${errors.estate_id ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100`}
            placeholder="e.g. HO, TRN"
          />
          {errors.estate_id && <p className="mt-1 text-xs text-red-600">{errors.estate_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Region</label>
          <input
            {...register('region')}
            className={`mt-1 block w-full border ${errors.region ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            placeholder="e.g. KALTIM"
          />
          {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Estate Name</label>
        <input
          {...register('estate')}
          className={`mt-1 block w-full border ${errors.estate ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Complete estate name"
        />
        {errors.estate && <p className="mt-1 text-xs text-red-600">{errors.estate.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Business Unit</label>
        <Controller
          name="business_unit_id"
          control={control}
          render={({ field }) => (
            <select
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              <option value="">— None —</option>
              {(businessUnits ?? []).map(bu => (
                <option key={bu.id} value={bu.id}>
                  {bu.bu_code} - {bu.bu_name}
                </option>
              ))}
            </select>
          )}
        />
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

export default EstateForm;
