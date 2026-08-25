# Rancangan Stock Opname Materials

Dokumen ini merancang modul stock opname material untuk Portal Asset berdasarkan struktur sistem saat ini:

- Backend Laravel API dengan model `Material`, `Transaction`, `ApprovalRequest`, dan Spatie permission.
- Frontend React dengan halaman operasional seperti `MaterialsPage`, `TransactionsPage`, `TransfersPage`, dan `ApprovalsPage`.
- Scope data berbasis estate melalui `InteractsWithEstateScope`.
- Audit perubahan master material melalui `Auditable`.

Istilah "stock opname" dipakai untuk proses membandingkan stok sistem dengan hitungan fisik material, lalu memposting adjustment resmi setelah diverifikasi dan disetujui.

## Tujuan

Modul stock opname harus:

- Membuat snapshot stok sistem pada saat sesi opname dimulai.
- Mengizinkan tim lapangan mengisi hasil hitung fisik tanpa langsung mengubah `materials.stock`.
- Menghitung selisih secara otomatis per material.
- Mendukung recount untuk selisih signifikan.
- Memisahkan peran pencatat, verifier, dan approver.
- Memposting adjustment hanya setelah approval final.
- Mencatat semua adjustment ke `transactions` dan histori opname.
- Menjaga scope estate agar user estate hanya bisa opname estate miliknya, sedangkan Head Office bisa memilih estate.

## Prinsip Best Practice

1. Snapshot, bukan live compare.
   Stok sistem yang dibandingkan harus stok pada waktu sesi dibuat (`system_stock_snapshot`). Jika ada transaksi masuk/keluar setelah snapshot, transaksi tersebut tidak mengubah baseline sesi.

2. No direct stock edit.
   Hasil opname tidak boleh langsung mengupdate `materials.stock`. Perubahan stok hanya terjadi saat posting adjustment final.

3. Segregation of duties.
   User yang membuat/mengisi opname sebaiknya tidak menjadi approver final untuk sesi yang sama.

4. Recount untuk variance material.
   Selisih di atas toleransi jumlah atau nilai harus masuk status `Need Recount` atau wajib diberi alasan.

5. Adjustment traceable.
   Setiap selisih yang diposting harus punya referensi ke sesi opname, detail item, user, waktu, dan alasan.

6. Idempotent posting.
   Approval final tidak boleh bisa memposting adjustment dua kali. Gunakan flag `posted_at` dan transaksi database dengan `lockForUpdate`.

7. Estate scoped.
   Satu sesi opname hanya berlaku untuk satu estate. Head Office bisa melihat semua atau membuat sesi untuk estate tertentu.

## Ruang Lingkup MVP

MVP yang disarankan:

- Sesi opname per estate dan optional per section.
- Generate item snapshot dari semua material aktif yang masuk filter.
- Input hitung fisik manual per material.
- Bulk import CSV untuk hasil hitung.
- Review variance.
- Submit approval.
- Approval final memposting adjustment ke stok material dan transaksi.
- Export hasil opname CSV.

Di luar MVP:

- Mobile barcode scanning.
- Blind count penuh tanpa menampilkan stok sistem ke counter.
- Multi-counter parallel count.
- Integrasi timbangan/RFID.

## Alur Proses

### 1. Draft

User dengan permission `create-material-stock-opnames` membuat sesi:

- Pilih estate.
- Pilih tanggal opname.
- Optional pilih section.
- Isi catatan.
- Sistem mengambil snapshot material aktif.

Status sesi: `Draft`.

Pada tahap ini item dapat diregenerasi selama belum ada hasil hitung fisik.

### 2. Counting

User membuka sesi dan mengisi:

- `physical_stock`
- `counted_by`
- `counted_at`
- `condition_note`
- `variance_reason`, jika ada selisih

Status sesi: `Counting`.

Setiap item yang sudah diisi diberi status `Counted`.

### 3. Review

User submit sesi untuk review.

Sistem menghitung:

