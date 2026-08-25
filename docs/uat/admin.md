# UAT Persona: Admin

## Instruksi Untuk Agent AI

Dokumen ini adalah panduan manual test end to end untuk persona `admin`.

Aturan wajib:

- Jangan menjalankan `php artisan tinker`, query database, seeder, migration, atau command yang mengubah data tanpa instruksi eksplisit dan persetujuan user.
- Jika test membutuhkan data setup via Tinker, tuliskan rencana data yang akan dibuat, dampaknya, dan tunggu approval user sebelum eksekusi.
- Setiap data test yang dibuat harus diberi penanda unik, misalnya prefix `UAT-ADMIN-YYYYMMDD-HHMM`.
- Setelah test selesai, minta persetujuan user sebelum cleanup data test.
- Catat hasil aktual, data yang dipakai, error message, dan screenshot bila manual tester membutuhkannya.

Instruksi berpikir kritis dan perbaikan:

- Jangan hanya menjalankan langkah secara mekanis. Evaluasi apakah flow masuk akal secara bisnis, konsisten antar role, dan konsisten antara UI, API, permission, scope estate, approval, dan efek data.
- Jika hasil aktual berbeda dari ekspektasi, segera klasifikasikan: bug aplikasi, gap requirement, data setup kurang, permission salah, workflow salah, atau batasan test environment.
- Jika ditemukan potensi bug atau flow yang jelas tidak sesuai dan penyebabnya ada di kode/config aplikasi, segera lakukan investigasi root cause dan perbaikan yang terarah.
- Setelah memperbaiki kode, jalankan verifikasi yang relevan dan update catatan UAT dengan bug, file yang diperbaiki, dan hasil retest.
- Jika perbaikan membutuhkan perubahan data via Tinker, query database, seeder, migration, approval manual, atau cleanup data, berhenti dulu dan minta persetujuan user.
- Jangan menutupi mismatch dengan mengubah data test sembarangan. Jelaskan temuan, dampak, dan opsi perbaikan.

## Ringkasan Persona

Role `admin` adalah super user Portal Asset. Admin memiliki seluruh permission dari seeder dan dapat mengakses menu master data, inventory, in/out, approval, user activation, role management, workflow, dan settings.

Akun seed default:

- Username: `admin`
- Password: `admin123`
- Estate: `HO - Head Office`

## Prasyarat

- Backend dan frontend berjalan.
- Database sudah migrate dan seed.
- Minimal tersedia master data: business unit, estate, section, category, unit, vendor, manufacturer, asset type, asset registration, asset department, asset division.
- Minimal tersedia user role `estate`, `manager`, `finance`, dan `guest`.
- Untuk test approval transfer, pastikan workflow `Transfer` aktif dengan step approver yang valid, atau siapkan workflow test setelah approval user.
- Untuk test write-off asset rusak, pastikan workflow `write-off` aktif untuk estate asset atau workflow global, dengan step approver aktif yang valid. Jika workflow tidak ada/tidak lengkap/tidak punya approver, write-off harus ditolak dan asset tidak boleh menjadi inactive.
- Permission transfer khusus harus tersedia untuk role terkait: `view-transfers`, `create-transfers`, `edit-transfers`, `delete-transfers`, `cancel-transfers`, `download-transfer-ba`, dan bila diuji via role management `view-transfer-history`.
- Permission `assign-asset-members` harus tersedia untuk role operasional agar destination estate bisa menutup reminder assignment member tanpa diberi permission edit asset penuh.
- Permission damage/write-off harus tersedia sesuai role: `create-asset-reports`, `view-write-offs`, `create-write-offs`, `cancel-write-offs`, dan `download-write-off-ba`.

Jika data belum cukup, agent AI wajib meminta izin sebelum membuat data via Tinker.

## Batasan Tinker

Contoh kebutuhan Tinker yang mungkin diperlukan, tetapi tidak boleh dijalankan sebelum approval:

- Membuat user test role `estate`, `manager`, `finance`, atau `guest`.
- Membuat material dengan stock cukup pada estate sumber.
- Membuat asset lengkap dengan department dan division.
- Mengubah status approval atau membuat workflow test.
- Menghapus data test setelah UAT selesai.

