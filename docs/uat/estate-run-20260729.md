# UAT Run Estate - 2026-07-29

## Scope

Persona: `estate`

Fokus run:

- Estate dapat membuat transfer asset dari estate sendiri.
- Estate dapat memilih anggota/member penerima dari data members destination estate.
- Setelah approval final, asset berpindah ke destination estate.
- Berita Acara transfer approved dapat diunduh dan menggunakan data `anggota_penerima`.
- Dashboard destination estate menampilkan reminder update assignment member untuk asset transfer approved.
- Approval tidak dapat diproses oleh user estate yang bukan approver destination estate.

## Data UAT

- Source estate: `U00 - UAT Admin Estate OK 101821`
- Destination estate: `TRN - Terunen`
- Source user: `uat_estate_src_111416`
- Destination/approver user: `uat_estate_dst_111416`
- Workflow: `UAT Estate Transfer Workflow 111416`, id `3`, module `Transfer`, estate `TRN`, step `estate`
- Asset: `AST-TRN-003`
- Member receiver: `MBR-TRN-001 - Budi Anggota`
- Transfer: `TRF-202607-0006`, id `6`

## Hasil

Status: PASS setelah perbaikan bug.

- Source estate user dapat melihat asset `AST-TRN-003` yang berada di estate `U00`.
- Source estate user dapat mengambil members dengan filter `estate_id=1` dan memilih `Budi Anggota`.
- Transfer asset dibuat dengan status `Pending Approval` dan `anggota_penerima` terisi.
- Source estate user tidak boleh memproses approval destination estate; flow approval sudah diperbaiki agar validasi role/estate dilakukan pada endpoint approve/reject.
- Destination estate user melihat approval pada `My Approvals` dan berhasil approve.
- Setelah approve, transfer menjadi `Approved`.
- Asset `AST-TRN-003` berpindah ke estate id `1` dan `unit_id` menjadi `TRN`.
- Berita Acara endpoint `/api/transfers/6/berita-acara` mengembalikan `200 OK` dengan content type `application/pdf`.
- Dashboard destination estate mengembalikan `asset_assignment_reminders` berisi transfer `TRF-202607-0006`, asset `AST-TRN-003`, anggota `Budi Anggota`.

Catatan PDF:

- Binary PDF berhasil diunduh, tetapi environment tidak memiliki `pdftotext`/tool ekstraksi PDF. Verifikasi nama member dilakukan dari kombinasi data transfer detail `anggota_penerima` dan template `transfer_berita_acara.blade.php` yang merender `anggotaPenerima->nama` pada bagian `Diterima Oleh`.

## Bug Yang Ditemukan Dan Diperbaiki

1. Dashboard estate belum memiliki reminder khusus untuk asset transfer approved yang punya anggota penerima.
   - Fix: endpoint dashboard menambahkan `asset_assignment_reminders`.
   - Fix: Dashboard frontend menampilkan panel reminder asset/member update.

2. Endpoint approve/reject dapat dipanggil by approval ID tanpa validasi approver untuk flow non-access-request.
   - Fix: `ApprovalController` menambahkan validasi current step role/user dan estate context sebelum process approval.

3. Create user lokal kedua gagal di SQL Server karena unique index `users.guid` menerima duplicate `NULL`.
   - Fix: `UserController` memberi `guid` unik `local-{uuid}` untuk user lokal baru.

4. Approval asset transfer gagal jika username approver lebih dari panjang kolom legacy `assets.update_by`.
   - Fix: `MaterialTransferService` menormalisasi actor name ke 20 karakter untuk field audit legacy.
   - Fix tambahan: write-off approval juga memotong `update_by` ke 20 karakter.

## Verifikasi Teknis

- `php -l backend/app/Http/Controllers/Api/DashboardController.php`: PASS
- `php -l backend/app/Http/Controllers/Api/ApprovalController.php`: PASS
- `php -l backend/app/Http/Controllers/Api/UserController.php`: PASS
- `php -l backend/app/Services/MaterialTransferService.php`: PASS
- `npm.cmd test`: PASS, 21 tests
- `npm.cmd run build`: PASS, dengan warning chunk size Vite existing

## Cleanup

Dilakukan setelah user memberi persetujuan.

- Asset `AST-TRN-003` dikembalikan dari `TRN` ke `U00`.
- Transfer `TRF-202607-0006` dihapus dari daftar transfer aktif melalui soft delete.
- Workflow `UAT Estate Transfer Workflow 111416` dihapus.
- User `uat_estate_src_111416` dan `uat_estate_dst_111416` dihapus melalui soft delete.

Verifikasi cleanup:

- Asset `AST-TRN-003`: `estate_id=9`, `unit_id=U00`.
- Transfer `TRF-202607-0006` tidak muncul lagi di `/api/transfers`.
- Workflow id `3` tidak muncul lagi di `/api/approval-workflows`.
- User UAT source/destination tidak muncul lagi di `/api/users`.
