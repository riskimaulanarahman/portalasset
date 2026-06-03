<?php

namespace App\Concerns;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

// #8 FIX: Trait untuk mencatat semua perubahan model ke audit_logs secara otomatis
trait Auditable
{
    /**
     * Boot the auditable trait — daftarkan model event listeners.
     */
    public static function bootAuditable(): void
    {
        // Setelah model dibuat
        static::created(function ($model) {
            static::writeAuditLog($model, 'created', [], $model->getAttributes());
        });

        // Setelah model diupdate
        static::updated(function ($model) {
            $dirty = $model->getDirty();
            if (empty($dirty)) {
                return; // tidak ada perubahan nyata
            }

            $old = [];
            foreach (array_keys($dirty) as $field) {
                $old[$field] = $model->getOriginal($field);
            }

            static::writeAuditLog($model, 'updated', $old, $dirty);
        });

        // Setelah model dihapus (soft atau hard)
        static::deleted(function ($model) {
            $action = method_exists($model, 'isForceDeleting') && $model->isForceDeleting()
                ? 'force_deleted'
                : 'deleted';

            static::writeAuditLog($model, $action, $model->getAttributes(), []);
        });

        // Setelah model di-restore (jika pakai SoftDeletes)
        if (method_exists(static::class, 'restored')) {
            static::restored(function ($model) {
                static::writeAuditLog($model, 'restored', [], $model->getAttributes());
            });
        }
    }

    /**
     * Tulis satu baris ke tabel audit_logs.
     */
    protected static function writeAuditLog($model, string $action, array $old, array $new): void
    {
        try {
            // Hapus field sensitif dari log
            $sensitiveFields = ['password', 'remember_token', 'guid'];
            foreach ($sensitiveFields as $field) {
                unset($old[$field], $new[$field]);
            }

            $user    = Auth::user();
            $request = Request::instance();

            AuditLog::create([
                'model_type' => get_class($model),
                'model_id'   => (string) $model->getKey(),
                'action'     => $action,
                'user_id'    => $user?->id,
                'username'   => $user?->name ?? $user?->username,
                'old_values' => empty($old) ? null : $old,
                'new_values' => empty($new) ? null : $new,
                'ip_address' => $request->ip(),
                'user_agent' => substr($request->userAgent() ?? '', 0, 255),
            ]);
        } catch (\Throwable $e) {
            // Jangan biarkan kegagalan audit mengganggu operasi utama
            \Illuminate\Support\Facades\Log::warning('Audit log write failed: ' . $e->getMessage());
        }
    }
}
