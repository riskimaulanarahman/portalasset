# UAT Persona: Guest

## Instruksi Untuk Agent AI

Dokumen ini adalah panduan manual test end to end untuk persona `guest`.

Aturan wajib:

- Jangan menjalankan `php artisan tinker`, query database, seeder, migration, atau command yang mengubah data tanpa instruksi eksplisit dan persetujuan user.
- Persona guest adalah read-only. Jangan mencoba membuat perubahan data kecuali user secara eksplisit meminta negative test dan menyetujui data test yang digunakan.
- Jika perlu membuat user guest atau data pembanding via Tinker, jelaskan rencana dan tunggu approval user.
- Gunakan prefix data test `UAT-GUEST-YYYYMMDD-HHMM` jika data baru dibuat.
- Jangan cleanup atau mengubah status data tanpa persetujuan user.

Instruksi berpikir kritis dan perbaikan:

- Jangan hanya menjalankan langkah secara mekanis. Evaluasi apakah flow masuk akal secara bisnis, konsisten antar role, dan konsisten antara UI, API, permission, scope estate, approval, dan efek data.
- Jika hasil aktual berbeda dari ekspektasi, segera klasifikasikan: bug aplikasi, gap requirement, data setup kurang, permission salah, workflow salah, atau batasan test environment.
- Jika ditemukan potensi bug atau flow yang jelas tidak sesuai dan penyebabnya ada di kode/config aplikasi, segera lakukan investigasi root cause dan perbaikan yang terarah.
- Setelah memperbaiki kode, jalankan verifikasi yang relevan dan update catatan UAT dengan bug, file yang diperbaiki, dan hasil retest.
- Jika perbaikan membutuhkan perubahan data via Tinker, query database, seeder, migration, approval manual, atau cleanup data, berhenti dulu dan minta persetujuan user.
- Jangan menutupi mismatch dengan mengubah data test sembarangan. Jelaskan temuan, dampak, dan opsi perbaikan.

## Ringkasan Persona

Role `guest` hanya memiliki akses lihat untuk beberapa modul:

- `view-assets`
- `view-materials`
- `view-transactions`
- `view-estates`

Guest tidak boleh create, edit, delete, approve, transfer, mengelola user, role, workflow, settings, atau master data lain.

Catatan akses aktual yang perlu divalidasi:

- Route `/approvals`, `/transfers`, dan `/access-request` saat ini tidak diberi required permission di frontend route.
- Jika menu atau direct URL tersebut bisa dibuka oleh guest, catat sebagai gap akses atau keputusan product owner yang perlu dikonfirmasi.
- Jangan submit approval, transfer, atau access request sebagai guest tanpa instruksi eksplisit dan persetujuan user.

Catatan scoping:

- Jika user guest memiliki estate_id, akses operational route mengikuti estate user.
- Jika user guest `not_active` atau tidak punya estate_id, aplikasi hanya mengizinkan dashboard dan redirect route lain ke dashboard.
- Asset visibility tetap dibatasi oleh assignment Asset Department atau Asset Division untuk user non-admin/non-HO.

## Prasyarat

- Ada user guest aktif dengan estate_id.
- User guest memiliki assignment Asset Department atau Asset Division jika perlu melihat asset.
- Ada asset/material/transaction pada estate guest.
- Jika user guest belum tersedia dari seeder, agent AI wajib meminta approval sebelum membuatnya via admin UI atau Tinker.

## Skenario G01: Login Guest Aktif

Tujuan: memastikan guest aktif dapat masuk dan melihat dashboard.

Langkah:

1. Buka `/login`.
2. Login sebagai user guest aktif.
3. Pastikan diarahkan ke `/dashboard`.
4. Periksa nama dan role guest pada header/sidebar.
5. Buka dan tutup sidebar.
6. Gunakan toggle dark mode.
7. Klik logout dan konfirmasi.

Ekspektasi:

