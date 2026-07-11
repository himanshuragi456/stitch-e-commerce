import { useMutation } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { settingsApi } from '@/api/settings';
import { useToast } from '@/hooks/useToast';
import { HttpError } from '@/api/client';

/**
 * "Publish changes" — fires a storefront rebuild on demand. Catalog edits no
 * longer auto-rebuild (manual-only mode), so this is how admins push their
 * changes live. Lives in the Topbar, visible on every page.
 */
export function PublishButton() {
  const toast = useToast();

  const publishMut = useMutation({
    mutationFn: () => settingsApi.rebuildStorefront(),
    onSuccess: (res) => toast.success(res.message ?? 'Publishing… live in ~1–2 min.'),
    onError: (e) =>
      toast.error(e instanceof HttpError ? e.data.message : 'Could not start publish.'),
  });

  return (
    <button
      onClick={() => publishMut.mutate()}
      disabled={publishMut.isPending}
      title="Rebuild the storefront so your latest catalog changes go live"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <UploadCloud size={14} />
      {publishMut.isPending ? 'Publishing…' : 'Publish changes'}
    </button>
  );
}
