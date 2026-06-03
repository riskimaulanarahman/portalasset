@extends('emails.layout')

@section('title', 'Transfer Ditolak')

@section('banner')
<div class="banner rejected">
    ❌ Transfer Anda Telah Ditolak
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Kami informasikan bahwa permintaan transfer dengan kode <strong>{{ $transfer->transfer_code }}</strong>
    telah <strong>ditolak</strong> oleh <strong>{{ $rejectedBy }}</strong>.
    Silakan tinjau alasan penolakan di bawah dan ajukan kembali jika diperlukan.
</p>

<div class="info-box">
    <table>
        <tr>
            <td>Kode Transfer</td>
            <td>: <strong>{{ $transfer->transfer_code }}</strong></td>
        </tr>
        <tr>
            <td>Tipe</td>
            <td>: {{ $transfer->type }}</td>
        </tr>
        <tr>
            <td>Dari Estate</td>
            <td>: {{ $transfer->fromEstate->estate ?? '-' }}
                @if($transfer->fromEstate) <span style="color:#888;">({{ $transfer->fromEstate->estate_id }})</span> @endif
            </td>
        </tr>
        <tr>
            <td>Ke Estate</td>
            <td>: {{ $transfer->toEstate->estate ?? '-' }}
                @if($transfer->toEstate) <span style="color:#888;">({{ $transfer->toEstate->estate_id }})</span> @endif
            </td>
        </tr>
        <tr>
            <td>Jumlah Item</td>
            <td>: {{ $transfer->items->count() }} item</td>
        </tr>
        <tr>
            <td>Dibuat Oleh</td>
            <td>: {{ $transfer->created_by }}</td>
        </tr>
        <tr>
            <td>Tanggal Transfer</td>
            <td>: {{ \Carbon\Carbon::parse($transfer->transfer_date)->format('d F Y, H:i') }} WIB</td>
        </tr>
        <tr>
            <td>Ditolak Oleh</td>
            <td>: <span style="color:#dc2626; font-weight:bold;">{{ $rejectedBy }}</span></td>
        </tr>
        <tr>
            <td>Status</td>
            <td>: <span style="color:#dc2626; font-weight:bold;">Ditolak</span></td>
        </tr>
    </table>
</div>

@if($comment)
<div class="comment-box">
    <div class="label">Alasan Penolakan</div>
    <div class="text">{{ $comment }}</div>
</div>
@endif

@if($transfer->items->isNotEmpty())
<p style="font-size:13px; font-weight:bold; margin-bottom:8px;">Daftar Item:</p>
<table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
    <thead>
        <tr style="background:#f1f5f9;">
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left; width:40px;">No</th>
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">ID / Kode</th>
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:center; width:60px;">Qty</th>
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">Catatan</th>
        </tr>
    </thead>
    <tbody>
        @foreach($transfer->items as $i => $item)
        <tr>
            <td style="border:1px solid #e2e8f0; padding:8px;">{{ $i + 1 }}</td>
            <td style="border:1px solid #e2e8f0; padding:8px;">{{ $item->item_id }}</td>
            <td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">{{ $item->qty }}</td>
            <td style="border:1px solid #e2e8f0; padding:8px;">{{ $item->notes ?? '-' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

<div class="action-note" style="background:#fef2f2; border-color:#fecaca; color:#991b1b;">
    💡 Anda dapat membuat permintaan transfer baru melalui menu <strong>Transfer</strong> di sistem Portal Asset.
</div>
@endsection
