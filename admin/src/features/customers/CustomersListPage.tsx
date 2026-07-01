import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/format';

export default function CustomersListPage() {
  const [page, setPage] = useState(1);
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', { page, search }],
    queryFn: () => customersApi.list({ page, per_page: 20, search: search || undefined }),
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={data?.meta.total !== undefined ? `${data.meta.total} total` : undefined} />

      <div className="w-56 mb-5">
        <Input placeholder="Search name, email…" value={searchRaw}
          onChange={(e) => { setSearchRaw(e.target.value); setPage(1); }} />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No customers found." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.data.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="font-medium text-[var(--color-primary)] hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{c.email}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">
                    {c.email_verified_at ? formatDate(c.email_verified_at) : 'Not verified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination current={data.meta.current_page} total={data.meta.last_page} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
