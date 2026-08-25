<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\TransCondition;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;

class TransConditionController extends Controller implements HasMiddleware
{
    use InteractsWithAssetOwnershipScope;

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
        }
            // Estate scoping — join via asset
            $query->whereHas('asset', fn($q) => $this->applyAssetVisibilityScope(
                $q,
                $request->filled('estate_id') ? $request->integer('estate_id') : null
            ));

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

        $asset = Asset::findOrFail($validated['reg_id']);
        $this->ensureAssetVisibility($asset);

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

        $this->ensureAssetVisibility($assetCondition->asset);

        $validated['update_by']   = Auth::user()->username ?? Auth::user()->name ?? 'system';
        $validated['update_date'] = now();

        $assetCondition->update($validated);

        return response()->json(['message' => 'Kondisi berhasil diperbarui', 'data' => $assetCondition]);
    }

    public function destroy(TransCondition $assetCondition)
    {
        $this->ensureAssetVisibility($assetCondition->asset);

        $assetCondition->delete();

        return response()->json(['message' => 'Kondisi berhasil dihapus']);
    }
}
