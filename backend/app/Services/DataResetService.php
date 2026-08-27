<?php

namespace App\Services;

use App\Models\DataResetLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DataResetService
{
    /**
     * Domain checklist yang tampil di Admin Panel.
     * Setiap domain memetakan ke satu atau lebih tabel yang akan dikosongkan.
     * Urutan tabel disusun child -> parent untuk keterbacaan log,
     * meski constraint FK dinonaktifkan sementara selama eksekusi.
     */
    public const DOMAINS = [
        'assets' => [
            'label' => 'Aset & Riwayat',
            'tables' => ['trans_conditions', 'trans_maintenances', 'trans_assets', 'assets'],
        ],
        'materials' => [
            'label' => 'Material & Stok',
            'tables' => ['transactions', 'material_transfer_histories', 'materials'],
        ],
        'transfers' => [
            'label' => 'Transfer & Approval',
            'tables' => ['approval_logs', 'approval_requests', 'transfer_items', 'transfers', 'approval_steps', 'approval_workflows'],
        ],
        'software' => [
            'label' => 'Software / Lisensi',
            'tables' => ['software'],
        ],
        'anggota' => [
            'label' => 'Anggota (Karyawan)',
            'tables' => ['anggotas'],
        ],
        'log_sistem' => [
            'label' => 'Log Sistem',
            'tables' => ['audit_logs', 'personal_access_tokens'],
        ],
        'master_data' => [
            'label' => 'Master Data Organisasi',
            'tables' => ['categories', 'asset_regs', 'sections', 'units', 'vendors', 'cost_centers', 'asset_types', 'manufacturers', 'estates', 'business_units'],
        ],
    ];

    /**
     * Domain khusus: bukan truncate tabel penuh, tapi hapus user
     * yang TIDAK memiliki role admin. Ditangani terpisah dari DOMAINS
     * karena kriterianya bukan "semua baris di tabel ini".
     */
    public const USERS_DOMAIN_KEY = 'users_testing';
    public const USERS_DOMAIN_LABEL = 'User Testing (non-admin)';

    public function allDomainKeys(): array
    {
        return array_merge(array_keys(self::DOMAINS), [self::USERS_DOMAIN_KEY]);
    }

    public function isProductionEnvironment(): bool
    {
        return app()->environment('production');
    }

    /**
     * Hitung jumlah baris yang akan terdampak per domain, tanpa menghapus apa pun.
     */
    public function preview(array $domainKeys): array
    {
        $result = [];

        foreach ($domainKeys as $key) {
            if ($key === self::USERS_DOMAIN_KEY) {
                $result[$key] = [
                    'label' => self::USERS_DOMAIN_LABEL,
                    'tables' => ['users' => $this->countNonAdminUsers()],
                    'total' => $this->countNonAdminUsers(),
                ];
                continue;
            }

            if (!isset(self::DOMAINS[$key])) {
                continue;
            }

            $domain = self::DOMAINS[$key];
            $tableCounts = [];
            foreach ($domain['tables'] as $table) {
                $tableCounts[$table] = DB::table($table)->count();
            }

            $result[$key] = [
                'label' => $domain['label'],
                'tables' => $tableCounts,
                'total' => array_sum($tableCounts),
            ];
        }

        return $result;
    }

    /**
     * Jalankan reset untuk domain-domain terpilih.
     *
     * @throws \RuntimeException jika backup gagal dan $forceWithoutBackup = false
     */
    public function execute(array $domainKeys, User $actor, string $ip, ?string $userAgent, bool $forceWithoutBackup = false): array
    {
        $validKeys = array_values(array_intersect($domainKeys, $this->allDomainKeys()));

        if (empty($validKeys)) {
            throw new \InvalidArgumentException('Tidak ada domain valid yang dipilih.');
        }

        $backup = $this->backupSelectedTables($this->resolveTables($validKeys));
        if (!$backup['success'] && !$forceWithoutBackup) {
            throw new \RuntimeException('BACKUP_FAILED:' . $backup['message']);
        }

        // Kumpulkan attachment fisik yang perlu dihapus setelah data berhasil di-commit.
        $attachmentsToDelete = [];
        if (in_array('assets', $validKeys, true)) {
            $attachmentsToDelete = DB::table('trans_maintenances')
                ->whereNotNull('attachment')
                ->pluck('attachment')
                ->filter()
                ->all();
        }

        $deletedCounts = [];

        DB::beginTransaction();

        try {
            $this->disableForeignKeyChecks();

            foreach ($validKeys as $key) {
                if ($key === self::USERS_DOMAIN_KEY) {
                    $deletedCounts[$key] = ['users' => $this->deleteNonAdminUsers()];
                    continue;
                }

                $domain = self::DOMAINS[$key];
                $tableCounts = [];
                foreach ($domain['tables'] as $table) {
                    $tableCounts[$table] = DB::table($table)->delete();
                }
                $deletedCounts[$key] = $tableCounts;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        } finally {
            $this->enableForeignKeyChecks();
        }

        foreach ($attachmentsToDelete as $path) {
            try {
                Storage::disk('public')->delete($path);
            } catch (\Throwable $e) {
                Log::warning('[DataReset] Gagal hapus attachment: ' . $path . ' - ' . $e->getMessage());
            }
        }

        $totalDeleted = 0;
        foreach ($deletedCounts as $tables) {
            $totalDeleted += array_sum($tables);
        }

        DataResetLog::create([
            'user_id' => $actor->id,
            'username' => $actor->username ?? $actor->name,
            'domains' => $validKeys,
            'deleted_counts' => $deletedCounts,
            'total_deleted' => $totalDeleted,
            'backup_path' => $backup['path'],
            'backup_success' => $backup['success'],
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'created_at' => now(),
        ]);

        return [
            'domains' => $validKeys,
            'deleted_counts' => $deletedCounts,
            'total_deleted' => $totalDeleted,
            'backup' => $backup,
        ];
    }

    /**
     * Flatten domain keys terpilih menjadi daftar nama tabel unik (termasuk
     * 'users' untuk domain users_testing), dipakai untuk backup sebelum hapus.
     */
    protected function resolveTables(array $validKeys): array
    {
        $tables = [];
        foreach ($validKeys as $key) {
            if ($key === self::USERS_DOMAIN_KEY) {
                $tables[] = 'users';
                continue;
            }
            if (!isset(self::DOMAINS[$key])) {
                continue;
            }
            foreach (self::DOMAINS[$key]['tables'] as $table) {
                $tables[] = $table;
            }
        }

        return array_values(array_unique($tables));
    }

    protected function driverName(): string
    {
        return DB::connection()->getDriverName();
    }

    /**
     * Nonaktifkan enforcement FK sementara agar tabel bisa dihapus tanpa
     * memusingkan urutan child/parent. Sintaks berbeda per engine database.
     */
    protected function disableForeignKeyChecks(): void
    {
        match ($this->driverName()) {
            'mysql', 'mariadb' => DB::statement('SET FOREIGN_KEY_CHECKS=0'),
            'sqlsrv' => DB::statement("EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'"),
            default => throw new \RuntimeException('Driver database "' . $this->driverName() . '" belum didukung oleh fitur reset data.'),
        };
    }

    protected function enableForeignKeyChecks(): void
    {
        try {
            match ($this->driverName()) {
                'mysql', 'mariadb' => DB::statement('SET FOREIGN_KEY_CHECKS=1'),
                'sqlsrv' => DB::statement("EXEC sp_msforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL'"),
                default => null,
            };
        } catch (\Throwable $e) {
            // Jangan biarkan kegagalan re-enable menutupi exception asli dari blok try.
            Log::error('[DataReset] Gagal mengaktifkan kembali FK constraint: ' . $e->getMessage());
        }
    }

    protected function countNonAdminUsers(): int
    {
        return $this->nonAdminUsersQuery()->count();
    }

    protected function deleteNonAdminUsers(): int
    {
        return $this->nonAdminUsersQuery()->delete();
    }

    protected function nonAdminUsersQuery()
    {
        $adminRoleId = DB::table('roles')->where('name', 'admin')->where('guard_name', 'web')->value('id');

        $query = DB::table('users');

        if ($adminRoleId) {
            $query->whereNotIn('id', function ($sub) use ($adminRoleId) {
                $sub->select('model_id')
                    ->from('model_has_roles')
                    ->where('role_id', $adminRoleId)
                    ->where('model_type', User::class);
            });
        }

        return $query;
    }

    /**
     * Backup baris dari tabel-tabel yang akan dihapus ke JSON di storage privat
     * (storage/app/private/backups/uat-reset-{timestamp}/{table}.json).
     *
     * Sengaja tidak pakai mysqldump/native DB backup tool: keduanya spesifik
     * per-engine (mysqldump untuk MySQL, BACKUP DATABASE untuk SQL Server perlu
     * akses filesystem di host DB server, bukan host aplikasi). Query builder
     * SELECT bekerja sama di MySQL maupun SQL Server tanpa dependency eksternal.
     */
    protected function backupSelectedTables(array $tables): array
    {
        $dir = 'backups/uat-reset-' . now()->format('Y-m-d-His');

        try {
            foreach ($tables as $table) {
                $rows = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
                Storage::disk('local')->put(
                    "{$dir}/{$table}.json",
                    json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
                );
            }

            return [
                'success' => true,
                'path' => $dir,
                'message' => 'Backup ' . count($tables) . ' tabel berhasil dibuat sebelum reset.',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'path' => null,
                'message' => 'Backup gagal dijalankan: ' . $e->getMessage(),
            ];
        }
    }
}
