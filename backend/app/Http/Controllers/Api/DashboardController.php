<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Estate;
use App\Models\Material;
use App\Models\Section;
use App\Models\Transaction;
use App\Models\Transfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use InteractsWithEstateScope;

    public function getStats()
    {
        $assetQuery       = $this->scopedAssetQuery();
        $materialQuery    = Material::query();
        $transactionQuery = Transaction::query()->with('material');

        if (!$this->isHeadOfficeUser()) {
            $materialQuery->where('estate_id', $this->currentEstateId());
            $transactionQuery->whereHas('material', function ($query) {
                $query->where('estate_id', $this->currentEstateId());
            });
        }

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
        ]);
    }

    private function scopedAssetQuery()
    {
        $query = Asset::query();

        if ($this->isHeadOfficeUser()) {
            return $query;
        }

        $query->where(function ($scoped) {
            $scoped->where('estate_id', $this->currentEstateId())
                ->orWhere(function ($legacy) {
                    $legacy->whereNull('estate_id')
                        ->where('unit_id', $this->currentEstateCode());
                });
        });

        return $query;
    }
}
