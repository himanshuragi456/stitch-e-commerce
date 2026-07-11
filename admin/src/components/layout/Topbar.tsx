import { Menu, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { authApi } from '@/api/auth';
import { PublishButton } from './PublishButton';

export function Topbar() {
  const toggle = useUiStore((s) => s.toggleSidebar);
  const staff = useAuthStore((s) => s.staff);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const logout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shrink-0">
      <button onClick={toggle} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3">
        <PublishButton />
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden sm:block text-[var(--color-text-muted)]">{staff?.name}</span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs font-medium">
            {staff?.name?.[0]?.toUpperCase() ?? <User size={12} />}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
