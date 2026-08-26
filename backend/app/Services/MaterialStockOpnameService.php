<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Estate;
use App\Models\Material;
use App\Models\MaterialStockOpname;
use App\Models\MaterialStockOpnameItem;
use App\Models\MaterialStockOpnameLog;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaterialStockOpnameService
{
    private const ACTIVE_STATUSES = ['Draft', 'Counting', 'Review', 'Pending Approval'];

    public function createSession(array $payload, User $actor): MaterialStockOpname
    {
        return DB::transaction(function () use ($payload, $actor) {
            $this->ensureNoActiveSession((int) $payload['estate_id'], $payload['section_id'] ?? null);

            $estate = Estate::findOrFail($payload['estate_id']);
            $opname = MaterialStockOpname::create([
                'opname_code' => $this->generateCode($estate, $payload['opname_date']),
                'estate_id' => $payload['estate_id'],
                'section_id' => $payload['section_id'] ?? null,
                'opname_date' => $payload['opname_date'],
                'snapshot_at' => now(),
                'status' => 'Draft',
                'notes' => $payload['notes'] ?? null,
                'created_by' => $this->actorName($actor),
            ]);

            $this->writeLog($opname, 'created', $actor, null, [
                'estate_id' => $opname->estate_id,
                'section_id' => $opname->section_id,
                'opname_date' => $opname->opname_date?->toDateString(),
            ]);

            $this->generateSnapshot($opname, $actor);

            return $opname->fresh(['estate', 'section', 'items']);
        });
    }

    public function generateSnapshot(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        return DB::transaction(function () use ($opname, $actor) {
            $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

            if (!in_array($lockedOpname->status, ['Draft'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Snapshot hanya dapat dibuat ulang saat status Draft.'],
                ]);
            }

            if ($lockedOpname->items()->whereNotNull('physical_stock')->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Snapshot tidak dapat dibuat ulang setelah hasil hitung fisik diisi.'],
                ]);
            }

            $lockedOpname->items()->delete();

            $materials = Material::query()
                ->where('estate_id', $lockedOpname->estate_id)
                ->when($lockedOpname->section_id, fn ($query) => $query->where('section_id', $lockedOpname->section_id))
                ->where(function ($query) {
                    $query->where('not_active', false)
                        ->orWhere('stock', '<>', 0);
                })
                ->orderBy('code')
                ->get();

            foreach ($materials as $material) {
                MaterialStockOpnameItem::create([
                    'opname_id' => $lockedOpname->id,
                    'material_code' => $material->code,
                    'material_name' => $material->nama,
                    'category_id' => $material->category_id,
                    'unit_id' => $material->unit_id,
                    'section_id' => $material->section_id,
                    'system_stock_snapshot' => $material->stock ?? 0,
                    'price_snapshot' => $material->price,
                    'status' => 'Open',
                ]);
            }

            $lockedOpname->update([
                'snapshot_at' => now(),
                'total_items' => $materials->count(),
                'counted_items' => 0,
                'total_variance_qty' => 0,
                'total_variance_value' => 0,
            ]);

            $this->writeLog($lockedOpname, 'snapshot_generated', $actor, null, [
                'total_items' => $materials->count(),
            ]);

            return $lockedOpname->fresh(['estate', 'section', 'items']);
        });
    }

    public function startCounting(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        if ($opname->status !== 'Draft') {
            throw ValidationException::withMessages([
                'status' => ['Counting hanya dapat dimulai dari status Draft.'],
            ]);
        }

        if ($opname->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Tidak ada item material untuk dihitung.'],
            ]);
        }

        $opname->update(['status' => 'Counting']);
        $this->writeLog($opname, 'counting_started', $actor);

        return $opname->fresh(['estate', 'section', 'items']);
    }

    public function updateCount(MaterialStockOpnameItem $item, array $payload, User $actor): MaterialStockOpnameItem
    {
        return DB::transaction(function () use ($item, $payload, $actor) {
            $lockedItem = MaterialStockOpnameItem::whereKey($item->id)->lockForUpdate()->firstOrFail();
            $opname = MaterialStockOpname::whereKey($lockedItem->opname_id)->lockForUpdate()->firstOrFail();

            if (!in_array($opname->status, ['Draft', 'Counting', 'Review'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Hasil hitung tidak dapat diubah pada status saat ini.'],
                ]);
            }

            if ($opname->status === 'Draft') {
                $opname->update(['status' => 'Counting']);
            }

            $oldValues = $lockedItem->only([
                'physical_stock',
                'recount_stock',
                'final_physical_stock',
                'variance_qty',
                'variance_value',
                'status',
                'variance_reason',
                'condition_note',
            ]);

            $physicalStock = (float) $payload['physical_stock'];
            $recountStock = array_key_exists('recount_stock', $payload) && $payload['recount_stock'] !== null
                ? (float) $payload['recount_stock']
                : null;
            $finalPhysicalStock = $recountStock ?? $physicalStock;
            $varianceQty = $finalPhysicalStock - (float) $lockedItem->system_stock_snapshot;
            $price = $lockedItem->price_snapshot !== null ? (float) $lockedItem->price_snapshot : 0.0;

            $lockedItem->update([
                'physical_stock' => $physicalStock,
                'recount_stock' => $recountStock,
                'final_physical_stock' => $finalPhysicalStock,
                'variance_qty' => $varianceQty,
                'variance_value' => round($varianceQty * $price, 2),
                'variance_type' => $this->varianceType($varianceQty),
                'status' => $recountStock === null ? 'Counted' : 'Reviewed',
                'variance_reason' => $payload['variance_reason'] ?? $lockedItem->variance_reason,
                'condition_note' => $payload['condition_note'] ?? $lockedItem->condition_note,
                'counted_by' => $lockedItem->counted_by ?: $this->actorName($actor),
                'counted_at' => $lockedItem->counted_at ?: now(),
            ]);

            $this->updateSummary($opname);
            $this->writeLog($opname, 'item_counted', $actor, $lockedItem, $lockedItem->fresh()->toArray(), $oldValues);

            return $lockedItem->fresh(['material', 'unit', 'section']);
        });
    }

    public function markNeedRecount(MaterialStockOpnameItem $item, string $reason, User $actor): MaterialStockOpnameItem
    {
        $opname = $item->opname;

        if (!in_array($opname->status, ['Counting', 'Review'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Recount hanya dapat diminta pada status Counting atau Review.'],
            ]);
        }

        $item->update([
            'status' => 'Need Recount',
            'variance_reason' => $reason,
            'reviewed_by' => $this->actorName($actor),
            'reviewed_at' => now(),
        ]);

        $this->writeLog($opname, 'recount_requested', $actor, $item, ['reason' => $reason]);

        return $item->fresh(['material', 'unit', 'section']);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array{imported: int, opname: MaterialStockOpname}
     */
    public function importCounts(MaterialStockOpname $opname, array $rows, User $actor): array
    {
        if (count($rows) === 0) {
            throw ValidationException::withMessages([
                'file' => ['File import tidak memiliki baris data.'],
            ]);
        }

        return DB::transaction(function () use ($opname, $rows, $actor) {
            $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

            if (!in_array($lockedOpname->status, ['Draft', 'Counting', 'Review'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Import hasil hitung tidak dapat dilakukan pada status saat ini.'],
                ]);
            }

            $materialCodes = [];
            foreach ($rows as $index => $row) {
                $line = (int) ($row['_line'] ?? ($index + 2));
                $materialCode = trim((string) ($row['material_code'] ?? ''));
                if ($materialCode === '') {
                    throw ValidationException::withMessages([
                        'file' => ["Baris {$line}: material_code wajib diisi."],
                    ]);
                }

                if (isset($materialCodes[$materialCode])) {
                    throw ValidationException::withMessages([
                        'file' => ["Baris {$line}: material_code {$materialCode} duplikat."],
                    ]);
                }
                $materialCodes[$materialCode] = true;

                if (!is_numeric($row['physical_stock'] ?? null) || (float) $row['physical_stock'] < 0) {
                    throw ValidationException::withMessages([
                        'file' => ["Baris {$line}: physical_stock wajib numeric dan minimal 0."],
                    ]);
                }

                if (($row['recount_stock'] ?? '') !== '' && (!is_numeric($row['recount_stock']) || (float) $row['recount_stock'] < 0)) {
                    throw ValidationException::withMessages([
                        'file' => ["Baris {$line}: recount_stock harus numeric dan minimal 0 jika diisi."],
                    ]);
                }
            }

            $items = MaterialStockOpnameItem::where('opname_id', $lockedOpname->id)
                ->whereIn('material_code', array_keys($materialCodes))
                ->get()
                ->keyBy('material_code');

            foreach (array_keys($materialCodes) as $materialCode) {
                if (!$items->has($materialCode)) {
                    throw ValidationException::withMessages([
                        'file' => ["Material {$materialCode} tidak ada di snapshot opname ini."],
                    ]);
                }
            }

            $imported = 0;
            foreach ($rows as $row) {
                $item = $items->get(trim((string) $row['material_code']));

                $this->updateCount($item, [
                    'physical_stock' => (float) $row['physical_stock'],
                    'recount_stock' => ($row['recount_stock'] ?? '') === '' ? null : (float) $row['recount_stock'],
                    'variance_reason' => trim((string) ($row['variance_reason'] ?? '')),
                    'condition_note' => trim((string) ($row['condition_note'] ?? '')),
                ], $actor);

                $imported++;
            }

            $this->writeLog($lockedOpname, 'counts_imported', $actor, null, [
                'imported' => $imported,
            ]);

            return [
                'imported' => $imported,
                'opname' => $lockedOpname->fresh(['estate', 'section', 'items']),
            ];
        });
    }

    public function submitReview(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        return DB::transaction(function () use ($opname, $actor) {
            $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

            if (!in_array($lockedOpname->status, ['Counting', 'Review'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Sesi hanya dapat direview setelah counting dimulai.'],
                ]);
            }

            if ($lockedOpname->items()->where('status', 'Open')->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Masih ada item yang belum dihitung.'],
                ]);
            }

            if ($lockedOpname->items()->where('status', 'Need Recount')->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Masih ada item yang membutuhkan recount.'],
                ]);
            }

            $missingReason = $lockedOpname->items()
                ->get()
                ->contains(fn (MaterialStockOpnameItem $item) => $this->requiresVarianceReason($item)
                    && trim((string) $item->variance_reason) === '');

            if ($missingReason) {
                throw ValidationException::withMessages([
                    'variance_reason' => ['Alasan wajib diisi untuk semua item yang memiliki selisih.'],
                ]);
            }

            $lockedOpname->items()
                ->whereIn('status', ['Counted', 'Reviewed'])
                ->update([
                    'status' => 'Reviewed',
                    'reviewed_by' => $this->actorName($actor),
                    'reviewed_at' => now(),
                ]);

            $lockedOpname->update([
                'status' => 'Review',
                'submitted_by' => $this->actorName($actor),
                'submitted_at' => now(),
            ]);

            $this->updateSummary($lockedOpname);
            $this->writeLog($lockedOpname, 'review_submitted', $actor);

            return $lockedOpname->fresh(['estate', 'section', 'items']);
        });
    }

    public function submitForApproval(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        return DB::transaction(function () use ($opname, $actor) {
            $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

            if ($lockedOpname->status !== 'Review') {
                throw ValidationException::withMessages([
                    'status' => ['Sesi hanya dapat diajukan approval setelah status Review.'],
                ]);
            }

            if ($lockedOpname->items()->whereIn('status', ['Open', 'Need Recount', 'Counted'])->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Semua item harus selesai direview sebelum diajukan approval.'],
                ]);
            }

            if ($lockedOpname->approvalRequests()->where('status', 'Pending')->exists()) {
                throw ValidationException::withMessages([
                    'approval' => ['Sesi ini sudah memiliki approval yang masih pending.'],
                ]);
            }

            $workflow = $this->resolveWorkflow((int) $lockedOpname->estate_id);
            $firstStep = $workflow->steps->where('sequence', 1)->first();

            if (!$firstStep) {
                throw ValidationException::withMessages([
                    'workflow' => ['Workflow stock opname belum memiliki step approval pertama.'],
                ]);
            }

            if (!$this->workflowStepHasActiveApprover($firstStep, (int) $lockedOpname->estate_id)) {
                throw ValidationException::withMessages([
                    'workflow' => ['Workflow stock opname tidak memiliki approver aktif untuk estate ini.'],
                ]);
            }

            ApprovalRequest::create([
                'reference_table' => 'material_stock_opnames',
                'reference_id' => $lockedOpname->id,
                'workflow_id' => $workflow->id,
                'current_sequence' => $firstStep->sequence,
                'status' => 'Pending',
                'requester_id' => $actor->id,
            ]);

            $lockedOpname->update([
                'status' => 'Pending Approval',
                'submitted_by' => $this->actorName($actor),
                'submitted_at' => now(),
            ]);

            $this->writeLog($lockedOpname, 'approval_submitted', $actor, null, [
                'workflow_id' => $workflow->id,
                'first_sequence' => $firstStep->sequence,
            ]);

            return $lockedOpname->fresh(['estate', 'section', 'items', 'approvalRequests.workflow.steps']);
        });
    }

    public function postAdjustments(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        return DB::transaction(function () use ($opname, $actor) {
            $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

            if ($lockedOpname->posted_at) {
                return $lockedOpname->fresh(['estate', 'section', 'items.transaction']);
            }

            if ($lockedOpname->status !== 'Pending Approval') {
                throw ValidationException::withMessages([
                    'status' => ['Adjustment hanya dapat diposting setelah approval final.'],
                ]);
            }

            $this->ensureSegregationOfDuties($lockedOpname, $actor);

            if ($lockedOpname->items()->whereIn('status', ['Open', 'Need Recount', 'Counted'])->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Semua item harus sudah direview sebelum posting.'],
                ]);
            }

            foreach ($lockedOpname->items()->orderBy('id')->get() as $item) {
                $material = Material::where('code', $item->material_code)->lockForUpdate()->firstOrFail();
                $before = (float) $material->stock;
                $variance = (float) $item->variance_qty;
                $after = $before + $variance;

                if ($after < 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Posting membuat stok {$material->code} menjadi negatif."],
                    ]);
                }

                $transaction = null;
                if ($variance !== 0.0) {
                    $transaction = Transaction::create([
                        'date' => $lockedOpname->opname_date,
                        'code' => $material->code,
                        'type' => $variance > 0 ? 'IN' : 'OUT',
                        'qty' => abs($variance),
                        'section' => $material->section?->section,
                        'estate' => $material->estate?->estate_id,
                        'keterangan' => "Stock opname {$lockedOpname->opname_code}. System {$item->system_stock_snapshot}, fisik {$item->final_physical_stock}.",
                        'create_by' => $this->actorName($actor),
                        'create_date' => now(),
                    ]);

                    $material->update([
                        'stock' => $after,
                        'update_by' => $this->actorName($actor),
                        'update_date' => now(),
                    ]);
                }

                $item->update([
                    'status' => 'Posted',
                    'stock_before_posting' => $before,
                    'stock_after_posting' => $after,
                    'transaction_id' => $transaction?->id,
                ]);
            }

            $lockedOpname->update([
                'status' => 'Posted',
                'posted_by' => $this->actorName($actor),
                'posted_at' => now(),
            ]);

            $this->updateSummary($lockedOpname);
            $this->writeLog($lockedOpname, 'adjustments_posted', $actor);

            return $lockedOpname->fresh(['estate', 'section', 'items.transaction']);
        });
    }

    public function cancel(MaterialStockOpname $opname, User $actor): MaterialStockOpname
    {
        if ($opname->posted_at || $opname->status === 'Posted') {
            throw ValidationException::withMessages([
                'status' => ['Sesi yang sudah posted tidak dapat dibatalkan.'],
            ]);
        }

        $opname->update(['status' => 'Cancelled']);
        $this->writeLog($opname, 'cancelled', $actor);

        return $opname->fresh(['estate', 'section', 'items']);
    }

    private function ensureNoActiveSession(int $estateId, string|int|null $sectionId): void
    {
        $exists = MaterialStockOpname::where('estate_id', $estateId)
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where(function ($query) use ($sectionId) {
                if ($sectionId) {
                    $query->where('section_id', $sectionId);
                } else {
                    $query->whereNull('section_id');
                }
            })
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'opname' => ['Masih ada sesi stock opname aktif untuk estate dan section yang sama.'],
            ]);
        }
    }

    private function resolveWorkflow(int $estateId): ApprovalWorkflow
    {
        $workflow = ApprovalWorkflow::with('steps')
            ->where('module_name', 'Material Stock Opname')
            ->where('is_active', true)
            ->where('estate_id', $estateId)
            ->first();

        if (!$workflow) {
            $workflow = ApprovalWorkflow::with('steps')
                ->where('module_name', 'Material Stock Opname')
                ->where('is_active', true)
                ->whereNull('estate_id')
                ->first();
        }

        if (!$workflow) {
            throw ValidationException::withMessages([
                'workflow' => ['Workflow stock opname aktif untuk estate atau global belum dikonfigurasi.'],
            ]);
        }

        return $workflow;
    }

    private function workflowStepHasActiveApprover($step, int $estateId): bool
    {
        if ($step->user_id) {
            return User::whereKey($step->user_id)
                ->where('not_active', false)
                ->where('estate_id', $estateId)
                ->exists();
        }

        if ($step->role_name) {
            return User::whereHas('role', fn ($query) => $query->where('name', $step->role_name))
                ->where('not_active', false)
                ->where('estate_id', $estateId)
                ->exists();
        }

        return false;
    }

    private function ensureSegregationOfDuties(MaterialStockOpname $opname, User $actor): void
    {
        $actorName = $this->actorName($actor);
        $headerActors = array_filter([
            $opname->created_by,
            $opname->submitted_by,
        ]);

        if (in_array($actorName, $headerActors, true)) {
            throw ValidationException::withMessages([
                'approval' => ['Approver final tidak boleh menjadi pembuat atau submitter stock opname yang sama.'],
            ]);
        }

        if ($opname->items()
            ->where(function ($query) use ($actorName) {
                $query->where('counted_by', $actorName)
                    ->orWhere('reviewed_by', $actorName);
            })
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'approval' => ['Approver final tidak boleh menjadi counter atau reviewer item pada stock opname yang sama.'],
            ]);
        }
    }

    private function requiresVarianceReason(MaterialStockOpnameItem $item): bool
    {
        if (!$this->settingBoolean('stock_opname_require_reason', true)) {
            return false;
        }

        $varianceQty = abs((float) $item->variance_qty);
        $varianceValue = abs((float) $item->variance_value);
        if ($varianceQty === 0.0 && $varianceValue === 0.0) {
            return false;
        }

        $qtyTolerance = $this->settingFloat('stock_opname_qty_tolerance', 0.0);
        $valueTolerance = $this->settingFloat('stock_opname_value_tolerance', 0.0);

        return $varianceQty > $qtyTolerance || $varianceValue > $valueTolerance;
    }

    private function settingFloat(string $key, float $default): float
    {
        return (float) Setting::get($key, $default);
    }

    private function settingBoolean(string $key, bool $default): bool
    {
        return filter_var(Setting::get($key, $default), FILTER_VALIDATE_BOOLEAN);
    }

    private function updateSummary(MaterialStockOpname $opname): void
    {
        $summary = $opname->items()
            ->selectRaw('COUNT(*) as total_items')
            ->selectRaw("SUM(CASE WHEN physical_stock IS NOT NULL OR status IN ('Skipped', 'Posted') THEN 1 ELSE 0 END) as counted_items")
            ->selectRaw('COALESCE(SUM(variance_qty), 0) as total_variance_qty')
            ->selectRaw('COALESCE(SUM(variance_value), 0) as total_variance_value')
            ->first();

        $opname->update([
            'total_items' => (int) ($summary->total_items ?? 0),
            'counted_items' => (int) ($summary->counted_items ?? 0),
            'total_variance_qty' => (float) ($summary->total_variance_qty ?? 0),
            'total_variance_value' => (float) ($summary->total_variance_value ?? 0),
        ]);
    }

    private function generateCode(Estate $estate, string $opnameDate): string
    {
        $datePart = str_replace('-', '', $opnameDate);
        $prefix = 'SOP-' . strtoupper($estate->estate_id) . '-' . $datePart . '-';
        $lastNumber = MaterialStockOpname::withTrashed()
            ->where('opname_code', 'like', $prefix . '%')
            ->pluck('opname_code')
            ->map(function (string $code) use ($prefix) {
                $suffix = substr($code, strlen($prefix));
                return ctype_digit($suffix) ? (int) $suffix : 0;
            })
            ->max() ?? 0;

        do {
            $lastNumber++;
            $code = $prefix . str_pad((string) $lastNumber, 4, '0', STR_PAD_LEFT);
        } while (MaterialStockOpname::withTrashed()->where('opname_code', $code)->exists());

        return $code;
    }

    private function varianceType(float $varianceQty): string
    {
        if ($varianceQty > 0) {
            return 'Surplus';
        }

        if ($varianceQty < 0) {
            return 'Shortage';
        }

        return 'Match';
    }

    private function actorName(User $actor): string
    {
        return mb_substr($actor->username ?? $actor->name ?? 'system', 0, 100);
    }

    private function writeLog(
        MaterialStockOpname $opname,
        string $action,
        User $actor,
        ?MaterialStockOpnameItem $item = null,
        ?array $newValues = null,
        ?array $oldValues = null,
        ?string $notes = null
    ): void {
        MaterialStockOpnameLog::create([
            'opname_id' => $opname->id,
            'item_id' => $item?->id,
            'action' => $action,
            'actor' => $this->actorName($actor),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'notes' => $notes,
        ]);
    }
}
