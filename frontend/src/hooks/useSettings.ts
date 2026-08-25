import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useSettings = () => {
  const token = localStorage.getItem('token');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getSetting = (key: string, defaultValue: any = '') => {
    return settingsData?.data?.[key]?.value ?? defaultValue;
  };

  return {
    settings: settingsData?.data ?? {},
    getSetting,
    isLoading,
  };
};