## Skenario A01: Login Admin Dan Validasi Shell Aplikasi

Tujuan: memastikan admin dapat masuk dan semua shell aplikasi bekerja.

Langkah:

1. Buka `/login`.
2. Login dengan username `admin` dan password `admin123`.
3. Pastikan diarahkan ke `/dashboard`.
4. Periksa header menampilkan nama user dan role admin.
5. Buka dan tutup sidebar.
6. Gunakan toggle dark mode.
7. Klik avatar/profile dan buka modal ubah password, lalu tutup tanpa menyimpan.
8. Klik Help Guide.
9. Klik logout dan konfirmasi.

Ekspektasi:

- Login berhasil dan token tersimpan.
- Dashboard tampil tanpa redirect ke login.
- Menu admin lengkap terlihat sesuai permission.
- Logout menghapus sesi dan kembali ke login.

## Skenario A02: Verifikasi Menu Dan Permission Admin

Tujuan: memastikan admin melihat seluruh modul.

Langkah:

1. Login sebagai admin.
2. Periksa menu Overview: Dashboard, My Approvals.
3. Periksa menu Master Data: Business Units, Sections, Estates, Cost Centers, User Activation, Members, Asset Types, Asset Departments, Asset Divisions, Asset Reg, Categories, Manufacturers, Units, Vendors.
4. Periksa menu Inventory: Assets, Kondisi Aset, Materials, Software.
5. Periksa menu In/Out: Transactions, Transfers.
6. Periksa menu Administration: Approval Workflows, User Management, Role Management, System Settings.
7. Buka tiap menu minimal sekali.

Ekspektasi:

- Semua menu dapat dibuka.
- Tidak ada redirect tidak wajar ke dashboard.
- Tidak ada error 403/404 untuk menu yang menjadi hak admin.

## Skenario A03: CRUD Master Organization

Tujuan: memastikan admin dapat mengelola master organization.

Data test:

- Prefix data: `UAT-ADMIN-ORG`
- Business Unit test: `UAT-ADMIN-BU`
- Section test: `UAT-ADMIN-SEC`
- Estate test: `UAT-ADMIN-EST`
- Cost Center test: `UAT-ADMIN-CC`

Langkah:

1. Buka Business Units.
2. Tambah business unit test.
3. Edit nama/deskripsi business unit test.
4. Pastikan data muncul di table dan bisa dicari.
5. Buka Sections.
6. Tambah dan edit section test.
7. Buka Estates.
8. Tambah estate test yang terhubung ke business unit.
9. Edit estate test.
10. Buka Cost Centers.
11. Tambah cost center test, pilih estate yang sesuai.
12. Edit cost center test.
13. Hapus data test jika user memberi approval cleanup.

Ekspektasi:

- Admin dapat create, edit, delete master data.
- Search dan pagination tetap bekerja.
- Validasi required field muncul saat field wajib dikosongkan.
- Data relasi estate/business unit tampil benar.

## Skenario A04: CRUD Master Asset Info

Tujuan: memastikan master asset info dapat dikelola admin.

Data test:

- Asset Type: `UAT-ADMIN-TYPE`
- Manufacturer: `UAT-ADMIN-MFG`
- Asset Reg: gabungan type, manufacturer, series `UAT-ADMIN-SERIES`
- Category: `UAT-ADMIN-CAT`
- Unit: `UAT-ADMIN-UNIT`
- Vendor: `UAT-ADMIN-VENDOR`
- Asset Department: `UAT-ADMIN-DEPT`
- Asset Division: `UAT-ADMIN-DIV`

Langkah:

1. Buat Asset Type test.
2. Buat Manufacturer test.
3. Buat Asset Reg test memakai type dan manufacturer tersebut.
4. Buat Category test.
5. Buat Unit test.
6. Buat Vendor test.
7. Buat Asset Department test.
8. Buat Asset Division test yang terhubung ke department test.
9. Edit masing-masing data test.
10. Validasi setiap data bisa dicari di table.

Ekspektasi:

