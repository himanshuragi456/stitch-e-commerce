import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Staff } from '@/api/types';

interface AuthState {
  token: string | null;
  staff: Staff | null;
  setAuth: (token: string, staff: Staff) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      staff: null,
      setAuth: (token, staff) => {
        localStorage.setItem('skc_admin_token', token);
        set({ token, staff });
      },
      clearAuth: () => {
        localStorage.removeItem('skc_admin_token');
        set({ token: null, staff: null });
      },
      hasPermission: (permission) => {
        const staff = get().staff;
        return staff?.permissions.includes(permission) ?? false;
      },
    }),
    {
      name: 'skc_admin_auth',
      partialize: (s) => ({ token: s.token, staff: s.staff }),
    },
  ),
);
