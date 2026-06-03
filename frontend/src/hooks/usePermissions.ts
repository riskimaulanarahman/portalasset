import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

interface UserMe {
  id: number
  name: string
  username: string
  email?: string
  estate_id?: number
  role?: { name: string }
  estate?: { id: number; estate_id: string; estate: string }
  permissions?: string[]
}

/**
 * #6 FIX: Auto-refresh permissions dari server setiap 5 menit.
 *
 * Hook ini dipanggil di MainLayout sehingga semua halaman mendapat permissions
 * terbaru tanpa perlu logout-login ulang setelah admin mengubah role/permission.
 *
 * Cara kerja:
 * 1. Setiap kali data `/api/user` segar diterima, update localStorage['user']
 * 2. TanStack Query men-refresh otomatis setiap `refetchInterval`
 * 3. Komponen yang membaca `getStoredUser()` akan mendapat data baru pada render berikutnya
 */
export function usePermissions(): void {
  const token = localStorage.getItem('token')

  const { data } = useQuery<UserMe>({
    queryKey: ['current-user-permissions'],
    enabled: !!token,
    queryFn: async () => {
      const response = await api.get('/user')
      // /user returns { user: {...}, permissions: [...] }
      const raw = response.data
      return { ...(raw.user ?? raw), permissions: raw.permissions ?? raw.user?.permissions }
    },
    staleTime:       4 * 60 * 1000,   // 4 menit — masih segar di cache
    refetchInterval: 5 * 60 * 1000,   // refresh setiap 5 menit
    refetchIntervalInBackground: false, // hanya refresh saat tab aktif
    retry: false,                       // jangan retry saat token expired
  })

  useEffect(() => {
    if (!data) return

    // Merge data server ke dalam localStorage user agar halaman lain ikut terupdate
    try {
      const existing  = JSON.parse(localStorage.getItem('user') || '{}')
      const updated   = { ...existing, ...data }
      localStorage.setItem('user', JSON.stringify(updated))
    } catch {
      // Ignore serialization error
    }
  }, [data])
}
