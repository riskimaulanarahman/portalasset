# UAT Persona: Estate

## Instruksi Untuk Agent AI

Dokumen ini adalah panduan manual test end to end untuk persona `estate`.

Aturan wajib:

- Jangan menjalankan `php artisan tinker`, query database, seeder, migration, atau command yang mengubah data tanpa instruksi eksplisit dan persetujuan user.
- Jika test membutuhkan data setup via Tinker, jelaskan data apa yang akan dibuat, estate mana yang terdampak, dan tunggu approval user.
- Gunakan prefix data test `UAT-ESTATE-YYYYMMDD-HHMM`.
- Jangan mengubah user produksi, workflow produksi, atau stock produksi tanpa persetujuan user.
- Untuk cleanup data test, minta persetujuan user terlebih dahulu.

Instruksi berpikir kritis dan perbaikan:

- Jangan hanya menjalankan langkah secara mekanis. Evaluasi apakah flow masuk akal secara bisnis, konsisten antar role, dan konsisten antara UI, API, permission, scope estate, approval, dan efek data.
- Jika hasil aktual berbeda dari ekspektasi, segera klasifikasikan: bug aplikasi, gap requirement, data setup kurang, permission salah, workflow salah, atau batasan test environment.
- Jika ditemukan potensi bug atau flow yang jelas tidak sesuai dan penyebabnya ada di kode/config aplikasi, segera lakukan investigasi root cause dan perbaikan yang terarah.
- Setelah memperbaiki kode, jalankan verifikasi yang relevan dan update catatan UAT dengan bug, file yang diperbaiki, dan hasil retest.
- Jika perbaikan membutuhkan perubahan data via Tinker, query database, seeder, migration, approval manual, atau cleanup data, berhenti dulu dan minta persetujuan user.
- Jangan menutupi mismatch dengan mengubah data test sembarangan. Jelaskan temuan, dampak, dan opsi perbaikan.

## Ringkasan Persona

Role `estate` adalah user operasional estate. Role ini dapat melihat dan mengelola sebagian data operasional, tetapi tidak boleh mengakses administrasi sistem.

Permission utama role `estate`:

- View assets, materials, transactions, estates.
- Create/edit materials.
- Create transactions.
- View anggotas dan mengelola anggota jika permission aktif di database.
- View cost centers, software, units, vendors.
- View dan create asset condition, maintenance, write-off jika migration permission sudah diterapkan.
- Mengakses transfer memakai permission khusus: `view-transfers`, `create-transfers`, `cancel-transfers`, `download-transfer-ba`, dan bila diuji via role management `view-transfer-history`.
- Menutup reminder assignment member memakai permission khusus `assign-asset-members`; role estate tidak perlu diberi `edit-assets` hanya untuk mengubah Assigned Member.

Catatan scoping:

- User non-HO hanya boleh melihat data estate sendiri.
- Asset visibility dibatasi oleh assignment Asset Department atau Asset Division user.
- Jika user estate tidak punya department/division assignment, daftar asset bisa kosong.

Akun seed default:

- Username format: `estate_<kode_estate_lowercase>`, contoh `estate_trn`
- Password: `user123`
- Estate contoh: `TRN - Terunen`

## Prasyarat

- User estate aktif dan memiliki estate_id.
- User estate memiliki assignment Asset Department atau Asset Division jika skenario asset perlu menampilkan data.
- Ada data material pada estate user.
- Ada minimal satu estate lain sebagai destination transfer.
- Ada workflow `Transfer` aktif untuk destination estate atau workflow global. Jika tidak ada, transfer harus ditolak.
- Ada workflow `write-off` aktif untuk estate asset atau workflow global jika skenario write-off dijalankan. Jika tidak ada, write-off harus ditolak dan asset tidak boleh menjadi inactive.
- Pastikan workflow approval memakai `module_name = Transfer` dan `role_name` yang sama persis dengan role user, misalnya `manager`, `finance`, atau `estate`. Jika workflow lama memakai `Transfers`, `Manager`, atau `Finance`, catat sebagai potensi mismatch dan minta approval user sebelum koreksi data.
- Permission `create-asset-reports` harus tersedia agar estate dapat melaporkan asset rusak. Permission `create-write-offs` hanya membuka pengajuan write-off, bukan approval otomatis.

Jika prasyarat belum ada, agent AI wajib meminta approval sebelum membuat atau mengubah data via Tinker.

## Skenario E01: Login Estate Dan Navigasi Dasar