- `variance_qty = physical_stock - system_stock_snapshot`
- `variance_value = variance_qty * price_snapshot`
- `variance_type = Match | Surplus | Shortage`

Jika variance melebihi toleransi dan belum ada alasan, submit ditolak.

Status sesi: `Review`.

### 4. Recount

Verifier bisa menandai item untuk recount.

Status item: `Need Recount`.

Setelah recount:

- `recount_stock`
- `recounted_by`
- `recounted_at`
- `final_physical_stock`

Status item: `Reviewed`.

### 5. Submit Approval

Jika semua item valid, sesi masuk approval generic dengan:

- `reference_table = material_stock_opnames`
- `reference_id = session id`
- workflow `module_name = Material Stock Opname`

Status sesi: `Pending Approval`.

### 6. Final Approval dan Posting

Saat approval terakhir disetujui:

- Lock sesi opname.
- Pastikan `posted_at` masih null.
- Lock setiap material.
- Posting adjustment:
  - Jika variance positif, tambah `materials.stock`.
  - Jika variance negatif, kurangi `materials.stock`.
- Buat baris `transactions` untuk setiap item selisih.
- Update item dengan stok sebelum/sesudah posting.
- Update sesi `status = Posted`, `posted_by`, `posted_at`.

Jika approval ditolak:

- Status sesi `Rejected`.
- Tidak ada perubahan stok.

### 7. Cancel

Sesi dapat dibatalkan hanya jika belum posted.

Status sesi: `Cancelled`.

## Status

### Status Sesi

- `Draft`
- `Counting`
- `Review`
- `Pending Approval`
- `Rejected`
- `Posted`
- `Cancelled`

### Status Item

- `Open`
- `Counted`
- `Need Recount`
- `Reviewed`
- `Posted`
- `Skipped`

## Rancangan Database

### material_stock_opnames

Tabel header sesi opname.

```php
Schema::create('material_stock_opnames', function (Blueprint $table) {
    $table->id();
    $table->string('opname_code', 40)->unique();
    $table->foreignId('estate_id')->constrained('estates')->noActionOnDelete();
    $table->foreignId('section_id')->nullable()->constrained('sections')->noActionOnDelete();
    $table->date('opname_date');
    $table->dateTime('snapshot_at');
    $table->enum('status', [
        'Draft',
        'Counting',
        'Review',
        'Pending Approval',
        'Rejected',
        'Posted',
        'Cancelled',
    ])->default('Draft');
    $table->unsignedInteger('total_items')->default(0);
    $table->unsignedInteger('counted_items')->default(0);
    $table->decimal('total_variance_qty', 12, 1)->default(0);
    $table->decimal('total_variance_value', 18, 2)->default(0);
    $table->text('notes')->nullable();
    $table->string('created_by', 100)->nullable();
    $table->string('submitted_by', 100)->nullable();
    $table->dateTime('submitted_at')->nullable();
    $table->string('posted_by', 100)->nullable();
    $table->dateTime('posted_at')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['estate_id', 'status']);
    $table->index(['opname_date', 'estate_id']);
});
```

### material_stock_opname_items

Tabel detail snapshot dan hasil hitung.

