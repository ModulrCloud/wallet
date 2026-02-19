import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Maximize2 } from 'lucide-react';

export function Screen({
  children,
  className,
  variant = 'framed'
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'framed' | 'plain';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={[
        variant === 'framed'
          ? 'glow-card gradient-border rounded-2xl p-4'
          : 'rounded-2xl border border-app-border bg-app-surface p-4 shadow-[0_20px_60px_rgba(0,0,0,0.10)]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </motion.div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        'rounded-2xl border border-app-border bg-app-surface px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

export function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'sm' | 'md' }) {
  const { className, size = 'md', ...rest } = props;
  const dims = size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-2xl';
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={[
        'inline-flex items-center justify-center border border-app-border bg-app-surface text-app-text',
        'shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition hover:border-app-accent/30 hover:bg-app-surface2',
        'active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60',
        dims,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl border border-app-border bg-app-surface"
      style={{ width: size, height: size }}
    >
      <img src="/brand/modulr.svg" alt="Modulr" className="h-8 w-8" />
      <div className="pointer-events-none absolute -inset-6 bg-[radial-gradient(circle_at_center,rgba(245,180,0,0.12),transparent_55%)]" />
    </div>
  );
}

export function OpenInTabButton({
  className,
  title = 'Open in tab'
}: {
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition',
        className ??
          'border-app-border bg-app-surface text-app-text hover:border-app-accent/35 hover:bg-app-surface2'
      ].join(' ')}
      onClick={() => {
        try {
          const ch = (globalThis as any).chrome;
          const url = ch?.runtime?.getURL ? ch.runtime.getURL('index.html?mode=tab') : `${window.location.href}?mode=tab`;
          window.open(url, '_blank');
        } catch {
          // ignore
        }
      }}
      title={title}
    >
      <Maximize2 className="h-5 w-5" />
    </button>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; fullWidth?: boolean }
) {
  const { className, loading, disabled, children, fullWidth = true, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl',
        fullWidth ? 'w-full' : '',
        'border border-app-primary/25 bg-app-primary px-4 py-3 text-sm font-semibold text-app-onPrimary',
        'shadow-[0_14px_34px_rgba(0,0,0,0.14)] transition hover:bg-app-primary/90 active:translate-y-[1px]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      ) : null}
      {children}
    </button>
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) {
  const { className, children, fullWidth = true, ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl',
        fullWidth ? 'w-full' : '',
        'border border-app-border bg-app-surface px-4 py-3 text-sm font-semibold text-app-text',
        'shadow-[0_10px_26px_rgba(0,0,0,0.08)] transition hover:border-app-accent/30 hover:bg-app-surface2 active:translate-y-[1px]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        'w-full rounded-xl border border-app-border bg-app-surface2 px-3 py-3 text-sm text-app-text outline-none',
        'placeholder:text-app-muted focus:border-app-accent/40 focus:ring-2 focus:ring-app-accent/10',
        'disabled:cursor-not-allowed disabled:opacity-70',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export function PasswordInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  name?: string;
  error?: boolean;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <TextInput
        name={props.name}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        type={show ? 'text' : 'password'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={[
          'pr-12',
          props.error ? 'border-red-500/35 focus:border-red-500/55 focus:ring-red-500/10' : ''
        ].join(' ')}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/35 hover:bg-app-surface2"
        onClick={() => setShow((s) => !s)}
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">{children}</p>;
}


