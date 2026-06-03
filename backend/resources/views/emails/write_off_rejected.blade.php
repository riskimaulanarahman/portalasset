@extends('emails.layout')

@section('title', 'Write-Off Aset Ditolak')

@section('banner')
<div class="banner rejected">
    ❌ Permohonan Write-Off Aset Ditolak
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Permohonan <strong>Write-Off Aset</strong> yang Anda ajukan telah <strong>ditolak</strong>
    oleh <strong>{{ $rejectedBy }}</strong>.
    Silakan tinjau alasan penolakan di bawah.
</p>

<div class="info-box">
    <table>
        <tr>
            <td>ID Aset</td>
            <td>: <strong>{{ $writeOff->asset?->reg_id ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td>Asset No</td>
            <td>: {{ $writeOff->asset?->asset_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Tipe Aset</td>
            <td>: {{ $writeOff->asset?->type ?? '-' }}</td>
        </tr>
        <tr>
            <td>Estate</td>
            <td>: {{ $writeOff->asset?->estate?->estate ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kondisi</td>
            <td>: {{ $writeOff->kondisi }}</td>
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

<div class="action-note" style="background:#fef2f2; border-color:#fecaca; color:#991b1b;">
    💡 Anda dapat mengajukan kembali permohonan write-off melalui menu <strong>Aset</strong> di Portal Asset.
</div>
@endsection
