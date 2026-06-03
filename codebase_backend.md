# Codebase Backend — Portal Asset

> **Panduan ini ditujukan untuk AI Agent** yang akan bekerja pada codebase backend Portal Asset.  
> Baca dokumen ini sebelum melakukan perubahan apa pun agar tidak merusak arsitektur dan aturan bisnis yang sudah ada.

---

## 1. Gambaran Umum

**Portal Asset** adalah sistem manajemen asset dan material untuk perusahaan perkebunan multi-estate.  
Backend dibangun di atas **Laravel 11** dengan pola REST API yang dikonsumsi oleh frontend React terpisah.

| Atribut | Detail |
|---|---|
| Framework | Laravel 11 (PHP ^8.2) |
| Autentikasi | Laravel Sanctum (token-based) + LDAP fallback |
| Otorisasi | Spatie Laravel Permission (role & permission) |
| Database | MySQL (default) / SQLite (dev) |
| Queue | Database queue driver |
| PDF | barryvdh/laravel-dompdf |
| LDAP | directorytree/ldaprecord-laravel |
| API Prefix | `/api/...` |

---

## 2. Struktur Direktori

```
backend/
├── app/
│   ├── Concerns/                         ← Trait yang dipakai model
│   │   └── Auditable.php                 ← Trait audit trail (NEW #8)
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/                      ← Semua controller REST API
│   │   │   │   ├── AuthController.php    ← Login, logout, me, changePassword, resetPasswordByAdmin
│   │   │   │   ├── AssetController.php
│   │   │   │   ├── MaterialController.php   ← Paginated + estate-aware code + duplicate check
│   │   │   │   ├── TransactionController.php
│   │   │   │   ├── TransferController.php   ← + cancel endpoint
│   │   │   │   ├── ApprovalController.php
│   │   │   │   ├── ApprovalWorkflowController.php
│   │   │   │   ├── DashboardController.php  ← + transfer_stats
│   │   │   │   ├── SearchController.php     ← Global search (NEW #16)
│   │   │   │   ├── UserController.php
│   │   │   │   ├── RoleController.php
│   │   │   │   ├── SettingController.php
│   │   │   │   ├── EstateController.php
│   │   │   │   ├── SectionController.php
│   │   │   │   ├── CategoryController.php
│   │   │   │   ├── BusinessUnitController.php
│   │   │   │   ├── AnggotaController.php
│   │   │   │   ├── AssetRegController.php
│   │   │   │   ├── AssetTypeController.php
│   │   │   │   ├── ManufacturerController.php
│   │   │   │   ├── CostCenterController.php
│   │   │   │   ├── SoftwareController.php   ← + asset relation (#19)
│   │   │   │   ├── UnitController.php
│   │   │   │   └── VendorController.php
│   │   │   └── Concerns/
│   │   │       └── InteractsWithEstateScope.php  ← Trait kritis multi-estate
│   ├── Jobs/
│   │   └── SendTransferBeritaAcaraJob.php  ← Respects enable_email_notif setting (#17)
│   ├── Mail/
│   │   └── TransferApprovedMail.php
│   ├── Models/
│   │   ├── Asset.php          ← + SoftDeletes + Auditable (#7, #8)
│   │   ├── Material.php       ← + SoftDeletes + Auditable (#7, #8)
│   │   ├── Transfer.php       ← + SoftDeletes + Auditable + cancel() (#7, #8, #18)
│   │   ├── Transaction.php    ← + SoftDeletes (#7)
│   │   ├── User.php           ← + SoftDeletes (#7)
│   │   ├── Software.php       ← + asset() relation + asset_id fillable (#19)
│   │   ├── AuditLog.php       ← Model audit trail (NEW #8)
│   │   └── ... (model lain tidak berubah)
│   ├── Services/
│   │   └── MaterialTransferService.php   ← Business logic transfer material
│   └── Providers/
│       └── AppServiceProvider.php
├── database/
│   ├── migrations/
│   │   ├── ... (migration lama)
│   │   ├── 2026_05_25_105022_add_unique_to_transfer_code_on_transfers_table.php  ← (#4)
│   │   ├── 2026_05_25_105244_add_soft_deletes_to_main_tables.php                ← (#7)
│   │   ├── 2026_05_25_105655_create_audit_logs_table.php                        ← (#8)
│   │   └── 2026_05_25_132429_add_asset_id_to_software_table.php                 ← (#19)
│   └── seeders/
├── routes/
│   └── api.php                           ← Semua route API
├── tests/
│   └── Feature/
│       ├── AuthTest.php        ← Feature test login/logout/changePassword (#24)
│       ├── MaterialTest.php    ← Feature test CRUD material (#24)
│       └── TransferTest.php    ← Feature test transfer flow (#24)
└── config/
    ├── ldap.php, cors.php, sanctum.php, permission.php
```

