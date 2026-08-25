<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\MaterialStockOpname;
use App\Models\MaterialStockOpnameItem;
use App\Services\MaterialStockOpnameService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class MaterialStockOpnameController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public function __construct(private MaterialStockOpnameService $stockOpnameService)
    {
    }

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-material-stock-opnames', only: ['index', 'show', 'export', 'downloadBeritaAcara']),
            new Middleware('permission:create-material-stock-opnames', only: ['store', 'generateItems']),
            new Middleware('permission:edit-material-stock-opnames', only: ['update']),
            new Middleware('permission:count-material-stock-opnames', only: ['startCounting', 'countItem', 'bulkCounts', 'importCounts']),
            new Middleware('permission:review-material-stock-opnames', only: ['markRecount', 'submitReview']),
            new Middleware('permission:submit-material-stock-opnames', only: ['submitApproval']),
            new Middleware('permission:cancel-material-stock-opnames', only: ['cancel']),
            new Middleware('permission:export-material-stock-opnames', only: ['export', 'downloadBeritaAcara']),
        ];
    }

    public function index(Request $request)
    {
        $query = MaterialStockOpname::with(['estate', 'section'])
            ->withCount('items');

        $estateId = $this->isHeadOfficeUser()
            ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
            : $this->currentEstateId();

        if ($estateId) {
            $query->where('estate_id', $estateId);
        }

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('opname_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('opname_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('opname_code', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->latest('id')->get()]);
        }

        $perPage = (int) $request->get('per_page', 15);
        $opnames = $query->latest('id')->paginate($perPage);

        return response()->json([
            'data' => $opnames->items(),
            'meta' => [
                'current_page' => $opnames->currentPage(),
                'per_page' => $opnames->perPage(),
                'total' => $opnames->total(),
                'last_page' => $opnames->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'estate_id' => [$this->isHeadOfficeUser() ? 'required' : 'nullable', 'exists:estates,id'],
            'section_id' => 'nullable|exists:sections,id',
            'opname_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $this->ensureEstateAccess((int) $validated['estate_id']);

        $opname = $this->stockOpnameService->createSession($validated, Auth::user());

        return response()->json([
            'message' => 'Material stock opname session created successfully',
            'data' => $opname,
        ], 201);
    }

    public function show(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        return response()->json([
            'data' => $materialStockOpname->load([
                'estate',
                'section',
                'items.material.category',
                'items.unit',
                'items.section',
                'items.transaction',
                'logs',
                'approvalRequests.workflow.steps',
                'approvalRequests.requester',
                'approvalRequests.logs.user',
            ]),
        ]);
    }

    public function update(Request $request, MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        if (!in_array($materialStockOpname->status, ['Draft', 'Counting', 'Review'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Sesi tidak dapat diubah pada status saat ini.'],
            ]);
        }

        $validated = $request->validate([
            'section_id' => 'sometimes|nullable|exists:sections,id',
            'opname_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
        ]);

        if (
            $materialStockOpname->items()->exists()
            && (array_key_exists('section_id', $validated) || array_key_exists('opname_date', $validated))
        ) {
            throw ValidationException::withMessages([
                'snapshot' => ['Section atau tanggal tidak dapat diubah setelah snapshot dibuat. Buat sesi baru jika scope opname berubah.'],
            ]);
        }

        $materialStockOpname->update($validated);

        return response()->json([
            'message' => 'Material stock opname updated successfully',
            'data' => $materialStockOpname->fresh(['estate', 'section', 'items']),
        ]);
    }

    public function generateItems(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $opname = $this->stockOpnameService->generateSnapshot($materialStockOpname, Auth::user());

        return response()->json([
            'message' => 'Material stock opname snapshot generated successfully',
            'data' => $opname,
        ]);
    }

    public function startCounting(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $opname = $this->stockOpnameService->startCounting($materialStockOpname, Auth::user());

        return response()->json([
            'message' => 'Material stock opname counting started successfully',
            'data' => $opname,
        ]);
    }

    public function countItem(Request $request, MaterialStockOpname $materialStockOpname, MaterialStockOpnameItem $item)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);
        $this->ensureItemBelongsToOpname($materialStockOpname, $item);

        $validated = $request->validate([
            'physical_stock' => 'required|numeric|min:0',
            'recount_stock' => 'nullable|numeric|min:0',
            'variance_reason' => 'nullable|string',
            'condition_note' => 'nullable|string',
        ]);

        $updatedItem = $this->stockOpnameService->updateCount($item, $validated, Auth::user());

        return response()->json([
            'message' => 'Material stock opname count saved successfully',
            'data' => $updatedItem,
        ]);
    }

    public function bulkCounts(Request $request, MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $validated = $request->validate([
            'counts' => 'required|array|min:1|max:1000',
            'counts.*.material_code' => 'required|string',
            'counts.*.physical_stock' => 'required|numeric|min:0',
            'counts.*.recount_stock' => 'nullable|numeric|min:0',
            'counts.*.variance_reason' => 'nullable|string',
            'counts.*.condition_note' => 'nullable|string',
        ]);

        $rows = collect($validated['counts'])
            ->values()
            ->map(function (array $row, int $index) {
                $row['_line'] = $index + 1;
                return $row;
            })
            ->all();

        $result = $this->stockOpnameService->importCounts($materialStockOpname, $rows, Auth::user());

        return response()->json([
            'message' => "{$result['imported']} count rows saved successfully",
            'imported' => $result['imported'],
            'data' => $result['opname'],
        ]);
    }

    public function importCounts(Request $request, MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $validated = $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $result = $this->stockOpnameService->importCounts(
            $materialStockOpname,
            $this->parseCountImportRows($validated['file']->getRealPath()),
            Auth::user()
        );

        return response()->json([
            'message' => "{$result['imported']} count rows imported successfully",
            'imported' => $result['imported'],
            'data' => $result['opname'],
        ]);
    }

    public function markRecount(Request $request, MaterialStockOpname $materialStockOpname, MaterialStockOpnameItem $item)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);
        $this->ensureItemBelongsToOpname($materialStockOpname, $item);

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $updatedItem = $this->stockOpnameService->markNeedRecount($item, $validated['reason'], Auth::user());

        return response()->json([
            'message' => 'Material stock opname item marked for recount',
            'data' => $updatedItem,
        ]);
    }

    public function submitReview(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $opname = $this->stockOpnameService->submitReview($materialStockOpname, Auth::user());

        return response()->json([
            'message' => 'Material stock opname submitted for review successfully',
            'data' => $opname,
        ]);
    }

    public function submitApproval(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $opname = $this->stockOpnameService->submitForApproval($materialStockOpname, Auth::user());

        return response()->json([
            'message' => 'Material stock opname submitted for approval successfully',
            'data' => $opname,
        ]);
    }

    public function cancel(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $opname = $this->stockOpnameService->cancel($materialStockOpname, Auth::user());

        return response()->json([
            'message' => 'Material stock opname cancelled successfully',
            'data' => $opname,
        ]);
    }

    public function export(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        $materialStockOpname->load(['estate', 'section', 'items.material.category', 'items.unit', 'items.section']);
        $filename = $materialStockOpname->opname_code . '.csv';

        return response()->streamDownload(function () use ($materialStockOpname) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'opname_code',
                'estate',
                'section',
                'opname_date',
                'material_code',
                'material_name',
                'category',
                'unit',
                'system_stock_snapshot',
                'physical_stock',
                'recount_stock',
                'final_physical_stock',
                'variance_qty',
                'price_snapshot',
                'variance_value',
                'variance_reason',
                'status',
                'counted_by',
                'reviewed_by',
                'transaction_id',
            ]);

            foreach ($materialStockOpname->items as $item) {
                fputcsv($handle, [
                    $materialStockOpname->opname_code,
                    $materialStockOpname->estate?->estate_id,
                    $item->section?->section,
                    $materialStockOpname->opname_date?->toDateString(),
                    $item->material_code,
                    $item->material_name,
                    $item->material?->category?->category,
                    $item->unit?->nama,
                    $item->system_stock_snapshot,
                    $item->physical_stock,
                    $item->recount_stock,
                    $item->final_physical_stock,
                    $item->variance_qty,
                    $item->price_snapshot,
                    $item->variance_value,
                    $item->variance_reason,
                    $item->status,
                    $item->counted_by,
                    $item->reviewed_by,
                    $item->transaction_id,
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function downloadBeritaAcara(MaterialStockOpname $materialStockOpname)
    {
        $this->ensureEstateAccess($materialStockOpname->estate_id);

        if ($materialStockOpname->status !== 'Posted') {
            return response()->json(['message' => 'Stock opname belum posted.'], 400);
        }

        $materialStockOpname->load([
            'estate',
            'section',
            'items.material.category',
            'items.category',
            'items.unit',
            'items.section',
            'items.transaction',
            'approvalRequests.logs.user',
            'approvalRequests.requester',
            'approvalRequests.workflow.steps.user',
        ]);

        $approvalRequest = $materialStockOpname->approvalRequests->first();
        $pdf = Pdf::loadView('pdfs.material_stock_opname_berita_acara', [
            'opname' => $materialStockOpname,
            'approvalRequest' => $approvalRequest,
        ])->setPaper('a4', 'landscape');

        return $pdf->download('Berita_Acara_Stock_Opname_' . $materialStockOpname->opname_code . '.pdf');
    }

    private function ensureItemBelongsToOpname(MaterialStockOpname $opname, MaterialStockOpnameItem $item): void
    {
        abort_if((int) $item->opname_id !== (int) $opname->id, 404);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parseCountImportRows(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => ['File import tidak dapat dibaca.'],
            ]);
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => ['File import kosong.'],
            ]);
        }

        $header = array_map(function ($column) {
            $column = preg_replace('/^\xEF\xBB\xBF/', '', (string) $column);
            return strtolower(trim((string) $column));
        }, $header);

        $requiredColumns = ['material_code', 'physical_stock'];
        foreach ($requiredColumns as $column) {
            if (!in_array($column, $header, true)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => ["Header CSV wajib memiliki kolom {$column}."],
                ]);
            }
        }

        $rows = [];
        $line = 1;
        while (($data = fgetcsv($handle)) !== false) {
            $line++;
            if (count(array_filter($data, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $row = ['_line' => $line];
            foreach ($header as $index => $column) {
                $row[$column] = isset($data[$index]) ? trim((string) $data[$index]) : '';
            }
            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }
}
