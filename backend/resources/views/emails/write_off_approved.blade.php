@extends('emails.layout')

@section('title', 'Write-Off Aset Disetujui')

@section('banner')
<div class="banner approved">
    ✅ Permohonan Write-Off Aset Telah Disetujui
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Permohonan <strong>Write-Off Aset</strong> yang Anda ajukan telah disetujui.
    Aset telah dinonaktifkan dari sistem. Berita Acara Write-Off dapat diunduh melalui Portal Asset.
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
            <td>: <span style="color:#dc2626; font-weight:bold;">{{ $writeOff->kondisi }}</span></td>
        </tr>
        <tr>
            <td>Status Aset</td>
            <td>: <span style="color:#16a34a; font-weight:bold;">Write-Off (Tidak Aktif)</span></td>
        </tr>
    </table>
</div>

<div class="action-note" style="background:#f0fdf4; border-color:#bbf7d0; color:#15803d;">
    📄 Login ke Portal Asset untuk mengunduh <strong>Berita Acara Write-Off</strong> dari menu Aset.
</div>
@endsection
