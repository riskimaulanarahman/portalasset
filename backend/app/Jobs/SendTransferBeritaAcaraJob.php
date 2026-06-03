<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use App\Models\Setting;
use App\Models\Transfer;
use App\Mail\TransferApprovedMail;
use Illuminate\Support\Facades\Log;

class SendTransferBeritaAcaraJob implements ShouldQueue
{
    use Queueable;

    public $transferId;
    public $toEmails;
    public $ccEmail;

    /**
     * Create a new job instance.
     */
    public function __construct($transferId, $toEmails, $ccEmail = null)
    {
        $this->transferId = $transferId;
        $this->toEmails = $toEmails;
        $this->ccEmail = $ccEmail;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // #17 FIX: Periksa setting enable_email_notif sebelum mengirim email.
        // Admin dapat mematikan notifikasi email melalui halaman Settings.
        $emailEnabled = Setting::get('enable_email_notif', true);
        if (!$emailEnabled) {
            Log::info("SendTransferBeritaAcaraJob: email notification disabled via settings, skipping transfer #{$this->transferId}.");
            return;
        }

        $mailer   = config('mail.default');
        $notReady = in_array($mailer, ['log', 'array'])
            || ($mailer === 'smtp'
                && in_array(config('mail.mailers.smtp.host', '127.0.0.1'), ['127.0.0.1', 'localhost'])
                && empty(config('mail.mailers.smtp.username')));

        if ($notReady) {
            Log::info('[NOTIF] Mail belum dikonfigurasi, email tidak terkirim.', [
                'type'     => 'TransferApprovedMail',
                'transfer' => $this->transferId,
                'to'       => $this->toEmails,
                'cc'       => $this->ccEmail,
            ]);
            return;
        }

        try {
            $transfer = Transfer::with(['fromEstate', 'toEstate', 'items', 'approvalRequests.logs.user'])->find($this->transferId);

            if (!$transfer || empty($this->toEmails)) {
                return;
            }

            $mail = Mail::to($this->toEmails);

            if (!empty($this->ccEmail)) {
                $mail->cc($this->ccEmail);
            }

            $mail->send(new TransferApprovedMail($transfer));
        } catch (\Exception $e) {
            Log::error('Task SendTransferBeritaAcaraJob Failed: '.$e->getMessage());
        }
    }
}