Tujuan: memastikan user estate aktif dapat masuk dan hanya melihat menu sesuai izin.

Langkah:

1. Buka `/login`.
2. Login sebagai user estate, misalnya `estate_trn` dengan password `user123`.
3. Pastikan diarahkan ke `/dashboard`.
4. Periksa nama, role, dan estate user di header/sidebar bila tampil.
5. Buka Dashboard.
6. Gunakan toggle dark mode.
7. Buka Help Guide.
8. Buka modal Ubah Password lalu tutup tanpa menyimpan.

Ekspektasi:

- Login berhasil.
- Dashboard tampil.
- User tidak diarahkan ke Access Request bila sudah aktif dan punya estate.
- Menu admin tidak terlihat.

## Skenario E02: Verifikasi Menu Yang Boleh Dan Tidak Boleh

Tujuan: memastikan menu estate sesuai permission.

Langkah:

1. Login sebagai estate.
2. Periksa menu yang boleh tampil: Dashboard, My Approvals, Estates, Cost Centers, Members, Assets, Materials, Software, Units, Vendors, Transactions, Transfers, Guide.
3. Periksa apakah Kondisi Aset tampil bila permission `view-asset-conditions` tersedia.
4. Pastikan menu berikut tidak tampil: Business Units, Sections, Categories, Asset Reg, Manufacturers, Asset Types, Asset Departments, Asset Divisions, User Activation, User Management, Role Management, Approval Workflows, System Settings.
5. Ketik URL langsung ke `/admin/users`.
6. Ketik URL langsung ke `/settings`.

Ekspektasi:

- Menu terbatas sesuai role.
- URL admin/settings redirect ke dashboard atau ditolak.
- Tidak ada tombol create/edit/delete untuk modul yang hanya view.

## Skenario E03: Estate Scope Untuk Data Operasional

Tujuan: memastikan user estate hanya melihat data estate sendiri.

Langkah:

1. Buka Materials.
2. Catat semua material yang tampil dan estate-nya.
3. Cari material dari estate lain jika tahu kode/nama dari admin.
4. Buka Transactions.
5. Catat transaksi yang tampil.
6. Buka Transfers.
7. Pastikan daftar hanya berisi transfer dari estate user atau ke estate user.
8. Buka Estates.

Ekspektasi:

- Materials hanya menampilkan material estate user, kecuali ada aturan HO yang tidak berlaku untuk user ini.
- Transactions hanya relevan dengan estate user.
- Transfers hanya yang source atau destination-nya estate user.
- Estates tampil read-only sesuai permission `view-estates`.

## Skenario E04: Asset Visibility Berdasarkan Department/Division

Tujuan: memastikan pembatasan ownership asset berjalan.

Prasyarat:

- User estate memiliki assignment department/division.
- Ada asset estate user dengan department/division yang cocok.
- Ada asset estate user dengan department/division yang tidak cocok, atau data ini disiapkan setelah approval user.

Langkah:

1. Buka Assets.
2. Catat asset yang tampil.
3. Cari asset yang seharusnya cocok dengan assignment user.
4. Buka detail asset tersebut.
5. Cari asset estate yang department/division-nya tidak termasuk assignment user.
6. Jika memiliki URL detail asset yang tidak cocok, buka langsung `/assets/{regId}`.

Ekspektasi:

- Asset yang cocok assignment tampil dan detail dapat dibuka.
- Asset yang tidak cocok tidak tampil.
- Direct URL asset yang tidak cocok memberi redirect, 404, atau tidak bisa diakses.

## Skenario E04B: Asset Management Dari Sudut User Estate

Tujuan: memastikan user estate dapat menjalankan bagian operasional asset management yang menjadi haknya: melihat asset hasil register admin, memastikan tidak bisa register asset, mengajukan distribusi/transfer asset dari estate sendiri, dan memverifikasi hasil transfer.

Prasyarat:

- Admin sudah membuat asset test pada estate user dengan prefix `UAT-ADMIN-ASSET-E2E` atau `UAT-ESTATE-ASSET-E2E`.
- Asset test memiliki department/division yang cocok dengan assignment user estate.
- Ada destination estate berbeda.
- Ada workflow `Transfer` aktif untuk destination estate atau workflow global. Jika tidak ada, transfer harus ditolak.

Langkah Verifikasi Asset Hasil Register:

1. Login sebagai user estate source.
2. Buka Assets.
3. Cari asset test yang sudah diregister admin.
4. Buka detail asset.
5. Catat Reg ID, Asset No, Estate, Department, Division, dan status active.

