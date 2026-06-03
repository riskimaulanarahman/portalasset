<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Transfer</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h2 { margin: 0; padding: 0; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 4px; }
        .info-table td:first-child { width: 120px; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .items-table th { background-color: #f5f5f5; font-weight: bold; }
        .signatures { width: 100%; margin-top: 40px; text-align: center; }
        .signature-box { display: inline-block; width: 22%; margin: 1%; vertical-align: top; }
        .signature-space { height: 60px; margin: 10px 0; display: flex; align-items: center; justify-content: center; }
        .stamp-approved { color: green; font-weight: bold; border: 2px solid green; padding: 5px; border-radius: 5px; transform: rotate(-5deg); display: inline-block; font-size: 14px;}
        .signature-name { font-weight: bold; text-decoration: underline; }
        .signature-title { font-size: 10px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h2>BERITA ACARA TRANSFER {{ strtoupper($transfer->type) }}</h2>
        <p>No. {{ $transfer->transfer_code }}</p>
    </div>

    <table class="info-table">
        <tr>
            <td>Tanggal Transfer</td>
            <td>: {{ \Carbon\Carbon::parse($transfer->transfer_date)->format('d F Y') }}</td>
        </tr>
        <tr>
            <td>Dari Estate</td>
            <td>: {{ $transfer->fromEstate->estate ?? $transfer->from_estate_id }} @if($transfer->fromEstate) ({{ $transfer->fromEstate->estate_id }}) @endif</td>
        </tr>
        <tr>
            <td>Ke Estate</td>
            <td>: {{ $transfer->toEstate->estate ?? $transfer->to_estate_id }} @if($transfer->toEstate) ({{ $transfer->toEstate->estate_id }}) @endif</td>
        </tr>
        <tr>
            <td>Status</td>
            <td>: {{ $transfer->status }}</td>
        </tr>
        @if($transfer->notes)
        <tr>
            <td>Catatan</td>
            <td>: {{ $transfer->notes }}</td>
        </tr>
        @endif
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50px;">No</th>
                <th>Tipe Asset/Material</th>
                <th>ID/Kode Barang</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th>Catatan Item</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transfer->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item->item_type }}</td>
                <td>{{ $item->item_id }}</td>
                <td style="text-align: center;">{{ $item->qty }}</td>
                <td>{{ $item->notes ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-title">Dibuat Oleh</div>
            <div class="signature-space">
                <!-- Creator Signature Space -->
                <div class="stamp-approved" style="color: blue; border-color: blue;">SUBMITTED</div>
            </div>
            <div class="signature-name">{{ $transfer->created_by }}</div>
            <div class="signature-title">Creator</div>
        </div>

        @if($transfer->approvalRequests && $transfer->approvalRequests->isNotEmpty())
            @php
                $approvalRequest = $transfer->approvalRequests->first();
                $logs = $approvalRequest->logs;
            @endphp
            
            @foreach($logs as $log)
                @if($log->action === 'Approved')
                <div class="signature-box">
                    <div class="signature-title">Disetujui Oleh (Seq {{ $log->sequence }})</div>
                    <div class="signature-space">
                        <div class="stamp-approved">APPROVED</div>
                        <div style="font-size: 9px; display:block; margin-top:2px;">{{ \Carbon\Carbon::parse($log->created_at)->format('d/m/Y H:i') }}</div>
                    </div>
                    <div class="signature-name">{{ $log->user ? $log->user->name : 'System' }}</div>
                    <div class="signature-title">Approver</div>
                </div>
                @endif
            @endforeach
        @endif

        <div class="signature-box">
            <div class="signature-title">Diterima Oleh</div>
            <div class="signature-space" style="{{ $transfer->anggotaPenerima ? 'height: 60px;' : 'border-bottom: 1px dotted #ccc; width: 80%; margin: 30px auto 10px auto; height: 30px;' }}">
                @if($transfer->anggotaPenerima)
                    <div class="stamp-approved">RECEIVED</div>
                @endif
            </div>
            <div class="signature-name">
                @if($transfer->anggotaPenerima)
                    {{ $transfer->anggotaPenerima->nama }}
                @else
                    (.....................................)
                @endif
            </div>
            <div class="signature-title">Anggota Penerima</div>
        </div>
    </div>
</body>
</html>