- Semua master asset info berhasil dibuat dan diedit.
- Asset Division hanya valid saat department tersedia.
- Data yang dipakai Asset Form muncul sebagai opsi.

## Skenario A05: Registrasi Asset Oleh Admin HO

Tujuan: memastikan admin HO dapat membuat asset untuk estate mana pun.

Prasyarat:

- Ada Asset Reg aktif.
- Ada Estate aktif selain HO, misalnya `TRN`.
- Ada Asset Department dan Division aktif.

Langkah:

1. Buka Assets.
2. Klik Add/Register Asset.
3. Pilih estate tujuan, misalnya `TRN`.
4. Pastikan Reg ID auto-generated setelah estate dipilih.
5. Isi Asset No, Serial No, Registration Date, Asset Registration Type, Alokasi, Asset Department, Asset Division, Vendor, Source, dan Keterangan.
6. Simpan.
7. Cari asset berdasarkan Reg ID atau Asset No.
8. Buka detail asset.
9. Edit asset, ubah keterangan atau vendor.
10. Simpan.

Ekspektasi:

- Admin dapat memilih estate pada form asset.
- Reg ID auto-generated.
- Asset muncul di daftar dan detail.
- Field type, manufacture, series terisi dari Asset Reg.
- Department dan Division tersimpan.

## Skenario A05B: Asset Management E2E Dari Register Sampai Distribusi Ke Estate

Tujuan: memastikan alur asset management dapat diuji sebagai satu proses bisnis utuh: register asset, validasi kepemilikan estate, distribusi/transfer asset ke estate lain, approval, dan verifikasi posisi asset setelah approval.

Data test:

- Prefix asset: `UAT-ADMIN-ASSET-E2E`
- Source estate: contoh `HO` atau `TRN`
- Destination estate: contoh `SPU`
- Qty transfer asset: `1`

Prasyarat:

- Ada Asset Reg aktif.
- Ada Asset Department dan Asset Division aktif.
- Ada user approver sesuai workflow transfer destination estate.
- Ada workflow aktif dengan `module_name = Transfer`; jika belum ada, minta approval user sebelum membuat/mengubah workflow.

Langkah Register Asset:

1. Login sebagai admin.
2. Buka Assets.
3. Klik Add/Register Asset.
4. Pilih Source Estate.
5. Pastikan Reg ID auto-generated sesuai estate yang dipilih.
6. Isi Asset No dengan prefix test, Serial No, Registration Date, Asset Registration Type, Alokasi, Department, Division, Vendor, Source, dan Keterangan.
7. Simpan asset.
8. Cari asset berdasarkan Reg ID/Asset No.
9. Buka detail asset dan catat nilai awal: Reg ID, Estate, Unit ID bila tampil, Department, Division, status active/inactive.

Ekspektasi Register:

- Asset berhasil dibuat pada source estate.
- Asset visible untuk admin.
- Asset memiliki department/division sehingga eligible untuk distribusi/transfer.
- Asset tidak masuk daftar transfer jika status inactive.

