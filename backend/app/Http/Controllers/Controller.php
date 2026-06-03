<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

abstract class Controller
{
    protected function sendEmailIfEnabled(array $to, Mailable $mailable, ?string $cc = null): void
    {
        if (empty($to)) return;

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
            if ($cc) $mail->cc($cc);
            $mail->send($mailable);
        } catch (\Exception $e) {
            Log::error('Email notification failed: ' . $e->getMessage());
        }
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
