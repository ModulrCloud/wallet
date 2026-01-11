import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Copy, Globe, Lock, Plus, QrCode, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';

import { useWallet } from '../state/wallet';
import { PrimaryButton, SecondaryButton } from '../ui/components';

type Tab = 'transactions' | 'connected' | 'usage';

type ConnectedSite = {
  connectedAt: number;
  accounts: string[];
};

function shorten(value: string, left = 10, right = 8) {
  if (!value) return '—';
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl px-4 py-2 text-sm font-semibold transition',
        active ? 'bg-white/90 text-black' : 'bg-white/5 text-gray-200 hover:bg-white/10'
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
        className="flex min-w-[130px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-200 transition hover:border-brand-accent/30"
      >
        <span>{value} / page</span>
        <ChevronDown className={['h-4 w-4 text-gray-400 transition', open ? 'rotate-180' : ''].join(' ')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full z-30 mt-2 min-w-[130px] overflow-hidden rounded-xl border border-white/10 bg-black/80 backdrop-blur"
          >
            {PAGE_SIZES.map((s) => {
              const active = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition',
                    active ? 'bg-brand-accent/10 text-gray-100' : 'text-gray-300 hover:bg-white/5'
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
  const accounts = wallet.data?.accounts ?? [];
  const selected = wallet.selectedAccount;
  const [tab, setTab] = useState<Tab>('transactions');

  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef<HTMLDivElement | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Connected sites
  const [connectedSites, setConnectedSites] = useState<Record<string, ConnectedSite>>({});
  const [sitesLoading, setSitesLoading] = useState(false);

  const loadConnectedSites = async () => {
    setSitesLoading(true);
    try {
      const chrome = (globalThis as any).chrome;
      if (chrome?.runtime?.sendMessage) {
        const response = await chrome.runtime.sendMessage({ type: 'MODULR_GET_CONNECTED_SITES' });
        setConnectedSites(response?.sites ?? {});
      }
    } catch {
      setConnectedSites({});
    } finally {
      setSitesLoading(false);
    }
  };

  const disconnectSite = async (origin: string) => {
    try {
      const chrome = (globalThis as any).chrome;
      if (chrome?.runtime?.sendMessage) {
        await chrome.runtime.sendMessage({ type: 'MODULR_DISCONNECT_SITE', origin });
        await loadConnectedSites();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (tab === 'connected') {
      loadConnectedSites();
    }
  }, [tab]);

  useEffect(() => {
    wallet.refreshSelectedAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.data?.selectedAccountId, wallet.data?.settings.nodeUrl]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!acctRef.current) return;
      if (e.target instanceof Node && !acctRef.current.contains(e.target)) setAcctOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
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
          <img src="/brand/modulr.svg" alt="Modulr" className="h-12 w-12 rounded-2xl border border-white/10 bg-black/20 p-2" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Account</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <div className="relative" ref={acctRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-gray-100 transition hover:border-brand-accent/30 hover:bg-black/25"
                  onClick={() => setAcctOpen((v) => !v)}
                >
                  <span className="max-w-[360px] truncate">{selected ? `${selected.name} · ${shorten(selected.pub, 10, 10)}` : 'Select account'}</span>
                  <ChevronDown className={['h-4 w-4 text-gray-300 transition', acctOpen ? 'rotate-180' : ''].join(' ')} />
                </button>
                <AnimatePresence>
                  {acctOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.99 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="absolute left-0 top-full z-30 mt-2 w-[520px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur"
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
                                active ? 'bg-brand-accent/10 text-gray-100' : 'hover:bg-white/5 text-gray-200'
                              ].join(' ')}
                              onClick={async () => {
                                setAcctOpen(false);
                                await wallet.selectAccount(a.id);
                                await wallet.refreshSelectedAccount();
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{a.name}</p>
                                <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{a.pub}</p>
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-gray-200 transition hover:border-brand-accent/40 hover:bg-black/30"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-gray-200 transition hover:border-brand-accent/40 hover:bg-black/30"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-gray-200 transition hover:border-brand-accent/40 hover:bg-black/40"
            onClick={() => navigate('settings')}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-gray-200 transition hover:border-brand-accent/40 hover:bg-black/40"
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
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs text-gray-400">Node</span>
          <span className="font-mono text-xs text-gray-300">{wallet.data?.settings.nodeUrl ?? '—'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          {tab === 'transactions' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Latest transactions</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Total: {txs.length}</span>
                  <PageSizeSelect
                    value={pageSize}
                    onChange={(v) => {
                      setPageSize(v);
                      setPage(0);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div className="grid grid-cols-12 gap-3 border-b border-white/10 bg-black/10 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  <span className="col-span-4">Tx id</span>
                  <span className="col-span-3">From</span>
                  <span className="col-span-3">To</span>
                  <span className="col-span-1 text-right">Amt</span>
                  <span className="col-span-1 text-right">Fee</span>
                </div>

                {txPage.length === 0 ? (
                  <div className="flex items-center justify-center px-4 py-14 text-sm text-gray-400">No transactions yet.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {txPage.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="grid w-full cursor-pointer grid-cols-12 gap-3 px-4 py-3 text-left text-sm text-gray-200 transition hover:bg-white/5"
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
                    className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:border-brand-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:border-brand-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : tab === 'connected' ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Connected sites</p>
                <button
                  type="button"
                  onClick={loadConnectedSites}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-200 transition hover:border-brand-accent/40"
                >
                  <RefreshCw className={['h-3.5 w-3.5', sitesLoading ? 'animate-spin' : ''].join(' ')} />
                  Refresh
                </button>
              </div>

              <div className="mt-4">
                {Object.keys(connectedSites).length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-14 text-center">
                    <Globe className="h-10 w-10 text-gray-500" />
                    <p className="mt-3 text-sm text-gray-400">No connected sites</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Sites can request connection via <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">window.modulr.connect()</code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(connectedSites).map(([origin, site]) => {
                      let hostname = origin;
                      try {
                        hostname = new URL(origin).hostname;
                      } catch {
                        // ignore
                      }
                      return (
                        <div
                          key={origin}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-brand-accent/25"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                              <Globe className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-100">{hostname}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Connected {new Date(site.connectedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => disconnectSite(origin)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
                            title="Disconnect"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-14 text-sm text-gray-400">
              App usage — coming soon.
            </div>
          )}
        </div>

        <div className="self-start rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Account stats</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-200 transition hover:border-brand-accent/40"
              onClick={() => wallet.refreshSelectedAccount()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Balance</p>
              <p className="mt-2 font-mono text-sm text-gray-100">{balance === null ? '—' : balance}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Nonce</p>
              <p className="mt-2 font-mono text-sm text-gray-100">{nonce === null ? '—' : nonce}</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {qrOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-8"
            onClick={() => setQrOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/70 p-6 text-center backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Receive</p>
              <p className="mt-2 text-sm font-semibold text-gray-100">Scan address QR</p>
              <div className="mt-4 flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="h-[260px] w-[260px] rounded-2xl bg-white p-3" />
                ) : (
                  <div className="flex h-[260px] w-[260px] items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-sm text-gray-400">
                    Generating…
                  </div>
                )}
              </div>
              <p className="mt-4 truncate font-mono text-xs text-gray-300" title={selected?.pub ?? ''}>
                {selected?.pub ?? '—'}
              </p>
              <div className="mt-4">
                <SecondaryButton onClick={() => setQrOpen(false)}>Close</SecondaryButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}


