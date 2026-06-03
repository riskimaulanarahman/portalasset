import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Input, Select, FormGroup, Checkbox } from '../ui/FormFields';
import Button from '../ui/Button';
import { getStoredUser } from '../../lib/utils';

const anggotaSchema = z.object({
  sap_id:          z.string().min(1, 'SAP ID is required').max(15),
  nik:             z.string().max(15).optional().default(''),
  nama:            z.string().min(1, 'Name is required').max(100),
  position:        z.string().max(50).optional().default(''),
  supervisor:      z.string().max(100).optional().default(''),
  email:           z.string().max(50).optional().default(''),
  section_id:      z.coerce.number().nullable().optional(),
  estate_id:       z.coerce.number().nullable().optional(),
  not_active:      z.boolean().default(false),
});

type AnggotaFormValues = z.infer<typeof anggotaSchema>;

interface Section {
  id: number;
  section: string;
  section_full: string;
}

interface Estate {
  id: number;
  estate_id: string;
  estate: string;
}

interface AnggotaFormProps {
  initialData?: any;
  onSubmit: (data: AnggotaFormValues) => void;
  onCancel: () => void;
}

const AnggotaForm: React.FC<AnggotaFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const user = getStoredUser();
  const isHoUser = user.estate?.estate_id === 'HO' || user.username === 'admin' || user.role?.name === 'admin';

  const { data: sections } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: async () => {
      const resp = await api.get('/sections');
      return resp.data.data;
    },
  });

  const { data: estates } = useQuery<Estate[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    },
    enabled: isHoUser,
  });

  const defaultEstateId = initialData?.estate_id ?? (isHoUser ? null : (user.estate?.id ?? null));

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(anggotaSchema),
    defaultValues: initialData ? {
      sap_id:     initialData.sap_id,
      nik:        initialData.nik || '',
      nama:       initialData.nama,
      position:   initialData.position || '',
      supervisor: initialData.supervisor || '',
      email:      initialData.email || '',
      section_id: initialData.section_id || null,
      estate_id:  defaultEstateId,
      not_active: !!initialData.not_active,
    } : {
      sap_id:     '',
      nik:        '',
      nama:       '',
      position:   '',
      supervisor: '',
      email:      '',
      section_id: null,
      estate_id:  defaultEstateId,
      not_active: false,
    }
  });

  const sectionOptions = (sections ?? []).map(s => ({
    value: s.id,
    label: s.section_full ? `${s.section} - ${s.section_full}` : s.section,
  }));

  const estateOptions = (estates ?? []).map(e => ({
    value: e.id,
    label: `${e.estate_id} - ${e.estate}`,
  }));

  const estateLabel = isHoUser
    ? undefined
    : (user.estate ? `${user.estate.estate_id} - ${user.estate.estate}` : 'N/A');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormGroup cols={2}>
        <Input
          label="SAP ID"
          {...register('sap_id')}
          error={errors.sap_id?.message}
          disabled={!!initialData}
          placeholder="e.g. 10001234"
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Login Name (LDAP)</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono"
            value={initialData?.login_name || '—'}
            disabled
            readOnly
          />
        </div>
      </FormGroup>

      <Input
        label="Full Name"
        {...register('nama')}
        error={errors.nama?.message}
        placeholder="Employee full name"
      />

      <FormGroup cols={2}>
        <Input
          label="Position"
          {...register('position')}
          error={errors.position?.message}
        />
        <Input
          label="Supervisor"
          {...register('supervisor')}
          error={errors.supervisor?.message}
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Input
          label="Email"
          {...register('email')}
          type="email"
          error={errors.email?.message}
        />
        <Controller
          name="section_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Section"
              options={sectionOptions}
              placeholder="Select section..."
              error={errors.section_id?.message}
              value={(field.value as any) ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </FormGroup>

      <Controller
        name="estate_id"
        control={control}
        render={({ field }) =>
          isHoUser ? (
            <Select
              label="Estate"
              options={estateOptions}
              placeholder="Select estate..."
              error={errors.estate_id?.message}
              value={(field.value as any) ?? ''}
              onChange={field.onChange}
            />
          ) : (
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Estate</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                value={estateLabel}
                disabled
                readOnly
              />
            </div>
          )
        }
      />

      <Controller
        name="not_active"
        control={control}
        render={({ field }) => (
          <Checkbox
            label="Inactive"
            description="Mark this member as no longer active"
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
          {initialData ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
};

export default AnggotaForm;
