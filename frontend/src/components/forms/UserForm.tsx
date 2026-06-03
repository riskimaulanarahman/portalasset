import React, { useState } from 'react';
import { Input, Select, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

interface UserFormProps {
  initialData?: any;
  roles?: { id: number; name: string }[];
  estates?: { id: string; name: string }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  initialData,
  roles = [],
  estates = [],
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
    });
  };

  const roleOptions = roles.map((r) => ({ value: r.id.toString(), label: r.name.toUpperCase() }));
  const estateOptions = estates.map((e) => ({ value: e.id, label: `${e.id} - ${e.name}` }));
  estateOptions.unshift({ value: 'HO', label: 'HO - Head Office' });

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
        <Select label="Estate Assignment" value={estateId} onChange={(e) => setEstateId(e.target.value)} options={estateOptions} placeholder="Select Estate..." />
      </FormGroup>

      <Checkbox label="Disabled / Not Active" description="Prevent this user from logging in" checked={notActive} onChange={(e) => setNotActive(e.target.checked)} />

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{initialData ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  );
};
export default UserForm;
