import React, { useEffect, useState } from 'react';
import { Input, Select, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

interface UserFormProps {
  initialData?: any;
  roles?: { id: number; name: string }[];
  estates?: { id: string | number; name?: string; estate?: string; estate_id?: string }[];
  assetDepartments?: { id: number; name: string; code?: string | null }[];
  assetDivisions?: { id: number; name: string; code?: string | null; asset_department_id: number; department?: { name?: string } }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  initialData,
  roles = [],
  estates = [],
  assetDepartments = [],
  assetDivisions = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [estateId, setEstateId] = useState(initialData?.estate_id || '');
  const [roleId, setRoleId] = useState(initialData?.role_id?.toString() || '');
  const [notActive, setNotActive] = useState(initialData?.not_active || false);
  const [assetDepartmentIds, setAssetDepartmentIds] = useState<number[]>(
    (initialData?.asset_departments ?? []).map((department: any) => Number(department.id)),
  );
  const [assetDivisionIds, setAssetDivisionIds] = useState<number[]>(
    (initialData?.asset_divisions ?? []).map((division: any) => Number(division.id)),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      username,
      email,
      password: password || undefined,
      estate_id: estateId || null,
      role_id: parseInt(roleId, 10),
      not_active: notActive,
      asset_department_ids: assetDepartmentIds,
      asset_division_ids: assetDivisionIds,
    });
  };

  const toggleId = (ids: number[], id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter(ids.includes(id) ? ids.filter((currentId) => currentId !== id) : [...ids, id]);
  };

  const selectedRoleName = roles.find((role) => String(role.id) === String(roleId))?.name?.toLowerCase() ?? '';
  const isEstateRole = selectedRoleName === 'estate';

  useEffect(() => {
    if (isEstateRole && estateId === 'HO') {
      setEstateId('');
    }
  }, [isEstateRole, estateId]);

  const roleOptions = roles.map((r) => ({ value: r.id.toString(), label: r.name.toUpperCase() }));
  const estateOptions = estates.map((e) => ({
    value: String(e.id),
    label: `${e.estate_id ?? e.id} - ${e.estate ?? e.name ?? ''}`,
  }));
  if (!isEstateRole) {
    estateOptions.unshift({ value: 'HO', label: 'HO - Head Office' });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup cols={2}>
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? "Leave blank to keep current" : "Min 6 characters"} required={!initialData} minLength={6} />
      </FormGroup>

      <FormGroup cols={2}>
        <Select label="Role (Spatie)" value={roleId} onChange={(e) => setRoleId(e.target.value)} options={roleOptions} required placeholder="Select Role..." />
        <Select label="Estate Assignment" value={estateId} onChange={(e) => setEstateId(e.target.value)} options={estateOptions} placeholder="Select Estate..." required={isEstateRole} />
      </FormGroup>

      <Checkbox label="Pending Activation / Disabled" description="User can only see the limited dashboard until activated" checked={notActive} onChange={(e) => setNotActive(e.target.checked)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-forest-700 mb-3">Asset Departments</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {assetDepartments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No asset departments configured.</p>
            ) : assetDepartments.map((department) => (
              <Checkbox
                key={department.id}
                label={department.code ? `${department.code} - ${department.name}` : department.name}
                checked={assetDepartmentIds.includes(department.id)}
                onChange={() => toggleId(assetDepartmentIds, department.id, setAssetDepartmentIds)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-forest-700 mb-3">Asset Divisions</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {assetDivisions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No asset divisions configured.</p>
            ) : assetDivisions.map((division) => (
              <Checkbox
                key={division.id}
                label={`${division.department?.name ?? 'Department'} / ${division.code ? `${division.code} - ` : ''}${division.name}`}
                checked={assetDivisionIds.includes(division.id)}
                onChange={() => toggleId(assetDivisionIds, division.id, setAssetDivisionIds)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{initialData ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  );
};
export default UserForm;
