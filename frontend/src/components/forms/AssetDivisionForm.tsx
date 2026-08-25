import React, { useState } from 'react';
import { Input, Select, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

interface AssetDivisionFormProps {
  initialData?: any;
  departments?: { id: number; name: string; code?: string | null }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const AssetDivisionForm: React.FC<AssetDivisionFormProps> = ({ initialData, departments = [], onSubmit, onCancel }) => {
  const [departmentId, setDepartmentId] = useState(String(initialData?.asset_department_id ?? ''));
  const [code, setCode] = useState(initialData?.code ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [notActive, setNotActive] = useState(Boolean(initialData?.not_active));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      asset_department_id: Number(departmentId),
      code: code || null,
      name,
      not_active: notActive,
    });
  };

  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.code ? `${department.code} - ${department.name}` : department.name,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Asset Department"
        value={departmentId}
        onChange={(event) => setDepartmentId(event.target.value)}
        options={departmentOptions}
        placeholder="Select department"
        required
      />

      <FormGroup cols={2}>
        <Input label="Code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Optional code" maxLength={30} />
        <Input label="Division Name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
      </FormGroup>

      <Checkbox label="Inactive" checked={notActive} onChange={(event) => setNotActive(event.target.checked)} />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!departmentId}>{initialData ? 'Save Changes' : 'Create Division'}</Button>
      </div>
    </form>
  );
};

export default AssetDivisionForm;
