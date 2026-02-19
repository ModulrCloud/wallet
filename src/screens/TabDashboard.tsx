import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Copy, Lock, Moon, Plus, QrCode, RefreshCw, Send, Settings, Sun } from 'lucide-react';

import { useWallet } from '../state/wallet';
import { PrimaryButton, SecondaryButton } from '../ui/components';
import { Dialog } from '../ui/overlays';
import { Drawer } from '../ui/overlays';
import { useTheme } from '../ui/theme';

type Tab = 'transactions' | 'connected' | 'usage';

function shorten(value: string, left = 10, right = 8) {
  if (!value) return '—';
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function formatInt(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl px-4 py-2 text-sm font-semibold transition',
        active ? 'bg-app-surface text-app-text shadow-[0_10px_26px_rgba(0,0,0,0.10)]' : 'bg-app-surface2 text-app-muted hover:bg-app-surface'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

import type { WalletTxRecord } from '../state/wallet';

const PAGE_SIZES = [10, 25, 50] as const;

function PageSizeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[130px] items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text transition hover:border-app-accent/25"
      >
        <span>{value} / page</span>
        <ChevronDown className={['h-4 w-4 text-app-muted transition', open ? 'rotate-180' : ''].join(' ')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full z-30 mt-2 min-w-[130px] overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-[0_30px_90px_rgba(0,0,0,0.40)] backdrop-blur"
          >
            {PAGE_SIZES.map((s) => {
              const active = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition',
                    active ? 'bg-app-accent/10 text-app-text' : 'text-app-text hover:bg-app-surface2'
                  ].join(' ')}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                >
                  <span>{s} / page</span>
                  {active ? <Check className="h-4 w-4 text-brand-accent" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function TabDashboard({ navigate, onTxClick }: { navigate: (to: 'send' | 'settings') => void; onTxClick?: (tx: WalletTxRecord) => void }) {
  const wallet = useWallet();
  const theme = useTheme();
  const accounts = wallet.data?.accounts ?? [];
  const selected = wallet.selectedAccount;
  const [tab, setTab] = useState<Tab>('transactions');

  const [acctOpen, setAcctOpen] = useState(false);
  const [acctDrawerOpen, setAcctDrawerOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const acctRef = useRef<HTMLDivElement | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh is now handled by WalletProvider

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!acctRef.current) return;
      if (e.target instanceof Node && !acctRef.current.contains(e.target)) setAcctOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Use Drawer on narrow widths (Rabby-like mobile behavior), keep popover on wide screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const apply = () => setCompact(mq.matches);
    apply();
    const handler = () => apply();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const balance = wallet.selectedAccountState?.balance ?? null;
  const nonce = wallet.selectedAccountState?.nonce ?? null;
  const txs = wallet.txs ?? [];

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const totalPages = Math.max(1, Math.ceil(txs.length / pageSize));
  const txPage = useMemo(() => txs.slice(page * pageSize, (page + 1) * pageSize), [txs, page, pageSize]);

  return (
    <div className="w-full">
      {/* Top account header (etherscan-like) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <img src="/brand/modulr.svg" alt="Modulr" className="h-12 w-12 rounded-2xl border border-app-border bg-app-surface p-2" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-app-muted">Account</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <div className="relative" ref={acctRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-text transition hover:border-app-accent/25 hover:bg-app-surface2"
                  onClick={() => {
                    if (compact) {
                      setAcctDrawerOpen(true);
                      setAcctOpen(false);
                    } else {
                      setAcctOpen((v) => !v);
                    }
                  }}
                >
                  <span className="max-w-[360px] truncate">{selected ? `${selected.name} · ${shorten(selected.pub, 10, 10)}` : 'Select account'}</span>
                  <ChevronDown className={['h-4 w-4 text-app-muted transition', acctOpen ? 'rotate-180' : ''].join(' ')} />
                </button>
                <AnimatePresence>
                  {acctOpen && !compact ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.99 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="absolute left-0 top-full z-30 mt-2 w-[520px] max-w-[90vw] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_30px_90px_rgba(0,0,0,0.40)] backdrop-blur"
                    >
                      <div className="max-h-72 overflow-auto p-1">
                        {accounts.map((a) => {
                          const active = a.id === wallet.data?.selectedAccountId;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              className={[
                                'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition',
                                active ? 'bg-app-accent/10 text-app-text' : 'hover:bg-app-surface2 text-app-text'
                              ].join(' ')}
                              onClick={async () => {
                                setAcctOpen(false);
                                await wallet.selectAccount(a.id);
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{a.name}</p>
                                <p className="mt-1 truncate font-mono text-[11px] text-app-muted">{a.pub}</p>
                              </div>
                              {active ? <Check className="h-4 w-4 text-brand-accent" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/30 hover:bg-app-surface2"
                onClick={async () => {
                  if (!selected?.pub) return;
                  await navigator.clipboard.writeText(selected.pub);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 900);
                }}
                title="Copy address"
              >
                <Copy className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/30 hover:bg-app-surface2"
                onClick={async () => {
                  setQrOpen(true);
                  setQrDataUrl(null);
                  if (!selected?.pub) return;
                  try {
                    const QR = await import('qrcode');
                    const url = await QR.toDataURL(selected.pub, { width: 260, margin: 1 });
                    setQrDataUrl(url);
                  } catch {
                    setQrDataUrl(null);
                  }
                }}
                title="Show QR"
              >
                <QrCode className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {copied ? (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs font-semibold text-brand-accent"
                  >
                    Copied
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            fullWidth={false}
            className="px-5 py-3 whitespace-nowrap"
            onClick={async () => {
              await wallet.createAccount();
            }}
          >
            <Plus className="h-4 w-4 text-brand-accent" />
            Create account
          </SecondaryButton>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/30 hover:bg-app-surface2"
            onClick={() => navigate('settings')}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/30 hover:bg-app-surface2"
            onClick={() => theme.toggle()}
            title="Theme"
          >
            {theme.mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-text transition hover:border-app-accent/30 hover:bg-app-surface2"
            onClick={() => wallet.lock()}
            title="Lock"
          >
            <Lock className="h-5 w-5" />
          </button>
          <PrimaryButton fullWidth={false} className="group px-7 py-3 whitespace-nowrap" onClick={() => navigate('send')}>
            <Send className="h-4 w-4 text-brand-accent group-hover:animate-[planeHover_420ms_ease-out_1]" />
            Send
          </PrimaryButton>
        </div>
      </div>

      {/* Balance (left, above tabs) */}
      <div className="mt-10 flex flex-col items-start text-left">
        <div className="flex items-end gap-2">
          <span className="font-mono text-5xl font-semibold tracking-tight text-app-text">
            {balance === null ? '—' : formatInt(balance)}
          </span>
          <span className="pb-1 text-sm font-semibold text-app-muted">MDR</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs font-semibold text-app-text shadow-[0_10px_26px_rgba(0,0,0,0.10)] transition hover:border-app-accent/25 hover:bg-app-surface2 disabled:opacity-50"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await Promise.all([wallet.refreshSelectedAccountThrottled(), new Promise((r) => setTimeout(r, 600))]);
              } finally {
                setRefreshing(false);
              }
            }}
            title="Refresh balance"
          >
            <RefreshCw className={['h-3.5 w-3.5', refreshing ? 'animate-spin' : ''].join(' ')} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <span className="text-xs text-app-muted">
            Nonce: <span className="font-mono text-app-text">{nonce === null ? '—' : nonce}</span>
          </span>
        </div>
      </div>

      {/* Tabs row */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TabButton active={tab === 'transactions'} onClick={() => setTab('transactions')}>
            Transactions
          </TabButton>
          <TabButton active={tab === 'connected'} onClick={() => setTab('connected')}>
            Connected sites
          </TabButton>
          <TabButton active={tab === 'usage'} onClick={() => setTab('usage')}>
            App usage
          </TabButton>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.10)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-success opacity-25" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-app-success" />
          </span>
          <span className="text-xs text-app-muted">Node</span>
          <span className="font-mono text-xs text-app-text">{wallet.data?.settings.nodeUrl ?? '—'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        <div className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          {tab === 'transactions' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Latest transactions</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-app-muted">Total: {txs.length}</span>
                  <PageSizeSelect
                    value={pageSize}
                    onChange={(v) => {
                      setPageSize(v);
                      setPage(0);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface2">
                <div className="grid grid-cols-12 gap-3 border-b border-app-border bg-app-surface px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-app-muted">
                  <span className="col-span-4">Tx id</span>
                  <span className="col-span-3">From</span>
                  <span className="col-span-3">To</span>
                  <span className="col-span-1 text-right">Amt</span>
                  <span className="col-span-1 text-right">Fee</span>
                </div>

                {txPage.length === 0 ? (
                  <div className="flex items-center justify-center px-4 py-14 text-sm text-app-muted">No transactions yet.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {txPage.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="grid w-full cursor-pointer grid-cols-12 gap-3 px-4 py-3 text-left text-sm text-app-text transition hover:bg-app-surface"
                        onClick={() => onTxClick?.(t)}
                      >
                        <div className="col-span-4 truncate font-mono text-xs text-brand-accent" title={t.id}>
                          {shorten(t.id, 14, 10)}
                        </div>
                        <div className="col-span-3 truncate font-mono text-xs" title={t.from}>
                          {shorten(t.from, 10, 8)}
                        </div>
                        <div className="col-span-3 truncate font-mono text-xs" title={t.to}>
                          {shorten(t.to, 10, 8)}
                        </div>
                        <div className="col-span-1 text-right font-mono text-xs">{t.amount}</div>
                        <div className="col-span-1 text-right font-mono text-xs">{t.fee}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              {txs.length > pageSize ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-app-border bg-app-surface2 px-4 py-2 text-xs font-semibold text-app-text transition hover:border-app-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-app-muted">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="rounded-lg border border-app-border bg-app-surface2 px-4 py-2 text-xs font-semibold text-app-text transition hover:border-app-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : tab === 'connected' ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface2 px-4 py-14 text-sm text-app-muted">
              Connected sites — coming soon.
            </div>
          ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface2 px-4 py-14 text-sm text-app-muted">
              App usage — coming soon.
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} title="Receive" widthClassName="max-w-sm">
        <p className="text-sm font-semibold text-app-text">Scan address QR</p>
        <div className="mt-4 flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR" className="h-[260px] w-[260px] rounded-2xl bg-white p-3" />
          ) : (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-2xl border border-app-border bg-app-surface2 text-sm text-app-muted">
              Generating…
            </div>
          )}
        </div>
        <p className="mt-4 truncate font-mono text-xs text-app-muted" title={selected?.pub ?? ''}>
          {selected?.pub ?? '—'}
        </p>
        <div className="mt-4">
          <SecondaryButton onClick={() => setQrOpen(false)}>Close</SecondaryButton>
        </div>
      </Dialog>

      <Drawer open={acctDrawerOpen} onClose={() => setAcctDrawerOpen(false)} title="Select account">
        <div className="space-y-2">
          {accounts.map((a) => {
            const active = a.id === wallet.data?.selectedAccountId;
            return (
              <button
                key={a.id}
                type="button"
                className={[
                  'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
                  active ? 'border-app-accent/25 bg-app-accent/10 text-app-text' : 'border-app-border bg-app-surface2 text-app-text hover:border-app-accent/20'
                ].join(' ')}
                onClick={async () => {
                  await wallet.selectAccount(a.id);
                  setAcctDrawerOpen(false);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-app-muted">{a.pub}</p>
                </div>
                {active ? <Check className="h-4 w-4 text-brand-accent" /> : null}
              </button>
            );
          })}
        </div>
      </Drawer>
    </div>
  );
}


