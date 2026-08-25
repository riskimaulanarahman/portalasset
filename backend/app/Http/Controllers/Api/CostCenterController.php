<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use App\Models\Estate;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;

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
        $query = CostCenter::with('mappedEstate');

        if (!$this->isHeadOfficeUser()) {
            $query->where(function ($scoped) {
                $scoped->where('estate_id', $this->currentEstateId())
                    ->orWhere('estate', $this->currentEstateCode())
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
            'estate_id' => 'nullable|exists:estates,id',
            'estate' => 'nullable|max:10',
            'join_estate' => 'nullable|max:10',
        ]);

        $validated = $this->normalizeEstateMapping($validated, true);
        $validated['created_by'] = auth()->user()->username ?? 'system';

        $costCenter = CostCenter::create($validated);
        return response()->json(['message' => 'Cost Center created successfully', 'data' => $costCenter->load('mappedEstate')], 201);
    }

    public function show(CostCenter $costCenter)
    {
        $this->ensureCostCenterAccess($costCenter);

        return response()->json(['data' => $costCenter->load('mappedEstate')]);
    }

    public function update(Request $request, CostCenter $costCenter)
    {
        $validated = $request->validate([
            'dept' => 'sometimes|required|max:30',
            'estate_id' => 'nullable|exists:estates,id',
            'estate' => 'nullable|max:10',
            'join_estate' => 'nullable|max:10',
        ]);

        $this->ensureCostCenterAccess($costCenter);

        $validated = $this->normalizeEstateMapping($validated, false);
        $validated['update_by'] = auth()->user()->username ?? 'system';

        $costCenter->update($validated);
        return response()->json(['message' => 'Cost Center updated successfully', 'data' => $costCenter->load('mappedEstate')]);
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
            (int) $costCenter->estate_id === $this->currentEstateId()
            || $costCenter->estate === $this->currentEstateCode()
            || $costCenter->join_estate === $this->currentEstateCode(),
            404
        );
    }

    private function normalizeEstateMapping(array $data, bool $creating): array
    {
        if (!$this->isHeadOfficeUser()) {
            $estate = $this->authUser()->estate;

            if (!$estate) {
                throw ValidationException::withMessages([
                    'estate_id' => ['Estate user tidak ditemukan.'],
                ]);
            }

            $data['estate_id'] = $estate->id;
            $data['estate'] = $estate->estate_id;
            $data['join_estate'] = $estate->estate_id;

            return $data;
        }

        $estate = null;
        $hasEstateInput = array_key_exists('estate_id', $data)
            || array_key_exists('estate', $data)
            || array_key_exists('join_estate', $data);

        if (!empty($data['estate_id'])) {
            $estate = Estate::find((int) $data['estate_id']);
        } else {
            $estateCode = trim((string) ($data['join_estate'] ?? $data['estate'] ?? ''));

            if ($estateCode !== '') {
                $estate = Estate::where('estate_id', $estateCode)->first();
            }
        }

        if (!$estate && ($creating || $hasEstateInput)) {
            throw ValidationException::withMessages([
                'estate_id' => ['Estate wajib dipilih untuk Cost Center.'],
            ]);
        }

        if (!$estate) {
            return $data;
        }

        $data['estate_id'] = $estate->id;
        $data['estate'] = $estate->estate_id;
        $data['join_estate'] = $estate->estate_id;

        return $data;
    }
}
