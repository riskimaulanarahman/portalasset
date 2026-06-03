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

        try {
            $mail = Mail::to($to);
            if ($cc) $mail->cc($cc);
            $mail->send($mailable);
        } catch (\Exception $e) {
            Log::error('Email notification failed: ' . $e->getMessage());
        }
    }
}