```php
Schema::create('material_stock_opname_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('opname_id')->constrained('material_stock_opnames')->cascadeOnDelete();
    $table->string('material_code', 25);
    $table->foreign('material_code')->references('code')->on('materials')->noActionOnDelete();
    $table->string('material_name', 150);
    $table->foreignId('category_id')->nullable()->constrained('categories')->noActionOnDelete();
    $table->foreignId('unit_id')->nullable()->constrained('units')->noActionOnDelete();
    $table->foreignId('section_id')->nullable()->constrained('sections')->noActionOnDelete();
    $table->decimal('system_stock_snapshot', 12, 1);
    $table->decimal('physical_stock', 12, 1)->nullable();
    $table->decimal('recount_stock', 12, 1)->nullable();
    $table->decimal('final_physical_stock', 12, 1)->nullable();
    $table->decimal('variance_qty', 12, 1)->default(0);
    $table->decimal('price_snapshot', 18, 2)->nullable();
    $table->decimal('variance_value', 18, 2)->default(0);
    $table->enum('variance_type', ['Match', 'Surplus', 'Shortage'])->default('Match');
    $table->enum('status', ['Open', 'Counted', 'Need Recount', 'Reviewed', 'Posted', 'Skipped'])->default('Open');
    $table->text('variance_reason')->nullable();
    $table->text('condition_note')->nullable();
    $table->decimal('stock_before_posting', 12, 1)->nullable();
    $table->decimal('stock_after_posting', 12, 1)->nullable();
    $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
    $table->string('counted_by', 100)->nullable();
    $table->dateTime('counted_at')->nullable();
    $table->string('reviewed_by', 100)->nullable();
    $table->dateTime('reviewed_at')->nullable();
    $table->timestamps();

    $table->unique(['opname_id', 'material_code']);
    $table->index(['material_code', 'status']);
    $table->index(['opname_id', 'variance_type']);
});
```

### material_stock_opname_logs

Tabel log aktivitas tambahan untuk event domain opname.

```php
Schema::create('material_stock_opname_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('opname_id')->constrained('material_stock_opnames')->cascadeOnDelete();
    $table->foreignId('item_id')->nullable()->constrained('material_stock_opname_items')->cascadeOnDelete();
    $table->string('action', 50);
    $table->string('actor', 100)->nullable();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();

    $table->index(['opname_id', 'action']);
});
```

Catatan: sistem sudah memiliki `audit_logs`, tetapi log domain tetap berguna untuk timeline yang mudah dibaca user.

## Model Laravel

Tambahkan model:

- `MaterialStockOpname`
- `MaterialStockOpnameItem`
- `MaterialStockOpnameLog`

Relasi utama:

- `MaterialStockOpname belongsTo Estate`
- `MaterialStockOpname belongsTo Section`
- `MaterialStockOpname hasMany MaterialStockOpnameItem`
- `MaterialStockOpname hasMany ApprovalRequest` melalui `reference_table/reference_id`
- `MaterialStockOpnameItem belongsTo Material`
- `MaterialStockOpnameItem belongsTo Transaction`

Tambahkan method pada `MaterialStockOpname`:

```php
public function getApprovalEstateId(): ?int
{
    return $this->estate_id;
}
```

Method ini membuat approval existing tetap bisa memfilter approval sesuai estate.

## Rancangan Service

Buat service `MaterialStockOpnameService`.

Tanggung jawab:

- `createSession(array $payload, User $actor)`
- `generateSnapshot(MaterialStockOpname $opname)`
- `updateCount(MaterialStockOpnameItem $item, array $payload, User $actor)`
- `submitReview(MaterialStockOpname $opname, User $actor)`
- `markNeedRecount(MaterialStockOpnameItem $item, string $reason, User $actor)`
- `submitForApproval(MaterialStockOpname $opname, User $actor)`
- `postAdjustments(MaterialStockOpname $opname, User $actor)`
- `cancel(MaterialStockOpname $opname, User $actor)`

Posting harus memakai `DB::transaction()` dan `lockForUpdate()`:

```php
DB::transaction(function () use ($opname, $actor) {
    $lockedOpname = MaterialStockOpname::whereKey($opname->id)->lockForUpdate()->firstOrFail();

    if ($lockedOpname->posted_at) {
        return;
    }

    foreach ($lockedOpname->items()->where('variance_qty', '<>', 0)->get() as $item) {
        $material = Material::where('code', $item->material_code)->lockForUpdate()->firstOrFail();
        $before = (float) $material->stock;
        $variance = (float) $item->variance_qty;
        $after = $before + $variance;

        if ($after < 0) {
            throw ValidationException::withMessages([
                'items' => ["Posting membuat stok {$material->code} menjadi negatif."],
            ]);
        }

        $transaction = Transaction::create([
            'date' => $lockedOpname->opname_date,
            'code' => $material->code,
            'type' => $variance > 0 ? 'IN' : 'OUT',
            'qty' => abs($variance),
            'section' => $material->section?->section,
            'estate' => $material->estate?->estate_id,
            'keterangan' => "Stock opname {$lockedOpname->opname_code}. System {$item->system_stock_snapshot}, fisik {$item->final_physical_stock}.",
            'create_by' => $actor->username ?? 'system',
            'create_date' => now(),
        ]);

        $material->update([
            'stock' => $after,
            'update_by' => $actor->username ?? 'system',
            'update_date' => now(),
        ]);

        $item->update([
            'status' => 'Posted',
            'stock_before_posting' => $before,
            'stock_after_posting' => $after,
            'transaction_id' => $transaction->id,
        ]);
    }

    $lockedOpname->update([
        'status' => 'Posted',
        'posted_by' => $actor->username ?? 'system',
        'posted_at' => now(),
    ]);
});
```

