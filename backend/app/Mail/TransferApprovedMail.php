<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Mail\Mailables\Attachment;

class TransferApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $transfer;

    /**
     * Create a new message instance.
     */
    public function __construct($transfer)
    {
        $this->transfer = $transfer;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Berita Acara Transfer: ' . $this->transfer->transfer_code,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: '
            <div style="font-family: sans-serif; color: #333;">
                <p>Yth. Bapak/Ibu,</p>
                <p>Terlampir adalah dokumen Berita Acara untuk Transfer dengan kode <b>' . $this->transfer->transfer_code . '</b> yang telah disetujui sepenuhnya.</p>
                <br/>
                <p>Terima kasih,</p>
                <p>Sistem Portal Asset</p>
            </div>
            ',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $pdf = Pdf::loadView('pdfs.transfer_berita_acara', ['transfer' => $this->transfer]);
        
        return [
            Attachment::fromData(fn () => $pdf->output(), 'Berita_Acara_' . $this->transfer->transfer_code . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
