<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Models\Anggota;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AnggotaController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-anggotas', only: ['index', 'show']),
            new Middleware('permission:create-anggotas', only: ['store']),
            new Middleware('permission:edit-anggotas', only: ['update']),
            new Middleware('permission:delete-anggotas', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = Anggota::with(['section', 'estate']);

        if ($request->filled('estate_id')) {
            // Explicit estate_id param: dipakai semua user (contoh: filter penerima di form Transfer)
            $query->where('estate_id', (int) $request->estate_id);
        } elseif (!$this->isHeadOfficeUser()) {
            // Non-HO tanpa filter: tampilkan anggota estate sendiri (untuk halaman Members)
            $query->where('estate_id', $this->currentEstateId());
        }
        // HO tanpa filter: tampilkan semua

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sap_id'    => 'required|max:15|unique:anggotas,sap_id',
            'nik'       => 'nullable|max:15',
            'nama'      => 'required|max:25',
            'position'  => 'nullable|max:25',
            'supervisor'=> 'nullable|max:25',
            'email'     => 'nullable|email|max:50',
            'section_id'=> 'nullable|exists:sections,id',
            'estate_id' => 'nullable|exists:estates,id',
            'not_active'=> 'boolean',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $validated['create_by'] = auth()->user()->username ?? 'system';

        $anggota = Anggota::create($validated);
        return response()->json(['message' => 'Anggota created successfully', 'data' => $anggota->load(['section', 'estate'])], 201);
    }

    public function show(Anggota $anggota)
    {
        return response()->json(['data' => $anggota->load(['section', 'estate'])]);
    }

    public function update(Request $request, Anggota $anggota)
    {
        $validated = $request->validate([
            'nik'       => 'nullable|max:15',
            'nama'      => 'sometimes|required|max:25',
            'position'  => 'nullable|max:25',
            'supervisor'=> 'nullable|max:25',
            'email'     => 'nullable|email|max:50',
            'section_id'=> 'nullable|exists:sections,id',
            'estate_id' => 'nullable|exists:estates,id',
            'not_active'=> 'boolean',
        ]);

        if (!$this->isHeadOfficeUser()) {
            unset($validated['estate_id']);
        }

        $validated['update_by'] = auth()->user()->username ?? 'system';

        $anggota->update($validated);
        return response()->json(['message' => 'Anggota updated successfully', 'data' => $anggota->load(['section', 'estate'])]);
    }

    public function destroy(Anggota $anggota)
    {
        $anggota->delete();
        return response()->json(['message' => 'Anggota deleted successfully']);
    }
}
