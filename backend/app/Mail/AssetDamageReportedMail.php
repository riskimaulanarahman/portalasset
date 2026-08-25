<?php

namespace App\Mail;

use App\Models\Asset;
use App\Models\TransCondition;
use App\Models\TransMaintenance;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AssetDamageReportedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Asset $asset,
        public TransCondition $condition,
        public ?TransMaintenance $maintenance = null
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Portal Asset] Laporan Kerusakan Aset: ' . $this->asset->reg_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.asset_damage_reported',
        );
    }
}
