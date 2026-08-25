@php
    use Carbon\Carbon;

    $asset = $writeOff->asset;
    $estateCode = $asset?->estate?->estate_id ?? 'NA';
    $documentNo = 'BA-WO/' . $estateCode . '/' . str_pad((string) $writeOff->id, 5, '0', STR_PAD_LEFT) . '/' . Carbon::parse($writeOff->date)->format('Y');
    $approvalLogs = $approvalRequest?->logs?->sortBy([['sequence', 'asc'], ['created_at', 'asc']]) ?? collect();
    $approvedLogs = $approvalLogs->where('action', 'Approved');
    $latestDamageCondition = $asset?->conditions
        ? $asset->conditions
            ->filter(fn ($condition) => in_array($condition->kondisi, ['Bad', 'Broken'], true))
            ->sortByDesc('date')
            ->first()
        : null;
    $latestMaintenance = $asset?->maintenances ? $asset->maintenances->sortByDesc('create_date')->first() : null;
    $finalApprovedAt = $approvedLogs->sortByDesc('created_at')->first()?->created_at;
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Write-Off Aset</title>
    <style>
        @page { margin: 28px 32px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.35; }
        .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 17px; letter-spacing: .4px; }
        .header p { margin: 3px 0 0; font-size: 10px; color: #4b5563; }
        .doc-no { margin-top: 6px; font-size: 12px; font-weight: bold; }
        .intro { margin: 12px 0 16px; text-align: justify; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 8px; margin: 14px 0 0; }
        table { width: 100%; border-collapse: collapse; }
        .info-table td { border: 1px solid #d1d5db; padding: 6px 7px; vertical-align: top; }
        .info-table td:first-child { width: 150px; background: #f9fafb; font-weight: bold; color: #374151; }
        .items-table th, .items-table td { border: 1px solid #d1d5db; padding: 6px 7px; vertical-align: top; }
        .items-table th { background: #f9fafb; font-weight: bold; text-align: left; }
        .status-approved { color: #166534; font-weight: bold; }
        .status-writeoff { color: #991b1b; font-weight: bold; }
        .muted { color: #6b7280; }
        .statement { border: 1px solid #d1d5db; border-top: 0; padding: 8px; text-align: justify; }
        .signature-wrapper { margin-top: 28px; width: 100%; text-align: center; }
        .signature-box { display: inline-block; width: 30%; margin: 0 1%; vertical-align: top; text-align: center; }
        .signature-role { font-size: 10px; color: #4b5563; min-height: 28px; }
        .signature-stamp { height: 58px; padding-top: 16px; }
        .stamp-approved { display: inline-block; color: #166534; border: 2px solid #166534; padding: 5px 8px; font-size: 11px; font-weight: bold; }
        .stamp-writeoff { display: inline-block; color: #991b1b; border: 2px solid #991b1b; padding: 5px 8px; font-size: 11px; font-weight: bold; }
        .signature-name { font-weight: bold; text-decoration: underline; min-height: 16px; }
        .footer { position: fixed; bottom: -14px; left: 0; right: 0; text-align: center; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>BERITA ACARA WRITE-OFF ASET</h1>
        <p>Portal Asset - Dokumen hasil approval penghapusan/nonaktif aset</p>
        <div class="doc-no">No. {{ $documentNo }}</div>
    </div>

    <p class="intro">
        Pada tanggal {{ $finalApprovedAt ? Carbon::parse($finalApprovedAt)->format('d F Y') : Carbon::parse($writeOff->date)->format('d F Y') }},
        berdasarkan pengajuan write-off dan persetujuan yang tercatat di Portal Asset, aset berikut dinyatakan
        <span class="status-writeoff">WRITE-OFF / TIDAK AKTIF</span> dari daftar aset operasional.
    </p>

    <div class="section-title">1. Identitas Aset</div>
    <table class="info-table">
        <tr>
            <td>Reg ID</td>
            <td><strong>{{ $asset?->reg_id ?? '-' }}</strong></td>
            <td>Asset No</td>
            <td>{{ $asset?->asset_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Tipe / Merek / Seri</td>
            <td>{{ trim(($asset?->type ?? '-') . ' / ' . ($asset?->manufacture ?? '-') . ' / ' . ($asset?->series ?? '-')) }}</td>
            <td>Serial No</td>
            <td>{{ $asset?->serial_no ?? '-' }}</td>
        </tr>
        <tr>
            <td>Estate</td>
            <td>{{ $asset?->estate?->estate ?? '-' }} @if($asset?->estate) ({{ $asset->estate->estate_id }}) @endif</td>
            <td>Section</td>
            <td>{{ $asset?->section?->section ?? '-' }}</td>
        </tr>
        <tr>
            <td>Department / Divisi</td>
            <td>{{ $asset?->department?->name ?? '-' }} / {{ $asset?->division?->name ?? '-' }}</td>
            <td>Status Akhir</td>
            <td><span class="status-writeoff">Tidak Aktif / Write-Off</span></td>
        </tr>
    </table>

    <div class="section-title">2. Dasar Laporan Kerusakan</div>
    <table class="info-table">
        <tr>
            <td>Tanggal Kondisi</td>
            <td>{{ $latestDamageCondition?->date ? Carbon::parse($latestDamageCondition->date)->format('d F Y') : '-' }}</td>
            <td>Kondisi</td>
            <td><span class="status-writeoff">{{ $latestDamageCondition?->kondisi ?? $writeOff->kondisi }}</span></td>
        </tr>
        <tr>
            <td>Catatan Kerusakan</td>
            <td colspan="3">{{ $latestDamageCondition?->remarks ?? $writeOff->keterangan ?? '-' }}</td>
        </tr>
        <tr>
            <td>Dilaporkan Oleh</td>
            <td>{{ $latestDamageCondition?->create_by ?? '-' }}</td>
            <td>Tanggal Input</td>
            <td>{{ $latestDamageCondition?->create_date ? Carbon::parse($latestDamageCondition->create_date)->format('d/m/Y H:i') : '-' }}</td>
        </tr>
    </table>

    <div class="section-title">3. Ringkasan Maintenance/Tindak Lanjut</div>
    <table class="info-table">
        <tr>
            <td>Status Maintenance</td>
            <td>{{ $latestMaintenance?->status ?? 'Tidak ada maintenance terkait' }}</td>
            <td>Target</td>
            <td>{{ $latestMaintenance?->target ? Carbon::parse($latestMaintenance->target)->format('d F Y') : '-' }}</td>
        </tr>
        <tr>
            <td>PIC / Tujuan</td>
            <td>{{ $latestMaintenance?->nama1 ?? '-' }} @if($latestMaintenance?->sap1) ({{ $latestMaintenance->sap1 }}) @endif</td>
            <td>Dikirim Ke</td>
            <td>{{ $latestMaintenance?->sent_ ?? '-' }}</td>
        </tr>
        <tr>
            <td>Keterangan</td>
            <td colspan="3">{{ $latestMaintenance?->keterangan ?? '-' }}</td>
        </tr>
        <tr>
            <td>Tindak Lanjut</td>
            <td colspan="3">{{ $latestMaintenance?->action_remark ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">4. Detail Pengajuan Write-Off</div>
    <table class="info-table">
        <tr>
            <td>Tanggal Pengajuan</td>
            <td>{{ $writeOff->date ? Carbon::parse($writeOff->date)->format('d F Y') : '-' }}</td>
            <td>Kondisi Pengajuan</td>
            <td><span class="status-writeoff">{{ $writeOff->kondisi }}</span></td>
        </tr>
        <tr>
            <td>Diajukan Oleh</td>
            <td>{{ $writeOff->create_by ?? $approvalRequest?->requester?->name ?? '-' }}</td>
            <td>Status Approval</td>
            <td><span class="status-approved">{{ $approvalRequest?->status ?? '-' }}</span></td>
        </tr>
        <tr>
            <td>Alasan Write-Off</td>
            <td colspan="3">{{ $writeOff->keterangan ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">5. Riwayat Persetujuan</div>
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
        <div class="statement muted">Belum ada riwayat approval.</div>
    @endif

    <div class="section-title">6. Pernyataan</div>
    <div class="statement">
        Dengan disetujuinya berita acara ini, asset dengan Reg ID <strong>{{ $asset?->reg_id ?? '-' }}</strong>
        dinyatakan tidak digunakan lagi secara operasional dan statusnya di Portal Asset menjadi
        <strong>Tidak Aktif</strong>. Dokumen ini menjadi bukti audit atas proses write-off yang telah melalui workflow approval.
    </div>

    <div class="signature-wrapper">
        <div class="signature-box">
            <div class="signature-role">Diajukan Oleh</div>
            <div class="signature-stamp"><span class="stamp-writeoff">SUBMITTED</span></div>
            <div class="signature-name">{{ $writeOff->create_by ?? '-' }}</div>
            <div class="muted">Requester</div>
        </div>

        <div class="signature-box">
            <div class="signature-role">Disetujui Oleh</div>
            <div class="signature-stamp"><span class="stamp-approved">APPROVED</span></div>
            <div class="signature-name">
                {{ $approvedLogs->last()?->user?->name ?? $approvedLogs->last()?->user?->username ?? '-' }}
            </div>
            <div class="muted">Final Approver</div>
        </div>

        <div class="signature-box">
            <div class="signature-role">Diketahui HO/Admin</div>
            <div class="signature-stamp"><span class="stamp-approved">VERIFIED</span></div>
            <div class="signature-name">
                {{ $approvedLogs->first(fn ($log) => $log->user?->hasRole('admin'))?->user?->name ?? 'Portal Asset' }}
            </div>
            <div class="muted">HO/Admin</div>
        </div>
    </div>

    <div class="footer">
        Dicetak otomatis oleh Portal Asset pada {{ Carbon::now()->format('d F Y H:i') }}. Dokumen valid bila status approval = Approved.
    </div>
</body>
</html>