Catatan kompatibilitas: tabel `transactions.type` saat ini hanya `IN` dan `OUT`. Untuk MVP, adjustment opname bisa memakai `IN` atau `OUT` dengan `keterangan` berisi kode opname. Untuk versi lebih rapi, tambahkan kolom `source_type`, `source_id`, dan `movement_reason`, atau ubah tipe menjadi `IN`, `OUT`, `ADJ_IN`, `ADJ_OUT`.

## API Endpoint

Tambahkan controller `MaterialStockOpnameController`.

Endpoint:

- `GET /api/material-stock-opnames`
- `POST /api/material-stock-opnames`
- `GET /api/material-stock-opnames/{opname}`
- `PUT /api/material-stock-opnames/{opname}`
- `POST /api/material-stock-opnames/{opname}/generate-items`
- `POST /api/material-stock-opnames/{opname}/start-counting`
- `PUT /api/material-stock-opnames/{opname}/items/{item}/count`
- `POST /api/material-stock-opnames/{opname}/items/{item}/mark-recount`
- `POST /api/material-stock-opnames/{opname}/submit-review`
- `POST /api/material-stock-opnames/{opname}/submit-approval`
- `POST /api/material-stock-opnames/{opname}/cancel`
- `GET /api/material-stock-opnames/{opname}/export`

Query filter index:

- `estate_id`
- `section_id`
- `status`
- `date_from`
- `date_to`
- `search`
- `page`
- `per_page`

## Permission

Tambahkan permission:

- `view-material-stock-opnames`
- `create-material-stock-opnames`
- `edit-material-stock-opnames`
- `count-material-stock-opnames`
- `review-material-stock-opnames`
- `submit-material-stock-opnames`
- `cancel-material-stock-opnames`
- `export-material-stock-opnames`
- `post-material-stock-opnames`

Role default:

- `admin`: semua permission.
- `estate`: view, create, edit draft, count, submit, cancel sebelum approval, export.
- `manager`: view, review, submit, export.
- `finance`: view, review, post jika dipakai sebagai final approver.

Permission `post-material-stock-opnames` tetap dicek di service final posting, meskipun pemicu posting berasal dari approval final.

## Approval Workflow

Gunakan approval engine existing.

Workflow default:

- Name: `Material Stock Opname Approval`
- Module Name: `Material Stock Opname`
- Step 1: `manager` sebagai Reviewer.
- Step 2: `finance` atau `admin` sebagai Approver.

Saat submit approval:

- Cari workflow aktif `module_name = Material Stock Opname`.
- Prioritaskan workflow dengan `estate_id` yang sama.
- Jika tidak ada, fallback ke workflow global.
- Buat `ApprovalRequest`.
- Ubah sesi ke `Pending Approval`.

Perubahan pada `ApprovalController`:

- Tambahkan handling `reference_table === 'material_stock_opnames'`.
- Saat approval final, panggil `MaterialStockOpnameService::postAdjustments()`.
- Saat rejected, update sesi ke `Rejected`.
- Tambahkan detail modal approval frontend untuk membaca endpoint opname.

## Validasi Utama

Header:

