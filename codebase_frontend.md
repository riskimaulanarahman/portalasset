# Codebase Frontend — Portal Asset

> **Panduan ini ditujukan untuk AI Agent** yang akan bekerja pada codebase frontend Portal Asset.  
> Baca dokumen ini sebelum melakukan perubahan agar tidak merusak pola yang sudah ada.

---

## 1. Gambaran Umum

Frontend **Portal Asset** adalah Single Page Application (SPA) yang dikonsumsi dari backend Laravel API.

| Atribut | Detail |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 4 |
| State Management | TanStack Query v5 (React Query) |
| Routing | React Router v7 |
| HTTP Client | Axios |
| Form Library | React Hook Form + Zod |
| Alert/Confirm | SweetAlert2 |
| Icons | Lucide React |
| Testing | Vitest + @testing-library/react (#24) |
| API Base URL | `http://127.0.0.1:8000/api` (dev) / auto-detect host (prod) |

---

## 2. Struktur Direktori

```
frontend/src/
├── api/
│   └── axios.ts              ← Instance axios + request interceptor (auth token)
├── assets/
├── components/
│   ├── DataTable.tsx          ← Tabel generik: sort, search, pagination (client + server-side)
│   ├── ErrorBoundary.tsx      ← Error boundary React class component (NEW #9)
│   ├── Modal.tsx              ← Modal dialog generik
│   ├── ProtectedRoute.tsx     ← Guard route: cek token + permission
│   ├── forms/                 ← Form component per entitas
│   │   ├── AnggotaForm.tsx
│   │   ├── AssetForm.tsx
│   │   ├── AssetRegForm.tsx
│   │   ├── AssetTypeForm.tsx
│   │   ├── BusinessUnitForm.tsx
│   │   ├── CategoryForm.tsx
│   │   ├── ChangePasswordForm.tsx   ← Form ganti password (NEW #14)
│   │   ├── CostCenterForm.tsx
│   │   ├── EstateForm.tsx
│   │   ├── ManufacturerForm.tsx
│   │   ├── MaterialForm.tsx
│   │   ├── RoleForm.tsx
│   │   ├── SectionForm.tsx
│   │   ├── SoftwareForm.tsx         ← + field asset_id (#19)
│   │   ├── UnitForm.tsx
│   │   ├── UserForm.tsx
│   │   ├── VendorForm.tsx
│   │   └── WorkflowForm.tsx
│   └── ui/                   ← Komponen UI reusable
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Dropdown.tsx
│       ├── FormFields.tsx     ← Input, Textarea, Select, Checkbox, SearchableSelect, FormGroup
│       ├── Skeleton.tsx
│       ├── StatsCard.tsx
│       ├── Tabs.tsx
│       └── Toast.tsx          ← Toast notification (useToast hook)
├── hooks/
│   ├── usePermissions.ts      ← Polling /api/user tiap 5 menit, merge ke localStorage (#6) (NEW)
│   ├── useSettings.ts         ← Fetch & cache app settings (nama, logo, dll)
│   └── useTitle.ts            ← Set document.title
├── layouts/
│   └── MainLayout.tsx         ← Sidebar + header + notif bell + global search + change password
├── lib/
│   ├── access.ts              ← routePermissions + hasStoredPermission helpers
│   └── utils.ts               ← cn(), formatDate(), formatNumber(), formatRupiah(), truncate(),
│                                 getInitials(), getStoredUser(), isHeadOfficeUser(), exportToCSV()
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx      ← + Transfer Stats section (#20)
│   ├── AssetsPage.tsx         ← + Export CSV (#12), isHeadOfficeUser (#22)
│   ├── AssetDetailPage.tsx    ← Detail asset + transaksi + maintenance tabs
│   ├── AssetRegsPage.tsx
│   ├── AssetTypesPage.tsx
│   ├── MaterialsPage.tsx      ← + Server pagination (#13), Export CSV (#12), isHeadOfficeUser (#22)
│   ├── TransactionsPage.tsx   ← + Export CSV (#12), isHeadOfficeUser (#22)
│   ├── TransfersPage.tsx      ← + Cancel transfer (#18), qty validation (#21), isHeadOfficeUser (#22)
│   ├── ApprovalsPage.tsx      ← Antrian approval user saat ini
│   ├── AnggotaPage.tsx
│   ├── BusinessUnitsPage.tsx
│   ├── CategoriesPage.tsx
│   ├── CostCentersPage.tsx
│   ├── EstatesPage.tsx
│   ├── GuidePage.tsx          ← Halaman panduan pengguna
│   ├── ManufacturersPage.tsx
│   ├── SectionsPage.tsx
│   ├── SoftwarePage.tsx       ← + kolom Host Asset (#19), isHeadOfficeUser (#22)
│   ├── UnitsPage.tsx
│   ├── VendorsPage.tsx
│   └── admin/
│       ├── AdminRolesPage.tsx
│       ├── AdminUsersPage.tsx
│       ├── AdminWorkflowsPage.tsx
│       └── SettingsPage.tsx
├── test/
│   └── setup.ts               ← Vitest setup: jest-dom, localStorage mock, URL mock (#24) (NEW)
├── __tests__/
│   ├── utils.test.ts          ← Unit test untuk lib/utils.ts (#24) (NEW)
│   └── ErrorBoundary.test.tsx ← Component test ErrorBoundary (#24) (NEW)
├── utils/
│   └── SwalUtils.ts           ← showConfirm() wrapper SweetAlert2
├── App.tsx                    ← Routing utama
├── main.tsx                   ← Entry point: ErrorBoundary wraps entire app (#9)
└── index.css                  ← CSS global + Tailwind + custom classes
```

---

## 3. Setup API & Autentikasi

### 3.1 Axios Instance (`src/api/axios.ts`)

```typescript
// Base URL: auto-detect dari hostname, bisa di-override via VITE_API_URL
// Interceptor: inject Bearer token dari localStorage('token') ke setiap request
```

### 3.2 State Autentikasi

Tidak ada state management global (Redux/Zustand). Auth state disimpan di `localStorage`:

| Key | Isi |
|---|---|
| `localStorage.token` | JWT token Sanctum |
| `localStorage.user` | JSON object user (name, estate_id, role, permissions, estate) |

**Akses user:** selalu via `getStoredUser()` dari `lib/utils.ts`

```typescript
const user = getStoredUser();
// user.name, user.role?.name, user.estate?.estate_id, user.permissions[]
```

**Cek HO User:** selalu via `isHeadOfficeUser()` dari `lib/utils.ts` (#22)

```typescript
import { isHeadOfficeUser } from '../lib/utils';
const isHoUser = isHeadOfficeUser();
// Jangan gunakan: user?.estate?.estate_id === 'HO' secara inline!
```

### 3.3 Refresh Permissions (`usePermissions` hook) — NEW #6

Hook `usePermissions` melakukan polling `/api/user` setiap 5 menit dan merge hasilnya ke `localStorage['user']`:

```typescript
import { usePermissions } from '../hooks/usePermissions';

// Di MainLayout (sudah terpasang):
usePermissions();  // auto-refresh di background
```

Response `/api/user` memiliki shape: `{ user: {...}, permissions: [...] }`.  
Hook ini menggabungkan keduanya dan menyimpan ke localStorage agar `getStoredUser()` selalu fresh.

### 3.4 Logout
1. Hapus `localStorage.token` dan `localStorage.user`
2. Panggil `queryClient.clear()` untuk reset semua cache
3. Redirect ke `/login`

---

## 4. Sistem Routing & Permission

### 4.1 Route Protection (`ProtectedRoute.tsx`)

```typescript
// Cek 1: token di localStorage → redirect /login jika tidak ada
// Cek 2: requiredPermissions vs permissions user → redirect /dashboard jika tidak punya
// Wrap children dengan MainLayout
```

### 4.2 `routePermissions` (`lib/access.ts`)

Mapping URL → permission yang dibutuhkan:

```typescript
'/materials': ['view-materials'],
'/assets': ['view-assets'],
'/admin/workflows': ['view-approval-workflows'],
// dll...
```

Navigasi sidebar di `MainLayout` otomatis filter item berdasarkan permission ini via `filterNavItems()`.

### 4.3 Deteksi HO User (Head Office) — TERPUSAT #22

```typescript
// ✅ BENAR — selalu gunakan helper ini:
import { isHeadOfficeUser } from '../lib/utils';
const isHoUser = isHeadOfficeUser();

// ❌ SALAH — jangan gunakan inline check:
// const isHoUser = user?.estate?.estate_id === 'HO';
```

Fungsi `isHeadOfficeUser()` membaca dari `getStoredUser()` dan cek `estate?.estate_id === 'HO'`.

---

## 5. Komponen UI Kunci

### 5.1 `DataTable<T>` (`components/DataTable.tsx`)

Komponen tabel generik dengan dua mode:

**Mode Client-Side (default):**
- Sort per kolom, Search via `searchKeys`, Pagination client-side
- Data diterima sebagai flat array

**Mode Server-Side (baru #13):**
- Aktif jika prop `serverPagination` diberikan
- Client-side sort & search di-disable saat server-paged
- Gunakan untuk halaman dengan data besar

```typescript
// Props baru:
interface ServerPaginationProps {
  totalItems: number;
  currentPage: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

// Contoh penggunaan server-side:
<DataTable<Material>
  columns={columns}
  data={data?.data ?? []}
  isLoading={isLoading}
  rowKey={(item) => item.code}
  serverPagination={{
    totalItems: data?.meta?.total ?? 0,
    currentPage: page,
    perPage: perPage,
    onPageChange: setPage,
    onPerPageChange: setPerPage,
  }}
/>

// Contoh penggunaan client-side (backward compatible):
<DataTable<Asset>
  columns={columns}
  data={data?.data ?? []}
  isLoading={isLoading}
  searchKeys={['reg_id', 'type']}
  rowKey={(item) => item.reg_id}
  pageSize={20}
/>
```

### 5.2 `ErrorBoundary` (`components/ErrorBoundary.tsx`) — NEW #9

Class component React yang menangkap JavaScript errors di subtree manapun:

```typescript
// Props:
interface Props {
  children: ReactNode;
  fallback?: ReactNode;  // Custom fallback UI (opsional)
}

// Penggunaan dengan fallback default:
<ErrorBoundary>
  <ComponentYangBisaError />
</ErrorBoundary>

// Penggunaan dengan fallback kustom:
<ErrorBoundary fallback={<div>Custom error UI</div>}>
  <ComponentYangBisaError />
</ErrorBoundary>
```

Fallback default menampilkan:
- Pesan error dalam Bahasa Indonesia
- Tombol **"Coba Lagi"** (reset error state)
- Tombol **"Muat Ulang Halaman"** (full page reload)
- Detail error hanya di DEV mode

**Di `main.tsx`:** seluruh aplikasi di-wrap dengan `<ErrorBoundary>`.

### 5.3 `ChangePasswordForm` (`components/forms/ChangePasswordForm.tsx`) — NEW #14

Form ganti password user sendiri:
- Fields: `current_password`, `password`, `password_confirmation` (eye toggle masing-masing)
- Mutation ke `POST /api/profile/change-password`
- Setelah sukses: toast → tunggu 1.5s → clear localStorage → redirect `/login`

Digunakan di `MainLayout.tsx` dalam Modal yang dibuka dari avatar profil.

### 5.4 `Modal` (`components/Modal.tsx`)

Modal dialog dengan prop `isOpen`, `onClose`, `title`, `description`, `size` ('sm'|'md'|'lg'|'xl').

### 5.5 `FormFields` (`components/ui/FormFields.tsx`)

Kumpulan komponen form reusable:
- `Input` — input teks standar
- `Textarea` — textarea dengan label
- `Select` — dropdown dengan label
- `Checkbox` — checkbox dengan label dan description
- `SearchableSelect` — dropdown dengan fitur search (digunakan di TransfersPage)
- `FormGroup` — wrapper grid cols (1-4)

### 5.6 `Toast` (`components/ui/Toast.tsx`)

```typescript
const { success, error, warning, info } = useToast();
success('Title', 'Message');
error('Title', 'Message');
```

### 5.7 `SwalUtils` (`utils/SwalUtils.ts`)

```typescript
const result = await showConfirm('Title', 'Message', 'Confirm Button Label');
if (result.isConfirmed) { /* proceed */ }
```

---

## 6. Utilitas Penting (`lib/utils.ts`)

### `isHeadOfficeUser()` (#22)
```typescript
export function isHeadOfficeUser(): boolean {
  const user = getStoredUser();
  return user?.estate?.estate_id === 'HO';
}
```

### `exportToCSV<T>()` (#12)
```typescript
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; label: string }[] | undefined,
  filename: string,
): void
```
- Membangun CSV dengan header dari `columns[].label` dan baris dari `data`
- Handle quoting (nilai dengan koma/quote/newline)
- Tambah BOM (`﻿`) agar Excel baca karakter Indonesia dengan benar
- Trigger download via `Blob` + `URL.createObjectURL`
- Data kosong → tidak ada aksi

```typescript
// Contoh penggunaan:
handleExportCSV = async () => {
  const res = await api.get('/materials?all=1');
  exportToCSV(
    res.data.data,
    [
      { key: 'code', label: 'Kode Material' },
      { key: 'nama', label: 'Nama Material' },
      { key: 'stock', label: 'Stok' },
    ],
    'materials-export',
  );
};
```

### Fungsi Lain di `utils.ts`
| Fungsi | Deskripsi |
|---|---|
| `cn(...classes)` | Gabungkan class Tailwind (clsx/twMerge) |
| `formatDate(val)` | Format ISO date ke string lokal; `null`/`undefined` → `'-'` |
| `formatNumber(n)` | Format angka dengan separator ribuan (`.`) |
| `formatRupiah(n)` | Format angka sebagai IDR |
| `truncate(str, n)` | Potong string + `...` jika melebihi `n` karakter |
| `getInitials(name)` | Ambil inisial (maks 2 huruf) dari nama |
| `getStoredUser()` | Parse `localStorage['user']`; return `{}` jika tidak ada |

---

## 7. MainLayout — Fitur Baru

### 7.1 Notification Bell (#15)
- Badge merah menampilkan jumlah approval yang pending milik user
- Data di-fetch dari `GET /api/approvals/my-approvals` dengan polling 60 detik
- Klik bell → navigate ke `/approvals`

### 7.2 Global Search (#16)
- Search input di header dengan debounce 300ms
- Minimum 2 karakter untuk trigger search
- Hasil tampil sebagai dropdown autocomplete dengan badge tipe (Asset / Material / Transfer)
- Klik hasil → navigate ke URL yang sesuai
- Fetch dari `GET /api/search?q={keyword}`

### 7.3 Change Password (#14)
- Avatar profil user di header sudah berupa tombol
- Klik avatar → buka Modal dengan `ChangePasswordForm`
- Setelah sukses ganti password → user otomatis di-logout

### 7.4 Permission Refresh (#6)
- `usePermissions()` hook dipanggil di `MainLayout`
- Polling `/api/user` setiap 5 menit (staleTime 4 menit)
- Hasil di-merge ke `localStorage['user']` → `getStoredUser()` selalu fresh

---

## 8. Data Fetching Pattern

**SEMUA data fetching menggunakan TanStack Query (React Query v5).**

```typescript
// Query (GET data)
const { data, isLoading } = useQuery<ResponseType>({
  queryKey: ['key', dep1, dep2],
  queryFn: async () => {
    const res = await api.get('/endpoint');
    return res.data;
  },
  enabled: !!condition,
});

// Mutation (POST/PUT/DELETE)
const mutation = useMutation({
  mutationFn: (payload) => api.post('/endpoint', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['key'] });
    success('Berhasil', 'Data tersimpan');
  },
  onError: (err: any) => {
    error('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
  },
});
```

### Invalidasi cache setelah mutasi:
- Setelah CRUD material → invalidate `['materials']`
- Setelah transaksi → invalidate `['transactions']`, `['materials']`
- Setelah transfer → invalidate `['transfers']`, `['materials']`, `['transactions']`
- Setelah approval → invalidate `['my-approvals']`, `['transfers']`, `['materials']`
- Setelah cancel transfer → invalidate `['transfers']`

### Pola Server-Side Pagination (#13)
```typescript
// State:
const [page, setPage] = useState(1);
const [perPage, setPerPage] = useState(20);

// Query — sertakan page + perPage sebagai dependency:
const { data, isLoading } = useQuery({
  queryKey: ['materials', page, perPage, search, estateFilter],
  queryFn: async () => {
    const res = await api.get('/materials', { params: { page, per_page: perPage, search } });
    return res.data; // { data: [...], meta: { current_page, per_page, total, last_page } }
  },
});

// Export semua data tanpa paginasi:
const res = await api.get('/materials?all=1');
exportToCSV(res.data.data, columns, 'filename');
```

---

## 9. Halaman-Halaman Utama

### 9.1 DashboardPage (#20)
- Stats card: total assets, transactions, materials, sections
- **Transfer Stats** (NEW): 5 colored cards (total, pending, approved, rejected, cancelled) + tabel 5 transfer terbaru
- Chart utilization asset (donut SVG)
- Top material stock (mini bar chart)
- Activity timeline (5 transaksi terbaru)
- Low stock alerts
- Data di-refresh setiap 60 detik

### 9.2 MaterialsPage (#11, #12, #13)
- **Server-side pagination** — kirim `?page=&per_page=` ke backend
- Filter estate (HO only) dan search; ganti filter → reset ke halaman 1
- **Export CSV**: fetch `?all=1` lalu `exportToCSV()` dengan 7 kolom
- Validasi duplicate via error message server (422)
- `isHoUser` via `isHeadOfficeUser()` — bukan inline check

### 9.3 AssetsPage (#12, #22)
- **Export CSV**: 11 kolom (reg_id, asset_no, type, manufacture, series, section, estate, dll)
- Tombol "Export CSV" di header halaman
- `isHoUser` via `isHeadOfficeUser()`

### 9.4 TransactionsPage (#12, #22)
- **Export CSV**: 8 kolom (kode material, nama, tipe, qty, notes, tanggal, dll)
- Tombol Export terpisah dari tombol IN/OUT
- `isHoUser` via `isHeadOfficeUser()`

### 9.5 TransfersPage (#18, #21, #22)
- Status badge untuk `Cancelled` (warna abu-abu)
- **Cancel Transfer**: tombol XCircle di action column untuk transfer dengan status Draft/Pending Approval
  - Konfirmasi via `showConfirm()` sebelum cancel
  - Mutation ke `POST /api/transfers/{id}/cancel`
- **Qty Validation**: validasi client-side sebelum submit
  - `getMaterialStock(materialCode)` — cek stok tersedia
  - `validateItemQtys()` — jika qty > stok → tampilkan error, block submit
  - Baris item yang melebihi stok diberi highlight merah
- `isHoUser` via `isHeadOfficeUser()`

### 9.6 SoftwarePage (#19, #22)
- Kolom "Host Asset" menampilkan `asset.reg_id` dalam monospace font
- `SoftwareForm` memiliki field `asset_id` (selector dari `/api/assets`)
- `isHoUser` via `isHeadOfficeUser()`

### 9.7 ApprovalsPage
- Daftar antrian approval yang perlu diproses user saat ini
- Aksi Approve (comment opsional) / Reject (comment wajib)

### 9.8 AssetDetailPage
- Detail lengkap asset dengan tabs: Info, Transactions, Maintenance
- Navigasi via URL: `/assets/:regId`

### 9.9 AdminWorkflowsPage
- CRUD workflow + steps approval
- Step bisa berurutan, di-assign ke role name

### 9.10 SettingsPage (Admin)
- Update nama app, logo URL, footer text, toggle email notifikasi
- Setting `enable_email_notif` mengontrol apakah email dikirim saat approval (#17)
- Simpan semua sekaligus via `/settings/bulk`

---

## 10. Navigasi Sidebar (`MainLayout.tsx`)

| Section | Items |
|---|---|
| **Overview** | Dashboard, My Approvals (dengan badge jumlah pending) |
| **Master Data > Organization** | Business Units, Sections, Estates, Cost Centers, Members |
| **Master Data > Asset Info** | Asset Types, Asset Reg, Categories, Manufacturers, Units, Vendors |
| **Inventory** | Assets, Materials, Software |
| **In/Out** | Transactions, Transfers |
| **Administration** | Approval Workflows, User Management, Role Management, System Settings |

Sidebar dapat di-collapse (icon only mode) pada desktop. Pada mobile terdapat overlay drawer.  
Dark mode toggle tersedia via `toggleDarkMode()` utility.

---

## 11. Testing — Vitest + React Testing Library (#24)

### Setup
```bash
cd frontend
npm run test            # Run semua test (watch mode)
npm run test:coverage   # Run dengan coverage report
```

### Konfigurasi (`vite.config.ts`)
```typescript
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  coverage: { provider: 'v8', include: ['src/**/*.ts', 'src/**/*.tsx'] }
}
```

### Setup File (`src/test/setup.ts`)
- Import `@testing-library/jest-dom`
- Mock `localStorage` (getItem, setItem, removeItem, clear)
- Mock `URL.createObjectURL` dan `URL.revokeObjectURL`
- Spy pada `console.error`

### Test yang tersedia

| File | Test Cases |
|---|---|
| `utils.test.ts` | formatRupiah, formatNumber, formatDate (null/valid), cn (merge/falsy), truncate, getInitials, exportToCSV (non-empty/empty), isHeadOfficeUser (no user/HO/estate), getStoredUser |
| `ErrorBoundary.test.tsx` | Render children normal, fallback saat child throw, custom fallback prop, reset state saat "Coba Lagi" diklik |

### Menulis test baru
```typescript
// Unit test (utils):
import { describe, it, expect } from 'vitest'
import { myFunction } from '../lib/utils'

describe('myFunction', () => {
  it('does something', () => {
    expect(myFunction(input)).toBe(expected);
  });
});

// Component test:
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../components/MyComponent'

it('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('label')).toBeInTheDocument();
});
```

---

## 12. Aturan Penting untuk AI Agent

### ✅ HARUS dilakukan:
1. **Gunakan `useQuery` / `useMutation`** dari TanStack Query untuk semua operasi API — jangan `useEffect` + `fetch` manual
2. **Invalidate query yang relevan** setelah setiap mutation agar data segar
3. **Gunakan `getStoredUser()`** untuk membaca data user — jangan `JSON.parse(localStorage.getItem('user'))` langsung
4. **Gunakan `isHeadOfficeUser()`** dari `lib/utils.ts` — jangan inline `estate?.estate_id === 'HO'` (#22)
5. **Gunakan `api` instance** dari `src/api/axios.ts` — jangan buat instance axios baru
6. **Ikuti pattern `DataTable<T>` + `Modal` + `Form`** untuk halaman CRUD baru
7. **Gunakan `showConfirm()`** untuk aksi destruktif (hapus/cancel data)
8. **Gunakan komponen dari `components/ui/`** (Button, Input, dll) agar tampilan konsisten
9. **Tambahkan route baru di `App.tsx`** dengan `<ProtectedRoute>` dan `routePermissions`
10. **Tambahkan entry di `routePermissions`** di `lib/access.ts` jika halaman memerlukan permission
11. **Gunakan `exportToCSV()`** dari `lib/utils.ts` untuk export CSV — jangan buat implementasi sendiri
12. **Untuk data besar: gunakan server-side pagination** dengan prop `serverPagination` di `DataTable`
13. **Wrap error-prone component** dengan `<ErrorBoundary>` jika ada kemungkinan runtime error

### ❌ JANGAN dilakukan:
1. **Jangan simpan state kompleks ke localStorage** — hanya untuk token dan user object
2. **Jangan panggil API langsung di `useEffect`** — gunakan `useQuery`
3. **Jangan hardcode estate_id atau permission string** — baca dari `getStoredUser()` atau `isHeadOfficeUser()`
4. **Jangan ubah `MainLayout.tsx` navigation tanpa menambah permission di `access.ts`**
5. **Jangan buat komponen form baru tanpa `FormFields.tsx`** components
6. **Jangan gunakan inline `estate?.estate_id === 'HO'`** — selalu pakai `isHeadOfficeUser()` (#22)
7. **Jangan fetch semua data tanpa pagination** untuk endpoint yang mendukung `?per_page=`; gunakan `?all=1` hanya untuk export

### ⚠️ Catatan Teknis:
- `isHeadOfficeUser()` terpusat di `lib/utils.ts` — semua halaman sudah direfactor menggunakannya (#22)
- `DataTable` mendukung dua mode: client-side (default) dan server-side (via `serverPagination` prop)
- `ErrorBoundary` sudah wrap seluruh app di `main.tsx` — tidak perlu wrap ulang di `App.tsx` (#9)
- Token tidak di-refresh otomatis — jika expired, user perlu login ulang manual
- `usePermissions()` di `MainLayout` auto-refresh permissions dari server setiap 5 menit (#6)
- Dark mode state tidak di-sync dengan server — hanya `localStorage('theme')`
- `SearchableSelect` digunakan untuk dropdown yang memiliki banyak opsi (asset/material list)
- Semua halaman yang direfactor sudah menggunakan `isHeadOfficeUser()` — estate, materials, assets, transactions, transfers, software

---

## 13. Cara Menambah Halaman CRUD Baru

```typescript
// 1. Buat form component di components/forms/NamaBaruForm.tsx
// 2. Buat halaman di pages/NamaBaruPage.tsx mengikuti pola:

const NamaBaruPage: React.FC = () => {
  useTitle('Nama Baru');
  const isHoUser = isHeadOfficeUser(); // #22
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [page, setPage] = useState(1); // jika pakai server pagination
  const [perPage, setPerPage] = useState(20);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading } = useQuery({ ... });
  const mutation = useMutation({ ... });

  const columns: Column<T>[] = [ ... ];

  // Handler export CSV:
  const handleExport = async () => {
    const res = await api.get('/nama-baru?all=1');
    exportToCSV(res.data.data, columns.map(c => ({ key: c.key, label: c.header })), 'filename');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header + Export Button */}
      {/* DataTable dengan serverPagination jika perlu */}
      {/* Modal + Form */}
    </div>
  );
};

// 3. Tambahkan route di App.tsx:
<Route path="/nama-baru" element={
  <ProtectedRoute requiredPermissions={routePermissions['/nama-baru']}>
    <NamaBaruPage />
  </ProtectedRoute>
} />

// 4. Tambahkan permission di lib/access.ts:
'/nama-baru': ['view-nama-baru'],

// 5. Tambahkan ke navigation di MainLayout.tsx

// 6. Tulis test di src/__tests__/NamaBaruPage.test.tsx
```

---

## 14. Cara Menjalankan (Development)

```bash
cd frontend
npm install
npm run dev         # Vite dev server di :5173
npm run build       # Build production ke dist/
npm run test        # Vitest test runner (watch mode)
npm run test:coverage  # Dengan coverage report
```

**Environment variables** (`.env` file di root frontend):
```
VITE_API_URL=http://127.0.0.1:8000/api   # Override base URL API
```
