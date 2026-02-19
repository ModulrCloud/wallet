import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

function useEscape(onEscape: () => void, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, onEscape]);
}

export function Dialog(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  useEscape(props.onClose, props.open);
  const node = (
    <AnimatePresence>
      {props.open ? (
        <motion.div
          key="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/40 p-6"
          onClick={props.onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={[
              'w-full rounded-3xl border border-app-border bg-app-surface p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)]',
              props.widthClassName ?? 'max-w-md'
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {props.title ? <p className="truncate text-sm font-semibold text-app-text">{props.title}</p> : null}
              </div>
              <button
                type="button"
                onClick={props.onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/25 hover:bg-app-surface2"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={props.title ? 'mt-4' : ''}>{props.children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  if (typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}

export function Drawer(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEscape(props.onClose, props.open);
  const node = (
    <AnimatePresence>
      {props.open ? (
        <motion.div
          key="drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] bg-black/40"
          onClick={props.onClose}
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={[
              'absolute bottom-0 left-0 right-0',
              'max-h-[85vh] overflow-hidden',
              'flex flex-col',
              'rounded-t-3xl border border-app-border bg-app-surface px-5 pb-6 pt-4',
              'shadow-[0_-30px_90px_rgba(0,0,0,0.35)]'
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {props.title ? <p className="truncate text-sm font-semibold text-app-text">{props.title}</p> : null}
              </div>
              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/25 hover:bg-app-surface2"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={['flex-1 overscroll-contain overflow-auto', props.title ? 'mt-4' : 'mt-2'].join(' ')}>
              {props.children}
            </div>
            <div className="mt-4 flex justify-center shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-app-border" />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  if (typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}

