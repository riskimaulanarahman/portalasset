<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
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

class WriteOffController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-write-offs', only: ['index', 'show']),
            new Middleware('permission:create-write-offs', only: ['store']),
        ];
    }

    public function index(Request $request)
    {
        $query = TransAsset::with(['asset.section', 'asset.estate', 'approvalRequests.logs'])
            ->writeOff();

        if (!$this->isHeadOfficeUser()) {
            $estateId = $this->currentEstateId();
            $query->whereHas('asset', fn($q) => $q->where('estate_id', $estateId));
        } elseif ($request->filled('estate_id')) {
            $query->whereHas('asset', fn($q) => $q->where('estate_id', $request->estate_id));
        }

        if ($request->filled('status')) {
            $approvalStatus = $request->status;
            $query->whereHas('approvalRequests', fn($q) => $q->where('status', $approvalStatus));
        }

        return response()->json(['data' => $query->orderByDesc('id')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reg_id'     => 'required|exists:assets,reg_id',
            'kondisi'    => 'required|in:Bad,Broken',
            'keterangan' => 'required|string|max:500',
        ]);

        $asset = Asset::with('estate')->findOrFail($validated['reg_id']);

        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $asset->estate_id === $this->currentEstateId(), 403, 'Akses ditolak untuk aset estate lain.');
        }

        // Cegah duplikat write-off yang masih Pending
        $existingPending = TransAsset::writeOff()
            ->where('reg_id', $validated['reg_id'])
            ->whereHas('approvalRequests', fn($q) => $q->where('status', 'Pending'))
            ->exists();

        if ($existingPending) {
            return response()->json(['message' => 'Aset ini sudah memiliki pengajuan write-off yang sedang menunggu persetujuan.'], 422);
        }

        try {
            DB::beginTransaction();

            $username = Auth::user()->username ?? Auth::user()->name ?? 'system';

            $writeOff = TransAsset::create([
                'reg_id'      => $validated['reg_id'],
                'date'        => now()->toDateString(),
                'kondisi'     => $validated['kondisi'],
                'keterangan'  => $validated['keterangan'],
                'process'     => 'Write Off',
                'estate'      => $asset->estate?->estate ?? null,
                'create_by'   => $username,
                'create_date' => now(),
            ]);

            // Cari workflow untuk module_name 'write-off' pada estate aset
            $workflow = ApprovalWorkflow::where('module_name', 'write-off')
                ->where('is_active', true)
                ->where('estate_id', $asset->estate_id)
                ->first();

            if (!$workflow) {
                $workflow = ApprovalWorkflow::where('module_name', 'write-off')
                    ->where('is_active', true)
                    ->whereNull('estate_id')
                    ->first();
            }

            $firstStepEmails = [];

            if ($workflow) {
                ApprovalRequest::create([
                    'reference_table' => 'trans_assets',
                    'reference_id'    => $writeOff->id,
                    'workflow_id'     => $workflow->id,
                    'current_sequence' => 1,
                    'status'          => 'Pending',
                    'requester_id'    => Auth::id(),
                ]);

                $firstStep = $workflow->steps->where('sequence', 1)->first();
                if ($firstStep) {
                    $firstStepEmails = $firstStep->getEmailRecipients($asset->estate_id);
                }
            } else {
                // Tidak ada workflow — langsung approve & nonaktifkan aset
                $asset->update(['not_active' => true, 'update_by' => $username]);
            }

            DB::commit();

            if (!empty($firstStepEmails)) {
                $writeOff->load('asset.estate');
                $this->sendEmailIfEnabled($firstStepEmails, new WriteOffCreatedMail($writeOff));
            }

            return response()->json(['message' => 'Pengajuan write-off berhasil dibuat', 'data' => $writeOff], 201);
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

        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $writeOff->asset->estate_id === $this->currentEstateId(), 404);
        }

        // Enrich role-based steps with assignee names
        foreach ($writeOff->approvalRequests as $approvalRequest) {
            if (!$approvalRequest->workflow) continue;
            foreach ($approvalRequest->workflow->steps as $step) {
                if ($step->user_id) {
                    $step->assignee_names = $step->user ? [$step->user->name] : [];
                } elseif ($step->role_name) {
                    $step->assignee_names = User::whereHas('role', fn($q) => $q->where('name', $step->role_name))
                        ->where('not_active', false)
                        ->where('estate_id', $writeOff->asset->estate_id)
                        ->pluck('name')
                        ->toArray();
                } else {
                    $step->assignee_names = [];
                }
            }
        }

        return response()->json(['data' => $writeOff]);
    }

    public function cancel(string $id)
    {
        $writeOff = TransAsset::writeOff()->findOrFail($id);

        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $writeOff->asset->estate_id === $this->currentEstateId(), 403);
        }

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
            'approvalRequests.logs.user',
            'approvalRequests.requester',
        ])->writeOff()->findOrFail($id);

        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $writeOff->asset->estate_id === $this->currentEstateId(), 404);
        }

        $approvalReq = $writeOff->approvalRequests->first();
        if (!$approvalReq || $approvalReq->status !== 'Approved') {
            return response()->json(['message' => 'Write-off belum disetujui.'], 400);
        }

        $pdf = Pdf::loadView('pdfs.write_off_berita_acara', ['writeOff' => $writeOff, 'approvalRequest' => $approvalReq]);
        return $pdf->download('Berita_Acara_Write_Off_' . $writeOff->asset->reg_id . '.pdf');
    }
}
