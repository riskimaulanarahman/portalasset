@php
    use Carbon\Carbon;

    $estateCode = $opname->estate?->estate_id ?? 'NA';
    $documentNo = 'BA-SO/' . $estateCode . '/' . str_pad((string) $opname->id, 5, '0', STR_PAD_LEFT) . '/' . Carbon::parse($opname->opname_date)->format('Y');
    $approvalLogs = $approvalRequest?->logs?->sortBy([['sequence', 'asc'], ['created_at', 'asc']]) ?? collect();
    $approvedLogs = $approvalLogs->where('action', 'Approved');
    $varianceItems = $opname->items->filter(fn ($item) => (float) $item->variance_qty !== 0.0);
    $shortageCount = $varianceItems->where('variance_type', 'Shortage')->count();
    $surplusCount = $varianceItems->where('variance_type', 'Surplus')->count();
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Stock Opname Material</title>
    <style>
        @page { margin: 24px 28px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; line-height: 1.3; }
        .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 9px; margin-bottom: 12px; }
        .header h1 { margin: 0; font-size: 16px; letter-spacing: .3px; }
        .header p { margin: 3px 0 0; color: #4b5563; }
        .doc-no { margin-top: 5px; font-size: 11px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; background: #f3f4f6; border: 1px solid #d1d5db; padding: 5px 7px; margin: 10px 0 0; }
        .info-table td { border: 1px solid #d1d5db; padding: 5px 6px; vertical-align: top; }
        .info-table td:first-child, .info-table td:nth-child(3) { width: 120px; background: #f9fafb; font-weight: bold; color: #374151; }
        .summary-table td { border: 1px solid #d1d5db; padding: 6px 7px; text-align: center; }
        .summary-label { background: #f9fafb; color: #4b5563; font-weight: bold; }
        .summary-value { font-size: 13px; font-weight: bold; }
        .items-table th, .items-table td { border: 1px solid #d1d5db; padding: 4px 5px; vertical-align: top; }
        .items-table th { background: #f9fafb; font-weight: bold; text-align: left; }
        .right { text-align: right; }
        .center { text-align: center; }
        .muted { color: #6b7280; }
        .positive { color: #166534; font-weight: bold; }
        .negative { color: #991b1b; font-weight: bold; }
        .statement { border: 1px solid #d1d5db; border-top: 0; padding: 7px; text-align: justify; }
        .signature-wrapper { margin-top: 22px; width: 100%; text-align: center; }
        .signature-box { display: inline-block; width: 30%; margin: 0 1%; vertical-align: top; text-align: center; }
        .signature-role { font-size: 9px; color: #4b5563; min-height: 24px; }
        .signature-stamp { height: 48px; padding-top: 12px; }
        .stamp { display: inline-block; border: 2px solid #166534; color: #166534; padding: 4px 7px; font-size: 10px; font-weight: bold; }
        .stamp-blue { border-color: #1d4ed8; color: #1d4ed8; }
        .signature-name { font-weight: bold; text-decoration: underline; min-height: 15px; }
        .footer { position: fixed; bottom: -12px; left: 0; right: 0; text-align: center; font-size: 8px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>BERITA ACARA STOCK OPNAME MATERIAL</h1>
        <p>Portal Asset - Dokumen final hasil stock opname dan adjustment material</p>
        <div class="doc-no">No. {{ $documentNo }}</div>
    </div>

    <div class="section-title">1. Informasi Sesi</div>
    <table class="info-table">
        <tr>
            <td>Kode Opname</td>
            <td><strong>{{ $opname->opname_code }}</strong></td>
            <td>Status</td>
            <td><strong>{{ $opname->status }}</strong></td>
        </tr>
        <tr>
            <td>Estate</td>
            <td>{{ $opname->estate?->estate ?? '-' }} @if($opname->estate) ({{ $opname->estate->estate_id }}) @endif</td>
            <td>Section</td>
            <td>{{ $opname->section?->section ?? 'All sections' }}</td>
        </tr>
        <tr>
            <td>Tanggal Opname</td>
            <td>{{ $opname->opname_date ? Carbon::parse($opname->opname_date)->format('d F Y') : '-' }}</td>
            <td>Snapshot</td>
            <td>{{ $opname->snapshot_at ? Carbon::parse($opname->snapshot_at)->format('d/m/Y H:i') : '-' }}</td>
        </tr>
        <tr>
            <td>Dibuat Oleh</td>
            <td>{{ $opname->created_by ?? '-' }}</td>
            <td>Diposting Oleh</td>
            <td>{{ $opname->posted_by ?? '-' }} / {{ $opname->posted_at ? Carbon::parse($opname->posted_at)->format('d/m/Y H:i') : '-' }}</td>
        </tr>
        <tr>
            <td>Catatan</td>
            <td colspan="3">{{ $opname->notes ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">2. Ringkasan Hasil</div>
    <table class="summary-table">
        <tr>
            <td class="summary-label">Total Item</td>
            <td class="summary-label">Item Counted</td>
            <td class="summary-label">Variance Item</td>
            <td class="summary-label">Shortage</td>
            <td class="summary-label">Surplus</td>
            <td class="summary-label">Variance Qty</td>
            <td class="summary-label">Variance Value</td>
        </tr>
        <tr>
            <td class="summary-value">{{ number_format((float) $opname->total_items, 1) }}</td>
            <td class="summary-value">{{ number_format((float) $opname->counted_items, 1) }}</td>
            <td class="summary-value">{{ number_format((float) $varianceItems->count(), 0) }}</td>
            <td class="summary-value negative">{{ number_format((float) $shortageCount, 0) }}</td>
            <td class="summary-value positive">{{ number_format((float) $surplusCount, 0) }}</td>
            <td class="summary-value {{ (float) $opname->total_variance_qty < 0 ? 'negative' : ((float) $opname->total_variance_qty > 0 ? 'positive' : '') }}">
                {{ number_format((float) $opname->total_variance_qty, 1) }}
            </td>
            <td class="summary-value {{ (float) $opname->total_variance_value < 0 ? 'negative' : ((float) $opname->total_variance_value > 0 ? 'positive' : '') }}">
                {{ number_format((float) $opname->total_variance_value, 2) }}
            </td>
        </tr>
    </table>

    <div class="section-title">3. Detail Material</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 24px;">No</th>
                <th style="width: 76px;">Kode</th>
                <th>Material</th>
                <th style="width: 48px;">Unit</th>
                <th style="width: 54px;" class="right">System</th>
                <th style="width: 54px;" class="right">Fisik</th>
                <th style="width: 54px;" class="right">Variance</th>
                <th style="width: 58px;" class="right">Value</th>
                <th>Alasan / Kondisi</th>
                <th style="width: 62px;">Transaksi</th>
            </tr>
        </thead>
        <tbody>
            @foreach($opname->items as $index => $item)
                <tr>
                    <td class="center">{{ $index + 1 }}</td>
                    <td>{{ $item->material_code }}</td>
                    <td>{{ $item->material_name }}</td>
                    <td>{{ $item->unit?->nama ?? '-' }}</td>
                    <td class="right">{{ number_format((float) $item->system_stock_snapshot, 1) }}</td>
                    <td class="right">{{ number_format((float) $item->final_physical_stock, 1) }}</td>
                    <td class="right {{ (float) $item->variance_qty < 0 ? 'negative' : ((float) $item->variance_qty > 0 ? 'positive' : '') }}">
                        {{ number_format((float) $item->variance_qty, 1) }}
                    </td>
                    <td class="right {{ (float) $item->variance_value < 0 ? 'negative' : ((float) $item->variance_value > 0 ? 'positive' : '') }}">
                        {{ number_format((float) $item->variance_value, 2) }}
                    </td>
                    <td>{{ $item->variance_reason ?: '-' }} @if($item->condition_note) / {{ $item->condition_note }} @endif</td>
                    <td>{{ $item->transaction_id ? '#' . $item->transaction_id : '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">4. Riwayat Approval</div>
    @if($approvalLogs->isNotEmpty())
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 35px;">Seq</th>
                    <th style="width: 135px;">Approver</th>
                    <th style="width: 75px;">Aksi</th>
                    <th style="width: 105px;">Tanggal</th>
                    <th>Komentar</th>
                </tr>
            </thead>
            <tbody>
                @foreach($approvalLogs as $log)
                    <tr>
                        <td>{{ $log->sequence }}</td>
                        <td>{{ $log->user?->name ?? $log->user?->username ?? 'System' }}</td>
                        <td>{{ $log->action }}</td>
                        <td>{{ $log->created_at ? Carbon::parse($log->created_at)->format('d/m/Y H:i') : '-' }}</td>
                        <td>{{ $log->comment ?? '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="statement muted">Tidak ada riwayat approval.</div>
    @endif

    <div class="section-title">5. Pernyataan</div>
    <div class="statement">
        Dengan status <strong>Posted</strong>, hasil stock opname ini telah memposting adjustment material ke stok sistem
        dan mencatat transaksi IN/OUT untuk setiap item yang memiliki variance. Dokumen ini menjadi bukti audit atas
        proses stock opname material pada estate {{ $opname->estate?->estate ?? '-' }}.
    </div>

    <div class="signature-wrapper">
        <div class="signature-box">
            <div class="signature-role">Dibuat / Dihitung Oleh</div>
            <div class="signature-stamp"><span class="stamp stamp-blue">COUNTED</span></div>
            <div class="signature-name">{{ $opname->created_by ?? '-' }}</div>
            <div class="muted">Counter</div>
        </div>
        <div class="signature-box">
            <div class="signature-role">Direview Oleh</div>
            <div class="signature-stamp"><span class="stamp">REVIEWED</span></div>
            <div class="signature-name">{{ $opname->submitted_by ?? $approvalRequest?->requester?->name ?? '-' }}</div>
            <div class="muted">Reviewer</div>
        </div>
        <div class="signature-box">
            <div class="signature-role">Disetujui / Diposting Oleh</div>
            <div class="signature-stamp"><span class="stamp">APPROVED</span></div>
            <div class="signature-name">{{ $approvedLogs->last()?->user?->name ?? $approvedLogs->last()?->user?->username ?? $opname->posted_by ?? '-' }}</div>
            <div class="muted">Final Approver</div>
        </div>
    </div>

    <div class="footer">
        Dicetak otomatis oleh Portal Asset pada {{ Carbon::now()->format('d F Y H:i') }}. Dokumen valid bila status stock opname = Posted.
    </div>
</body>
</html>