- Login berhasil.
- Dashboard tampil.
- Tidak ada error permission pada dashboard.
- Logout kembali ke halaman login.

## Skenario G02: Menu Guest Read-Only

Tujuan: memastikan hanya menu view yang tampil.

Langkah:

1. Login sebagai guest.
2. Periksa menu yang tampil.
3. Pastikan menu berikut boleh tampil jika user aktif dan punya estate: Dashboard, Estates, Assets, Materials, Transactions.
4. Periksa apakah My Approvals atau Transfers tampil. Jika tampil, catat sebagai gap akses karena role guest tidak memiliki permission approval/transfer eksplisit.
5. Pastikan menu berikut tidak tampil: Access Request dari sidebar, Business Units, Sections, Categories, Cost Centers, User Activation, Members, Asset Types, Asset Departments, Asset Divisions, Asset Reg, Manufacturers, Units, Vendors, Software, Kondisi Aset, User Management, Role Management, Approval Workflows, System Settings.
6. Buka Help Guide jika icon tersedia.

Ekspektasi:

- Guest melihat menu read-only yang sesuai permission.
- Tidak ada tombol create/edit/delete pada halaman yang dapat dibuka.
- Jika modul transfer atau approval tersedia dari navigasi, catat sebagai temuan akses dan jangan lakukan mutation tanpa approval user.

Catatan:

- Route `/access-request` dilindungi hanya oleh token, tetapi tidak tampil di sidebar. Jika dibuka langsung, guest mungkin dapat mengajukan request akses. Validasi skenario G08.

## Skenario G03: View Estates

Tujuan: memastikan guest dapat melihat daftar estate tanpa aksi modifikasi.

Langkah:

1. Buka Estates.
2. Periksa daftar estate.
3. Gunakan search.
4. Gunakan pagination/sort jika tersedia.
5. Periksa apakah tombol add/edit/delete tidak tampil.

Ekspektasi:

- Daftar estate tampil.
- Search bekerja.
- Guest tidak dapat membuat, mengedit, atau menghapus estate.

## Skenario G04: View Materials Estate Scope

Tujuan: memastikan guest hanya melihat material sesuai scope dan tanpa aksi modifikasi.

Langkah:

1. Buka Materials.
2. Catat material yang tampil.
3. Cari material pada estate guest.
4. Cari material estate lain jika kode/nama diketahui dari admin.
5. Periksa tombol Add Material.
6. Periksa action edit/delete pada row.

Ekspektasi:

- Material estate guest tampil.
- Material estate lain tidak tampil untuk guest non-HO.
- Tombol Add Material tidak tampil.
- Tombol edit/delete tidak tampil.
- API create/update/delete material mengembalikan 403 jika dipanggil langsung.

## Skenario G05: View Assets Dengan Ownership Scope

Tujuan: memastikan guest hanya melihat asset yang sesuai estate dan assignment department/division.

Prasyarat:

- Guest punya asset department/division assignment.
- Ada asset yang cocok assignment.

Langkah:

1. Buka Assets.
2. Cari asset yang cocok dengan assignment guest.
3. Buka detail asset.
4. Periksa informasi asset, history kondisi, maintenance, atau write-off bila tampil.
5. Cari asset estate lain atau asset department/division lain jika data diketahui.
6. Buka direct URL `/assets/{regId}` untuk asset yang tidak boleh diakses jika user menyetujui negative test ini.

Ekspektasi:

- Asset visible dapat dibuka detailnya.
- Asset di luar estate/ownership tidak tampil atau tidak bisa dibuka.
- Tombol Register Asset, Edit, Delete, Add Condition, Add Maintenance, dan Write-Off tidak tampil.

## Skenario G05B: Guest Verifikasi Hasil Register Dan Distribusi Asset

Tujuan: memastikan guest hanya bisa memantau asset hasil register/distribusi sesuai estate dan ownership scope, tanpa dapat melakukan aksi asset management.

