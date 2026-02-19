import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  createdAt: number;
  ttlMs: number;
};

type ToastContextValue = {
  push: (t: { variant: ToastVariant; message: string; title?: string; ttlMs?: number }) => void;
  success: (message: string, opts?: { title?: string; ttlMs?: number }) => void;
  error: (message: string, opts?: { title?: string; ttlMs?: number }) => void;
  info: (message: string, opts?: { title?: string; ttlMs?: number }) => void;
};

const ToastCtx = React.createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function iconFor(v: ToastVariant) {
  if (v === 'success') return <CheckCircle2 className="h-5 w-5 text-app-success" />;
  if (v === 'error') return <TriangleAlert className="h-5 w-5 text-app-danger" />;
  return <Info className="h-5 w-5 text-app-accent" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const push = React.useCallback(
    (t: { variant: ToastVariant; message: string; title?: string; ttlMs?: number }) => {
      const toast: Toast = {
        id: uid(),
        variant: t.variant,
        title: t.title,
        message: t.message,
        createdAt: Date.now(),
        ttlMs: typeof t.ttlMs === 'number' ? t.ttlMs : t.variant === 'error' ? 5200 : 3200
      };
      setItems((xs) => [toast, ...xs].slice(0, 4));
      window.setTimeout(() => remove(toast.id), toast.ttlMs);
    },
    [remove]
  );

  const api = React.useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, opts) => push({ variant: 'success', message, title: opts?.title, ttlMs: opts?.ttlMs }),
      error: (message, opts) => push({ variant: 'error', message, title: opts?.title, ttlMs: opts?.ttlMs }),
      info: (message, opts) => push({ variant: 'info', message, title: opts?.title, ttlMs: opts?.ttlMs })
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] w-[360px] max-w-[calc(100vw-2rem)] space-y-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="pointer-events-auto rounded-2xl border border-app-border bg-app-surface px-3 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.30)]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{iconFor(t.variant)}</div>
                <div className="min-w-0 flex-1">
                  {t.title ? <p className="text-sm font-semibold text-app-text">{t.title}</p> : null}
                  <p className={['text-sm', t.title ? 'mt-0.5' : '', 'text-app-text'].filter(Boolean).join(' ')}>
                    {t.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/25 hover:bg-app-surface2"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

