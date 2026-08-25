import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/ui/FormFields';
import Button from '../components/ui/Button';
import useTitle from '../hooks/useTitle';
import { showError } from '../utils/SwalUtils';
import { useSettings } from '../hooks/useSettings';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { getSetting } = useSettings();
  useTitle('Login');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post('/login', data);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify({
        ...response.data.user,
        permissions: response.data.permissions ?? [],
      }));
      navigate('/dashboard');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        Object.entries(error.response.data.errors).forEach(([field, messages]: [any, any]) => {
          setError(field as any, { message: messages[0] });
        });
      } else {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error.request ? 'Tidak ada response dari server API. Pastikan backend berjalan dan URL API benar.' : error.message);

        showError('Login failed', message);
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(6, 44, 44, 0.8), rgba(6, 44, 44, 0.8)), url('/forest-bg.png')" }}
    >
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10 border border-forest-100 animate-scale-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-4 shadow-lg shadow-forest-900/20 p-2 border-2 border-forest-100">
            <img src={getSetting('app_logo_url', '/favicon.png')} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-forest-900 tracking-tight">{getSetting('app_name', 'Portal Asset')}</h1>
          <p className="text-forest-600 font-semibold mt-2">Management System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Username"
            {...register('username')}
            leftIcon={<User className="h-5 w-5" />}
            iconOutside
            placeholder="Enter username"
            error={errors.username?.message}
            className="text-black"
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            leftIcon={<Lock className="h-5 w-5" />}
            iconOutside
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 hover:bg-forest-50 rounded-lg text-forest-400 hover:text-forest-600 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            }
            placeholder="••••••••"
            error={errors.password?.message}
            className="text-black"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              className="py-6 text-base shadow-xl shadow-forest-900/10"
            >
              Sign in to Portal
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center bg-forest-50/50 rounded-xl py-3 border border-forest-100/50">
          <p className="text-[10px] text-forest-500 font-bold uppercase tracking-widest">
            {getSetting('footer_text', '© 2026 Portal Asset')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
