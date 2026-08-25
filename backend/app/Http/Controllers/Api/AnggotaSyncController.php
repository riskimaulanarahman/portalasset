<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\TblEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AnggotaSyncController extends Controller
{
    private const BATCH_SIZE = 100;

    public function sync(Request $request)
    {
        @set_time_limit(300);

        $actor = $request->user();

        if (!$actor->hasRole('admin') && !$actor->hasPermissionTo('create-anggotas')) {
            abort(403, 'Hanya admin yang dapat melakukan sync data karyawan.');
        }

        $synced  = 0;
        $skipped = 0;

        $startedAt = microtime(true);

        try {
            TblEmployee::with('department')
                ->select([
                    'id',
                    'SAPID',
                    'LoginName',
                    'FullName',
                    'superiorName',
                    'companycode',
                    'CostCenter',
                    'department_id',
                    'contract_status',
                    'JoinDate',
                    'Gender',
                    'isTerminate',
                    'isActive',
                ])
                ->whereNotNull('SAPID')
                ->where('SAPID', '!=', '')
                ->chunkById(self::BATCH_SIZE, function ($employees) use (&$synced, &$skipped, $actor) {
                    $rows = [];

                    foreach ($employees as $emp) {
                        $sapId = trim((string) $emp->SAPID);

                        if ($sapId === '') {
                            $skipped++;
                            continue;
                        }

                        $rows[$sapId] = $this->mapEmployeeToAnggotaRow($emp, $sapId, $actor->username ?? 'system_sync');
                    }

                    if ($rows === []) {
                        return;
                    }

                    Anggota::upsert(
                        array_values($rows),
                        ['sap_id'],
                        [
                            'login_name',
                            'nama',
                            'supervisor',
                            'company_code',
                            'cost_center',
                            'department',
                            'contract_status',
                            'join_date',
                            'gender',
                            'not_active',
                            'update_by',
                        ]
                    );

                    $synced += count($rows);
                });
        } catch (\Throwable $e) {
            Log::error('Anggota ERP sync failed.', [
                'user_id' => $actor->id ?? null,
                'username' => $actor->username ?? null,
                'synced' => $synced,
                'skipped' => $skipped,
                'duration_seconds' => round(microtime(true) - $startedAt, 2),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Sync gagal saat mengambil atau menyimpan data ERP. Cek log Laravel untuk detail.',
                'synced'  => $synced,
                'skipped' => $skipped,
            ], 500);
        }

        return response()->json([
            'message' => "Sync selesai: {$synced} karyawan diperbarui, {$skipped} dilewati.",
            'synced'  => $synced,
            'skipped' => $skipped,
        ]);
    }

    private function mapEmployeeToAnggotaRow(TblEmployee $emp, string $sapId, string $updatedBy): array
    {
        $department = $emp->departmentName();

        return [
            'sap_id'          => $sapId,
            'login_name'      => $this->nullableSubstring($emp->LoginName, 50),
            'nama'            => $this->nullableSubstring($emp->FullName, 100),
            'supervisor'      => $this->nullableSubstring($emp->superiorName, 100),
            'company_code'    => $this->nullableSubstring($emp->companycode, 10),
            'cost_center'     => $this->nullableSubstring($emp->CostCenter, 100),
            'department'      => $this->nullableSubstring($department, 100),
            'contract_status' => $this->nullableSubstring($emp->contract_status, 15),
            'join_date'       => $emp->JoinDate,
            'gender'          => $this->nullableSubstring($emp->Gender, 10),
            'not_active'      => ((string) $emp->isTerminate === '1') || ((string) $emp->isActive !== '1'),
            'update_by'       => $updatedBy,
        ];
    }

    private function nullableSubstring($value, int $limit): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : mb_substr($value, 0, $limit);
    }
}
