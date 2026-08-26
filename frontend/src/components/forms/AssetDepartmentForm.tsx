import React, { useState } from 'react';
import { Input, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

interface AssetDepartmentFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const AssetDepartmentForm: React.FC<AssetDepartmentFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [code, setCode] = useState(initialData?.code ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [notActive, setNotActive] = useState(Boolean(initialData?.not_active));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      code: code || null,
      name,
      not_active: notActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup cols={2}>
        <Input label="Code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Optional code" maxLength={30} />
        <Input label="Department Name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
      </FormGroup>

      <Checkbox label="Inactive" checked={notActive} onChange={(event) => setNotActive(event.target.checked)} />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{initialData ? 'Save Changes' : 'Create Department'}</Button>
      </div>
    </form>
  );
};

export default AssetDepartmentForm;