- `estate_id` wajib untuk HO, otomatis current estate untuk user estate.
- `opname_date` wajib.
- Tidak boleh ada sesi aktif lain untuk estate dan section yang sama dengan status `Draft`, `Counting`, `Review`, atau `Pending Approval`.

Item:

- `physical_stock` numeric dan minimal 0.
- `recount_stock` numeric dan minimal 0.
- `variance_reason` wajib jika `abs(variance_qty)` lebih besar dari threshold.
- Item material harus milik estate sesi.
- Material tidak aktif bisa ikut snapshot jika stoknya tidak nol, agar saldo lama bisa diselesaikan.

Posting:

- Sesi harus `Pending Approval`.
- Approval harus final approved.
- `posted_at` harus null.
- Semua item harus `Reviewed`, `Skipped`, atau variance nol.
- Hasil posting tidak boleh membuat stok negatif.

## Threshold Variance

Tambahkan setting opsional:

- `stock_opname_qty_tolerance`, default `0`.
- `stock_opname_value_tolerance`, default `0`.
- `stock_opname_require_reason`, default `true`.

Jika belum ingin menambah settings, gunakan konstanta di service MVP:

- Qty tolerance: `0`.
- Value tolerance: `0`.
- Reason wajib untuk semua variance.

## Frontend

Tambahkan halaman `MaterialStockOpnamesPage.tsx`.

Navigasi:

- Section `Inventory`
- Label `Stock Opname`
- Icon lucide: `ClipboardCheck` atau `ClipboardList`
- Route: `/material-stock-opnames`

View utama:

- Header dengan filter estate, status, tanggal.
- Summary kecil:
  - Total sesi.
  - Pending approval.
  - Total variance qty.
  - Total variance value.
- DataTable sesi opname.
- Action:
  - Create session.
  - Open detail.
  - Export.
  - Cancel jika masih boleh.

Detail sesi:

- Info header: kode, estate, section, tanggal, status.
- Progress counted vs total.
- Tab:
  - Items
  - Variance
  - Approval
  - Log

Tab Items:

- Search material.
- Inline input physical stock.
- Badge variance.
- Button mark recount.
- CSV import/export.

Tab Variance:

- Tampilkan hanya item variance.
- Sort by variance value.
- Wajib isi reason.

Tab Approval:

- Reuse pola accordion approval dari `ApprovalsPage`.

UX penting:

- Jangan tampilkan tombol posting manual untuk user biasa.
- Tampilkan peringatan jelas bahwa stok belum berubah sebelum status `Posted`.
- Saat sesi `Posted`, semua input read-only.
- Untuk HO, estate selector wajib sebelum snapshot.

## CSV Import

Format import minimal:

```csv
material_code,physical_stock,variance_reason,condition_note
MAT-KLT-000001,12.5,Selisih hasil hitung gudang,Rak A1
```

Aturan:

- `material_code` harus ada di item snapshot sesi.
- `physical_stock` wajib numeric.
- Import tidak boleh membuat item baru di luar snapshot.
- Hasil import mengupdate item dan mencatat log.

## Laporan

Export sesi opname berisi:

- Opname code.
- Estate.
- Section.
- Opname date.
- Material code.
- Material name.
- Category.
- Unit.
- System stock snapshot.
- Physical stock.
- Recount stock.
- Final physical stock.
- Variance qty.
- Price snapshot.
- Variance value.
- Variance reason.
- Status item.
- Counted by.
- Reviewed by.
- Transaction id.

## Integrasi Dengan Dashboard

Tambahkan metrik opsional:

- Jumlah sesi opname pending.
- Total variance value bulan berjalan.
- Material dengan shortage terbesar.
- Sesi opname terakhir per estate.

## Risiko dan Mitigasi

- Transaksi berjalan setelah snapshot.
  Mitigasi: baseline tetap snapshot, posting adjustment memakai stok terkini yang dikunci. Laporan tetap menampilkan snapshot dan stok sebelum posting.

- Double posting.
  Mitigasi: `posted_at`, lock header, dan item `transaction_id`.