Langkah Distribusi/Transfer Asset:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Asset`.
4. Pilih Source Estate yang sama dengan estate asset.
5. Pilih Destination Estate yang berbeda.
6. Pilih recipient anggota destination estate jika tersedia.
7. Pilih asset test.
8. Isi qty `1`.
9. Isi notes, misalnya `UAT distribusi asset ke estate`.
10. Submit Transfer.
11. Buka detail transfer dan catat Transfer Code.
12. Pastikan status `Pending Approval`.

Ekspektasi Distribusi/Transfer:

- Source dan destination estate tidak boleh sama.
- Asset yang muncul hanya asset source estate.
- Asset tanpa department/division ditolak.
- Asset yang sudah ada di pending transfer lain ditolak.
- Detail transfer menampilkan asset test, source, destination, qty, notes, dan approval chain.

Langkah Approval Dan Verifikasi Setelah Approval:

1. Login sebagai user approver sesuai step workflow, atau minta user memberi instruksi jika approval akan dibantu via Tinker.
2. Buka My Approvals.
3. Cari approval transfer asset test.
4. Approve setiap step sesuai urutan workflow.
5. Login kembali sebagai admin.
6. Buka Transfers dan cari Transfer Code.
7. Pastikan status menjadi `Approved`.
8. Klik download Berita Acara bila tombol tersedia.
9. Buka Assets dan cari asset test.
10. Verifikasi apakah estate asset sudah berubah ke Destination Estate.
11. Buka detail asset dan periksa tab Riwayat Transfer.
12. Jika transfer memilih anggota penerima, cek field Assigned Member pada asset. Bila masih kosong/berbeda, update Assigned Member ke anggota penerima transfer.
13. Login sebagai user estate source dan destination jika user menyetujui, lalu cek visibility asset di masing-masing estate.
14. Jika email notification aktif dan mailer terkonfigurasi, cek email transfer created/approved/rejected men-CC email HO/admin.

Ekspektasi Setelah Approval:

- Transfer asset final berstatus `Approved`.
- Berita Acara dapat diunduh untuk transfer approved.
- Email HO/admin ikut menjadi CC pada notifikasi transfer jika email notification aktif.
- Detail asset menampilkan audit/history transfer asset: transfer code, estate asal, estate tujuan, unit lama/baru, anggota sebelumnya, target anggota, dan waktu proses.
- Reminder assignment member di dashboard destination estate hilang setelah field Assigned Member asset disesuaikan dengan anggota penerima transfer.
- Secara bisnis, asset yang sudah didistribusikan harus berpindah ke destination estate dan visible bagi user destination yang punya department/division sesuai.
- Secara bisnis, asset tidak lagi visible sebagai asset aktif source estate setelah distribusi final.
- Jika status transfer `Approved` tetapi `estate_id` atau `unit_id` asset tidak berubah ke destination estate, catat sebagai bug/gap implementasi asset transfer.
- Jika transfer approved tetapi tidak ada riwayat distribusi asset, catat sebagai gap audit trail.

Negative test:

1. Coba submit transfer asset dengan Source Estate sama dengan Destination Estate.
2. Coba submit asset yang belum punya department/division.
3. Coba submit asset yang sedang pending transfer.
4. Coba download Berita Acara saat status masih `Pending Approval`.
5. Coba ubah status transfer melalui endpoint update umum jika testing API dilakukan. Endpoint harus menolak karena status hanya boleh berubah via approval/cancel.

Ekspektasi Negative:

- Source dan destination sama ditolak.
- Asset tanpa ownership ditolak.
- Duplicate pending transfer ditolak.
- Berita Acara hanya bisa diunduh setelah approved.
- Status dan receive date tidak bisa dimutasi dari endpoint update umum.

## Skenario A06: Material Dan Stock Transaction

Tujuan: memastikan admin dapat membuat material dan mencatat stock IN/OUT.

Prasyarat:

- Ada category, section, unit, dan estate aktif.

Langkah:

1. Buka Materials.
2. Klik Add Material.
3. Gunakan tombol `AUTO` untuk Material Code.
4. Isi Material Name, Category, Estate, Section, Unit, Stock awal, Min Stock.
5. Simpan.
6. Cari material test.
7. Edit stock/min stock atau nama material.
8. Buka Transactions.
9. Klik Material IN.
10. Karena admin HO, pilih Estate yang sama dengan material test.
11. Pilih material test, isi qty, store/bin, SAP ID, nama penerima/pengirim, keterangan.
12. Simpan.
13. Klik Material OUT dengan qty lebih kecil dari stock tersedia.
14. Simpan.
15. Export CSV dari daftar transaksi.

Ekspektasi:

- Material berhasil dibuat.
- Transaction IN menambah stock.
- Transaction OUT mengurangi stock.
- Preview stock tampil sebelum submit.
- CSV terunduh/terbuat oleh browser.
- Jika qty OUT melebihi stock, UI memberi indikasi stock minus atau backend menolak sesuai aturan yang berjalan.

## Skenario A07: Transfer Material Cross Estate

Tujuan: memastikan admin dapat membuat transfer material antar estate dan memantau approval.

Prasyarat:

- Ada material aktif di source estate dengan stock cukup.
- Ada destination estate berbeda.
- Ada workflow `Transfer` aktif untuk destination estate atau workflow global.

Langkah:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Material`.
4. Pilih Source Estate.
5. Pilih Destination Estate yang berbeda.
6. Pilih Anggota penerima jika tersedia.
7. Pilih material, isi qty valid.
8. Tambahkan notes.
9. Submit Transfer.
10. Jika workflow tidak dikonfigurasi, transfer harus ditolak dan user harus setup workflow terlebih dahulu.
11. Buka detail transfer.
12. Periksa kode transfer, source, destination, item, qty, status, dan rantai approval.
13. Jika status masih Pending Approval, cancel transfer test hanya setelah user setuju.

