<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Mail\WriteOffCreatedMail;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Asset;
use App\Models\TransAsset;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WriteOffController extends Controller implements HasMiddleware
{
    use InteractsWithAssetOwnershipScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-write-offs', only: ['index', 'show']),
            new Middleware('permission:create-write-offs', only: ['store']),
            new Middleware('permission:cancel-write-offs', only: ['cancel']),
            new Middleware('permission:download-write-off-ba', only: ['downloadBeritaAcara']),
        ];
    }

    public function index(Request $request)
    {
        $query = TransAsset::with(['asset.section', 'asset.estate', 'approvalRequests.logs'])
            ->writeOff();

        $query->whereHas('asset', fn ($q) => $this->applyAssetVisibilityScope(
            $q,
            $request->filled('estate_id') ? $request->integer('estate_id') : null
        ));

        if ($request->filled('status')) {
            $query->whereHas('approvalRequests', fn ($q) => $q->where('status', $request->status));
        }

        return response()->json(['data' => $query->orderByDesc('id')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reg_id' => 'required|exists:assets,reg_id',
            'kondisi' => 'required|in:Bad,Broken',
            'keterangan' => 'required|string|max:500',
        ]);

        $asset = Asset::with('estate')->findOrFail($validated['reg_id']);
        $this->ensureAssetVisibility($asset);

        $existingPending = TransAsset::writeOff()
            ->where('reg_id', $validated['reg_id'])
            ->whereHas('approvalRequests', fn ($q) => $q->where('status', 'Pending'))
            ->exists();

        if ($existingPending) {
            return response()->json(['message' => 'Aset ini sudah memiliki pengajuan write-off yang sedang menunggu persetujuan.'], 422);
        }

        try {
            $workflow = $this->resolveWriteOffWorkflow((int) $asset->estate_id);
            $firstStep = $this->firstReadyStep($workflow, (int) $asset->estate_id);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Write-off validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $username = Auth::user()->username ?? Auth::user()->name ?? 'system';

            $writeOff = TransAsset::create([
                'reg_id' => $validated['reg_id'],
                'date' => now()->toDateString(),
                'kondisi' => $validated['kondisi'],
                'keterangan' => $validated['keterangan'],
                'process' => 'Write Off',
                'estate' => $asset->estate?->estate ?? null,
                'create_by' => mb_substr($username, 0, 20),
                'create_date' => now(),
            ]);

            ApprovalRequest::create([
                'reference_table' => 'trans_assets',
                'reference_id' => $writeOff->id,
                'workflow_id' => $workflow->id,
                'current_sequence' => 1,
                'status' => 'Pending',
                'requester_id' => Auth::id(),
            ]);

            $firstStepEmails = $firstStep->getEmailRecipients($asset->estate_id);

            DB::commit();

            if (!empty($firstStepEmails)) {
                $writeOff->load('asset.estate');
                $this->sendEmailIfEnabled($firstStepEmails, new WriteOffCreatedMail($writeOff));
            }

            return response()->json(['message' => 'Pengajuan write-off berhasil dibuat', 'data' => $writeOff], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Write-off validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membuat pengajuan write-off', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(string $id)
    {
        $writeOff = TransAsset::with([
            'asset.section',
            'asset.estate',
            'approvalRequests.logs.user',
            'approvalRequests.workflow.steps.user',
            'approvalRequests.requester',
        ])->writeOff()->findOrFail($id);

        $this->ensureAssetVisibility($writeOff->asset);
        $this->appendStepAssignees($writeOff);

        return response()->json(['data' => $writeOff]);
    }

    public function cancel(string $id)
    {
        $writeOff = TransAsset::writeOff()->findOrFail($id);
        $this->ensureAssetVisibility($writeOff->asset);

        $approvalReq = $writeOff->approvalRequests()->where('status', 'Pending')->first();

        if (!$approvalReq) {
            return response()->json(['message' => 'Tidak ada pengajuan write-off yang bisa dibatalkan.'], 400);
        }

        DB::beginTransaction();
        try {
            $approvalReq->update(['status' => 'Cancelled']);
            $writeOff->delete();
            DB::commit();

            return response()->json(['message' => 'Pengajuan write-off berhasil dibatalkan.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membatalkan write-off.', 'error' => $e->getMessage()], 500);
        }
    }

    public function downloadBeritaAcara(string $id)
    {
        $writeOff = TransAsset::with([
            'asset.section',
            'asset.estate',
            'asset.department',
            'asset.division',
            'asset.latestCondition',
            'asset.conditions',
            'asset.maintenances',
            'approvalRequests.logs.user',
            'approvalRequests.workflow.steps.user',
            'approvalRequests.requester',
        ])->writeOff()->findOrFail($id);

        $this->ensureAssetVisibility($writeOff->asset);

        $approvalReq = $writeOff->approvalRequests->first();
        if (!$approvalReq || $approvalReq->status !== 'Approved') {
            return response()->json(['message' => 'Write-off belum disetujui.'], 400);
        }

        $pdf = Pdf::loadView('pdfs.write_off_berita_acara', [
            'writeOff' => $writeOff,
            'approvalRequest' => $approvalReq,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('Berita_Acara_Write_Off_' . $writeOff->asset->reg_id . '.pdf');
    }

    private function resolveWriteOffWorkflow(int $estateId): ApprovalWorkflow
    {
        $workflow = ApprovalWorkflow::with('steps')
            ->where('module_name', 'write-off')
            ->where('is_active', true)
            ->where('estate_id', $estateId)
            ->first();

        if (!$workflow) {
            $workflow = ApprovalWorkflow::with('steps')
                ->where('module_name', 'write-off')
                ->where('is_active', true)
                ->whereNull('estate_id')
                ->first();
        }

        if (!$workflow) {
            throw ValidationException::withMessages([
                'workflow' => ['Workflow write-off aktif untuk estate asset atau global belum dikonfigurasi. Write-off tidak dapat diajukan.'],
            ]);
        }

        return $workflow;
    }

    private function firstReadyStep(ApprovalWorkflow $workflow, int $estateId)
    {
        $firstStep = $workflow->steps->where('sequence', 1)->first();

        if (!$firstStep) {
            throw ValidationException::withMessages([
                'workflow' => ['Workflow write-off belum memiliki step approval pertama. Hubungi admin untuk melengkapi workflow.'],
            ]);
        }

        if (!$this->workflowStepHasActiveApprover($firstStep, $estateId)) {
            throw ValidationException::withMessages([
                'workflow' => ['Workflow write-off tidak memiliki approver aktif untuk estate asset. Hubungi admin untuk melengkapi user/role approver.'],
            ]);
        }

        return $firstStep;
    }

    private function workflowStepHasActiveApprover($step, int $estateId): bool
    {
        if ($step->user_id) {
            $user = User::with(['roles', 'estate'])
                ->whereKey($step->user_id)
                ->where('not_active', false)
                ->first();

            return $user
                && (
                    (int) $user->estate_id === $estateId
                    || $user->hasRole('admin')
                    || mb_strtoupper((string) ($user->estate?->estate_id ?? '')) === 'HO'
                );
        }

        if ($step->role_name) {
            $query = User::whereHas('role', fn ($query) => $query->where('name', $step->role_name))
                ->where('not_active', false);

            if (mb_strtolower($step->role_name) !== 'admin') {
                $query->where('estate_id', $estateId);
            }

            return $query->exists();
        }

        return false;
    }

    private function appendStepAssignees(TransAsset $writeOff): void
    {
        foreach ($writeOff->approvalRequests as $approvalRequest) {
            if (!$approvalRequest->workflow) {
                continue;
            }

            foreach ($approvalRequest->workflow->steps as $step) {
                if ($step->user_id) {
                    $step->assignee_names = $step->user ? [$step->user->name] : [];
                } elseif ($step->role_name) {
                    $query = User::whereHas('role', fn ($q) => $q->where('name', $step->role_name))
                        ->where('not_active', false);

                    if (mb_strtolower($step->role_name) !== 'admin') {
                        $query->where('estate_id', $writeOff->asset->estate_id);
                    }

                    $step->assignee_names = $query->pluck('name')->toArray();
                } else {
                    $step->assignee_names = [];
                }
            }
        }
    }
}