- User mengubah master stock manual.
  Mitigasi: batasi edit `materials.stock` di master material setelah modul opname aktif. Perubahan stok harus lewat transaction atau opname.

- Approval tidak punya detail modal.
  Mitigasi: tambah loader detail untuk `material_stock_opnames` di `ApprovalsPage`.

- Enum `transactions.type` terbatas.
  Mitigasi MVP: pakai `IN/OUT` plus keterangan opname. Perbaikan lanjutan: tambah kolom reason/source.

## Tahapan Implementasi

### Phase 1: Backend Foundation

- Buat migration 3 tabel opname.
- Buat model dan relasi.
- Buat service.
- Buat controller dan routes.
- Tambah permission seeder.
- Tambah unit test/service test untuk snapshot, count, submit, dan posting.

### Phase 2: Approval Integration

- Tambah workflow seeder default.
- Tambah handling final approval di `ApprovalController`.
- Tambah reject handling.
- Tambah test approval final posting.

### Phase 3: Frontend MVP

- Tambah route dan menu.
- Buat list page dan create modal.
- Buat detail page/modal dengan input item.
- Tambah CSV export/import.
- Tambah approval detail rendering.

### Phase 4: Hardening

- Tambah setting tolerance.
- Tambah dashboard metrics.
- Tambah PDF/print berita acara opname jika dibutuhkan.
- Tambah guard agar `materials.stock` tidak diedit langsung dari form master kecuali admin.

### Phase 5: Operational Import

- Tambah import CSV hasil hitung fisik.
- Validasi header dan baris CSV sebelum data diproses.
- Import bersifat all-or-nothing agar tidak ada hasil hitung yang masuk sebagian.
- Tambah test import sukses dan rollback ketika ada material di luar snapshot.
- Tambah tombol import CSV di detail sesi opname.

### Phase 6: Official Report

- Tambah PDF berita acara stock opname material.
- PDF hanya dapat diunduh setelah sesi berstatus `Posted`.
- Laporan memuat ringkasan sesi, item variance, transaksi posting, dan riwayat approval.
- Tambah tombol download berita acara di detail sesi.
- Tambah test endpoint PDF sebelum dan sesudah posting.

### Phase 7: Detail Workspace

- Tambah tab detail sesi: `Items`, `Variance`, `Approval`, dan `Log`.
- Tab `Variance` menampilkan ringkasan dan hanya item yang memiliki selisih.
- Tab `Approval` menampilkan request, requester, status, dan log approval.
- Tab `Log` menampilkan timeline aktivitas domain stock opname.

### Phase 8: Counting Ergonomics

- Tambah pencarian item di detail sesi.
- Tambah template CSV dari snapshot sesi.
- Tambah bulk save draft count dengan endpoint all-or-nothing.

### Phase 9: Segregation of Duties

- Approver final tidak boleh menjadi creator, submitter, counter, atau reviewer pada sesi yang sama.
- Guard ditempatkan di service posting agar berlaku untuk semua jalur posting.
- Tambah test agar self-approval final ditolak dan stok tidak berubah.

### Phase 10: Reporting Dashboard

- Tambah aging pending approval stock opname.
- Tambah top shortage material bulan berjalan.
- Tampilkan metrik reporting lanjutan di dashboard.

## Acceptance Criteria

- User estate hanya melihat sesi opname estate miliknya.
- HO dapat membuat dan melihat sesi untuk estate tertentu.
- Snapshot menyimpan stok sistem dan tidak berubah walaupun ada transaksi setelah sesi dibuat.
- Input fisik tidak mengubah `materials.stock`.
- Submit ditolak jika variance wajib alasan tetapi alasan kosong.
- Approval final memposting adjustment satu kali saja.
- Setiap adjustment membuat `transactions` dan update `materials.stock`.
- Sesi rejected/cancelled tidak mengubah stok.
- Export CSV menampilkan snapshot, fisik, variance, alasan, dan transaksi posting.
- Semua perubahan penting tercatat di audit/log.
