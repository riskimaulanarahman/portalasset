<?php

namespace App\Mail;

use App\Models\Transfer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TransferCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Transfer $transfer;

    public function __construct(Transfer $transfer)
    {
        $this->transfer = $transfer;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Permintaan Transfer Baru: ' . $this->transfer->transfer_code,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.transfer_created',
        );
    }
}
