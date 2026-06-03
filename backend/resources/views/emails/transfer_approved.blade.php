@extends('emails.layout')

@section('title', 'Transfer Disetujui')

@section('banner')
<div class="banner approved">
    ✅ Transfer Telah Disetujui Sepenuhnya
</div>
@endsection

@section('content')
<p class="greeting">Yth. Bapak/Ibu,</p>

<p class="message">
    Kami informasikan bahwa transfer <strong>{{ $transfer->transfer_code }}</strong> telah
    <strong>disetujui sepenuhnya</strong> melalui seluruh tahap approval.
    Terlampir dokumen Berita Acara Transfer sebagai bukti persetujuan.
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
        @if($transfer->receive_date)
        <tr>
            <td>Tanggal Disetujui</td>
            <td>: {{ \Carbon\Carbon::parse($transfer->receive_date)->format('d F Y, H:i') }} WIB</td>
        </tr>
        @endif
        <tr>
            <td>Status</td>
            <td>: <span style="color:#16a34a; font-weight:bold;">Approved</span></td>
        </tr>
        @if($transfer->notes)
        <tr>
            <td>Catatan</td>
            <td>: {{ $transfer->notes }}</td>
        </tr>
        @endif
    </table>
</div>

@if($transfer->approvalRequests && $transfer->approvalRequests->isNotEmpty())
@php $logs = $transfer->approvalRequests->first()->logs->where('action', 'Approved'); @endphp
@if($logs->isNotEmpty())
<p style="font-size:13px; font-weight:bold; margin-bottom:8px;">Riwayat Persetujuan:</p>
<table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
    <thead>
        <tr style="background:#f1f5f9;">
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:center; width:50px;">Step</th>
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">Disetujui Oleh</th>
            <th style="border:1px solid #e2e8f0; padding:8px; text-align:left;">Tanggal</th>
        </tr>
    </thead>
    <tbody>
        @foreach($logs->sortBy('sequence') as $log)
        <tr>
            <td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">{{ $log->sequence }}</td>
            <td style="border:1px solid #e2e8f0; padding:8px;">{{ $log->user->name ?? 'System' }}</td>
            <td style="border:1px solid #e2e8f0; padding:8px;">{{ \Carbon\Carbon::parse($log->created_at)->format('d/m/Y H:i') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif
@endif

<p style="font-size:13px; color:#555; margin-bottom:0;">
    Dokumen Berita Acara Transfer terlampir dalam email ini (format PDF).
</p>
@endsection