---

## 3. Autentikasi & Otorisasi

### 3.1 Alur Login (`AuthController::login`)

```
Request (username + password)
    │
    ├─→ Rate limit: throttle:5,1 — max 5 attempt per menit (#3)
    │
    ├─→ Cek local database (Hash::check)
    │       └─→ Jika cocok → respond token
    │
    └─→ Jika tidak cocok → coba LDAP Auth::attempt()
            ├─→ Jika berhasil → sync password ke lokal → respond token
            └─→ Jika gagal → ValidationException "User tidak ditemukan"
```

- Token menggunakan **Laravel Sanctum personal access token**
- User nonaktif (`not_active = true`) ditolak meskipun password benar
- Response login: `{ access_token, token_type, user, permissions }`

### 3.2 Ganti Password & Reset Password

| Endpoint | Method | Keterangan |
|---|---|---|
| `POST /api/profile/change-password` | `AuthController::changePassword` | User ganti password sendiri; wajib `current_password`; menghapus semua token |
| `POST /api/users/{id}/reset-password` | `AuthController::resetPasswordByAdmin` | Admin/HO reset password user lain; butuh role `admin` atau permission `edit-users` |

### 3.3 Permission System (Spatie)

Semua route di dalam `auth:sanctum` middleware group.  
Controller menggunakan `HasMiddleware` interface untuk permission per method:

```php
new Middleware('permission:view-assets', only: ['index', 'show']),
new Middleware('permission:create-assets', only: ['store']),
new Middleware('permission:edit-assets', only: ['update']),
new Middleware('permission:delete-assets', only: ['destroy']),
```

**Daftar permission yang ada** (didefinisikan di `PermissionSeeder`):
- CRUD untuk: business-units, sections, estates, categories, materials, asset-types, asset-regs, manufacturers, assets, transactions, anggotas, cost-centers, software, units, vendors, users, roles, approval-workflows, transfers
- `edit-settings` (satu-satunya permission untuk settings)

**Roles bawaan:**
| Role | Deskripsi |
|---|---|
| `admin` | Semua permission (via `Gate::before` di AppServiceProvider) |
| `estate` | Manajemen material & transaksi lokal |
| `Manager` | Sama dengan estate |
| `Finance` | Sama dengan estate |

---

## 4. Konsep Multi-Estate (`InteractsWithEstateScope`)

> **Ini adalah konsep paling penting dalam sistem ini. HARUS dipahami sebelum mengubah controller apapun.**

Trait `InteractsWithEstateScope` di `app/Http/Controllers/Concerns/` menyediakan helper:

| Method | Fungsi |
|---|---|
| `isHeadOfficeUser()` | `true` jika `estate.estate_id === 'HO'` |
| `currentEstateId()` | ID estate user yang login |
| `currentEstateCode()` | Kode estate (misalnya 'KLT', 'SMD') |
| `applyEstateScope($query, $column)` | Filter query berdasarkan estate user |
| `ensureEstateAccess($estateId)` | Abort 404 jika bukan estate user sendiri |

**Aturan akses:**
- **HO (Head Office)** → bisa melihat semua estate, bisa filter by estate_id
- **Non-HO** → hanya bisa melihat data estate sendiri

```php
// Contoh pola yang digunakan di semua controller:
$estateId = $this->isHeadOfficeUser()
    ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
    : $this->currentEstateId();
```

---

## 5. Model-Model Kunci

