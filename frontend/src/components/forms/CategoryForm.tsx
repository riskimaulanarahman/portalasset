import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const categorySchema = z.object({
  category: z.string().min(1, 'Category name is required').max(100),
  section_id: z.number().min(1, 'Section is required'),
  not_active: z.boolean().default(false),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: any;
  onSubmit: (data: CategoryFormValues) => void;
  onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const resp = await api.get('/sections');
      return resp.data.data;
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData ? {
      category: initialData.category,
      section_id: Number(initialData.section_id),
      not_active: Boolean(initialData.not_active),
    } : {
      category: '',
      section_id: 0,
      not_active: false
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Category Name</label>
        <input
          {...register('category')}
          className={`mt-1 block w-full border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="e.g. Computer, Vehicle"
        />
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Section / Department</label>
        <select
          {...register('section_id', { setValueAs: v => v === "" ? undefined : Number(v) })}
          className={`mt-1 block w-full border ${errors.section_id ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
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

export default CategoryForm;
