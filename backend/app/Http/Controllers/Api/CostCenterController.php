<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CostCenterController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-cost-centers', only: ['index', 'show']),
            new Middleware('permission:create-cost-centers', only: ['store']),
            new Middleware('permission:edit-cost-centers', only: ['update']),
            new Middleware('permission:delete-cost-centers', only: ['destroy']),
        ];
    }

    public function index()
    {
        $query = CostCenter::query();

        if (!$this->isHeadOfficeUser()) {
            $query->where(function ($scoped) {
                $scoped->where('estate', $this->currentEstateCode())
                    ->orWhere('join_estate', $this->currentEstateCode());
            });
        }

        $costCenters = $query->get();
        return response()->json(['data' => $costCenters]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cost_center' => 'required|max:10|unique:cost_centers,cost_center',
            'dept' => 'required|max:30',
            'estate' => 'required|max:10',
            'join_estate' => 'nullable|max:10',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate'] = $this->currentEstateCode();
            $validated['join_estate'] = $validated['join_estate'] ?? $this->currentEstateCode();
        }

        $validated['created_by'] = auth()->user()->username ?? 'system';

        $costCenter = CostCenter::create($validated);
        return response()->json(['message' => 'Cost Center created successfully', 'data' => $costCenter], 201);
    }

    public function show(CostCenter $costCenter)
    {
        $this->ensureCostCenterAccess($costCenter);

        return response()->json(['data' => $costCenter]);
    }

    public function update(Request $request, CostCenter $costCenter)
    {
        $validated = $request->validate([
            'dept' => 'sometimes|required|max:30',
            'estate' => 'sometimes|required|max:10',
            'join_estate' => 'nullable|max:10',
        ]);

        $this->ensureCostCenterAccess($costCenter);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate'] = $this->currentEstateCode();
            $validated['join_estate'] = $validated['join_estate'] ?? $costCenter->join_estate;
        }

        $validated['update_by'] = auth()->user()->username ?? 'system';

        $costCenter->update($validated);
        return response()->json(['message' => 'Cost Center updated successfully', 'data' => $costCenter]);
    }

    public function destroy(CostCenter $costCenter)
    {
        $this->ensureCostCenterAccess($costCenter);

        $costCenter->delete();
        return response()->json(['message' => 'Cost Center deleted successfully']);
    }

    private function ensureCostCenterAccess(CostCenter $costCenter): void
    {
        if ($this->isHeadOfficeUser()) {
            return;
        }

        abort_unless(
            $costCenter->estate === $this->currentEstateCode() || $costCenter->join_estate === $this->currentEstateCode(),
            404
        );
    }
}
