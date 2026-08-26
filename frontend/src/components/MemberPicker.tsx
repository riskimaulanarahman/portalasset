import React, { useMemo, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import DataTable, { Column } from './DataTable';
import Modal from './Modal';
import Button from './ui/Button';
import { cn } from '../lib/utils';

export interface MemberPickerItem extends Record<string, unknown> {
  sap_id: string;
  login_name?: string | null;
  nama: string;
  position?: string | null;
  department?: string | null;
  company_code?: string | null;
  cost_center?: string | null;
}

interface MemberPickerProps {
  label?: string;
  value?: string | null;
  members: MemberPickerItem[];
  isLoading?: boolean;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  selectedFallbackLabel?: string;
  required?: boolean;
  modalTitle?: string;
  modalDescription?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const formatMemberLabel = (member?: MemberPickerItem | null, fallback?: string) => {
  if (member) {
    return `${member.nama} (${member.sap_id})${member.position ? ` - ${member.position}` : ''}`;
  }

  return fallback || 'No member selected';
};

const MemberPicker: React.FC<MemberPickerProps> = ({
  label = 'Assigned Member',
  value,
  members,
  isLoading = false,
  onChange,
  error,
  disabled = false,
  selectedFallbackLabel,
  required = false,
  modalTitle = 'Select Assigned Member',
  modalDescription = 'Search members, then choose Select on the matching row.',
  searchPlaceholder = 'Search by SAP ID, name, department, position...',
  emptyMessage = 'No active members found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMember = useMemo(
    () => members.find((member) => member.sap_id === value),
    [members, value],
  );
  const effectiveFallbackLabel = value ? selectedFallbackLabel : undefined;

  const columns: Column<MemberPickerItem>[] = [
    { key: 'sap_id', label: 'SAP ID', sortable: true, className: 'font-mono text-xs' },
    { key: 'nama', label: 'Name', sortable: true },
    {
      key: 'position',
      label: 'Position',
      render: (val) => val ? String(val) : <span className="text-gray-300 text-xs">-</span>,
    },
    {
      key: 'department',
      label: 'Department',
      render: (val) => val ? String(val) : <span className="text-gray-300 text-xs">-</span>,
    },
    {
      key: 'company_code',
      label: 'Company',
      render: (val) => val ? <span className="font-mono text-xs font-semibold">{String(val)}</span> : '-',
    },
    {
      key: 'select',
      label: '',
      className: 'text-right',
      render: (_value, row) => (
        <Button
          type="button"
          size="xs"
          variant={row.sap_id === value ? 'secondary' : 'primary'}
          onClick={() => {
            onChange(row.sap_id);
            setIsOpen(false);
          }}
        >
          Select
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-forest-800 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      <div className={cn(
        'rounded-xl border bg-white px-3 py-2.5 flex items-center justify-between gap-3',
        error ? 'border-red-300' : 'border-gray-200',
        disabled && 'opacity-60',
      )}>
        <div className="min-w-0 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-forest-500 shrink-0" />
          <span className={cn(
            'text-sm font-medium truncate',
            selectedMember || effectiveFallbackLabel ? 'text-forest-900' : 'text-forest-300',
          )}>
            {formatMemberLabel(selectedMember, effectiveFallbackLabel)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {value && (
            <button
              type="button"
              title="Clear member"
              disabled={disabled}
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg text-forest-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            leftIcon={<Search className="h-3.5 w-3.5" />}
            onClick={() => setIsOpen(true)}
          >
            Browse
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={modalTitle}
        description={modalDescription}
        size="xl"
      >
        <DataTable<MemberPickerItem>
          columns={columns}
          data={members}
          isLoading={isLoading}
          searchPlaceholder={searchPlaceholder}
          searchKeys={['sap_id', 'nama', 'login_name', 'position', 'department', 'company_code', 'cost_center']}
          rowKey={(member) => member.sap_id}
          pageSize={10}
          emptyMessage={emptyMessage}
        />
      </Modal>
    </div>
  );
};

export default MemberPicker;