Ekspektasi:

- Source dan destination tidak boleh sama.
- Qty material tidak boleh melebihi stock tersedia.
- Transfer tersimpan dengan status `Pending Approval`.
- Jika workflow `Transfer` tidak aktif/tidak lengkap/tidak punya approver, transfer ditolak dan tidak boleh auto-approved.
- Email HO/admin ikut menjadi CC pada notifikasi transfer jika email notification aktif.
- Detail menampilkan approval sequence.
- Transfer dapat dicancel saat status `Pending Approval`.
- Cancel/delete pending hanya boleh dilakukan oleh source estate atau HO.

## Skenario A08: Transfer Asset Cross Estate

Tujuan: memastikan admin dapat membuat transfer asset dengan ownership lengkap.

Prasyarat:

- Ada asset aktif pada source estate.
- Asset memiliki Asset Department dan Asset Division.
- Destination estate berbeda.

Langkah:

1. Buka Transfers.
2. Klik New Transfer.
3. Pilih type `Asset`.
4. Pilih Source Estate.
5. Pilih Destination Estate.
6. Pilih asset test.
7. Isi qty `1`.
8. Submit Transfer.
9. Buka detail transfer.
10. Periksa status dan approval chain.

Negative test:

1. Coba pilih asset yang belum memiliki department/division jika tersedia.
2. Submit.

Ekspektasi:

- Asset lengkap bisa diajukan transfer.
- Asset tanpa department/division ditolak dengan pesan bahwa ownership asset harus dilengkapi.
- Asset yang sedang berada pada pending transfer lain tidak boleh diajukan ulang.
- Setelah final approval, cek apakah data master asset berpindah ke destination estate. Jika tidak berpindah, catat sebagai bug/gap karena distribusi asset belum benar-benar mengubah ownership estate asset.

## Skenario A08B: Asset Rusak, Maintenance, Dan Write-Off Dengan Approval

Tujuan: memastikan alur pelaporan asset rusak tidak langsung mengubah status asset menjadi inactive, HO/admin mendapat visibility lewat dashboard/email, dan write-off hanya dapat berjalan melalui workflow approval yang valid.

Prasyarat:

- Ada asset aktif yang visible untuk admin dan estate operasional.
- Ada user estate yang memiliki permission `create-asset-reports` dan `create-write-offs`.
- Ada workflow `write-off` aktif untuk estate asset atau workflow global, dengan step approval pertama yang memiliki approver aktif. Untuk SOP HO/admin, gunakan step role `admin` atau user approver HO yang dipilih eksplisit.
- Jika workflow belum ada, minta approval user sebelum membuat/mengubah workflow test.

Langkah Laporan Kerusakan:

1. Login sebagai admin atau estate operasional sesuai instruksi user.
2. Buka Assets.
3. Buka detail asset test.
4. Pada tab Kondisi, klik `Report Damage`.
5. Isi tanggal, kondisi `Bad` atau `Broken`, deskripsi kerusakan, dan aktifkan pembuatan maintenance.
6. Isi PIC/target maintenance dan simpan.
7. Login sebagai admin/HO.
8. Buka Dashboard.
9. Periksa panel reminder `Asset Damage` dan `Maintenance Progress`.

Ekspektasi Laporan Kerusakan:

- Kondisi asset tersimpan sebagai `Bad` atau `Broken`.
- Maintenance tersimpan dengan status `Progress`.
- Asset tetap active setelah laporan kerusakan.
- Dashboard HO/admin menampilkan reminder asset rusak dan maintenance progress.
- Jika email notification aktif dan mailer terkonfigurasi, HO/admin menerima email laporan kerusakan.

