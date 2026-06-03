import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Bell, Globe, Layout, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import { Input, Checkbox, FormGroup } from '../../components/ui/FormFields';
import { useToast } from '../../components/ui/Toast';
import useTitle from '../../hooks/useTitle';
import Skeleton from '../../components/ui/Skeleton';

const SettingsPage: React.FC = () => {
  useTitle('System Settings');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  
  const [formState, setFormState] = useState<any>({});

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      setFormState(settingsData.data);
    } else {
        // Default values if empty
        setFormState({
            app_name: { value: 'Portal Asset', group: 'general', type: 'string' },
            app_logo_url: { value: '', group: 'general', type: 'string' },
            enable_email_notif: { value: true, group: 'notifications', type: 'boolean' },
            footer_text: { value: '© 2026 PT. Industat Forest', group: 'general', type: 'string' },
        });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api.post('/settings/bulk', { settings: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      success('Saved', 'System settings updated successfully.');
    },
    onError: (err: any) => {
      toastError('Error', err.response?.data?.message || 'Could not save settings.');
    },
  });

  const handleChange = (key: string, value: any) => {
    setFormState((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl ring-4 ring-forest-50">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">System Settings</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Global configurations for the entire Portal Asset application.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-primary hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-forest-200 transition-all font-bold text-sm tracking-wide transform active:scale-95 disabled:opacity-70"
        >
          {updateMutation.isPending ? (
            <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <Globe className="h-4 w-4 text-forest-400" />
            <h2 className="text-sm font-bold text-forest-900 uppercase tracking-wider">General Configuration</h2>
          </div>
          <div className="p-6 space-y-4">
            <FormGroup cols={2}>
              <Input 
                label="Application Name" 
                value={formState?.app_name?.value || ''} 
                onChange={(e) => handleChange('app_name', e.target.value)}
              />
              <Input 
                label="Footer Copyright Text" 
                value={formState?.footer_text?.value || ''} 
                onChange={(e) => handleChange('footer_text', e.target.value)}
              />
            </FormGroup>
            <Input 
              label="Logo URL" 
              placeholder="https://example.com/logo.png"
              value={formState?.app_logo_url?.value || ''} 
              onChange={(e) => handleChange('app_logo_url', e.target.value)}
            />
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <Bell className="h-4 w-4 text-forest-400" />
            <h2 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Communication & Notifications</h2>
          </div>
          <div className="p-6 space-y-4">
            <Checkbox 
              label="Enable Email Notifications" 
              description="Send automatic emails to approvers when a new request is submitted."
              checked={formState?.enable_email_notif?.value || false}
              onChange={(e) => handleChange('enable_email_notif', e.target.checked)}
            />
          </div>
        </section>

        {/* UI Customization (Placeholder) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
            <Layout className="h-4 w-4 text-forest-400" />
            <h2 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Appearance Preferences</h2>
          </div>
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-forest-50 mb-3">
               <ShieldCheck className="h-6 w-6 text-forest-300" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Coming soon: Themes, color schemes, and dashboard layout builder.</p>
          </div>
        </section>
      </form>
    </div>
  );
};

export default SettingsPage;
