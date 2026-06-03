<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Estate;
use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MaterialController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-materials', only: ['index', 'show']),
            new Middleware('permission:create-materials', only: ['store', 'generateCode']),
            new Middleware('permission:edit-materials', only: ['update']),
            new Middleware('permission:delete-materials', only: ['destroy']),
        ];
    }
    /**
     * #10 FIX: generateCode kini estate-aware sehingga kode unik per estate.
     * Format: MAT-{ESTATE_CODE}-XXXXXX  (contoh: MAT-KLT-000001, MAT-HO-000042)
     */
    public function generateCode(Request $request)
    {
        // Tentukan estate code yang akan digunakan
        if ($this->isHeadOfficeUser()) {
            // HO user bisa generate untuk estate manapun via ?estate_id=
            if ($request->filled('estate_id')) {
                $estate     = Estate::findOrFail($request->estate_id);
                $estateCode = strtoupper($estate->estate_id);
            } else {
                $estateCode = 'HO';
            }
        } else {
            $estateCode = strtoupper($this->currentEstateCode() ?? 'EST');
        }

        $prefix = "MAT-{$estateCode}-";

        $lastMaterial = Material::where('code', 'like', $prefix . '%')
            ->orderBy('code', 'desc')
            ->first();

        if (!$lastMaterial) {
            $nextNumber = 1;
        } else {
            // Ambil bagian angka di akhir kode
            $lastPart   = substr($lastMaterial->code, strlen($prefix));
            $nextNumber = ((int) $lastPart) + 1;
        }

        $newCode = $prefix . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

        return response()->json(['data' => ['code' => $newCode]]);
    }

    public function index(Request $request)
    {
        $query = Material::with(['category', 'section', 'unit', 'estate']);
        $estateId = $this->isHeadOfficeUser()
            ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
            : $this->currentEstateId();

        if ($estateId) {
            $query->where('estate_id', $estateId);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('nama', 'like', "%{$search}%");
            });
        }

        // #13 FIX: Gunakan paginate() agar response scalable untuk ribuan material
        // Jika ?all=1 dikirim (misal untuk export atau select dropdown), kembalikan semua tanpa paginasi
        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        $perPage   = (int) $request->get('per_page', 15);
        $materials = $query->paginate($perPage);

        return response()->json([
            'data' => $materials->items(),
            'meta' => [
                'current_page' => $materials->currentPage(),
                'per_page'     => $materials->perPage(),
                'total'        => $materials->total(),
                'last_page'    => $materials->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|max:25|unique:materials',
            'nama' => 'required|max:150',
            'type' => 'nullable|max:25',
            'category_id' => 'required|exists:categories,id',
            'unit_id' => 'nullable|exists:units,id',
            'matcode' => 'nullable|max:10',
            'sn' => 'nullable|max:25',
            'min_stock' => 'nullable|numeric',
            'price' => 'nullable|numeric',
            'stock' => 'nullable|numeric',
            'pt' => 'nullable|max:150',
            'section_id' => 'required|exists:sections,id',
            'estate_id' => 'required|exists:estates,id',
            'not_active' => 'boolean',
        ]);

        // Tentukan estate_id efektif sebelum cek duplikat
        $effectiveEstateId = $this->isHeadOfficeUser()
            ? (int) $validated['estate_id']
            : $this->currentEstateId();

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $effectiveEstateId;
        }

        // #11 FIX: Cegah duplikat material (nama + category + estate)
        $duplicateExists = Material::where('nama', $validated['nama'])
            ->where('category_id', $validated['category_id'])
            ->where('estate_id', $effectiveEstateId)
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'nama' => ['Material dengan nama, kategori, dan estate yang sama sudah ada.'],
            ]);
        }

        $validated['create_by'] = Auth::user()->username ?? 'system';

        $material = Material::create($validated);
        return response()->json(['message' => 'Material created successfully', 'data' => $material], 201);
    }

    public function show(Material $material)
    {
        $this->ensureEstateAccess($material->estate_id);

        return response()->json(['data' => $material->load(['category', 'section', 'unit', 'estate'])]);
    }

    public function update(Request $request, Material $material)
    {
        $validated = $request->validate([
            'nama' => 'sometimes|required|max:150',
            'type' => 'nullable|max:25',
            'category_id' => 'sometimes|required|exists:categories,id',
            'unit_id' => 'nullable|exists:units,id',
            'matcode' => 'nullable|max:10',
            'sn' => 'nullable|max:25',
            'min_stock' => 'nullable|numeric',
            'price' => 'nullable|numeric',
            'stock' => 'nullable|numeric',
            'pt' => 'nullable|max:150',
            'section_id' => 'sometimes|required|exists:sections,id',
            'estate_id' => 'sometimes|required|exists:estates,id',
            'not_active' => 'boolean',
        ]);

        $this->ensureEstateAccess($material->estate_id);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $validated['update_by'] = Auth::user()->username ?? 'system';

        $material->update($validated);
        return response()->json(['message' => 'Material updated successfully', 'data' => $material]);
    }

    public function destroy(Material $material)
    {
        $this->ensureEstateAccess($material->estate_id);

        $material->delete();
        return response()->json(['message' => 'Material deleted successfully']);
    }
}