Langkah Write-Off:

1. Dari detail asset yang kondisinya `Broken`, ajukan write-off.
2. Isi alasan write-off minimal dan submit.
3. Buka detail/daftar write-off.
4. Pastikan status approval masih `Pending`.
5. Buka Dashboard dan periksa panel `Pending Write-Off`.
6. Login sebagai approver workflow hanya setelah user menyetujui eksekusi approval.
7. Approve seluruh step workflow sesuai urutan.
8. Login kembali sebagai admin dan buka detail asset.
9. Cek status active/inactive.
10. Klik `Generate BA` / download Berita Acara write-off jika approved.
11. Periksa isi PDF Berita Acara.

Ekspektasi Write-Off:

- Write-off hanya membuat approval request, tidak langsung membuat asset inactive.
- Asset baru menjadi inactive setelah final approval.
- Approver HO/admin dapat melihat dan memproses approval bila step workflow memang ditujukan ke role `admin` atau user HO eksplisit.
- Berita Acara write-off hanya bisa diunduh setelah approved.
- Output Berita Acara memuat nomor dokumen, identitas asset, dasar laporan kerusakan, ringkasan maintenance, alasan write-off, approval log, dan tanda tangan requester/approver/HO.
- Jika write-off direject/cancel, asset tetap active.
- Dashboard HO/admin menampilkan pending write-off selama approval masih pending.

Negative test:

1. Nonaktifkan atau kosongkan workflow `write-off` hanya jika user menyetujui perubahan data test.
2. Submit write-off untuk asset test.
3. Buat workflow `write-off` tanpa step pertama atau tanpa approver aktif hanya jika user menyetujui.
4. Submit ulang write-off.
5. Coba submit write-off kedua saat masih ada write-off pending untuk asset yang sama.

Ekspektasi Negative:

- Tanpa workflow aktif, write-off ditolak dengan status 422.
- Workflow tanpa step pertama ditolak.
- Workflow tanpa approver aktif ditolak.
- Tidak ada record write-off yang dibuat untuk request invalid.
- Asset tidak berubah inactive untuk semua request invalid/rejected/cancelled.
- Duplicate pending write-off ditolak.

## Skenario A09: Approval Workflows

Tujuan: memastikan admin dapat mengelola workflow approval.

Langkah:

1. Buka Approval Workflows.
2. Tambah workflow test.
3. Isi Workflow Name.
4. Pilih module sesuai opsi UI.
5. Pilih estate optional atau global.
6. Tambah step approval, pilih role non-admin, misalnya `manager` atau `finance`.
7. Simpan.
8. Edit workflow test: tambah step atau ubah active flag.
9. Gunakan fitur check workflow dari flow transfer bila tersedia.
10. Hapus workflow test setelah user memberi approval cleanup.

Ekspektasi:

- Role admin tidak muncul sebagai approver.
- Workflow dapat dibuat, diedit, diaktifkan/nonaktifkan.
- Workflow estate-specific hanya dipakai untuk destination estate terkait.

Catatan risiko:

- Backend transfer mencari workflow dengan `module_name = Transfer`; pastikan workflow test/admin menggunakan value ini.
- Role seed menggunakan `manager` dan `finance` huruf kecil, sedangkan workflow seed lama dapat memakai `Manager` dan `Finance`. Jika approval tidak muncul di My Approvals user manager/finance, catat mismatch role_name sebagai temuan dan minta approval user sebelum memperbaiki data workflow via Tinker.

## Skenario A10: User Management Dan Role Management

Tujuan: memastikan admin dapat mengelola user dan role.

Langkah User Management:

1. Buka User Management.
2. Buat user local test dengan role non-admin dan estate tertentu.
3. Pastikan user muncul di table.
4. Edit nama, email, role, estate, dan assignment asset department/division jika form mendukung.
5. Reset password user test.
6. Login sebagai user test hanya bila user memberi approval untuk memakai akun tersebut.
7. Hapus user test setelah user memberi approval cleanup.

