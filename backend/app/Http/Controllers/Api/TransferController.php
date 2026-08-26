<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Estate;
use App\Models\Material;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use App\Services\MaterialTransferService;
use App\Mail\TransferCreatedMail;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Barryvdh\DomPDF\Facade\Pdf;

class TransferController extends Controller implements HasMiddleware
{
    use InteractsWithAssetOwnershipScope;

    public function __construct(private MaterialTransferService $materialTransferService)
    {
    }

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-transfers', only: ['index', 'show']),
            new Middleware('permission:create-transfers', only: ['store']),
            new Middleware('permission:edit-transfers', only: ['update']),
            new Middleware('permission:delete-transfers', only: ['destroy']),
            new Middleware('permission:cancel-transfers', only: ['cancel']),
            new Middleware('permission:download-transfer-ba', only: ['downloadBeritaAcara']),
        ];
    }

    public function index()
    {
        $transfers = Transfer::with(['fromEstate', 'toEstate', 'items', 'approvalRequests.logs', 'anggotaPenerima', 'materialHistories.fromEstate', 'materialHistories.toEstate', 'assetHistories.fromEstate', 'assetHistories.toEstate', 'assetHistories.targetAnggota'])
            ->when(!$this->isHeadOfficeUser(), function ($query) {
                $query->where(function ($scoped) {
                    $scoped->where('from_estate_id', $this->currentEstateId())
                        ->orWhere('to_estate_id', $this->currentEstateId());
                });
            })
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json(['data' => $transfers]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:Asset,Material',
            'from_estate_id' => 'nullable|exists:estates,id',
            'to_estate_id' => 'required|exists:estates,id',
            'anggota_id' => 'nullable|exists:anggotas,sap_id',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required',
            'items.*.qty' => $request->input('type') === 'Material' ? 'required|integer|min:1' : 'nullable|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $fromEstateId = $this->isHeadOfficeUser()
                ? ($request->from_estate_id ?? Auth::user()->estate_id)
                : $this->currentEstateId();

            if (!$fromEstateId) {
                return response()->json(['message' => 'Source estate is required'], 422);
            }

            if ((int) $fromEstateId === (int) $request->to_estate_id) {
                return response()->json(['message' => 'Source and destination estate must be different'], 422);
            }

            $this->ensureTransferItemsBelongToEstate($request->type, $request->items, (int) $fromEstateId);
            $workflow = $this->resolveTransferWorkflow((int) $request->to_estate_id);
            $firstStep = $workflow->steps->where('sequence', 1)->first();

            if (!$firstStep) {
                throw ValidationException::withMessages([
                    'workflow' => ['Workflow transfer belum memiliki step approval pertama. Hubungi admin untuk melengkapi workflow.'],
                ]);
            }

            if (!$this->workflowStepHasActiveApprover($firstStep, (int) $request->to_estate_id)) {
                throw ValidationException::withMessages([
                    'workflow' => ['Workflow transfer tidak memiliki approver aktif untuk destination estate. Hubungi admin untuk melengkapi user/role approver.'],
                ]);
            }

            // #4 FIX: Gunakan lockForUpdate() di dalam transaksi agar atomic
            // Mencegah race condition saat dua request membaca ID yang sama bersamaan
            $transferCode = $this->nextTransferCode();

            $transfer = Transfer::create([
                'transfer_code' => $transferCode,
                'type' => $request->type,
                'from_estate_id' => $fromEstateId,
                'to_estate_id' => $request->to_estate_id,
                'anggota_id' => $request->anggota_id,
                'status' => 'Pending Approval',
                'transfer_date' => now(),
                'notes' => $request->notes,
                'created_by' => Auth::user()->name ?? 'System',
            ]);

            foreach ($request->items as $item) {
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'item_type' => $request->type,
                    'item_id' => $item['item_id'],
                    'qty' => $request->type === 'Asset' ? 1 : $item['qty'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            $firstStepEmails = [];
            ApprovalRequest::create([
                'reference_table' => 'transfers',
                'reference_id' => $transfer->id,
                'workflow_id' => $workflow->id,
                'current_sequence' => 1,
                'status' => 'Pending',
                'requester_id' => Auth::id(),
            ]);
            $firstStepEmails = $firstStep->getEmailRecipients($transfer->to_estate_id);

            DB::commit();

            if (!empty($firstStepEmails)) {
                $transfer->load(['fromEstate', 'toEstate', 'items']);
                $this->sendEmailIfEnabled(
                    $firstStepEmails,
                    new TransferCreatedMail($transfer),
                    $this->transferOversightCcEmails($firstStepEmails)
                );
            }

            return response()->json(['message' => 'Transfer created successfully', 'data' => $transfer], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Transfer validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create transfer', 'error' => $e->getMessage()], 500);
        }
    }

    private function resolveTransferWorkflow(int $toEstateId): ApprovalWorkflow
    {
        $workflow = ApprovalWorkflow::with('steps')
            ->where('module_name', 'Transfer')
            ->where('is_active', true)
            ->where('estate_id', $toEstateId)
            ->first();

        if (!$workflow) {
            $workflow = ApprovalWorkflow::with('steps')
                ->where('module_name', 'Transfer')
                ->where('is_active', true)
                ->whereNull('estate_id')
                ->first();
        }

        if (!$workflow) {
            throw ValidationException::withMessages([
                'workflow' => ['Workflow transfer aktif untuk destination estate atau global belum dikonfigurasi. Transfer tidak dapat dibuat.'],
            ]);
        }

        return $workflow;
    }

    private function workflowStepHasActiveApprover($step, int $toEstateId): bool
    {
        if ($step->user_id) {
            return User::whereKey($step->user_id)
                ->where('not_active', false)
                ->where('estate_id', $toEstateId)
                ->exists();
        }

        if ($step->role_name) {
            return User::whereHas('role', fn ($query) => $query->where('name', $step->role_name))
                ->where('not_active', false)
                ->where('estate_id', $toEstateId)
                ->exists();
        }

        return false;
    }

    private function nextTransferCode(): string
    {
        $prefix = 'TRF-' . date('Ym') . '-';
        $lastNumber = Transfer::withTrashed()
            ->where('transfer_code', 'like', $prefix . '%')
            ->lockForUpdate()
            ->pluck('transfer_code')
            ->map(function (string $code) use ($prefix) {
                $suffix = substr($code, strlen($prefix));

                return ctype_digit($suffix) ? (int) $suffix : 0;
            })
            ->max() ?? 0;

        do {
            $lastNumber++;
            $transferCode = $prefix . str_pad((string) $lastNumber, 4, '0', STR_PAD_LEFT);
        } while (Transfer::withTrashed()->where('transfer_code', $transferCode)->exists());

        return $transferCode;
    }

    public function show(string $id)
    {
        $transfer = Transfer::with([
            'fromEstate',
            'toEstate',
            'items',
            'approvalRequests.logs.user',
            'approvalRequests.workflow.steps.user',
            'anggotaPenerima',
            'materialHistories.fromEstate',
            'materialHistories.toEstate',
            'assetHistories.fromEstate',
            'assetHistories.toEstate',
            'assetHistories.targetAnggota',
        ])->findOrFail($id);
        $this->ensureTransferAccess($transfer);

        // Enrich items with name, current stock, and projected stock
        $materialIds = $transfer->items->where('item_type', 'Material')->pluck('item_id');
        $assetIds    = $transfer->items->where('item_type', 'Asset')->pluck('item_id');

        $materials = $materialIds->isNotEmpty()
            ? Material::whereIn('code', $materialIds)->get(['code', 'nama', 'stock'])->keyBy('code')
            : collect();

        $assets = $assetIds->isNotEmpty()
            ? Asset::whereIn('reg_id', $assetIds)->get(['reg_id', 'asset_no', 'type', 'manufacture', 'series', 'asset_department_id', 'asset_division_id'])->keyBy('reg_id')
            : collect();

        foreach ($transfer->items as $item) {
            if ($item->item_type === 'Material') {
                $mat = $materials[$item->item_id] ?? null;
                $item->item_name       = $mat?->nama ?? $item->item_id;
                $item->current_stock   = $mat?->stock ?? null;
                $item->projected_stock = $mat !== null ? ($mat->stock - $item->qty) : null;
            } else {
                $ast  = $assets[$item->item_id] ?? null;
                $name = implode(' — ', array_filter([$ast?->asset_no, $ast?->type, $ast?->manufacture, $ast?->series]));
                $item->item_name       = $name ?: $item->item_id;
                $item->current_stock   = null;
                $item->projected_stock = null;
            }
        }

        // Enrich role-based steps with actual user names from destination estate
        foreach ($transfer->approvalRequests as $approvalRequest) {
            if (!$approvalRequest->workflow) continue;
            foreach ($approvalRequest->workflow->steps as $step) {
                if ($step->user_id) {
                    $step->assignee_names = $step->user ? [$step->user->name] : [];
                } else if ($step->role_name) {
                    $step->assignee_names = User::whereHas('role', fn($q) => $q->where('name', $step->role_name))
                        ->where('not_active', false)
                        ->where('estate_id', $transfer->to_estate_id)
                        ->pluck('name')
                        ->toArray();
                } else {
                    $step->assignee_names = [];
                }
            }
        }

        return response()->json(['data' => $transfer]);
    }

    public function update(Request $request, string $id)
    {
        $transfer = Transfer::findOrFail($id);
        $this->ensureTransferAccess($transfer);
        $this->ensureTransferRequesterAccess($transfer);

        if ($request->hasAny(['status', 'receive_date'])) {
            return response()->json([
                'message' => 'Status dan receive date transfer hanya boleh berubah melalui workflow approval atau cancel.',
            ], 422);
        }

        if (!in_array($transfer->status, ['Draft', 'Pending Approval'], true)) {
            return response()->json([
                'message' => 'Transfer yang sudah diproses tidak dapat diubah.',
            ], 400);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $transfer->update($validated);
        return response()->json(['message' => 'Transfer updated', 'data' => $transfer]);
    }

    public function destroy(string $id)
    {
        $transfer = Transfer::findOrFail($id);
        $this->ensureTransferAccess($transfer);
        $this->ensureTransferRequesterAccess($transfer);
        if ($transfer->status !== 'Draft' && $transfer->status !== 'Pending Approval') {
            return response()->json(['message' => 'Cannot delete transfer that is already processed'], 400);
        }

        DB::transaction(function () use ($transfer) {
            $transfer->approvalRequests()
                ->where('status', 'Pending')
                ->update(['status' => 'Cancelled']);

            $transfer->delete();
        });

        return response()->json(['message' => 'Transfer deleted']);
    }

    // #18 FIX: Cancel transfer yang masih Pending atau Draft
    public function cancel(string $id)
    {
        $transfer = Transfer::findOrFail($id);
        $this->ensureTransferAccess($transfer);
        $this->ensureTransferRequesterAccess($transfer);

        if (!in_array($transfer->status, ['Pending Approval', 'Draft'])) {
            return response()->json([
                'message' => 'Hanya transfer berstatus Draft atau Pending Approval yang dapat dibatalkan.',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $transfer->update(['status' => 'Cancelled']);

            // Batalkan juga ApprovalRequest yang terkait (jika ada)
            $transfer->approvalRequests()
                ->where('status', 'Pending')
                ->update(['status' => 'Cancelled']);

            DB::commit();
            return response()->json(['message' => 'Transfer berhasil dibatalkan.', 'data' => $transfer]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membatalkan transfer.', 'error' => $e->getMessage()], 500);
        }
    }

    public function downloadBeritaAcara(string $id)
    {
        $transfer = Transfer::with(['fromEstate', 'toEstate', 'items', 'approvalRequests.logs.user', 'anggotaPenerima', 'materialHistories', 'assetHistories'])->findOrFail($id);
        $this->ensureTransferAccess($transfer);
        
        if ($transfer->status !== 'Approved') {
            return response()->json(['message' => 'Transfer is not fully approved yet.'], 400);
        }

        $pdf = Pdf::loadView('pdfs.transfer_berita_acara', ['transfer' => $transfer]);
        return $pdf->download('Berita_Acara_Transfer_' . $transfer->transfer_code . '.pdf');
    }

    private function ensureTransferAccess(Transfer $transfer): void
    {
        if ($this->isHeadOfficeUser()) {
            return;
        }

        abort_unless(
            (int) $transfer->from_estate_id === $this->currentEstateId()
            || (int) $transfer->to_estate_id === $this->currentEstateId(),
            404
        );
    }

    private function ensureTransferRequesterAccess(Transfer $transfer): void
    {
        if ($this->isHeadOfficeUser()) {
            return;
        }

        abort_unless((int) $transfer->from_estate_id === $this->currentEstateId(), 403);
    }

    private function ensureTransferItemsBelongToEstate(string $type, array $items, int $fromEstateId): void
    {
        $sourceEstate = Estate::find($fromEstateId);
        if (!$sourceEstate) {
            throw ValidationException::withMessages([
                'from_estate_id' => ['Source estate is invalid'],
            ]);
        }

        foreach ($items as $item) {
            if ($type === 'Material') {
                $material = Material::where('code', $item['item_id'])->first();
                if (!$material || (int) $material->estate_id !== $fromEstateId) {
                    throw ValidationException::withMessages([
                        'items' => ["Material {$item['item_id']} is not available in the source estate"],
                    ]);
                }
                continue;
            }

            $asset = Asset::where('reg_id', $item['item_id'])->first();
            $assetBelongsToEstate = $asset && (
                (int) $asset->estate_id === $fromEstateId
                || ($asset->estate_id === null && $asset->unit_id === $sourceEstate->estate_id)
            );

            if (!$assetBelongsToEstate) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$item['item_id']} is not available in the source estate"],
                ]);
            }

            if (!$asset->asset_department_id || !$asset->asset_division_id) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$item['item_id']} belum memiliki Department dan Divisi. Lengkapi ownership asset sebelum transfer/distribusi."],
                ]);
            }

            if (!$this->canBypassAssetOwnership() && !$this->applyAssetVisibilityScope(Asset::whereKey($asset->getKey()))->exists()) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$item['item_id']} is not available for your Department/Divisi assignment."],
                ]);
            }

            // #5 FIX: Cek apakah asset sudah ada dalam transfer lain yang masih Pending Approval
            $alreadyInPendingTransfer = TransferItem::where('item_id', $item['item_id'])
                ->where('item_type', 'Asset')
                ->whereHas('transfer', function ($q) {
                    $q->where('status', 'Pending Approval');
                })
                ->exists();

            if ($alreadyInPendingTransfer) {
                throw ValidationException::withMessages([
                    'items' => ["Asset {$item['item_id']} is already included in another pending transfer request. Please wait for it to be processed first."],
                ]);
            }
        }
    }
}
