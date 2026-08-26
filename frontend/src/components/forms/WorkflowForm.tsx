import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Checkbox, FormGroup } from '../ui/FormFields';
import Button from '../ui/Button';

interface WorkflowStep {
  sequence: number;
  role_name: string;
  action_type: string;
}

interface WorkflowFormProps {
  initialData?: any;
  roles?: { id: number; name: string }[];
  estates?: { id: number; estate: string; estate_id?: string }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const WorkflowForm: React.FC<WorkflowFormProps> = ({
  initialData,
  roles = [],
  estates = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [moduleName, setModuleName] = useState(initialData?.module_name || 'Transfer');
  const [estateId, setEstateId] = useState(initialData?.estate_id || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.is_active : true);
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialData?.steps?.length > 0
      ? initialData.steps.map((s: any) => ({
          sequence: s.sequence,
          role_name: s.role_name,
          action_type: s.action_type || 'Approver',
        }))
      : [{ sequence: 1, role_name: '', action_type: 'Approver' }]
  );

  // Filter out admin role from the options as requested by user
  const roleOptions = roles
    .filter((r) => r.name.toLowerCase() !== 'admin')
    .map((r) => ({ value: r.name, label: r.name.toUpperCase() }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      module_name: moduleName,
      estate_id: estateId || null,
      is_active: isActive,
      steps: steps.filter((step) => step.role_name.trim() !== ''),
    });
  };

  const addStep = () => {
    setSteps([...steps, { sequence: steps.length + 1, role_name: '', action_type: 'Approver' }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 }));
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <FormGroup cols={2}>
        <Input
          label="Workflow Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard Material Transfer"
          required
        />
        <Select
          label="Module"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          options={[
            { value: 'Transfer', label: 'Transfer' },
            { value: 'write-off', label: 'Write-Off' },
            { value: 'Transactions', label: 'Transactions' },
          ]}
          required
        />
      </FormGroup>

      <FormGroup cols={2}>
        <Select
          label="Estate (Optional)"
          value={estateId}
          onChange={(e) => setEstateId(e.target.value)}
          options={[
            { value: '', label: 'GLOBAL (All Estates)' },
            ...estates.map((e) => ({ value: e.id, label: `${e.estate.toUpperCase()}${e.estate_id ? ` (${e.estate_id})` : ''}` }))
          ]}
        />
        <p className="text-xs text-forest-500 -mt-2">
          If set, this workflow only applies to the specified destination estate.
        </p>
        <div className="flex items-end pb-2">
          <Checkbox
            label="Active"
            description="Enable or disable this workflow template"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </div>
      </FormGroup>

      <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-forest-900 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 font-bold w-16 text-center">Seq</th>
              <th className="px-4 py-2 font-bold">Role (Approver) *</th>
              <th className="px-4 py-2 font-bold">Action Type *</th>
              <th className="px-4 py-2 font-bold w-12 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-2 text-center font-semibold text-gray-500">{step.sequence}</td>
                <td className="px-4 py-2">
                  <Select
                    value={step.role_name}
                    onChange={(e) => updateStep(idx, 'role_name', e.target.value)}
                    options={roleOptions}
                    placeholder="Select Role..."
                    required
                  />
                </td>
                <td className="px-4 py-2">
                  <Select
                    value={step.action_type}
                    onChange={(e) => updateStep(idx, 'action_type', e.target.value)}
                    options={[
                      { value: 'Approver', label: 'Approver' },
                      { value: 'Reviewer', label: 'Reviewer' },
                    ]}
                    required
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {steps.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">No steps defined. Add a step below.</div>
        )}
        <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-center">
          <button
            type="button"
            onClick={addStep}
            className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline px-3 py-1"
          >
            <Plus className="h-3 w-3" /> Add Approval Step
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData ? 'Save Changes' : 'Create Workflow'}
        </Button>
      </div>
    </form>
  );
};

export default WorkflowForm;
