<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DataResetService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class DataResetController extends Controller implements HasMiddleware
{
    private const CONFIRM_PHRASE = 'RESET DATA UAT';

    public static function middleware(): array
    {
        return [
            new Middleware('permission:execute-data-reset'),
        ];
    }

    public function __construct(private readonly DataResetService $service)
    {
    }

    /**
     * GET /admin/data-reset/preview
     * Hitung jumlah baris per domain tanpa menghapus apa pun.
     */
    public function preview(Request $request)
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Hanya admin yang dapat mengakses fitur ini.');

        $validated = $request->validate([
            'domains' => 'sometimes|array',
            'domains.*' => 'string',
        ]);

        $domains = $validated['domains'] ?? $this->service->allDomainKeys();

        return response()->json([
            'is_production' => $this->service->isProductionEnvironment(),
            'domains' => $this->service->preview($domains),
        ]);
    }

    /**
     * POST /admin/data-reset
     * Eksekusi reset untuk domain terpilih, dengan konfirmasi berlapis.
     */
    public function execute(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('admin'), 403, 'Hanya admin yang dapat menjalankan reset data.');

        $validated = $request->validate([
            'domains' => 'required|array|min:1',
            'domains.*' => 'string',
            'confirm_phrase' => 'required|string',
            'password' => 'required|string',
            'production_ack' => 'sometimes|boolean',
            'force_without_backup' => 'sometimes|boolean',
        ]);

        if (trim($validated['confirm_phrase']) !== self::CONFIRM_PHRASE) {
            return response()->json([
                'message' => 'Frasa konfirmasi tidak cocok. Ketik persis: ' . self::CONFIRM_PHRASE,
            ], 422);
        }

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Password tidak sesuai.',
            ], 422);
        }

        if ($this->service->isProductionEnvironment() && empty($validated['production_ack'])) {
            return response()->json([
                'message' => 'Environment ini terdeteksi PRODUCTION. Konfirmasi eksplisit diperlukan sebelum melanjutkan.',
                'requires_production_ack' => true,
            ], 422);
        }

        try {
            $result = $this->service->execute(
                domainKeys: $validated['domains'],
                actor: $user,
                ip: $request->ip(),
                userAgent: $request->userAgent(),
                forceWithoutBackup: (bool) ($validated['force_without_backup'] ?? false),
            );
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'BACKUP_FAILED:')) {
                return response()->json([
                    'message' => substr($e->getMessage(), strlen('BACKUP_FAILED:')),
                    'requires_backup_override' => true,
                ], 422);
            }

            Log::error('[DataReset] Gagal eksekusi: ' . $e->getMessage());
            return response()->json(['message' => 'Reset gagal dijalankan: ' . $e->getMessage()], 500);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('[DataReset] Gagal eksekusi: ' . $e->getMessage());
            return response()->json(['message' => 'Reset gagal dijalankan, tidak ada data yang terhapus (transaksi di-rollback).'], 500);
        }

        Log::warning('[DataReset] Data UAT direset oleh ' . ($user->username ?? $user->name), [
            'domains' => $result['domains'],
            'total_deleted' => $result['total_deleted'],
        ]);

        return response()->json([
            'message' => 'Reset data berhasil dijalankan.',
            'data' => $result,
        ]);
    }
}
