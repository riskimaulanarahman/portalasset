<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Write-Off Aset</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h2 { margin: 0; padding: 0; font-size: 16px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #555; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 4px; vertical-align: top; }
        .info-table td:first-child { width: 130px; font-weight: bold; }
        .section-title { font-weight: bold; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 16px 0 8px; }
        .asset-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .asset-table th, .asset-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .asset-table th { background-color: #f5f5f5; font-weight: bold; }
        .kondisi-broken { color: #dc2626; font-weight: bold; }
        .kondisi-bad { color: #d97706; font-weight: bold; }
        .signatures { width: 100%; margin-top: 40px; text-align: center; }
        .signature-box { display: inline-block; width: 22%; margin: 1%; vertical-align: top; }
        .signature-space { height: 60px; margin: 10px 0; display: flex; align-items: center; justify-content: center; }
        .stamp-approved { color: green; font-weight: bold; border: 2px solid green; padding: 5px; border-radius: 5px; transform: rotate(-5deg); display: inline-block; font-size: 14px; }
        .stamp-writeoff { color: #dc2626; font-weight: bold; border: 2px solid #dc2626; padding: 5px; border-radius: 5px; transform: rotate(-5deg); display: inline-block; font-size: 12px; }
        .signature-name { font-weight: bold; text-decoration: underline; }
        .signature-title { font-size: 10px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h2>BERITA ACARA WRITE-OFF ASET</h2>
        <p>Portal Asset &mdash; Manajemen Aset Perkebunan</p>
    </div>

    <div class="section-title">Informasi Aset</div>
    <table class="info-table">
        <tr>
            <td>ID Aset (Reg ID)</td>
            <td>: <strong>{{ $writeOff->asset->reg_id ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td>Asset No</td>
            <td>: {{ $writeOff->asset->asset_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Tipe / Merek</td>
            <td>: {{ trim(($writeOff->asset->type ?? '') . ' / ' . ($writeOff->asset->manufacture ?? '')) }}</td>
        </tr>
        <tr>
            <td>Seri</td>
            <td>: {{ $writeOff->asset->series ?? '-' }}</td>
        </tr>
        <tr>
            <td>Serial No</td>
            <td>: {{ $writeOff->asset->serial_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Estate</td>
            <td>: {{ $writeOff->asset->estate?->estate ?? '-' }}
                @if($writeOff->asset->estate) ({{ $writeOff->asset->estate?->estate_id }}) @endif
            </td>
        </tr>
        <tr>
            <td>Seksi</td>
            <td>: {{ $writeOff->asset->section?->section ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">Detail Pengajuan Write-Off</div>
    <table class="info-table">
        <tr>
            <td>Tanggal Pengajuan</td>
            <td>: {{ \Carbon\Carbon::parse($writeOff->date)->format('d F Y') }}</td>
        </tr>
        <tr>
            <td>Kondisi Aset</td>
            <td>:
                <span class="{{ $writeOff->kondisi === 'Broken' ? 'kondisi-broken' : 'kondisi-bad' }}">
                    {{ $writeOff->kondisi }}
                </span>
            </td>
        </tr>
        <tr>
            <td>Alasan Write-Off</td>
            <td>: {{ $writeOff->keterangan }}</td>
        </tr>
        <tr>
            <td>Diajukan Oleh</td>
            <td>: {{ $writeOff->create_by }}</td>
        </tr>
        @if($approvalRequest)
        <tr>
            <td>Status Approval</td>
            <td>: <strong>{{ $approvalRequest->status }}</strong></td>
        </tr>
        @endif
    </table>

    <div class="section-title">Riwayat Persetujuan</div>
    @if($approvalRequest && $approvalRequest->logs->isNotEmpty())
    <table class="asset-table">
        <thead>
            <tr>
                <th style="width: 40px;">Seq</th>
                <th>Nama Approver</th>
                <th style="width: 80px;">Aksi</th>
                <th style="width: 130px;">Tanggal</th>
                <th>Komentar</th>
            </tr>
        </thead>
        <tbody>
            @foreach($approvalRequest->logs as $log)
            <tr>
                <td>{{ $log->sequence }}</td>
                <td>{{ $log->user?->name ?? 'System' }}</td>
                <td>{{ $log->action }}</td>
                <td>{{ \Carbon\Carbon::parse($log->created_at)->format('d/m/Y H:i') }}</td>
                <td>{{ $log->comment ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @else
    <p style="color:#888;">Tidak ada riwayat approval.</p>
    @endif

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-title">Diajukan Oleh</div>
            <div class="signature-space">
                <div class="stamp-writeoff">WRITE-OFF</div>
            </div>
            <div class="signature-name">{{ $writeOff->create_by }}</div>
            <div class="signature-title">Pemohon</div>
        </div>

        @if($approvalRequest && $approvalRequest->logs->isNotEmpty())
            @foreach($approvalRequest->logs->where('action', 'Approved') as $log)
            <div class="signature-box">
                <div class="signature-title">Disetujui (Seq {{ $log->sequence }})</div>
                <div class="signature-space">
                    <div>
                        <div class="stamp-approved">APPROVED</div>
                        <div style="font-size:9px; margin-top:2px;">{{ \Carbon\Carbon::parse($log->created_at)->format('d/m/Y H:i') }}</div>
                    </div>
                </div>
                <div class="signature-name">{{ $log->user?->name ?? 'System' }}</div>
                <div class="signature-title">Approver</div>
            </div>
            @endforeach
        @endif
    </div>

    <p style="font-size:10px; color:#888; margin-top:40px; text-align:center;">
        Dokumen ini dicetak secara otomatis oleh sistem Portal Asset pada {{ \Carbon\Carbon::now()->format('d F Y, H:i') }} WIB
    </p>
</body>
</html>