Langkah Role Management:

1. Buka Role Management.
2. Buat role test dengan permission terbatas.
3. Edit nama atau permission role test.
4. Coba edit role `admin`.
5. Coba delete role `admin`.
6. Hapus role test setelah user memberi approval cleanup.

Ekspektasi:

- User dapat dibuat dan disinkronkan dengan role Spatie.
- Reset password berhasil dan token target dicabut.
- Role admin tidak dapat dimodifikasi/dihapus oleh endpoint.
- Role test dapat dikelola sesuai permission admin.

## Skenario A11: User Activation LDAP/Pending User

Tujuan: memastikan admin dapat mengaktifkan dan menonaktifkan user non-admin.

Prasyarat:

- Ada user LDAP/pending dengan `not_active = true`.
- Jika tidak ada, agent AI wajib meminta approval sebelum membuat data simulasi via Tinker.

Langkah:

1. Buka User Activation.
2. Filter status `pending`.
3. Pilih user pending.
4. Pilih role yang tersedia: guest, estate, manager, atau finance.
5. Aktifkan user.
6. Filter status `active`.
7. Pastikan user pindah ke daftar active.
8. Deactivate user test hanya setelah user menyetujui.

Ekspektasi:

- Role admin tidak tersedia untuk aktivasi.
- User aktif mendapatkan role dan tidak lagi `not_active`.
- User nonaktif kehilangan role dan kembali tidak aktif.

## Skenario A12: System Settings

Tujuan: memastikan admin dapat mengubah setting sistem.

Langkah:

1. Buka System Settings.
2. Catat nilai awal setting penting seperti app name, logo URL, footer text, atau email toggle.
3. Ubah satu setting minor dengan nilai test.
4. Simpan.
5. Refresh aplikasi.
6. Pastikan perubahan tampil.
7. Kembalikan nilai awal hanya setelah user menyetujui.

Ekspektasi:

- Setting berhasil tersimpan.
- Perubahan terlihat pada UI terkait.
- Tidak ada setting penting yang berubah permanen tanpa persetujuan.

## Skenario A13: Global Search

Tujuan: memastikan admin dapat mencari asset, material, dan transfer.

Langkah:

1. Login sebagai admin.
2. Gunakan search bar di header.
3. Cari minimal 2 karakter dari asset test.
4. Pilih hasil asset.
5. Ulangi untuk material test.
6. Ulangi untuk transfer test.

Ekspektasi:

- Search menampilkan hasil sesuai tipe.
- Klik hasil membawa user ke halaman detail/list yang benar.
- Search kosong menampilkan pesan no results tanpa error.

## Skenario A14: Negative Permission Dan Auth

Tujuan: memastikan endpoint dan UI menolak kondisi invalid.

Langkah:

1. Logout.
2. Akses `/dashboard` langsung.
3. Pastikan redirect ke `/login`.
4. Login admin.
5. Submit form wajib tanpa mengisi required field.
6. Akses transfer detail ID yang tidak ada.
7. Coba trigger `/api/process-queue` sebagai admin hanya jika user menyetujui karena ini menjalankan queue.

Ekspektasi:

- Route tanpa token redirect ke login.
- Validasi form tampil.
- Data tidak ditemukan memberi 404 atau pesan wajar.
- Queue endpoint hanya boleh dipakai admin dan hanya setelah approval user.

## Checklist Exit Criteria Admin

- Login/logout berhasil.
- Semua menu admin dapat dibuka.
- CRUD master data utama berhasil.
- Asset dan material dapat dibuat.
- Transaction IN/OUT berjalan.
- Transfer material dan asset bisa dibuat atau tervalidasi dengan benar.
- Laporan asset rusak terlihat di dashboard HO/admin dan tidak membuat asset inactive.
- Write-off tanpa workflow/approver valid ditolak; write-off approved membuat asset inactive dan menghasilkan Berita Acara.
- Workflow, user, role, activation, dan settings tervalidasi.
- Semua penggunaan Tinker atau cleanup sudah mendapat approval user.
- Temuan bug dicatat dengan langkah reproduksi dan data test.
