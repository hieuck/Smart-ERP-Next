import { useState, useCallback } from "react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

export interface UseConfirmReturn {
  isOpen: boolean;
  options: ConfirmOptions | null;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

/**
 * Programmatic confirm dialog hook.
 * Pair with <ConfirmDialog> from @smart-erp/ui to render.
 *
 * Usage:
 *   const { confirm, isOpen, options, resolve } = useConfirm();
 *   const ok = await confirm({ message: 'Bạn có chắc muốn xóa?' });
 *   if (ok) await deleteItem();
 */
export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((res) => {
      setResolver(() => res);
    });
  }, []);

  const resolve = useCallback(
    (value: boolean) => {
      setIsOpen(false);
      setOptions(null);
      resolver?.(value);
      setResolver(null);
    },
    [resolver],
  );

  return { isOpen, options, confirm, resolve };
}
