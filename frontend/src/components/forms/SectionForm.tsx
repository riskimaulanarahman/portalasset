import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const sectionSchema = z.object({
  section: z.string().min(1, 'Section short name is required').max(25),
  section_full: z.string().max(50).nullable().default(''),
  keterangan: z.string().max(25).nullable().default(''),
  not_active: z.boolean().default(false),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

interface SectionFormProps {
  initialData?: any;
  onSubmit: (data: SectionFormValues) => void;
  onCancel: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema) as any,
    defaultValues: initialData ? {
      section: initialData.section,
      section_full: initialData.section_full || '',
      keterangan: initialData.keterangan || '',
      not_active: !!initialData.not_active,
    } : {
      section: '',
      section_full: '',
      keterangan: '',
      not_active: false
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Section Name (Short)</label>
        <input
          {...register('section')}
          className={`mt-1 block w-full border ${errors.section ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="e.g. IT, ACC, etc."
        />
        {errors.section && <p className="mt-1 text-xs text-red-600">{errors.section.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          {...register('section_full')}
          className={`mt-1 block w-full border ${errors.section_full ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Complete department name"
        />
        {errors.section_full && <p className="mt-1 text-xs text-red-600">{errors.section_full.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description / Keterangan</label>
        <input
          {...register('keterangan')}
          className={`mt-1 block w-full border ${errors.keterangan ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        />
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

export default SectionForm;
