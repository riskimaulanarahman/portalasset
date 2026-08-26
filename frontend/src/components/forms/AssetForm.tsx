import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Input, Select, Textarea, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';
import { getStoredUser, isHeadOfficeUser, parseBoolean } from '../../lib/utils';
import MemberPicker, { type MemberPickerItem } from '../MemberPicker';

const assetSchema = z.object({
  reg_id:      z.string().max(20).optional().default(''),
  asset_no:    z.string().min(1, 'Asset No is required').max(25),
  unit_id:     z.string().max(25).optional().default(''),
  date:        z.string().optional().default(''),
  serial_no:   z.string().min(1, 'Serial No is required'),
  type_id:     z.coerce.number().min(1, 'Asset Type is required'),
  type:        z.string().min(1).max(25),
  manufacture: z.string().min(1).max(50),
  series:      z.string().min(1).max(25),
  alokasi:     z.string().max(10).optional().default(''),
  keterangan:  z.string().optional().default(''),
  vendor_id:   z.coerce.number().optional().nullable(),
  estate_id:   z.coerce.number().min(1, 'Estate is required'),
  asset_department_id: z.coerce.number().min(1, 'Department is required'),
  asset_division_id:   z.coerce.number().min(1, 'Division is required'),
  anggota_id:   z.string().max(15).optional().nullable(),
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
interface AssetDepartment {
  id: number | string;
  code?: string | null;
  name: string;
  not_active?: boolean;
  divisions?: AssetDivision[];
}

interface AssetDivision {
  id: number | string;
  asset_department_id?: number | string | null;
  code?: string | null;
  name: string;
  not_active?: boolean;
}

interface EstateOption {
  id: number;
  estate: string;
  estate_id: string;
}

interface AnggotaOption {
  sap_id: string;
  login_name?: string | null;
  nama: string;
  position?: string | null;
  department?: string | null;
  company_code?: string | null;
  cost_center?: string | null;
  not_active?: boolean;
}

interface AssetFormProps {
  initialData?: Record<string, unknown> | null;
  onSubmit: (data: AssetFormValues) => void;
  onCancel: () => void;
}

const idAsNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueDivisionsById = (divisions: AssetDivision[]) => (
  divisions.filter((division, index, allDivisions) => {
    const divisionId = idAsNumber(division.id);
    return divisionId > 0 && allDivisions.findIndex((item) => idAsNumber(item.id) === divisionId) === index;
  })
);

const AssetForm: React.FC<AssetFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const user = getStoredUser();
  const isHoUser = isHeadOfficeUser();
  const currentUserEstateId = Number(user.estate?.id ?? user.estate_id ?? 0) || 0;

  const { data: assetRegs } = useQuery<AssetReg[]>({
    queryKey: ['asset-regs'],
    queryFn: async () => {
      const resp = await api.get('/asset-regs');
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

  const { data: estates } = useQuery<EstateOption[]>({
    queryKey: ['estates'],
    queryFn: async () => {
      const resp = await api.get('/estates');
      return resp.data.data;
    },
  });

  const { data: assetDepartments } = useQuery<AssetDepartment[]>({
    queryKey: ['asset-departments'],
    queryFn: async () => {
      const resp = await api.get('/asset-departments');
      return resp.data.data;
    },
  });

  const { data: assetDivisions } = useQuery<AssetDivision[]>({
    queryKey: ['asset-divisions'],
    queryFn: async () => {
      const resp = await api.get('/asset-divisions');
      return resp.data.data;
    },
    retry: false,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema) as Resolver<AssetFormValues>,
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
          alokasi:     String(initialData.alokasi    ?? ''),
          keterangan:  String(initialData.keterangan ?? ''),
          vendor_id:   initialData.vendor_id ? Number(initialData.vendor_id) : undefined,
          estate_id:   initialData.estate_id ? Number(initialData.estate_id) : 0,
          asset_department_id: initialData.asset_department_id ? Number(initialData.asset_department_id) : 0,
          asset_division_id:   initialData.asset_division_id ? Number(initialData.asset_division_id) : 0,
          anggota_id:   initialData.anggota_id ? String(initialData.anggota_id) : '',
          source:      String(initialData.source     ?? ''),
          not_active:  parseBoolean(initialData.not_active),
        }
      : {
          reg_id: '', asset_no: '', unit_id: '', date: '', serial_no: '',
          type_id: 0, type: '', manufacture: '', series: '',
          alokasi: '', keterangan: '', vendor_id: undefined,
          estate_id: isHoUser ? 0 : currentUserEstateId, asset_department_id: 0, asset_division_id: 0, anggota_id: '', source: '',
          not_active: false,
        },
  });

  const selectedTypeId = watch('type_id');
  const selectedEstateId = watch('estate_id');
  const selectedDepartmentId = watch('asset_department_id');
  const selectedDepartmentNumericId = idAsNumber(selectedDepartmentId);

  const { data: anggotas, isFetching: isFetchingAnggotas } = useQuery<{ data: AnggotaOption[] }>({
    queryKey: ['anggotas'],
    queryFn: async () => {
      const resp = await api.get('/anggotas');
      return resp.data;
    },
  });

  const { data: generatedRegId, isFetching: isGeneratingRegId } = useQuery<{ reg_id: string }>({
    queryKey: ['assets', 'generate-reg-id', isHoUser ? selectedEstateId : 'current-user-estate'],
    queryFn: async () => {
      const params = isHoUser ? { estate_id: selectedEstateId } : {};
      const resp = await api.get('/assets/generate-reg-id', { params });
      return resp.data.data;
    },
    enabled: !initialData && (!isHoUser || Number(selectedEstateId) > 0),
  });

  const { data: fallbackDivisions } = useQuery<AssetDivision[]>({
    queryKey: ['asset-divisions', selectedDepartmentNumericId],
    queryFn: async () => {
      const resp = await api.get('/asset-divisions', {
        params: { asset_department_id: selectedDepartmentNumericId },
      });
      return resp.data.data;
    },
    enabled: selectedDepartmentNumericId > 0,
    retry: false,
  });

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

  useEffect(() => {
    if (!initialData) {
      setValue('reg_id', generatedRegId?.reg_id ?? '');
    }
  }, [generatedRegId, initialData, setValue]);

  useEffect(() => {
    if (!anggotas) {
      return;
    }

    const currentMemberId = watch('anggota_id');
    if (!anggotas?.data?.length && currentMemberId) {
      setValue('anggota_id', '');
    }
  }, [anggotas, setValue, watch]);

  useEffect(() => {
    const currentDivisionId = watch('asset_division_id');

    if (!selectedDepartmentNumericId) {
      if (currentDivisionId) {
        setValue('asset_division_id', 0);
      }

      return;
    }

    const selectedDepartment = (assetDepartments ?? []).find(
      (department) => idAsNumber(department.id) === selectedDepartmentNumericId,
    );
    const selectedDepartmentDivisionIds = new Set(
      (selectedDepartment?.divisions ?? []).map((division) => idAsNumber(division.id)),
    );
    const availableDivisions = uniqueDivisionsById([
      ...(selectedDepartment?.divisions ?? []),
      ...(fallbackDivisions ?? []),
      ...(assetDivisions ?? []),
    ]);

    const divisionBelongsToDepartment = availableDivisions.some(
      (division) => (
        idAsNumber(division.id) === idAsNumber(currentDivisionId)
        && (
          idAsNumber(division.asset_department_id) === selectedDepartmentNumericId
          || selectedDepartmentDivisionIds.has(idAsNumber(division.id))
        )
      ),
    );

    if (currentDivisionId && !divisionBelongsToDepartment) {
      setValue('asset_division_id', 0);
    }
  }, [selectedDepartmentNumericId, assetDepartments, fallbackDivisions, assetDivisions, setValue, watch]);

  const regOptions = (assetRegs ?? []).map((r) => ({
    value: r.id,
    label: `${r.asset_type?.name ?? r.type ?? '-'} - ${r.manufacturer?.name ?? r.manufacture ?? '-'} (${r.series})`,
  }));

  const vendorOptions = (vendors ?? []).map((v) => ({
    value: v.id,
    label: v.nama,
  }));

  const estateOptions = (estates ?? []).map((e) => ({
    value: e.id,
    label: `${e.estate} (${e.estate_id})`,
  }));

  const activeMembers: MemberPickerItem[] = useMemo(
    () => (anggotas?.data ?? [])
      .filter((anggota) => !parseBoolean(anggota.not_active))
      .map((anggota) => ({
        sap_id: String(anggota.sap_id),
        login_name: anggota.login_name ?? null,
        nama: String(anggota.nama ?? ''),
        position: anggota.position ?? null,
        department: anggota.department ?? null,
        company_code: anggota.company_code ?? null,
        cost_center: anggota.cost_center ?? null,
      })),
    [anggotas],
  );

  useEffect(() => {
    if (!anggotas) {
      return;
    }

    const currentMemberId = watch('anggota_id');
    if (currentMemberId && !activeMembers.some((member) => member.sap_id === currentMemberId)) {
      setValue('anggota_id', '');
    }
  }, [anggotas, activeMembers, setValue, watch]);

  const initialAnggota = initialData?.anggota as { nama?: string; sap_id?: string } | undefined;
  const selectedMemberFallback = initialAnggota?.nama && initialAnggota?.sap_id
    ? `${initialAnggota.nama} (${initialAnggota.sap_id})`
    : undefined;

  const departmentOptions = (assetDepartments ?? [])
    .filter((department) => !parseBoolean(department.not_active))
    .map((department) => ({
      value: department.id,
      label: department.code ? `${department.code} - ${department.name}` : department.name,
    }));

  const selectedDepartment = (assetDepartments ?? []).find(
    (department) => idAsNumber(department.id) === selectedDepartmentNumericId,
  );
  const selectedDepartmentDivisionIds = new Set(
    (selectedDepartment?.divisions ?? []).map((division) => idAsNumber(division.id)),
  );
  const availableDivisions = uniqueDivisionsById([
    ...(selectedDepartment?.divisions ?? []),
    ...(fallbackDivisions ?? []),
    ...(assetDivisions ?? []),
  ]);

  const divisionOptions = availableDivisions
    .filter((division) => (
      !parseBoolean(division.not_active)
      && (
        idAsNumber(division.asset_department_id) === selectedDepartmentNumericId
        || selectedDepartmentDivisionIds.has(idAsNumber(division.id))
      )
    ))
    .map((division) => ({
      value: division.id,
      label: division.code ? `${division.code} - ${division.name}` : division.name,
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
          readOnly
          error={errors.reg_id?.message}
          placeholder={isGeneratingRegId ? 'Generating...' : 'Auto-generated'}
          className="font-mono"
        />
        <Input
          label="Asset No"
          {...register('asset_no')}
          required
          error={errors.asset_no?.message}
          placeholder="Asset number"
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Input
          label="Serial No"
          {...register('serial_no')}
          required
          error={errors.serial_no?.message}
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
              disabled={!isHoUser}
            />
          )}
        />
      </FormGroup>

      <FormGroup cols={1}>
        <Input
          label="Alokasi"
          {...register('alokasi')}
          placeholder="e.g. USER-1"
        />
      </FormGroup>

      <FormGroup cols={1}>
        <Controller
          name="anggota_id"
          control={control}
          render={({ field }) => (
            <MemberPicker
              label="Assigned Member"
              members={activeMembers}
              isLoading={isFetchingAnggotas}
              error={errors.anggota_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
              selectedFallbackLabel={selectedMemberFallback}
            />
          )}
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Controller
          name="asset_department_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Asset Department"
              required
              options={departmentOptions}
              placeholder="Select department..."
              error={errors.asset_department_id?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="asset_division_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Asset Division"
              required
              options={divisionOptions}
              placeholder={selectedDepartmentId ? 'Select division...' : 'Select department first...'}
              error={errors.asset_division_id?.message}
              value={field.value}
              onChange={field.onChange}
              disabled={!selectedDepartmentId}
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
