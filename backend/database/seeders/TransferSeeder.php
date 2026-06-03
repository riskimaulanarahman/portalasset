<?php

namespace Database\Seeders;

use App\Models\Anggota;
use App\Models\ApprovalLog;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Estate;
use App\Models\MaterialTransferHistory;
use App\Models\Transaction;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use App\Services\MaterialTransferService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TransferSeeder extends Seeder
{
    public function run(): void
    {
        $workflow = ApprovalWorkflow::where('module_name', 'Transfer')
            ->where('is_active', true)
            ->whereNull('estate_id')
            ->first();

        $ho = Estate::where('estate_id', 'HO')->first();
        $trn = Estate::where('estate_id', 'TRN')->first();
        $spu = Estate::where('estate_id', 'SPU')->first();

        $requesterHo = User::where('username', 'estate_ho')->first();
        $requesterSpu = User::where('username', 'estate_spu')->first();
        $managerTrn = User::where('username', 'manager_trn')->first();
        $financeTrn = User::where('username', 'finance_trn')->first();

        $anggotaTrn = Anggota::where('sap_id', 'MBR-TRN-001')->first();
        $anggotaHo = Anggota::where('sap_id', 'MBR-HO-001')->first();

        if (!$workflow || !$ho || !$trn || !$spu || !$requesterHo || !$requesterSpu || !$managerTrn || !$financeTrn || !$anggotaTrn || !$anggotaHo) {
            return;
        }

        $pendingManager = $this->upsertTransfer(
            [
                'transfer_code' => 'TRF-SEED-0001',
                'type' => 'Material',
                'from_estate_id' => $ho->id,
                'to_estate_id' => $trn->id,
                'anggota_id' => $anggotaTrn->sap_id,
                'status' => 'Pending Approval',
                'transfer_date' => Carbon::now()->subDays(2),
                'notes' => 'Seed transfer waiting for manager approval.',
                'created_by' => $requesterHo->name,
            ],
            [
                ['item_type' => 'Material', 'item_id' => 'MAT-HO-001', 'qty' => 2, 'notes' => 'Demo request for manager approval'],
            ]
        );

        $this->upsertApprovalRequest($pendingManager, $workflow->id, 1, 'Pending', $requesterHo->id, []);

        $pendingFinance = $this->upsertTransfer(
            [
                'transfer_code' => 'TRF-SEED-0002',
                'type' => 'Asset',
                'from_estate_id' => $spu->id,
                'to_estate_id' => $trn->id,
                'anggota_id' => $anggotaTrn->sap_id,
                'status' => 'Pending Approval',
                'transfer_date' => Carbon::now()->subDay(),
                'notes' => 'Seed transfer waiting for finance approval.',
                'created_by' => $requesterSpu->name,
            ],
            [
                ['item_type' => 'Asset', 'item_id' => 'AST-TRN-001', 'qty' => 1, 'notes' => 'Demo request for finance approval'],
            ]
        );

        $this->upsertApprovalRequest($pendingFinance, $workflow->id, 2, 'Pending', $requesterSpu->id, [
            [
                'sequence' => 1,
                'user_id' => $managerTrn->id,
                'action' => 'Approved',
                'comment' => 'Approved by seeded manager.',
                'created_at' => Carbon::now()->subHours(18),
                'updated_at' => Carbon::now()->subHours(18),
            ],
        ]);

        $approvedTransfer = $this->upsertTransfer(
            [
                'transfer_code' => 'TRF-SEED-0003',
                'type' => 'Material',
                'from_estate_id' => $ho->id,
                'to_estate_id' => $trn->id,
                'anggota_id' => $anggotaTrn->sap_id,
                'status' => 'Approved',
                'transfer_date' => Carbon::now()->subDays(3),
                'receive_date' => Carbon::now()->subDays(1),
                'notes' => 'Seed transfer fully approved.',
                'created_by' => $requesterHo->name,
            ],
            [
                ['item_type' => 'Material', 'item_id' => 'MAT-HO-003', 'qty' => 4, 'notes' => 'Demo approved transfer'],
            ]
        );

        $this->upsertApprovalRequest($approvedTransfer, $workflow->id, 2, 'Approved', $requesterHo->id, [
            [
                'sequence' => 1,
                'user_id' => $managerTrn->id,
                'action' => 'Approved',
                'comment' => 'Manager approval for approved demo.',
                'created_at' => Carbon::now()->subDays(3)->addHours(2),
                'updated_at' => Carbon::now()->subDays(3)->addHours(2),
            ],
            [
                'sequence' => 2,
                'user_id' => $financeTrn->id,
                'action' => 'Approved',
                'comment' => 'Finance approval for approved demo.',
                'created_at' => Carbon::now()->subDays(2)->addHours(5),
                'updated_at' => Carbon::now()->subDays(2)->addHours(5),
            ],
        ]);

        MaterialTransferHistory::where('transfer_id', $approvedTransfer->id)->delete();
        Transaction::where('keterangan', 'like', 'Transfer ' . $approvedTransfer->transfer_code . ' %')->delete();
        app(MaterialTransferService::class)->applyTransfer($approvedTransfer, 'Seeder');
    }

    private function upsertTransfer(array $transferData, array $items): Transfer
    {
        $transfer = Transfer::updateOrCreate(
            ['transfer_code' => $transferData['transfer_code']],
            $transferData
        );

        TransferItem::where('transfer_id', $transfer->id)->delete();

        foreach ($items as $item) {
            TransferItem::create(array_merge($item, ['transfer_id' => $transfer->id]));
        }

        return $transfer;
    }

    private function upsertApprovalRequest(Transfer $transfer, int $workflowId, int $currentSequence, string $status, int $requesterId, array $logs): void
    {
        $approvalRequest = ApprovalRequest::updateOrCreate(
            [
                'reference_table' => 'transfers',
                'reference_id' => $transfer->id,
            ],
            [
                'workflow_id' => $workflowId,
                'current_sequence' => $currentSequence,
                'status' => $status,
                'requester_id' => $requesterId,
            ]
        );

        ApprovalLog::where('approval_request_id', $approvalRequest->id)->delete();

        foreach ($logs as $log) {
            ApprovalLog::create(array_merge($log, [
                'approval_request_id' => $approvalRequest->id,
            ]));
        }
    }
}
