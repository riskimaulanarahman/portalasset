@extends('emails.layout')

@section('title', 'Laporan Kerusakan Aset')

@section('banner')
<div class="banner rejected">
    Laporan Kerusakan Aset
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Ada laporan kerusakan aset yang perlu ditinjau oleh HO/admin.
    Detail laporan tercantum di bawah ini.
</p>

<div class="info-box">
    <table>
        <tr>
            <td>ID Aset</td>
            <td>: <strong>{{ $asset->reg_id }}</strong></td>
        </tr>
        <tr>
            <td>Asset No</td>
            <td>: {{ $asset->asset_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Tipe Aset</td>
            <td>: {{ trim(($asset->type ?? '') . ' ' . ($asset->manufacture ?? '') . ' ' . ($asset->series ?? '')) ?: '-' }}</td>
        </tr>
        <tr>
            <td>Estate</td>
            <td>: {{ $asset->estate?->estate ?? '-' }}</td>
        </tr>
        <tr>
            <td>Kondisi</td>
            <td>: <strong>{{ $condition->kondisi }}</strong></td>
        </tr>
        <tr>
            <td>Tanggal Laporan</td>
            <td>: {{ optional($condition->date)->format('d F Y') ?? '-' }}</td>
        </tr>
        <tr>
            <td>Keterangan</td>
            <td>: {{ $condition->remarks ?? '-' }}</td>
        </tr>
        <tr>
            <td>Maintenance</td>
            <td>: {{ $maintenance ? 'Dibuat - ' . $maintenance->status : 'Tidak dibuat' }}</td>
        </tr>
        <tr>
            <td>Dilaporkan Oleh</td>
            <td>: {{ $condition->create_by ?? '-' }}</td>
        </tr>
    </table>
</div>

<div class="action-note">
    Silakan login ke Portal Asset untuk meninjau detail aset, maintenance progress, atau melanjutkan proses write-off jika diperlukan.
</div>
@endsection
