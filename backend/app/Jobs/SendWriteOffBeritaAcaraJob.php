<?php

namespace App\Jobs;

use App\Mail\WriteOffApprovedMail;
use App\Models\Setting;
use App\Models\TransAsset;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendWriteOffBeritaAcaraJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $writeOffId,
        public array $toEmails,
        public ?string $ccEmail = null
    ) {
    }

    public function handle(): void
    {
        $emailEnabled = Setting::get('enable_email_notif', true);
        if (!$emailEnabled) {
            Log::info("SendWriteOffBeritaAcaraJob: email notification disabled, skipping write-off #{$this->writeOffId}.");
            return;
        }

        $mailer   = config('mail.default');
        $notReady = in_array($mailer, ['log', 'array'])
            || ($mailer === 'smtp'
                && in_array(config('mail.mailers.smtp.host', '127.0.0.1'), ['127.0.0.1', 'localhost'])
                && empty(config('mail.mailers.smtp.username')));

        if ($notReady) {
            Log::info('[NOTIF] Mail belum dikonfigurasi, email write-off tidak terkirim.', [
                'write_off_id' => $this->writeOffId,
                'to'           => $this->toEmails,
            ]);
            return;
        }

        try {
            $writeOff = TransAsset::with(['asset.estate', 'asset.section', 'approvalRequests.logs.user'])->find($this->writeOffId);

            if (!$writeOff || empty($this->toEmails)) {
                return;
            }

            $mail = Mail::to($this->toEmails);
            if (!empty($this->ccEmail)) {
                $mail->cc($this->ccEmail);
            }
            $mail->send(new WriteOffApprovedMail($writeOff));
        } catch (\Exception $e) {
            Log::error('SendWriteOffBeritaAcaraJob failed: ' . $e->getMessage());
        }
    }
}
