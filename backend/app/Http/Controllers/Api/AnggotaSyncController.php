<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\TblEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnggotaSyncController extends Controller
{
    public function sync(Request $request)
    {
        $actor = $request->user();

        if (!$actor->hasRole('admin') && !$actor->hasPermissionTo('create-anggotas')) {
            abort(403, 'Hanya admin yang dapat melakukan sync data karyawan.');
        }

        $employees = TblEmployee::whereNotNull('SAPID')
            ->where('SAPID', '!=', '')
            ->get();

        $synced  = 0;
        $skipped = 0;

        DB::transaction(function () use ($employees, &$synced, &$skipped, $actor) {
            foreach ($employees as $emp) {
                $sapId = trim($emp->SAPID);
                if ($sapId === '') {
                    $skipped++;
                    continue;
                }

                $notActive = ($emp->isTerminate === '1') || ($emp->isActive !== '1');

                Anggota::updateOrCreate(
                    ['sap_id' => $sapId],
                    [
                        'login_name'      => $emp->LoginName ? mb_substr(trim($emp->LoginName), 0, 50) : null,
                        'nama'            => $emp->FullName ? mb_substr($emp->FullName, 0, 100) : null,
                        'supervisor'      => $emp->superiorName ? mb_substr($emp->superiorName, 0, 100) : null,
                        'company_code'    => $emp->companycode ? mb_substr(trim($emp->companycode), 0, 10) : null,
                        'cost_center'     => $emp->CostCenter ? mb_substr(trim($emp->CostCenter), 0, 100) : null,
                        'contract_status' => $emp->contract_status ? mb_substr(trim($emp->contract_status), 0, 15) : null,
                        'join_date'       => $emp->JoinDate,
                        'gender'          => $emp->Gender ? mb_substr(trim($emp->Gender), 0, 10) : null,
                        'not_active'      => $notActive,
                        'update_by'       => $actor->username ?? 'system_sync',
                    ]
                );

                $synced++;
            }
        });

        return response()->json([
            'message' => "Sync selesai: {$synced} karyawan diperbarui, {$skipped} dilewati.",
            'synced'  => $synced,
            'skipped' => $skipped,
        ]);
    }
}
