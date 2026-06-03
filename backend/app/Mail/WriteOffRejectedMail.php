<?php

namespace App\Mail;

use App\Models\TransAsset;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WriteOffRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $rejectedBy;
    public ?string $comment;

    public function __construct(public TransAsset $writeOff, string $rejectedBy, ?string $comment = null)
    {
        $this->rejectedBy = $rejectedBy;
        $this->comment = $comment;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Write-Off Ditolak: ' . $this->writeOff->asset?->reg_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.write_off_rejected',
        );
    }
}
