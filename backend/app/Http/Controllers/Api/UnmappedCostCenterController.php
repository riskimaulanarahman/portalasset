<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use App\Models\Estate;
use App\Models\UnmappedCostCenter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UnmappedCostCenterController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-cost-centers', only: ['index', 'show']),
            new Middleware('permission:create-cost-centers', only: ['resolve']),
        ];
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,resolved,ignored,all',
        ]);

        $query = UnmappedCostCenter::with('resolvedBy:id,name,username')
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderByDesc('last_seen_at')
            ->orderByDesc('created_at');

        $status = $validated['status'] ?? UnmappedCostCenter::STATUS_PENDING;

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(UnmappedCostCenter $unmappedCostCenter)
    {
        return response()->json([
            'data' => $unmappedCostCenter->load('resolvedBy:id,name,username'),
        ]);
    }

    public function resolve(Request $request, UnmappedCostCenter $unmappedCostCenter)
    {
        $validated = $request->validate([
            'estate_id' => 'required|exists:estates,id',
            'dept' => 'required|string|max:30',
        ]);

        $costCenterCode = trim((string) $unmappedCostCenter->cost_center);

        if (mb_strlen($costCenterCode) > 10) {
            throw ValidationException::withMessages([
                'cost_center' => ['Kode Cost Center melebihi batas 10 karakter untuk master Cost Center.'],
            ]);
        }

        $estate = Estate::findOrFail($validated['estate_id']);
        $actor = $request->user();

        return DB::transaction(function () use ($unmappedCostCenter, $validated, $costCenterCode, $estate, $actor) {
            $costCenter = CostCenter::where('cost_center', $costCenterCode)->first();
            $created = false;

            if (!$costCenter) {
                $costCenter = CostCenter::create([
                    'cost_center' => $costCenterCode,
                    'dept' => $validated['dept'],
                    'estate' => $estate->estate_id,
                    'join_estate' => $estate->estate_id,
                    'estate_id' => $estate->id,
                    'created_by' => $actor->username ?? 'system',
                ]);
                $created = true;
            } elseif (!$costCenter->estate_id) {
                $costCenter->update([
                    'estate' => $estate->estate_id,
                    'join_estate' => $estate->estate_id,
                    'estate_id' => $estate->id,
                    'update_by' => $actor->username ?? 'system',
                ]);
            }

            $unmappedCostCenter->update([
                'status' => UnmappedCostCenter::STATUS_RESOLVED,
                'resolved_by' => $actor->id,
                'resolved_at' => now(),
            ]);

            return response()->json([
                'message' => 'Cost Center berhasil dimapping ke Estate.',
                'data' => [
                    'cost_center' => $costCenter,
                    'unmapped_cost_center' => $unmappedCostCenter->fresh('resolvedBy:id,name,username'),
                ],
            ], $created ? 201 : 200);
        });
    }
}
