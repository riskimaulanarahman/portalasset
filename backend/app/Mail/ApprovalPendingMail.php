<?php

namespace App\Mail;

use App\Models\Transfer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApprovalPendingMail extends Mailable
{
    use Queueable, SerializesModels;

    public Transfer $transfer;
    public int $sequence;

    public function __construct(Transfer $transfer, int $sequence)
    {
        $this->transfer = $transfer;
        $this->sequence = $sequence;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Giliran Anda Menyetujui Transfer: ' . $this->transfer->transfer_code,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.approval_pending',
        );
    }
}
