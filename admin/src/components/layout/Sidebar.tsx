import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderOpen, ShoppingBag, Users,
  UserCog, Tag, Settings, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
}

const navGroups = [
  {
    label: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> }],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: <Package size={16} />, permission: 'manage-products' },
      { to: '/categories', label: 'Categories', icon: <FolderOpen size={16} />, permission: 'manage-products' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/orders', label: 'Orders', icon: <ShoppingBag size={16} />, permission: 'view-orders' },
      { to: '/coupons', label: 'Coupons', icon: <Tag size={16} />, permission: 'manage-products' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/customers', label: 'Customers', icon: <Users size={16} />, permission: 'manage-customers' },
      { to: '/staff', label: 'Staff', icon: <UserCog size={16} />, permission: 'manage-staff' },
    ],
  },
  {
    label: null,
    items: [{ to: '/settings', label: 'Settings', icon: <Settings size={16} />, permission: 'manage-settings' }],
  },
];

function NavItem({ item }: { item: NavItem }) {
  const permissions = useAuthStore((s) => s.staff?.permissions);
  const has = item.permission ? (permissions?.includes(item.permission) ?? false) : true;
  if (!has) return null;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const close = () => setSidebarOpen(false);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 h-14">
        <span className="font-[var(--font-heading)] font-semibold text-[var(--color-primary)] text-sm leading-tight">
          Shree Krishna<br />Collection
        </span>
        <button onClick={close} className="lg:hidden text-[var(--color-text-muted)]">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] uppercase tracking-widest text-[var(--color-text-subtle)]">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Version hint */}
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <p className="text-[10px] text-[var(--color-text-subtle)]">SKC Admin</p>
      </div>
    </aside>
  );
}
