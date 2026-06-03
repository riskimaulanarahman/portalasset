<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\TransCondition;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;

class TransConditionController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-conditions', only: ['index']),
            new Middleware('permission:create-asset-conditions', only: ['store']),
            new Middleware('permission:edit-asset-conditions', only: ['update']),
            new Middleware('permission:delete-asset-conditions', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = TransCondition::with(['asset.section', 'asset.estate']);

        if ($request->filled('reg_id')) {
            $query->where('reg_id', $request->reg_id);
        } else {
            // Estate scoping — join via asset
            if (!$this->isHeadOfficeUser()) {
                $estateId = $this->currentEstateId();
                $query->whereHas('asset', fn($q) => $q->where('estate_id', $estateId));
            } elseif ($request->filled('estate_id')) {
                $query->whereHas('asset', fn($q) => $q->where('estate_id', $request->estate_id));
            }
        }

        if ($request->filled('kondisi')) {
            $query->where('kondisi', $request->kondisi);
        }

        $query->orderByDesc('date')->orderByDesc('id');

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reg_id'  => 'required|exists:assets,reg_id',
            'date'    => 'required|date',
            'kondisi' => 'required|in:Good,Bad,Broken',
            'remarks' => 'nullable|string',
        ]);

        // Non-HO users may only record condition for their own estate assets
        if (!$this->isHeadOfficeUser()) {
            $asset = Asset::findOrFail($validated['reg_id']);
            abort_unless((int) $asset->estate_id === $this->currentEstateId(), 403, 'Akses ditolak untuk aset estate lain.');
        }

        $username = Auth::user()->username ?? Auth::user()->name ?? 'system';

        $condition = TransCondition::create(array_merge($validated, [
            'create_by'   => $username,
            'create_date' => now(),
        ]));

        return response()->json(['message' => 'Kondisi berhasil disimpan', 'data' => $condition->load('asset')], 201);
    }

    public function update(Request $request, TransCondition $assetCondition)
    {
        $validated = $request->validate([
            'date'    => 'sometimes|required|date',
            'kondisi' => 'sometimes|required|in:Good,Bad,Broken',
            'remarks' => 'nullable|string',
        ]);

        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $assetCondition->asset->estate_id === $this->currentEstateId(), 403);
        }

        $validated['update_by']   = Auth::user()->username ?? Auth::user()->name ?? 'system';
        $validated['update_date'] = now();

        $assetCondition->update($validated);

        return response()->json(['message' => 'Kondisi berhasil diperbarui', 'data' => $assetCondition]);
    }

    public function destroy(TransCondition $assetCondition)
    {
        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $assetCondition->asset->estate_id === $this->currentEstateId(), 403);
        }

        $assetCondition->delete();

        return response()->json(['message' => 'Kondisi berhasil dihapus']);
    }
}
