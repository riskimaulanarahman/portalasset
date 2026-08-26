<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Estate;
use App\Models\Material;
use App\Models\MaterialStockOpname;
use App\Models\MaterialStockOpnameItem;
use App\Models\Section;
use App\Models\Transaction;
use App\Models\TransAsset;
use App\Models\TransMaintenance;
use App\Models\Transfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use InteractsWithAssetOwnershipScope;

    public function getStats()
    {
        $user = auth()->user();

        abort_if($user?->not_active, 403, 'Akun anda belum diaktivasi oleh admin.');
        abort_if(!$user?->estate_id, 403, 'Silakan pilih estate terlebih dahulu.');

        $assetQuery       = $this->scopedAssetQuery();
        $materialQuery    = Material::query();
        $transactionQuery = Transaction::query()->with('material');

        if (!$this->isHeadOfficeUser()) {
            $materialQuery->where('estate_id', $this->currentEstateId());
            $transactionQuery->whereHas('material', function ($query) {
                $query->where('estate_id', $this->currentEstateId());
            });
        }

        $stockOpnameQuery = MaterialStockOpname::query()->with(['estate:id,estate,estate_id', 'section:id,section']);
        if (!$this->isHeadOfficeUser()) {
            $stockOpnameQuery->where('estate_id', $this->currentEstateId());
        }

        $stockOpnameItemQuery = MaterialStockOpnameItem::query()
            ->whereHas('opname', function ($query) {
                $query->whereBetween('opname_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
                    ->whereIn('status', ['Posted', 'Pending Approval', 'Review']);

                if (!$this->isHeadOfficeUser()) {
                    $query->where('estate_id', $this->currentEstateId());
                }
            });

        $stockOpnameStats = [
            'total' => (clone $stockOpnameQuery)->count(),
            'pending' => (clone $stockOpnameQuery)->where('status', 'Pending Approval')->count(),
            'review' => (clone $stockOpnameQuery)->where('status', 'Review')->count(),
            'posted_this_month' => (clone $stockOpnameQuery)
                ->where('status', 'Posted')
                ->whereBetween('posted_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->count(),
            'variance_value_this_month' => (float) (clone $stockOpnameQuery)
                ->whereIn('status', ['Posted', 'Pending Approval', 'Review'])
                ->whereBetween('opname_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
                ->sum('total_variance_value'),
            'recent' => (clone $stockOpnameQuery)
                ->latest('id')
                ->limit(5)
                ->get(['id', 'opname_code', 'status', 'opname_date', 'estate_id', 'section_id', 'total_variance_qty', 'total_variance_value']),
            'pending_aging' => (clone $stockOpnameQuery)
                ->where('status', 'Pending Approval')
                ->oldest('submitted_at')
                ->limit(5)
                ->get(['id', 'opname_code', 'status', 'opname_date', 'submitted_at', 'updated_at', 'estate_id', 'section_id', 'total_variance_value'])
                ->map(function (MaterialStockOpname $opname) {
                    $basisDate = $opname->submitted_at ?? $opname->updated_at;

                    return [
                        'id' => $opname->id,
                        'opname_code' => $opname->opname_code,
                        'status' => $opname->status,
                        'opname_date' => $opname->opname_date,
                        'submitted_at' => $opname->submitted_at,
                        'days_pending' => $basisDate ? (int) $basisDate->diffInDays(now()) : 0,
                        'estate' => $opname->estate,
                        'section' => $opname->section,
                        'total_variance_value' => $opname->total_variance_value,
                    ];
                })
                ->values(),
            'top_shortages_this_month' => (clone $stockOpnameItemQuery)
                ->where('variance_qty', '<', 0)
                ->select('material_code', 'material_name')
                ->selectRaw('ABS(SUM(variance_qty)) as shortage_qty')
                ->selectRaw('ABS(SUM(variance_value)) as shortage_value')
                ->groupBy('material_code', 'material_name')
                ->orderByDesc(DB::raw('ABS(SUM(variance_value))'))
                ->limit(5)
                ->get(),
        ];

        // #20 FIX: Transfer stats (scoped ke estate user)
        $transferQuery = Transfer::query();
        if (!$this->isHeadOfficeUser()) {
            $transferQuery->where(function ($q) {
                $q->where('from_estate_id', $this->currentEstateId())
                  ->orWhere('to_estate_id', $this->currentEstateId());
            });
        }
        $transferStats = [
            'total'           => (clone $transferQuery)->count(),
            'pending'         => (clone $transferQuery)->where('status', 'Pending Approval')->count(),
            'approved'        => (clone $transferQuery)->where('status', 'Approved')->count(),
            'rejected'        => (clone $transferQuery)->where('status', 'Rejected')->count(),
            'cancelled'       => (clone $transferQuery)->where('status', 'Cancelled')->count(),
            'recent'          => (clone $transferQuery)
                ->with(['fromEstate:id,estate', 'toEstate:id,estate'])
                ->latest()
                ->limit(5)
                ->get(['id', 'transfer_code', 'status', 'transfer_date', 'from_estate_id', 'to_estate_id']),
        ];

        $assetAssignmentReminderQuery = Transfer::query()
            ->with([
                'fromEstate:id,estate,estate_id',
                'toEstate:id,estate,estate_id',
                'anggotaPenerima:sap_id,nama,position',
                'items' => fn ($query) => $query
                    ->where('item_type', 'Asset')
                    ->select(['id', 'transfer_id', 'item_id', 'qty', 'notes']),
            ])
            ->where('type', 'Asset')
            ->where('status', 'Approved')
            ->whereNotNull('anggota_id');

        if (!$this->isHeadOfficeUser()) {
            $assetAssignmentReminderQuery->where('to_estate_id', $this->currentEstateId());
        }

        $assetAssignmentTransfers = $assetAssignmentReminderQuery
            ->latest('receive_date')
            ->latest('transfer_date')
            ->limit(10)
            ->get();
        $reminderAssetIds = $assetAssignmentTransfers
            ->flatMap(fn (Transfer $transfer) => $transfer->items->pluck('item_id'))
            ->unique()
            ->values();
        $reminderAssets = $reminderAssetIds->isNotEmpty()
            ? $this->applyAssetVisibilityScope(Asset::query()->with('anggota'), null)
                ->whereIn('reg_id', $reminderAssetIds)
                ->get(['reg_id', 'anggota_id', 'estate_id', 'unit_id', 'asset_department_id', 'asset_division_id'])
                ->keyBy('reg_id')
            : collect();
        $assetAssignmentReminders = $assetAssignmentTransfers
            ->flatMap(function (Transfer $transfer) use ($reminderAssets) {
                return $transfer->items
                    ->filter(function ($item) use ($transfer, $reminderAssets) {
                        $asset = $reminderAssets->get($item->item_id);

                        return $asset && $asset->anggota_id !== $transfer->anggota_id;
                    })
                    ->map(function ($item) use ($transfer, $reminderAssets) {
                        $asset = $reminderAssets->get($item->item_id);

                        return [
                    'transfer_id' => $transfer->id,
                    'transfer_code' => $transfer->transfer_code,
                    'transfer_date' => $transfer->transfer_date,
                    'receive_date' => $transfer->receive_date,
                    'asset_id' => $item->item_id,
                    'item_notes' => $item->notes,
                    'from_estate' => $transfer->fromEstate,
                    'to_estate' => $transfer->toEstate,
                    'anggota_penerima' => $transfer->anggotaPenerima,
                            'asset_anggota' => $asset?->anggota,
                        ];
                    });
            })
            ->values();

        $assetDamageReminders = $this->applyAssetVisibilityScope(
            Asset::query()->with(['estate:id,estate,estate_id', 'latestCondition'])
        )
            ->whereHas('latestCondition', fn ($query) => $query->whereIn('kondisi', ['Bad', 'Broken']))
            ->latest('update_date')
            ->limit(10)
            ->get(['reg_id', 'asset_no', 'type', 'manufacture', 'series', 'estate_id', 'unit_id', 'update_date'])
            ->map(fn (Asset $asset) => [
                'reg_id' => $asset->reg_id,
                'asset_no' => $asset->asset_no,
                'name' => implode(' - ', array_filter([$asset->type, $asset->manufacture, $asset->series])),
                'estate' => $asset->estate,
                'kondisi' => $asset->latestCondition?->kondisi,
                'remarks' => $asset->latestCondition?->remarks,
                'condition_date' => $asset->latestCondition?->date,
            ])
            ->values();

        $maintenanceReminders = TransMaintenance::query()
            ->with(['asset.estate:id,estate,estate_id'])
            ->where('status', 'Progress')
            ->whereHas('asset', fn ($query) => $this->applyAssetVisibilityScope($query))
            ->orderBy('target')
            ->limit(10)
            ->get()
            ->map(fn (TransMaintenance $maintenance) => [
                'id' => $maintenance->id,
                'reg_id' => $maintenance->reg_id,
                'asset_no' => $maintenance->asset?->asset_no,
                'estate' => $maintenance->asset?->estate,
                'kondisi' => $maintenance->kondisi,
                'target' => $maintenance->target,
                'sent_' => $maintenance->sent_,
                'keterangan' => $maintenance->keterangan,
                'status' => $maintenance->status,
            ])
            ->values();

        $writeOffPendingReminders = TransAsset::query()
            ->with(['asset.estate:id,estate,estate_id', 'approvalRequests'])
            ->writeOff()
            ->whereHas('approvalRequests', fn ($query) => $query->where('status', 'Pending'))
            ->whereHas('asset', fn ($query) => $this->applyAssetVisibilityScope($query))
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (TransAsset $writeOff) => [
                'id' => $writeOff->id,
                'reg_id' => $writeOff->reg_id,
                'asset_no' => $writeOff->asset?->asset_no,
                'estate' => $writeOff->asset?->estate,
                'kondisi' => $writeOff->kondisi,
                'keterangan' => $writeOff->keterangan,
                'date' => $writeOff->date,
                'status' => 'Pending',
            ])
            ->values();

        $assetsBySection = (clone $assetQuery)
            ->with('section:id,section')
            ->select('section_id', DB::raw('count(reg_id) as count'))
            ->groupBy('section_id')
            ->get()
            ->map(fn (Asset $asset) => [
                'label' => $asset->section?->section ?? '-',
                'count' => (int) $asset->count,
            ])
            ->values();

        $lowStockMaterials = (clone $materialQuery)
            ->whereRaw('stock <= min_stock')
            ->where('not_active', false)
            ->limit(5)
            ->get(['code', 'nama', 'stock', 'min_stock']);

        $totalAssets = (clone $assetQuery)->count();
        $totalMaterials = (clone $materialQuery)->count();
        $inactiveAssets = (clone $assetQuery)->where('not_active', true)->count();
        $recentTransactions = (clone $transactionQuery)
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();

        $totalSections = $this->isHeadOfficeUser()
            ? Section::count()
            : Section::query()
                ->whereIn('id', (clone $assetQuery)->select('section_id'))
                ->orWhereIn('id', (clone $materialQuery)->select('section_id'))
                ->count();

        $totalEstates = $this->isHeadOfficeUser()
            ? Estate::count()
            : ($this->currentEstateId() ? 1 : 0);

        return response()->json([
            'total_assets'       => $totalAssets,
            'asset_access_setup_required' => $this->userNeedsAssetOwnershipSetup($user),
            'active_assets'      => $totalAssets - $inactiveAssets,
            'total_materials'    => $totalMaterials,
            'total_transactions' => (clone $transactionQuery)->count(),
            'total_sections'     => $totalSections,
            'total_estates'      => $totalEstates,
            'recent_transactions' => $recentTransactions,
            'recent_assets'      => (clone $assetQuery)->orderBy('create_date', 'desc')->limit(5)->get(),
            'assets_by_section'  => $assetsBySection,
            'low_stock_materials' => $lowStockMaterials,
            'stock_alerts'       => (clone $materialQuery)
                ->leftJoin('units', 'materials.unit_id', '=', 'units.id')
                ->whereRaw('materials.stock <= materials.min_stock')
                ->get(['materials.code', 'materials.nama', 'materials.stock as stok', 'units.nama as unit']),
            'transfer_stats'     => $transferStats,  // #20 FIX
            'stock_opname_stats' => $stockOpnameStats,
            'asset_assignment_reminders' => $assetAssignmentReminders,
            'asset_damage_reminders' => $assetDamageReminders,
            'maintenance_reminders' => $maintenanceReminders,
            'write_off_pending_reminders' => $writeOffPendingReminders,
        ]);
    }

    private function scopedAssetQuery()
    {
        $query = Asset::query();

        return $this->applyAssetVisibilityScope($query);
    }
}