### 5.1 Asset (Primary Key: `reg_id` - string)
```
assets: reg_id(PK,string,10), asset_no, unit_id(legacy), date, serial_no,
        type_id(FK→asset_regs), type, manufacture, series, section_id(FK),
        alokasi, keterangan, vendor_id(FK), estate_id(FK), attachment,
        not_active, create_by, create_date, update_by, update_date, source,
        deleted_at  ← SoftDelete (#7)
```
- Timestamp kustom: `create_date` / `update_date`; **bukan** `created_at`/`updated_at`
- `deleted_at` ada tapi timestamp kustom tetap `create_date`/`update_date`
- Trait aktif: `SoftDeletes`, `Auditable`
- Relasi legacy: `unit_id` (string) untuk estate lama sebelum ada `estate_id`

### 5.2 Material (Primary Key: `code` - string)
```
materials: code(PK,string,25), nama, type, category_id(FK), unit_id(FK),
           matcode, sn, min_stock, price, stock(decimal,10,1), pt,
           section_id(FK), estate_id(FK), not_active, create_by, create_date,
           update_by, update_date, deleted_at  ← SoftDelete (#7)
```
- `stock` dikelola otomatis oleh `TransactionController` (IN/OUT) dan `MaterialTransferService`
- Timestamp kustom: `create_date` / `update_date`
- Kode material format: **`MAT-{ESTATE_CODE}-XXXXXX`** (estate-aware, 6 digit zero-padded) (#10)
- Unik: kombinasi `nama + category_id + estate_id` harus unik per estate (#11)
- Trait aktif: `SoftDeletes`, `Auditable`

### 5.3 Transfer
```
transfers: id, transfer_code(UNIQUE, TRF-YYYYMM-XXXX), type(Asset|Material),
           from_estate_id(FK), to_estate_id(FK), anggota_id(FK→anggotas.sap_id),
           status(Pending Approval|Approved|Rejected|Cancelled),
           transfer_date, receive_date, notes, created_by,
           deleted_at  ← SoftDelete (#7)
```
- `transfer_code` memiliki UNIQUE constraint di database (#4)
- Transfer yang dibuat dalam `DB::transaction` dengan `lockForUpdate()` untuk mencegah race condition (#4)
- Status `Cancelled` tersedia untuk membatalkan transfer yang belum diproses (#18)
- `cancel()` method di model untuk validasi + update status
- Trait aktif: `SoftDeletes`, `Auditable`

### 5.4 Transaction
```
transactions: id, material_code(FK), estate_id, type(IN|OUT), qty, notes,
              create_by, create_date,
              deleted_at  ← SoftDelete (#7)
```
- `$timestamps = false` — tidak punya `created_at`/`updated_at` (pakai `create_date`)
- Trait aktif: `SoftDeletes` saja (tidak ada `Auditable` karena timestamps false)

### 5.5 AuditLog (NEW #8)
```
audit_logs: id, model_type(string), model_id(string), action(created|updated|deleted|restored|force_deleted),
            user_id(nullable,FK→users), username(nullable,string), old_values(json nullable),
            new_values(json nullable), ip_address(string,45), user_agent(string nullable),
            created_at, updated_at
            Indexes: (model_type, model_id), user_id, action
```

### 5.6 Software
```
software: id, name, version, license_key, ..., asset_id(nullable,string) ← NEW (#19)
```
- `asset()` relation: `belongsTo(Asset::class, 'asset_id', 'reg_id')`
- `asset_id` nullable (software standalone tidak wajib punya asset host)
- Tidak ada FK constraint di database karena Asset PK bertipe string

### 5.7 ApprovalWorkflow + ApprovalStep + ApprovalRequest + ApprovalLog
- Workflow berisi steps berurutan (`sequence`)
- Step bisa di-assign ke `role_name` (nama role Spatie) atau `user_id` spesifik
- ApprovalRequest adalah instance dari workflow untuk 1 transaksi
- ApprovalLog mencatat setiap aksi approve/reject

---

## 6. Audit Trail (`Auditable` Trait) — NEW #8

Trait `App\Concerns\Auditable` di-apply ke semua model utama (Asset, Material, Transfer, User).

### Cara kerja:
```php
// Di model:
use App\Concerns\Auditable;
use SoftDeletes, Auditable;

// bootAuditable() registrasi model events:
// created, updated, deleted → each calls writeAuditLog()
// restored → juga di-track
```

### `writeAuditLog()`:
- Strip field sensitif: `password`, `remember_token`, `guid`
- Baca `Auth::user()` dan `Request::instance()` untuk user & IP
- Buat record `AuditLog::create([...])`
- **Selalu di-wrap try/catch** — audit gagal tidak boleh gagalkan operasi utama

### Mengakses audit log:
```php
// Contoh: ambil riwayat perubahan 1 material
AuditLog::where('model_type', 'App\Models\Material')
         ->where('model_id', $material->code)
         ->latest()
         ->get();
```

---

## 7. Soft Delete — SEMUA MODEL UTAMA (#7)

Model yang menggunakan SoftDeletes: `Asset`, `Material`, `Transfer`, `Transaction`, `User`

```php
// Delete (soft):
$model->delete();   // sets deleted_at, TIDAK hapus dari DB

// Restore:
$model->restore();  // hapus deleted_at

// Query termasuk deleted:
Model::withTrashed()->find($id);
Model::onlyTrashed()->get();
```

**PENTING:** Karena Asset dan Material menggunakan PK custom (string) dan timestamp kustom, pastikan `deleted_at` tidak konflik dengan field kustom tersebut. Migration hanya menambah kolom `deleted_at` nullable.

---

## 8. Alur Bisnis Utama

### 8.1 Transaksi Material (IN/OUT)
```
POST /api/transactions
    → Validasi: code material exists, type IN/OUT, qty > 0
    → Cek stok jika OUT (abort jika kurang)
    → DB::transaction { create transaction + update material.stock }
    → AuditLog dicatat otomatis via Auditable trait
```

### 8.2 Transfer Asset/Material antar Estate
```
POST /api/transfers
    → Rate limit: hanya user terautentikasi
    → Validasi dari/ke estate berbeda
    → Cek item milik estate asal
    → Cek asset/material tidak sedang dalam pending transfer lain (#5)
    → DB::transaction + lockForUpdate untuk generate transfer_code (#4)
    → Buat Transfer (transfer_code UNIQUE) + TransferItem records
    → Cari ApprovalWorkflow aktif (priority: estate-spesifik > global)
    → Jika ada workflow: buat ApprovalRequest (status Pending)
    → Jika tidak ada workflow: langsung Approved + jalankan MaterialTransferService
```

### 8.3 Cancel Transfer (#18)
```
POST /api/transfers/{id}/cancel
    → Hanya transfer dengan status 'Pending Approval' atau 'Draft' yang bisa dibatalkan
    → Transfer 'Approved' atau 'Rejected' tidak bisa dibatalkan (400 Bad Request)
    → Update status → 'Cancelled'
    → Response: { message: 'Transfer berhasil dibatalkan.' }
```

### 8.4 Proses Approval
```
POST /api/approvals/{id}/approve atau /reject
    → Cek step yang sedang aktif (current_sequence)
    → Catat ApprovalLog
    → Jika ada step berikutnya: naikkan current_sequence
    → Jika step terakhir + Approved:
        → Update status Transfer ke Approved
        → Jika type Material: jalankan MaterialTransferService.applyTransfer()
        → Cek Setting::get('enable_email_notif', true) sebelum dispatch job (#17)
        → Jika enabled: Dispatch SendTransferBeritaAcaraJob
```

### 8.5 MaterialTransferService.applyTransfer()
```
Untuk setiap TransferItem:
    1. Kunci material source (lockForUpdate)
    2. Cek stok cukup
    3. Cari material destination di estate tujuan (by matcode, atau nama+category+unit+section)
    4. Jika tidak ada: buat material baru di estate tujuan (kode MAT-{ESTATE_CODE}-XXXXXX)
    5. Kurangi stok source, tambah stok destination
    6. Catat MaterialTransferHistory
    7. Buat dua Transaction logs (OUT dari source, IN ke destination)
```

### 8.6 Global Search (#16)
```
GET /api/search?q={keyword}&limit={n}
    → q minimum 2 karakter
    → Mencari di: Asset (reg_id, type, manufacture), Material (nama, code, matcode), Transfer (transfer_code)
    → Estate-scoped: non-HO hanya lihat data estate sendiri
    → Return: [{ type, id, label, subtitle, url }]
```

---

## 9. API Routes (api.php)

Semua route memerlukan `auth:sanctum` kecuali `/login`.

| Method | Endpoint | Controller | Keterangan |
|---|---|---|---|
| POST | `/login` | AuthController@login | Login (local+LDAP); throttle:5,1 (#3) |
| GET | `/user` | AuthController@me | User saat ini + permissions |
| POST | `/logout` | AuthController@logout | Logout |
| POST | `/profile/change-password` | AuthController@changePassword | Ganti password sendiri (#14) |
| POST | `/users/{id}/reset-password` | AuthController@resetPasswordByAdmin | Admin reset password user (#14) |
| GET | `/dashboard` | DashboardController@getStats | Stats dashboard + transfer_stats (#20) |
| GET | `/process-queue` | - | Trigger queue:work manual; **admin-only** (#2) |
| GET | `/search` | SearchController@search | Global search (#16) |
| CRUD | `/sections` | SectionController | |
| CRUD | `/estates` | EstateController | |
| CRUD | `/business-units` | BusinessUnitController | |
| CRUD | `/categories` | CategoryController | |
| GET | `/materials` | MaterialController@index | Paginated (`?per_page=`, `?all=1`, `?search=`) (#13) |
| POST | `/materials` | MaterialController@store | Validasi unique nama+category+estate (#11) |
| PUT/PATCH | `/materials/{code}` | MaterialController@update | |
| DELETE | `/materials/{code}` | MaterialController@destroy | Soft delete (#7) |
| GET | `/materials/generate-code` | MaterialController@generateCode | Generate `MAT-{ESTATE}-XXXXXX` (#10) |
| CRUD | `/asset-regs` | AssetRegController | Tipe asset registrasi |
| CRUD | `/assets` | AssetController | Inventaris fisik |
| CRUD | `/transactions` | TransactionController | IN/OUT material |
| CRUD | `/transfers` | TransferController | Transfer antar estate |
| POST | `/transfers/{id}/cancel` | TransferController@cancel | Batalkan transfer (#18) |
| GET | `/transfers/{id}/berita-acara` | TransferController@downloadBeritaAcara | Download PDF |
| GET | `/approvals/my-approvals` | ApprovalController@myApprovals | Antrian approval user |
| POST | `/approvals/{id}/approve` | ApprovalController@approve | Setujui |
| POST | `/approvals/{id}/reject` | ApprovalController@reject | Tolak (wajib comment) |
| CRUD | `/approval-workflows` | ApprovalWorkflowController | |
| GET | `/approval-workflows/check` | ApprovalWorkflowController@checkWorkflow | Cek workflow ada/tidak |
| CRUD | `/users` | UserController | |
| CRUD | `/roles` | RoleController | |
| GET/POST | `/settings`, `/settings/bulk` | SettingController | Pengaturan sistem |
| CRUD | `/anggotas` | AnggotaController | Anggota/karyawan |
| CRUD | `/cost-centers` | CostCenterController | |
| CRUD | `/software` | SoftwareController | + relasi asset (#19) |
| CRUD | `/manufacturers` | ManufacturerController | |
| CRUD | `/asset-types` | AssetTypeController | |
| CRUD | `/units` | UnitController | Satuan ukur |
| CRUD | `/vendors` | VendorController | |

---

## 10. Controller Penting — Detail Perubahan

### MaterialController (#10, #11, #13)
```php
// generateCode($request): estate-aware
$estateCode = $this->currentEstateCode(); // contoh: 'KLT'
$prefix = "MAT-{$estateCode}-";
$lastMaterial = Material::where('code', 'like', $prefix . '%')->orderBy('code', 'desc')->first();
// Format: MAT-KLT-000001

// index($request): paginated + all bypass
if ($request->boolean('all')) {
    $items = $query->get();
    return response()->json(['data' => MaterialResource::collection($items)]);
}
return MaterialResource::collection($query->paginate($perPage));
// Response: { data: [...], meta: { current_page, per_page, total, last_page } }

// store($request): unique validation
// Validasi: nama + category_id + estate_id harus unik
// Error message: 'Material dengan nama, kategori, dan estate yang sama sudah ada.'
```

### DashboardController (#20)
```php
// getStats(): tambahan transfer_stats
$transfer_stats = [
    'total'     => $query->count(),
    'pending'   => $query->where('status', 'Pending Approval')->count(),
    'approved'  => $query->where('status', 'Approved')->count(),
    'rejected'  => $query->where('status', 'Rejected')->count(),
    'cancelled' => $query->where('status', 'Cancelled')->count(),
    'recent'    => Transfer::with(['fromEstate', 'toEstate'])->latest()->take(5)->get(),
];
```

### SendTransferBeritaAcaraJob (#17)
```php
// handle(): cek setting sebelum kirim email
if (!Setting::get('enable_email_notif', true)) {
    Log::info('Email notification disabled via settings. Skipping...');
    return;
}
// lanjut kirim email
```

### SearchController (#16)
```php
// search($request): global search
// q = keyword (min 2 chars), limit = jumlah hasil per tipe (default 5)
// Return: [{ type: 'Asset'|'Material'|'Transfer', id, label, subtitle, url }]
// Estate-scoped untuk non-HO user
```

---

## 11. Aturan Penting untuk AI Agent

### ✅ HARUS dilakukan:
1. **Selalu gunakan `InteractsWithEstateScope` trait** di controller baru yang menangani data multi-estate
2. **Gunakan `DB::transaction()`** untuk operasi yang mengubah stok atau status
3. **Gunakan `lockForUpdate()`** saat membaca material/asset yang akan dimodifikasi dalam transaksi
4. **Ikuti pola timestamp kustom** pada model Asset dan Material: `create_date`/`update_date`
5. **Permission middleware** harus didefinisikan di `middleware()` static method controller
6. **Validasi estate access** dengan `$this->ensureEstateAccess()` sebelum update/delete
7. **Tambahkan `SoftDeletes` + `Auditable`** pada model baru yang menyimpan data penting
8. **Wrap audit trail dalam try/catch** — audit gagal tidak boleh menggagalkan operasi utama
9. **Cek `Setting::get('enable_email_notif', true)`** sebelum dispatch email job
10. **Gunakan `?all=1`** sebagai bypass pagination di endpoint yang mendukung export

### ❌ JANGAN dilakukan:
1. **Jangan update `stock` langsung** di Material selain dari TransactionController atau MaterialTransferService
2. **Jangan hapus ApprovalRequest yang sudah Approved** — data historis
3. **Jangan menambah kolom `estate_id`** tanpa mengupdate `InteractsWithEstateScope` scope-nya
4. **Jangan panggil `queue:work` dari controller** — sudah ada endpoint `/process-queue` (admin-only)
5. **Jangan ubah format `transfer_code`** (TRF-YYYYMM-XXXX) tanpa mengupdate frontend
6. **Jangan ubah format `material_code`** (MAT-{ESTATE}-XXXXXX) tanpa mengupdate `MaterialTransferService`
7. **Jangan tambah FK constraint pada `software.asset_id`** — Asset PK adalah string, gunakan application-level validation
8. **Jangan buat AuditLog::create() manual** — selalu via `Auditable` trait agar konsisten

### ⚠️ Catatan Teknis:
- `Asset::primaryKey` = `reg_id` (string) — bukan integer auto-increment
- `Material::primaryKey` = `code` (string) — bukan integer auto-increment
- User hanya boleh satu per estate per role (enforced di `UserController`)
- Transfer code dibuat dalam `DB::transaction` dengan `lockForUpdate()` → race condition sudah diatasi (#4)
- Queue driver menggunakan **database** (tabel `jobs`) — butuh worker berjalan
- LDAP dikonfigurasi di `config/ldap.php` dan `.env`
- `Gate::before` di AppServiceProvider memberi admin semua permission — tidak perlu daftarkan permission spesifik untuk admin
- Transfer status enum: `Pending Approval`, `Approved`, `Rejected`, `Cancelled`
- Asset/Material yang ter-soft-delete masih bisa di-restore — JANGAN `forceDelete()` tanpa persetujuan

---

## 12. Database — Tabel Utama

| Tabel | Keterangan |
|---|---|
| `users` | User dengan LDAP support (guid, domain); `deleted_at` (#7) |
| `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` | Spatie permission tables |
| `estates` | Estate/kebun (estate_id='HO' = kantor pusat) |
| `business_units` | Business unit yang menaungi estate |
| `sections` | Bagian/divisi |
| `assets` | Asset fisik (PK: reg_id string); `deleted_at` (#7) |
| `asset_regs` | Tipe/jenis asset untuk referensi |
| `asset_types` | Kategori besar asset |
| `materials` | Inventaris material (PK: code string); `deleted_at` (#7) |
| `transactions` | Log IN/OUT material; `deleted_at` (#7) |
| `transfers` | Transfer antar estate; `transfer_code` UNIQUE; `deleted_at` (#7) |
| `transfer_items` | Item dalam satu transfer |
| `material_transfer_histories` | Riwayat mutasi stok hasil transfer |
| `audit_logs` | **NEW** Riwayat perubahan semua model utama (#8) |
| `approval_workflows` | Konfigurasi workflow approval |
| `approval_steps` | Step-step dalam workflow |
| `approval_requests` | Instance approval untuk 1 transaksi |
| `approval_logs` | Log setiap aksi approve/reject |
| `anggotas` | Data anggota/karyawan |
| `categories` | Kategori material |
| `units` | Satuan ukur material |
| `vendors` | Data vendor/supplier |
| `manufacturers` | Data produsen asset |
| `cost_centers` | Cost center |
| `software` | Inventaris software; `asset_id` (nullable, FK ke assets.reg_id) (#19) |
| `settings` | Konfigurasi sistem (key-value); mendukung tipe boolean & json |
| `email_assets`, `email_records` | Tabel email |
| `jobs` | Queue jobs (database driver) |

---

## 13. Testing — Feature Tests (#24)

```bash
# Jalankan semua test
cd backend
php artisan test

# Jalankan test spesifik
php artisan test tests/Feature/AuthTest.php
php artisan test tests/Feature/MaterialTest.php
php artisan test tests/Feature/TransferTest.php
```

**Test yang tersedia:**

| File | Test Cases |
|---|---|
| `AuthTest.php` | Login valid, login password salah, login user nonaktif, rate limit 429, logout revoke token, me() returns user+permissions, changePassword sukses, changePassword password lama salah |
| `MaterialTest.php` | List paginated, list all (`?all=1`), create material, duplikat ditolak (422), soft delete, generate code mengandung estate code |
| `TransferTest.php` | Transfer code unik, asset tidak bisa di-2 pending transfer, cancel pending berhasil, cancel approved gagal, soft delete |

**Catatan untuk menulis test baru:**
- Gunakan `RefreshDatabase` — database direset tiap test
- Setup estate + user dengan permission di `setUp()`
- Gunakan `actingAs($user, 'sanctum')` untuk auth
- Untuk soft delete: `assertSoftDeleted()` + `Transfer::withTrashed()->find()`

---

## 14. Cara Menambah Fitur Baru

### Menambah modul CRUD baru:
1. Buat migration → `php artisan make:migration create_xxx_table` (tambah `deleted_at` jika perlu soft delete)
2. Buat model → `php artisan make:model Xxx` (tambah `SoftDeletes` + `Auditable` jika perlu audit)
3. Buat controller → `php artisan make:controller Api/XxxController` (pakai `InteractsWithEstateScope` jika multi-estate)
4. Tambahkan permission di `PermissionSeeder` dan jalankan `php artisan db:seed --class=PermissionSeeder`
5. Daftarkan route di `routes/api.php`
6. Tambah middleware permission ke controller
7. Tulis feature test di `tests/Feature/XxxTest.php`

### Menjalankan development:
```bash
cd backend
php artisan serve          # API server di :8000
php artisan queue:work     # Queue worker (diperlukan untuk email)
php artisan test           # Jalankan semua feature test
```

### Menjalankan migrations & seeders:
```bash
php artisan migrate
php artisan db:seed
```
