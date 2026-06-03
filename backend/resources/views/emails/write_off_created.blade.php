@extends('emails.layout')

@section('title', 'Permohonan Write-Off Aset')

@section('banner')
<div class="banner created">
    📋 Permohonan Write-Off Aset Baru
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Ada permohonan <strong>Write-Off Aset</strong> yang memerlukan persetujuan Anda.
    Silakan tinjau detail permohonan di bawah ini dan berikan keputusan melalui sistem Portal Asset.
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
            <td>Alasan Write-Off</td>
            <td>: {{ $writeOff->keterangan }}</td>
        </tr>
        <tr>
            <td>Diajukan Oleh</td>
            <td>: {{ $writeOff->create_by }}</td>
        </tr>
        <tr>
            <td>Tanggal Pengajuan</td>
            <td>: {{ \Carbon\Carbon::parse($writeOff->date)->format('d F Y') }}</td>
        </tr>
    </table>
</div>

<div class="action-note">
    💡 Silakan login ke sistem Portal Asset untuk menyetujui atau menolak permohonan ini melalui menu <strong>Persetujuan</strong>.
</div>
@endsection
