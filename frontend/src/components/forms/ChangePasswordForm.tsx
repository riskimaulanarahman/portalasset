import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import api from '../../api/axios'
import { useToast } from '../ui/Toast'

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * #14 FIX: Formulir ganti password untuk user yang sedang login.
 * Memverifikasi password lama sebelum menyimpan password baru.
 */
const ChangePasswordForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const { success, error: toastError } = useToast()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,      setShowNew]     = useState(false)
  const [form, setForm] = useState({
    current_password:      '',
    password:              '',
    password_confirmation: '',
  })

  const mutation = useMutation({
    mutationFn: () => api.post('/profile/change-password', form),
    onSuccess: () => {
      success('Password diubah', 'Silakan login ulang dengan password baru.')
      // Logout local state setelah sukses (backend sudah cabut token)
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }, 1500)
      onSuccess?.()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || err?.response?.data?.errors?.current_password?.[0]
        || 'Gagal mengubah password.'
      toastError('Error', msg)
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      toastError('Validasi', 'Konfirmasi password tidak cocok.')
      return
    }
    if (form.password.length < 8) {
      toastError('Validasi', 'Password minimal 8 karakter.')
      return
    }
    mutation.mutate()
  }

  const PasswordInput = ({
    name,
    label,
    show,
    toggle,
  }: {
    name: keyof typeof form
    label: string
    show: boolean
    toggle: () => void
  }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={form[name]}
          onChange={handleChange}
          required
          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        name="current_password"
        label="Password Saat Ini"
        show={showCurrent}
        toggle={() => setShowCurrent((v) => !v)}
      />
      <PasswordInput
        name="password"
        label="Password Baru"
        show={showNew}
        toggle={() => setShowNew((v) => !v)}
      />
      <PasswordInput
        name="password_confirmation"
        label="Konfirmasi Password Baru"
        show={showNew}
        toggle={() => setShowNew((v) => !v)}
      />

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-5 py-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
        >
          {mutation.isPending ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </div>
    </form>
  )
}

export default ChangePasswordForm
