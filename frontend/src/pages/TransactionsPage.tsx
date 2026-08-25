import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Download, Upload, FileDown } from 'lucide-react';
import api from '../api/axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import { txTypeBadge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import useTitle from '../hooks/useTitle';

import {
	Input,
	Textarea,
	FormGroup,
	SearchableSelect,
} from '../components/ui/FormFields';

import { formatDate, getStoredUser, exportToCSV, isHeadOfficeUser } from '../lib/utils';
import { hasStoredPermission } from '../lib/access';

interface Transaction {
	[key: string]: any;
	id: number;
	date: string;
	type: 'IN' | 'OUT';
	material?: { nama?: string };
	code: string;
	qty: number;
	section: string;
	nama2: string;
	create_by: string;
}

interface MaterialOption {
	code: string;
	nama: string;
	stock?: number;
	unit?: { nama?: string } | null;
	not_active?: boolean;
}

interface EstateOption {
	id: number;
	estate: string;
	estate_id: string;
}

const TransactionsPage: React.FC = () => {
	useTitle('Transactions');
	const [isModalOpen,      setIsModalOpen]      = useState(false);
	const [txType,           setTxType]           = useState<'IN' | 'OUT'>('IN');
	const [selectedCode,     setSelectedCode]     = useState('');
	const [selectedEstateId, setSelectedEstateId] = useState('');
	const [selectedQty,      setSelectedQty]      = useState<number>(0);

	const user         = getStoredUser();
	const isHoUser     = isHeadOfficeUser(); // #22 FIX: use centralized helper
	const userEstateId = user?.estate_id ? Number(user.estate_id) : undefined;

	const canCreateTransaction = hasStoredPermission('create-transactions');
	const queryClient = useQueryClient();
	const { success, error: toastError } = useToast();

	// ── Transactions list ───────────────────────────────────────────────────────
	const { data, isLoading } = useQuery<{ data: Transaction[] }>({
		queryKey: ['transactions'],
		queryFn: async () => {
			const response = await api.get('/transactions');
			return response.data;
		},
	});

	// ── Estates (HO user only — to pick which estate's materials to record) ─────
	const { data: estatesData } = useQuery<EstateOption[]>({
		queryKey: ['estates'],
		enabled: isHoUser,
		queryFn: async () => {
			const response = await api.get('/estates');
			return response.data.data;
		},
	});

	// ── Materials filtered by estate ────────────────────────────────────────────
	// HO  → uses selectedEstateId chosen in the modal; disabled until estate selected
	// Non-HO → backend auto-scopes to their estate; no extra param needed
	const effectiveEstateId = isHoUser
		? (selectedEstateId ? Number(selectedEstateId) : undefined)
		: userEstateId;

	const { data: materialOptionsData, isLoading: isLoadingMaterials } =
		useQuery<{ data: MaterialOption[] }>({
			queryKey: ['transaction-material-options', effectiveEstateId],
			enabled: isHoUser ? !!selectedEstateId : true,
			queryFn: async () => {
				const response = await api.get('/materials', {
					params: { all: 1, ...(effectiveEstateId ? { estate_id: effectiveEstateId } : {}) },
				});
				return response.data;
			},
		});

	const materialOptions = useMemo(
		() =>
			(materialOptionsData?.data ?? [])
				.filter((m) => !m.not_active)
				.map((m) => ({
					value: m.code,
					label: `${m.code} - ${m.nama}${typeof m.stock === 'number' ? ` (Stock: ${m.stock})` : ''}`,
				})),
		[materialOptionsData],
	);

	// ── Stock preview ───────────────────────────────────────────────────────────
	const selectedMaterial = useMemo(
		() => (materialOptionsData?.data ?? []).find((m) => m.code === selectedCode) ?? null,
		[materialOptionsData, selectedCode],
	);

	const currentStock  = typeof selectedMaterial?.stock === 'number' ? selectedMaterial.stock : null;
	const selectedUnitName = selectedMaterial?.unit?.nama || '-';
	const previewStock  =
		currentStock !== null && selectedQty > 0
			? Number((txType === 'IN' ? currentStock + selectedQty : currentStock - selectedQty).toFixed(2))
			: null;

	// ── Mutation ────────────────────────────────────────────────────────────────
	const mutation = useMutation({
		mutationFn: (newTransaction: unknown) =>
			api.post('/transactions', newTransaction),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['transactions'] });
			queryClient.invalidateQueries({ queryKey: ['materials'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
			closeModal();
			success(`Material ${txType} recorded`, 'Transaction has been saved.');
		},
		onError: () =>
			toastError('Transaction failed', 'Could not record the transaction.'),
	});

	const openModal = (type: 'IN' | 'OUT') => {
		setTxType(type);
		setSelectedCode('');
		setSelectedEstateId('');
		setSelectedQty(0);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedCode('');
		setSelectedEstateId('');
		setSelectedQty(0);
	};

	// #12 FIX: Export transaction list ke CSV
	const handleExportCSV = () => {
		const rows = (data?.data ?? []).map((t) => ({
			date:     t.date,
			type:     t.type,
			material: t.material?.nama ?? t.code,
			code:     t.code,
			qty:      t.qty,
			section:  t.section ?? '',
			receiver: t.nama2 ?? '',
			by:       t.create_by ?? '',
		}));
		exportToCSV(rows, [
			{ key: 'date',     label: 'Tanggal' },
			{ key: 'type',     label: 'Tipe' },
			{ key: 'material', label: 'Material' },
			{ key: 'code',     label: 'Kode' },
			{ key: 'qty',      label: 'Qty' },
			{ key: 'section',  label: 'Section' },
			{ key: 'receiver', label: 'Penerima/Pengirim' },
			{ key: 'by',       label: 'Dibuat Oleh' },
		], `transactions-${new Date().toISOString().split('T')[0]}`);
	};

	// ── Table columns ───────────────────────────────────────────────────────────
	const columns: Column<Transaction>[] = [
		{
			key: 'date',
			label: 'Date',
			sortable: true,
			render: (val) => formatDate(String(val ?? '')),
		},
		{ key: 'type', label: 'Type', render: (val) => txTypeBadge(String(val)) },
		{
			key: 'material',
			label: 'Material',
			render: (_, row) => row.material?.nama ?? row.code,
		},
		{
			key: 'qty',
			label: 'Qty',
			sortable: true,
			render: (val, row) => (
				<span className={`font-bold ${row.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
					{row.type === 'IN' ? '+' : '-'}{String(val)}
				</span>
			),
		},
		{ key: 'section',   label: 'Section' },
		{ key: 'nama2',     label: 'Receiver/Sender' },
		{ key: 'create_by', label: 'By' },
	];

	// ── Render ──────────────────────────────────────────────────────────────────
	return (
		<div className="space-y-6 animate-fade-in">
			{/* Header */}
			<div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
				<div className="flex items-center gap-4">
					<div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
						<ArrowLeftRight className="h-6 w-6" />
					</div>
					<div>
						<h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
							Material Transactions
						</h1>
						<p className="text-sm text-gray-500 font-medium mt-1">
							Track all material movements (IN / OUT)
						</p>
					</div>
				</div>
				<div className="flex gap-3">
					{/* #12 FIX: Export CSV */}
					<button
						onClick={handleExportCSV}
						disabled={!(data?.data?.length)}
						className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl flex items-center text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
						title="Export to CSV"
					>
						<FileDown className="h-4 w-4 mr-2" />
						Export CSV
					</button>
					{canCreateTransaction && (
						<>
							<button
								onClick={() => openModal('IN')}
								className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
							>
								<Upload className="h-4 w-4 mr-2" />
								Material IN
							</button>
							<button
								onClick={() => openModal('OUT')}
								className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-red-200 transition-all font-bold text-sm tracking-wide transform active:scale-95"
							>
								<Download className="h-4 w-4 mr-2" />
								Material OUT
							</button>
						</>
					)}
				</div>
			</div>

			<DataTable<Transaction>
				columns={columns}
				data={data?.data ?? []}
				isLoading={isLoading}
				searchKeys={['code', 'section', 'nama2', 'create_by']}
				searchPlaceholder="Search by material, section, or receiver…"
				rowKey={(item) => item.id}
				pageSize={15}
				emptyMessage="No transactions recorded yet"
			/>

			{/* Record transaction modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title={`Record Material ${txType}`}
				description={`Record a material ${txType === 'IN' ? 'stock-in' : 'stock-out'} transaction`}
				size="md"
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (isHoUser && !selectedEstateId) {
							toastError('Validation', 'Please select an estate.');
							return;
						}
						if (!selectedCode) {
							toastError('Validation', 'Please select a material code.');
							return;
						}
						const fd = new FormData(e.currentTarget);
						const payload = Object.fromEntries(fd);
						payload.type = txType;
						payload.code = selectedCode;
						mutation.mutate(payload);
					}}
					className="space-y-4"
				>
					{/* Estate selector — visible for HO users only */}
					{isHoUser && (
						<div className="space-y-1.5">
							<label className="block text-sm font-semibold text-forest-900">
								Estate <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
								value={selectedEstateId}
								onChange={(e) => {
									setSelectedEstateId(e.target.value);
									setSelectedCode('');
									setSelectedQty(0);
								}}
							>
								<option value="">Select Estate...</option>
								{estatesData?.map((est) => (
									<option key={est.id} value={est.id}>
										{est.estate} ({est.estate_id})
									</option>
								))}
							</select>
						</div>
					)}

					<FormGroup cols={2}>
						<Input
							label="Date"
							name="date"
							type="date"
							required
							defaultValue={new Date().toISOString().split('T')[0]}
						/>
						<div className="space-y-1.5">
							<label className="block text-sm font-semibold text-forest-900">
								Material Code <span className="text-red-500">*</span>
							</label>
							<SearchableSelect
								options={materialOptions}
								value={selectedCode}
								onChange={(val) => setSelectedCode(String(val))}
								placeholder={
									isHoUser && !selectedEstateId
										? 'Select estate first...'
										: isLoadingMaterials
										? 'Loading materials...'
										: 'Search material by code or name...'
								}
								disabled={isLoadingMaterials || (isHoUser && !selectedEstateId)}
								noOptionsText="No materials available"
							/>
						</div>
					</FormGroup>

					{/* Stock info card — tampil setelah material dipilih */}
					{selectedCode && (
						<div className={`rounded-xl border px-4 py-3 flex items-center justify-between text-sm transition-colors ${
							previewStock !== null && previewStock < 0
								? 'bg-red-50 border-red-200'
								: txType === 'IN'
								? 'bg-emerald-50 border-emerald-200'
								: 'bg-gray-50 border-gray-200'
						}`}>
							<div className="flex items-center gap-2">
								<span className="text-xs text-gray-500">Current Stock</span>
								<span className="font-bold text-gray-900 text-base">
									{currentStock !== null ? currentStock : '-'}
									<span className="ml-1 text-xs font-semibold text-gray-500">{selectedUnitName}</span>
								</span>
							</div>
							{previewStock !== null && (
								<div className="flex items-center gap-2">
									<span className="text-gray-400">→</span>
									<span className={`font-black text-base ${
										previewStock < 0
											? 'text-red-600'
											: txType === 'IN'
											? 'text-emerald-600'
											: 'text-orange-600'
									}`}>
										{previewStock}
										<span className="ml-1 text-xs font-semibold text-gray-500">{selectedUnitName}</span>
									</span>
									<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
										txType === 'IN'
											? 'bg-emerald-100 text-emerald-700'
											: 'bg-red-100 text-red-600'
									}`}>
										{txType === 'IN' ? `+${selectedQty}` : `-${selectedQty}`} {selectedUnitName}
									</span>
									{previewStock < 0 && (
										<span className="text-xs font-semibold text-red-600">⚠ Stok minus</span>
									)}
								</div>
							)}
						</div>
					)}

					<FormGroup cols={2}>
						<Input
							label="Quantity"
							name="qty"
							type="number"
							step="0.1"
							min="0.1"
							required
							placeholder="0.0"
							hint={selectedCode ? `Satuan: ${selectedUnitName}` : undefined}
							onChange={(e) => setSelectedQty(parseFloat(e.target.value) || 0)}
						/>
						<Input
							label="Store / Bin"
							name="store"
							type="text"
							placeholder="CRW / Bin ID"
						/>
					</FormGroup>

					<FormGroup cols={2}>
						<Input
							label="SAP ID (Receiver/Sender)"
							name="sap2"
							type="text"
							placeholder="SAP employee ID"
						/>
						<Input
							label="Name (Receiver/Sender)"
							name="nama2"
							type="text"
							placeholder="Full name"
						/>
					</FormGroup>

					<Textarea
						label="Remarks / Keterangan"
						name="keterangan"
						rows={3}
						placeholder="Optional notes about this transaction"
					/>

					<div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
						<Button variant="ghost" type="button" onClick={closeModal}>
							Cancel
						</Button>
						<Button
							variant={txType === 'IN' ? 'success' : 'danger'}
							type="submit"
							loading={mutation.isPending}
						>
							Record {txType}
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	);
};

export default TransactionsPage;