Ekspektasi Verifikasi:

- Asset test tampil karena berada di estate user dan department/division cocok.
- User estate dapat membuka detail asset.
- Tombol Register Asset tidak tampil karena role estate tidak memiliki `create-assets`.
- Tombol edit/delete asset tidak tampil bila permission edit/delete assets tidak diberikan.

Langkah Distribusi/Transfer Asset Dari Estate Sendiri:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Asset`.
4. Pastikan Source Estate terkunci pada estate user.
5. Pilih Destination Estate yang berbeda.
6. Pilih recipient anggota destination estate jika tersedia.
7. Pilih asset test.
8. Isi qty `1`.
9. Isi notes, misalnya `UAT distribusi asset oleh estate`.
10. Submit transfer.
11. Buka detail transfer dan catat Transfer Code serta status.

Ekspektasi Distribusi/Transfer:

- User estate tidak dapat memilih source estate lain.
- Asset yang dapat dipilih hanya asset visible sesuai estate dan department/division assignment.
- Transfer tersimpan sebagai `Pending Approval`.
- Jika workflow `Transfer` tidak aktif/tidak lengkap/tidak punya approver, transfer ditolak dan tidak boleh auto-approved.
- Detail transfer menampilkan approval chain.

Langkah Verifikasi Setelah Final Approval:

1. Setelah approval selesai oleh approver yang sah, login kembali sebagai user estate source.
2. Buka Transfers dan cari Transfer Code.
3. Pastikan status `Approved`.
4. Buka Assets dan cari asset test.
5. Buka detail asset dan periksa tab Riwayat Transfer.
6. Login sebagai user destination estate jika user menyetujui.
7. Cari asset test dari destination estate.
8. Jika transfer memilih anggota penerima, update Assigned Member asset ke anggota penerima transfer untuk menutup reminder dashboard.

Ekspektasi Setelah Approval:

- Transfer asset final berstatus `Approved`.
- Secara bisnis, asset seharusnya tidak lagi muncul sebagai asset aktif source estate.
- Secara bisnis, asset seharusnya muncul di destination estate bila user destination memiliki department/division yang cocok.
- Riwayat Transfer asset mencatat audit perpindahan dari source ke destination, termasuk unit lama/baru dan target anggota bila ada.
- Dashboard reminder assignment member di destination estate harus hilang setelah Assigned Member asset sama dengan anggota penerima transfer.
- Jika transfer approved tetapi asset masih berada di source estate, catat sebagai bug/gap implementasi distribusi asset.

Negative test:

1. Coba akses Assets lalu cari asset dari estate lain.
2. Coba transfer asset dari estate lain melalui source dropdown atau direct API hanya setelah user menyetujui negative test.
3. Coba transfer asset tanpa department/division jika data test tersedia.
4. Coba transfer asset yang masih pending transfer lain.

Ekspektasi Negative:

- Asset estate lain tidak tampil.
- Source estate lain tidak bisa dipilih oleh user non-HO.
- Backend menolak asset yang bukan milik estate/assignment user.
- Duplicate pending transfer ditolak.

## Skenario E05: Materials Create Dan Edit Untuk Estate

Tujuan: memastikan estate dapat membuat dan mengedit material sesuai permission.

Data test:

- Material Name: `UAT-ESTATE-MATERIAL`
- Stock awal: angka kecil yang disetujui user, misalnya `10`

Langkah:

1. Buka Materials.
2. Klik Add Material.
3. Gunakan tombol `AUTO` untuk Material Code.
4. Isi Material Name, Category, Section, Unit, Stock, Min Stock.
5. Pilih Estate user sendiri jika field estate tersedia.
6. Simpan.
7. Cari material test.
8. Edit nama atau min stock.
9. Simpan.
10. Coba pilih estate lain pada form jika field memungkinkan.

Ekspektasi:

- Material berhasil dibuat untuk estate user.
- Material muncul di daftar user estate.
- Edit berhasil.
- Jika estate lain dipilih, backend harus menolak atau tetap membatasi sesuai estate scope. Catat perilaku aktual.
- Tombol delete material tidak tampil untuk role estate bila permission delete tidak diberikan.

## Skenario E06: Material Transaction IN Dan OUT

Tujuan: memastikan user estate dapat mencatat transaksi material pada estate sendiri.

Prasyarat:

- Ada material aktif di estate user.

Langkah:

1. Buka Transactions.
2. Klik Material IN.
3. Pastikan tidak ada dropdown estate untuk user non-HO, atau estate otomatis estate user.
4. Pilih material estate user.
5. Isi tanggal, qty, store/bin, SAP ID, nama penerima/pengirim, dan keterangan.
6. Simpan.
7. Pastikan transaksi IN muncul dan stock material bertambah.
8. Klik Material OUT.
9. Pilih material yang sama.
10. Isi qty lebih kecil dari stock.
11. Simpan.
12. Pastikan transaksi OUT muncul dan stock berkurang.

Negative test:

1. Coba OUT dengan qty lebih besar dari stock jika user menyetujui perubahan stock test.
2. Coba submit tanpa material atau qty.

Ekspektasi:

- Transaksi hanya mengambil material estate user.
- IN/OUT tersimpan dengan create_by user estate.
- Validasi required field muncul.
- Stock preview berubah sesuai qty.

## Skenario E07: Transfer Material Dari Estate Sendiri

Tujuan: memastikan estate dapat mengajukan transfer material dari estate sendiri ke estate lain.

Prasyarat:

- Material estate user punya stock cukup.
- Destination estate berbeda.

Langkah:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Material`.
4. Pastikan Source Estate terkunci pada estate user.
5. Pilih Destination Estate yang berbeda.
6. Pilih recipient anggota bila tersedia.
7. Pilih material, isi qty valid.
8. Tambahkan notes.
9. Submit.
10. Jika workflow tidak dikonfigurasi, transfer harus ditolak dan user harus setup workflow terlebih dahulu.
11. Buka detail transfer.
12. Periksa status, item, qty, dan approval chain.

