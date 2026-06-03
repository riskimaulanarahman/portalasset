<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Material;
use App\Models\Transfer;
use Illuminate\Http\Request;

/**
 * #16 FIX: Global search endpoint — mencari di Asset, Material, dan Transfer
 * secara bersamaan dengan scoping estate agar HO dan estate user mendapat
 * hasil yang sesuai hak aksesnya.
 *
 * GET /api/search?q=keyword&limit=10
 */
class SearchController extends Controller
{
    use InteractsWithEstateScope;

    public function search(Request $request)
    {
        $request->validate([
            'q'     => 'required|string|min:2|max:100',
            'limit' => 'nullable|integer|min:1|max:30',
        ]);

        $q       = $request->q;
        $limit   = (int) $request->get('limit', 10);
        $results = [];

        // ── Assets ────────────────────────────────────────────────────────────
        $assetQuery = Asset::select(['reg_id', 'asset_no', 'type', 'manufacture', 'estate_id'])
            ->where(function ($query) use ($q) {
                $query->where('reg_id', 'like', "%{$q}%")
                      ->orWhere('asset_no', 'like', "%{$q}%")
                      ->orWhere('type', 'like', "%{$q}%")
                      ->orWhere('manufacture', 'like', "%{$q}%");
            })
            ->limit($limit);

        if (!$this->isHeadOfficeUser()) {
            $assetQuery->where('estate_id', $this->currentEstateId());
        }

        foreach ($assetQuery->get() as $asset) {
            $results[] = [
                'type'     => 'asset',
                'id'       => $asset->reg_id,
                'label'    => "{$asset->reg_id} — {$asset->type} {$asset->manufacture}",
                'subtitle' => 'Asset',
                'url'      => "/assets/{$asset->reg_id}",
            ];
        }

        // ── Materials ─────────────────────────────────────────────────────────
        $materialQuery = Material::select(['code', 'nama', 'estate_id'])
            ->where(function ($query) use ($q) {
                $query->where('code', 'like', "%{$q}%")
                      ->orWhere('nama', 'like', "%{$q}%");
            })
            ->limit($limit);

        if (!$this->isHeadOfficeUser()) {
            $materialQuery->where('estate_id', $this->currentEstateId());
        }

        foreach ($materialQuery->get() as $material) {
            $results[] = [
                'type'     => 'material',
                'id'       => $material->code,
                'label'    => "{$material->code} — {$material->nama}",
                'subtitle' => 'Material',
                'url'      => '/materials',
            ];
        }

        // ── Transfers ─────────────────────────────────────────────────────────
        $transferQuery = Transfer::select(['id', 'transfer_code', 'status', 'to_estate_id'])
            ->where('transfer_code', 'like', "%{$q}%")
            ->limit($limit);

        if (!$this->isHeadOfficeUser()) {
            $transferQuery->where(function ($query) {
                $query->where('from_estate_id', $this->currentEstateId())
                      ->orWhere('to_estate_id', $this->currentEstateId());
            });
        }

        foreach ($transferQuery->get() as $transfer) {
            $results[] = [
                'type'     => 'transfer',
                'id'       => $transfer->id,
                'label'    => "{$transfer->transfer_code}",
                'subtitle' => "Transfer · {$transfer->status}",
                'url'      => '/transfers',
            ];
        }

        return response()->json(['data' => $results]);
    }
}
