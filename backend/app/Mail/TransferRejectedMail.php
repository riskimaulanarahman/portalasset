<?php

namespace App\Mail;

use App\Models\Transfer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TransferRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Transfer $transfer;
    public string $rejectedBy;
    public ?string $comment;

    public function __construct(Transfer $transfer, string $rejectedBy, ?string $comment = null)
    {
        $this->transfer = $transfer;
        $this->rejectedBy = $rejectedBy;
        $this->comment = $comment;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Transfer Ditolak: ' . $this->transfer->transfer_code,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.transfer_rejected',
        );
    }
}