Prasyarat:

- Ada asset test yang sudah diregister admin.
- Ada transfer/distribusi asset test yang sudah final approved ke estate guest, atau skenario ini dijalankan setelah admin/estate menyelesaikan transfer asset.
- Guest memiliki department/division assignment yang cocok dengan asset destination jika ingin melihat asset.

Langkah:

1. Login sebagai guest destination estate.
2. Buka Assets.
3. Cari asset test yang sudah didistribusikan ke estate guest.
4. Buka detail asset.
5. Periksa Estate, Department, Division, status active, dan informasi asset.
6. Periksa tombol aksi asset management.
7. Buka `/transfers` langsung jika user menyetujui negative access check.
8. Cari Transfer Code distribusi asset jika halaman terbuka.

Ekspektasi:

- Jika distribusi asset sudah benar, guest destination dapat melihat asset sesuai estate dan assignment.
- Guest source estate tidak lagi melihat asset yang sudah dipindahkan ke destination estate.
- Guest tidak melihat tombol Register Asset, Edit, Delete, Add Condition, Maintenance, Write-Off, New Transfer, Approve, Reject, atau Cancel.
- Jika asset tidak muncul di destination estate setelah transfer approved, catat sebagai bug/gap distribusi asset.
- Jika guest bisa membuat transfer atau approval, catat sebagai bug/gap akses kritis.

## Skenario G06: View Transactions

Tujuan: memastikan guest hanya melihat transaksi tanpa membuat IN/OUT.

Langkah:

1. Buka Transactions.
2. Periksa daftar transaksi.
3. Gunakan search berdasarkan material, section, receiver, atau create_by.
4. Klik Export CSV bila tombol tersedia.
5. Periksa tombol Material IN dan Material OUT.

Ekspektasi:

- Transaksi tampil sesuai scope estate.
- Search bekerja.
- Export CSV boleh berjalan karena tidak mengubah database.
- Tombol Material IN dan Material OUT tidak tampil.

## Skenario G07: Direct URL Negative Test Untuk Modul Terlarang

Tujuan: memastikan guest tidak dapat mengakses route yang tidak sesuai permission.

Langkah:

1. Login sebagai guest.
2. Buka `/transfers`.
3. Jika `/transfers` terbuka, jangan submit transfer. Catat apakah tombol New Transfer tampil sebagai gap akses.
4. Buka `/approvals`.
5. Jika `/approvals` terbuka, pastikan daftar kosong atau hanya item yang benar-benar ditugaskan; catat sebagai gap jika guest dapat approve/reject.
6. Buka `/anggotas`.
7. Buka `/cost-centers`.
8. Buka `/software`.
9. Buka `/units`.
10. Buka `/vendors`.
11. Buka `/admin/users`.
12. Buka `/admin/roles`.
13. Buka `/admin/workflows`.
14. Buka `/settings`.
15. Buka `/asset-regs`, `/asset-types`, `/manufacturers`, `/categories`, `/sections`, `/business-units`, `/asset-departments`, `/asset-divisions`.

Ekspektasi:

- Route tanpa permission redirect ke dashboard atau menampilkan akses ditolak.
- Jika `/transfers` atau `/approvals` dapat dibuka, catat hasil aktual sebagai potensi gap karena route tersebut belum memakai required permission.
- Tidak ada data sensitif dari modul admin yang tampil.
- API terkait mengembalikan 403 bila dipanggil langsung.

## Skenario G08: Access Request Direct URL

Tujuan: memastikan guest dapat atau tidak dapat mengajukan perubahan akses sesuai desain aplikasi aktual.

Langkah:

1. Login sebagai guest.
2. Buka `/access-request` langsung dari address bar.
3. Periksa Role Saat Ini dan Estate Saat Ini.
4. Periksa opsi role yang tersedia.
5. Pastikan role admin tidak tersedia.
6. Coba submit request dengan role dan estate yang sama dengan saat ini.
7. Jika user menyetujui, submit request perubahan role/estate test.
8. Coba submit request kedua saat request pertama masih pending.

