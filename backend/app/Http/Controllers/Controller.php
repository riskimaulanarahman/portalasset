<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

abstract class Controller
{
    protected function sendEmailIfEnabled(array $to, Mailable $mailable, array|string|null $cc = null): void
    {
        if (empty($to)) return;

        $cc = $this->normalizeEmailList($cc);
        $cc = $this->withoutEmails($cc, $to);

        if (!Setting::get('enable_email_notif', true)) return;

        if (!static::isMailConfigured()) {
            Log::info('[NOTIF] Mail belum dikonfigurasi, email tidak terkirim.', [
                'type'    => class_basename($mailable),
                'to'      => $to,
                'cc'      => $cc,
                'subject' => $mailable->envelope()->subject ?? '-',
            ]);
            return;
        }

        try {
            $mail = Mail::to($to);
            if (!empty($cc)) $mail->cc($cc);
            $mail->send($mailable);
        } catch (\Exception $e) {
            Log::error('Email notification failed: ' . $e->getMessage());
        }
    }

    protected function transferOversightCcEmails(array $exclude = []): array
    {
        $emails = User::query()
            ->where('not_active', false)
            ->whereNotNull('email')
            ->where('email', '<>', '')
            ->where(function ($query) {
                $query->whereHas('roles', fn ($role) => $role->where('name', 'admin'))
                    ->orWhereHas('estate', fn ($estate) => $estate->where('estate_id', 'HO'));
            })
            ->pluck('email')
            ->all();

        return $this->withoutEmails($emails, $exclude);
    }

    protected function normalizeEmailList(array|string|null $emails): array
    {
        if (!$emails) {
            return [];
        }

        $emails = is_array($emails) ? $emails : [$emails];

        return collect($emails)
            ->filter()
            ->map(fn ($email) => trim((string) $email))
            ->filter()
            ->unique(fn ($email) => mb_strtolower($email))
            ->values()
            ->all();
    }

    protected function withoutEmails(array $emails, array $exclude): array
    {
        $excluded = collect($exclude)
            ->filter()
            ->map(fn ($email) => mb_strtolower(trim((string) $email)))
            ->all();

        return collect($emails)
            ->filter()
            ->map(fn ($email) => trim((string) $email))
            ->reject(fn ($email) => in_array(mb_strtolower($email), $excluded, true))
            ->unique(fn ($email) => mb_strtolower($email))
            ->values()
            ->all();
    }

    protected static function isMailConfigured(): bool
    {
        $mailer = config('mail.default');
        if (in_array($mailer, ['log', 'array'])) {
            return false;
        }
        if ($mailer === 'smtp') {
            $host     = config('mail.mailers.smtp.host', '127.0.0.1');
            $username = config('mail.mailers.smtp.username');
            if (in_array($host, ['127.0.0.1', 'localhost']) && empty($username)) {
                return false;
            }
        }
        return true;
    }
}
