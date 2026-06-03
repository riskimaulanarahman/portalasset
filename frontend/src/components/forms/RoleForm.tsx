import React, { useState } from 'react';
import { Input } from '../ui/FormFields';
import Button from '../ui/Button';

interface RoleFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.toLowerCase() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Role Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. manager, supervisor, site_lead"
        required
        disabled={initialData?.name === 'admin'}
      />
      
      {initialData?.name === 'admin' && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
          The 'admin' role is a system requirement and its name cannot be changed.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting} disabled={initialData?.name === 'admin'}>
          {initialData ? 'Update Role' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
};

export default RoleForm;