Ekspektasi:

- User estate tidak bisa memilih source estate lain.
- Destination tidak boleh sama dengan source.
- Qty melebihi stock dicegah.
- Transfer dibuat sebagai `Pending Approval`.
- Jika workflow `Transfer` tidak aktif/tidak lengkap/tidak punya approver, transfer ditolak dan tidak boleh auto-approved.
- Email HO/admin ikut menjadi CC pada notifikasi transfer jika email notification aktif.

## Skenario E08: Transfer Asset Dari Estate Sendiri

Tujuan: memastikan estate hanya dapat transfer asset yang berada di estate dan ownership-nya.

Prasyarat:

- Ada asset aktif di estate user.
- Asset memiliki department/division yang cocok dengan assignment user.
- Ada destination estate berbeda yang memiliki data anggota/member aktif.
- Ada workflow transfer aktif untuk destination estate, atau user memberi persetujuan eksplisit untuk setup workflow test.

Langkah:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Asset`.
4. Pastikan Source Estate estate user.
5. Pilih Destination Estate.
6. Pastikan dropdown Recipient memuat anggota dari Destination Estate.
7. Pilih anggota/member penerima dari data members.
8. Pilih asset dari daftar.
9. Submit qty `1`.
10. Buka detail transfer.
11. Pastikan `Recipient`/`anggota_penerima` terisi sesuai member yang dipilih.
12. Login sebagai approver destination estate hanya jika user sudah memberi instruksi/persetujuan eksekusi approval.
13. Approve transfer.
14. Buka kembali detail transfer dan download Berita Acara.
15. Login sebagai destination estate dan buka Dashboard.
16. Pastikan reminder asset assignment/member update muncul untuk asset yang baru diterima jika Assigned Member asset belum sama dengan anggota penerima transfer.
17. Buka Assets, cari asset yang diterima, lalu edit Assigned Member ke anggota penerima transfer.
18. Kembali ke Dashboard dan pastikan reminder untuk transfer/asset tersebut tidak muncul lagi.
19. Buka detail asset dan cek Riwayat Transfer.
20. Jika email notification aktif dan mailer terkonfigurasi, cek email transfer created/approved/rejected men-CC email HO/admin.

Negative test:

1. Coba cari asset dari estate lain.
2. Coba transfer asset estate sendiri tetapi department/division tidak cocok jika data tersedia.
3. Coba transfer asset tanpa department/division jika data tersedia.
4. Coba approve transfer destination estate menggunakan user estate source. Endpoint harus menolak dengan 403.
5. Coba ubah status transfer melalui endpoint update umum jika testing API dilakukan. Endpoint harus menolak karena status hanya boleh berubah via approval/cancel.

Ekspektasi:

- Daftar asset hanya berisi asset yang boleh dilihat user.
- Asset dari estate lain tidak muncul.
- Asset tanpa ownership lengkap ditolak.
- Asset yang sedang pending transfer tidak bisa diajukan ulang.
- Setelah approval final, asset berpindah ke destination estate dan `unit_id` mengikuti kode estate tujuan.
- Berita Acara transfer approved dapat diunduh dan bagian `Diterima Oleh` menggunakan nama anggota/member penerima.
- Dashboard destination estate menampilkan reminder asset assignment/member update untuk transfer asset approved yang memiliki anggota penerima.
- Reminder destination estate tertutup setelah Assigned Member asset disamakan dengan anggota/member penerima.
- Detail asset menampilkan audit/history transfer khusus asset.
- Email HO/admin ikut menjadi CC pada notifikasi transfer jika email notification aktif.
- User estate yang bukan approver destination estate tidak bisa memproses approval meskipun mengetahui approval request ID.
- Status dan receive date tidak bisa dimutasi dari endpoint update umum.

## Skenario E09: Cancel Transfer Pending

Tujuan: memastikan estate dapat membatalkan transfer yang masih pending/draft dan terkait estate-nya.

Prasyarat:

- Ada transfer test status `Pending Approval` yang dibuat oleh user estate atau terkait estate user.

Langkah:

1. Buka Transfers.
2. Cari transfer test.
3. Klik action cancel.
4. Konfirmasi pembatalan.
5. Refresh daftar.
6. Buka detail transfer.

Ekspektasi:

- Status berubah menjadi `Cancelled`.
- Approval request terkait ikut `Cancelled`.
- Transfer yang sudah `Approved` atau `Rejected` tidak bisa dicancel.
- Destination estate tidak boleh cancel/delete request source estate; destination estate harus approve/reject melalui My Approvals.

## Skenario E10: My Approvals Untuk Role Estate

Tujuan: memastikan role estate hanya melihat approval yang memang ditugaskan kepadanya.

Prasyarat:

- Ada Access Request dengan requested estate sama dengan estate user, atau workflow lain yang step-nya role estate.
- Jika tidak ada, minta approval user sebelum membuat access request test.

Langkah:

1. Login sebagai estate.
2. Buka My Approvals.
3. Periksa daftar pending approval.
4. Buka detail approval.
5. Approve satu request test hanya jika user memberi instruksi eksplisit.
6. Reject satu request test hanya jika user memberi instruksi eksplisit.
7. Catat efek terhadap status request.

Ekspektasi:

- User estate hanya melihat approval sesuai role dan estate.
- Approve/reject membutuhkan komentar jika UI/backend mewajibkan.
- Access Request yang diapprove mengubah role/estate target sesuai request.

## Skenario E11: Access Request Oleh Estate User

Tujuan: memastikan estate user dapat mengajukan perubahan role/estate tanpa meminta role admin.

Langkah:

1. Buka `/access-request`.
2. Periksa Role Saat Ini dan Estate Saat Ini.
3. Pilih requested role selain admin, misalnya `guest`, `manager`, atau `finance`.
4. Pilih estate berbeda dari saat ini.
5. Isi alasan.
6. Submit request hanya jika user menyetujui pembuatan request.
7. Submit request kedua saat request pertama masih pending.

Ekspektasi:

- Opsi role admin tidak tersedia.
- Request yang sama dengan role/estate saat ini ditolak.
- Request kedua saat ada pending ditolak.
- Pending request tampil setelah submit berhasil.

## Skenario E12: Asset Detail, Kondisi, Maintenance, Dan Write-Off

Tujuan: memastikan estate dapat melaporkan asset rusak ke HO/admin, membuat maintenance progress, dan mengajukan write-off tanpa bypass workflow approval.

Prasyarat:

- Ada asset visible untuk user estate.
- Permission `view-asset-conditions`, `create-asset-conditions`, `create-asset-maintenances`, `create-asset-reports`, dan `create-write-offs` tersedia untuk role estate sesuai kebutuhan test.
- Ada workflow `write-off` aktif untuk estate asset atau workflow global bila skenario write-off dijalankan. Jika write-off harus disetujui HO/admin, step workflow memakai role `admin` atau user HO yang dipilih eksplisit.

Langkah Laporan Kerusakan:

1. Buka Assets.
2. Buka detail asset visible.
3. Buka tab Kondisi.
4. Klik `Report Damage` bila tombol tampil.
5. Isi tanggal laporan.
6. Pilih kondisi `Bad` untuk asset yang masih bisa diperbaiki, atau `Broken` untuk kerusakan berat.
7. Isi deskripsi kerusakan yang memuat gejala, lokasi, dampak operasional, dan bukti awal.
8. Aktifkan pembuatan maintenance bila asset perlu ditindaklanjuti teknisi/PIC.
9. Isi PIC/target maintenance dan upload attachment bila ada.
10. Simpan laporan.
11. Buka Dashboard estate.
12. Periksa panel `Asset Damage` dan `Maintenance Progress`.
13. Jika email notification aktif dan mailer terkonfigurasi, pastikan HO/admin menerima email laporan kerusakan.

Ekspektasi Laporan Kerusakan:

- Tombol report damage hanya muncul sesuai permission.
- Kondisi `Bad` atau `Broken` tersimpan di history kondisi asset.
- Maintenance dibuat dengan status `Progress` jika opsi maintenance aktif.
- Asset tetap active setelah laporan kerusakan.
- Dashboard estate menampilkan reminder asset rusak/maintenance progress selama kondisi latest masih Bad/Broken atau maintenance masih Progress.
- HO/admin mendapat visibility melalui dashboard dan email notification bila aktif.

Langkah Write-Off:

1. Dari detail asset yang kondisinya `Broken`, klik ajukan Write-Off hanya untuk asset test dan setelah user menyetujui karena final approval dapat mengubah status asset.
2. Isi alasan write-off.
3. Submit.
4. Buka daftar/riwayat terkait dan periksa status approval write-off.
5. Buka Dashboard estate dan pastikan panel `Pending Write-Off` muncul selama approval masih pending.
6. Setelah final approval oleh approver yang sah, buka ulang detail asset.
7. Klik `Generate BA` / download Berita Acara write-off bila status approved dan permission tersedia.
8. Periksa isi PDF Berita Acara.

Ekspektasi Write-Off:

- Write-off membuat approval request jika workflow aktif.
- Asset tidak langsung inactive bila workflow write-off masih pending.
- Asset baru inactive setelah final approval.
- HO/admin dapat memproses approval write-off bila workflow memang mengarah ke role `admin` atau user HO eksplisit.
- Jika write-off direject atau cancel, asset tetap active.
- Berita Acara hanya tersedia setelah write-off approved.
- Output Berita Acara memuat nomor dokumen, identitas asset, dasar laporan kerusakan, ringkasan maintenance, alasan write-off, approval log, dan tanda tangan requester/approver/HO.

Negative test:

1. Coba submit write-off tanpa workflow `write-off` aktif hanya jika user menyetujui perubahan data test.
2. Coba submit write-off saat workflow tidak punya step pertama atau approver aktif.
3. Coba submit write-off kedua saat asset sudah punya write-off pending.

Ekspektasi Negative:

- Tanpa workflow aktif, write-off ditolak dan tidak boleh auto-approved.
- Workflow tanpa step pertama atau tanpa approver aktif ditolak.
- Request invalid tidak membuat record write-off.
- Asset tetap active untuk request invalid/rejected/cancelled.
- Duplicate pending write-off ditolak.

## Skenario E13: Negative Access Ke Modul Admin

Tujuan: memastikan role estate tidak dapat mengakses fitur admin melalui URL langsung.

Langkah:

1. Login sebagai estate.
2. Akses `/admin/users`.
3. Akses `/admin/roles`.
4. Akses `/admin/workflows`.
5. Akses `/settings`.
6. Akses `/business-units`, `/asset-types`, `/asset-regs`, `/manufacturers`, `/categories`, `/asset-departments`, `/asset-divisions`.

Ekspektasi:

- Semua route tanpa permission redirect ke dashboard.
- API terkait mengembalikan 403 jika dipanggil langsung.
- Tidak ada data admin yang bocor di UI.

## Checklist Exit Criteria Estate

- Login dan logout berhasil.
- Menu sesuai role estate.
- Data estate scope benar.
- Asset visibility sesuai department/division.
- Material create/edit berhasil.
- Transaction IN/OUT berhasil pada estate sendiri.
- Transfer material dan asset mematuhi source estate dan ownership.
- Laporan asset rusak membuat condition/maintenance reminder tanpa mengubah asset menjadi inactive.
- Write-off hanya berjalan melalui workflow aktif dan asset baru inactive setelah final approval.
- Access Request dan My Approvals berjalan sesuai approval user.
- Semua penggunaan Tinker, write-off, approval, dan cleanup sudah mendapat persetujuan user.
