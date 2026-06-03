<?php

namespace App\Mail;

use App\Models\TransAsset;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WriteOffCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public TransAsset $writeOff)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Permohonan Write-Off Aset: ' . $this->writeOff->asset?->reg_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.write_off_created',
        );
    }
}
