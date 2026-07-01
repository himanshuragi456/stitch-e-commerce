import { useUiStore } from '@/store/ui.store';

export function useToast() {
  const addToast = useUiStore((s) => s.addToast);
  return {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    info: (message: string) => addToast('info', message),
  };
}