Ekspektasi:

- Role admin tidak dapat diajukan.
- Request yang sama dengan role/estate saat ini ditolak.
- Request kedua saat ada pending ditolak.
- Jika request berhasil dibuat, status pending tampil.

Catatan keputusan:

- Jika product owner menganggap guest tidak boleh membuka Access Request sama sekali, catat sebagai gap karena route `/access-request` saat ini hanya memerlukan login, bukan permission khusus.

## Skenario G09: Guest Tidak Aktif Atau Tanpa Estate

Tujuan: memastikan user guest yang belum aktif atau belum punya estate tidak dapat masuk ke area operasional.

Prasyarat:

- Ada user guest/test dengan `not_active = true` atau `estate_id = null`.
- Jika belum ada, agent AI wajib meminta approval sebelum membuat/mengubah user test.

Langkah:

1. Login sebagai user guest tidak aktif atau tanpa estate.
2. Pastikan dashboard masih dapat dibuka jika token valid.
3. Coba buka `/materials`.
4. Coba buka `/assets`.
5. Coba buka `/transactions`.

Ekspektasi:

- User `not_active` atau tanpa estate diarahkan kembali ke dashboard saat membuka route operasional.
- Sidebar hanya menampilkan dashboard atau menu minimum.
- Tidak ada data operasional yang tampil.

## Skenario G10: Negative API Mutation

Tujuan: memastikan guest tidak dapat mengubah data melalui API langsung.

Instruksi khusus:

- Jangan menjalankan request mutation langsung sebelum user menyetujui negative test.
- Gunakan data test saja.

Endpoint yang harus ditolak bila diuji:

- `POST /api/materials`
- `PUT /api/materials/{code atau id}`
- `DELETE /api/materials/{id}`
- `POST /api/transactions`
- `POST /api/transfers`
- `POST /api/write-offs`
- `POST /api/assets`
- `PUT /api/assets/{id}`
- `DELETE /api/assets/{id}`
- `POST /api/approvals/{id}/approve`
- `POST /api/password/reset-by-admin`

Ekspektasi:

- API mengembalikan 403 atau validasi akses yang setara.
- Tidak ada data yang berubah.
- Jika ada endpoint mutation yang berhasil untuk guest, catat sebagai bug kritis.
- Khusus transfer, endpoint saat ini tidak memakai middleware permission eksplisit; jika guest berhasil membuat transfer, catat sebagai bug kritis atau keputusan product owner yang perlu dikonfirmasi.

## Skenario G11: Search Bar Dan Visibility

Tujuan: memastikan global search guest tidak membocorkan data.

Langkah:

1. Login sebagai guest aktif.
2. Gunakan search bar header bila tampil.
3. Cari asset yang visible untuk guest.
4. Cari material yang visible untuk guest.
5. Cari transfer atau data estate lain yang tidak seharusnya terlihat.

Ekspektasi:

- Search hanya mengembalikan data yang guest boleh lihat.
- Data transfer tidak muncul jika guest tidak punya akses transfer. Jika muncul, catat sebagai potensi gap akses.
- Klik hasil search tidak membuka data di luar scope.

## Checklist Exit Criteria Guest

- Login/logout berhasil.
- Guest hanya melihat menu read-only.
- Estates, Materials, Assets, dan Transactions dapat dilihat sesuai scope.
- Tidak ada tombol create/edit/delete/approve/transfer; jika transfer/approval tampil, temuan akses sudah dicatat.
- Direct URL ke modul terlarang ditolak.
- Access Request direct URL tervalidasi dan gap desain dicatat jika perlu.
- Guest tidak aktif atau tanpa estate dibatasi ke dashboard.
- Semua negative mutation dan Tinker hanya dilakukan setelah persetujuan user.
