<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TransactionController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-transactions', only: ['index', 'show']),
            new Middleware('permission:create-transactions', only: ['store']),
            new Middleware('permission:edit-transactions', only: ['update']),
            new Middleware('permission:delete-transactions', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = Transaction::query()
            ->with('material')
            ->when($request->input('estate_id') || !$this->isHeadOfficeUser(), function (\Illuminate\Database\Eloquent\Builder $q) use ($request) {
                $estateId = $this->isHeadOfficeUser()
                    ? (int) $request->input('estate_id')
                    : $this->currentEstateId();

                $q->whereHas('material', function ($materialQuery) use ($estateId) {
                    $materialQuery->where('estate_id', $estateId);
                });
            })
            ->when($request->input('type'), function (\Illuminate\Database\Eloquent\Builder $q, $type) {
                $q->where(function ($sq) use ($type) {
                    $sq->where('type', $type);
                });
            })
            ->when($request->input('section'), function (\Illuminate\Database\Eloquent\Builder $q, $section) {
                $q->where(function ($sq) use ($section) {
                    $sq->where('section', $section);
                });
            })
            ->when($request->input('search'), function ($q, $search) {
                $q->where(function ($sq) use ($search) {
                    $sq->where('code', 'like', "%{$search}%")
                      ->orWhere('uav_id', 'like', "%{$search}%")
                      ->orWhere('nama2', 'like', "%{$search}%");
                });
            });

        return response()->json($query->orderBy('date', 'desc')->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'code' => 'required|exists:materials,code',
            'type' => 'required|in:IN,OUT',
            'qty' => 'required|numeric|min:0.1',
            'uav_id' => 'nullable|max:25',
            'sap1' => 'nullable|max:15',
            'nama1' => 'nullable|max:50',
            'sap2' => 'nullable|max:15',
            'nama2' => 'nullable|max:50',
            'section' => 'nullable|max:25',
            'estate' => 'nullable|max:50',
            'keterangan' => 'nullable',
            'store' => 'nullable|max:10',
        ]);

        return DB::transaction(function () use ($validated) {
            $material = Material::with('estate')->where('code', $validated['code'])->lockForUpdate()->first();

            abort_if(!$material, 404);
            $this->ensureEstateAccess($material->estate_id);

            if ($validated['type'] === 'OUT' && $material->stock < $validated['qty']) {
                return response()->json([
                    'message' => 'Insufficient stock',
                    'errors' => ['qty' => ["Current stock is {$material->stock}, cannot deduct {$validated['qty']}"]]
                ], 422);
            }

            $validated['estate'] = $material->estate?->estate_id ?? $this->currentEstateCode();
            $validated['create_by'] = Auth::user()->username ?? 'system';
            $validated['create_date'] = now();

            $transaction = Transaction::create($validated);

            // Update Material Stock
            if ($validated['type'] === 'IN') {
                $material->increment('stock', $validated['qty']);
            } else {
                $material->decrement('stock', $validated['qty']);
            }

            return response()->json([
                'message' => 'Transaction recorded successfully',
                'data' => $transaction->load('material')
            ], 201);
        });
    }

    public function show(Transaction $transaction)
    {
        $transaction->load('material.estate');
        $this->ensureEstateAccess($transaction->material?->estate_id);

        return response()->json(['data' => $transaction->load('material')]);
    }

    public function destroy(Transaction $transaction)
    {
        return DB::transaction(function () use ($transaction) {
            $material = Material::with('estate')->where('code', $transaction->code)->lockForUpdate()->first();

            abort_if(!$material, 404);
            $this->ensureEstateAccess($material->estate_id);

            // Reverse stock change
            if ($transaction->type === 'IN') {
                // If it was an IN, deleting it means reducing stock
                if ($material->stock < $transaction->qty) {
                    return response()->json(['message' => 'Cannot delete IN transaction: resulting stock would be negative'], 400);
                }
                $material->decrement('stock', $transaction->qty);
            } else {
                // If it was an OUT, deleting it means increasing stock
                $material->increment('stock', $transaction->qty);
            }

            $transaction->delete();
            return response()->json(['message' => 'Transaction deleted and stock adjusted']);
        });
    }
}
