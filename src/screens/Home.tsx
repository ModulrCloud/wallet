import { useEffect, useState } from 'react';
import { Check, Copy, History, Lock, Moon, QrCode, RefreshCw, Send, Settings, Sun } from 'lucide-react';
import { useWallet, type WalletTxRecord } from '../state/wallet';
import { IconButton, OpenInTabButton, Screen, SecondaryButton } from '../ui/components';
import { Dialog, Drawer } from '../ui/overlays';
import { useToast } from '../ui/toast';
import { useTheme } from '../ui/theme';
import { formatNativeUnits } from '../lib/nativeUnits';

export type HomeNav = 'home' | 'send' | 'transactions' | 'settings';

function shorten(value: string, left = 6, right = 4) {
  if (!value) return '—';
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export function Home({
  navigate,
  onTxClick: _onTxClick
}: {
  navigate: (to: HomeNav) => void;
  onTxClick?: (tx: WalletTxRecord) => void;
}) {
  const wallet = useWallet();
  const toast = useToast();
  const theme = useTheme();
  const selected = wallet.selectedAccount;
  const [acctOpen, setAcctOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Auto-refresh is now handled by WalletProvider

  const balance = wallet.selectedAccountState?.balance ?? null;
  const nonce = wallet.selectedAccountState?.nonce ?? null;

  // Home no longer shows recent txs; use Transactions page.
  void _onTxClick;

  const isDark = theme.mode === 'dark';

  useEffect(() => {
    if (!wallet.lastAutoRefreshAt) return;
    setAutoSpin(true);
    const t = window.setTimeout(() => setAutoSpin(false), 900);
    return () => window.clearTimeout(t);
  }, [wallet.lastAutoRefreshAt]);

  return (
    <Screen variant="plain" className="p-0 overflow-hidden">
      {/* Rabby-like top gradient area */}
      <div
        className={[
          'px-4 pb-4 pt-4',
          isDark
            ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.86))] text-white'
            : 'bg-[linear-gradient(180deg,rgb(255,255,255),rgb(245,246,250))] text-app-text'
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={[
              'min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
              isDark ? 'bg-white/10 text-white/95 hover:bg-white/15' : 'bg-black/5 text-app-text hover:bg-black/7'
            ].join(' ')}
            onClick={() => setAcctOpen(true)}
            title={selected?.pub ?? ''}
          >
            {selected ? (
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate leading-5">{selected.name}</span>
                  <span className={['mt-0.5 block truncate font-mono text-[11px]', isDark ? 'text-white/65' : 'text-app-muted'].join(' ')}>
                    {shorten(selected.pub, 10, 8)}
                  </span>
                </span>
                <span className={['shrink-0 pl-1', isDark ? 'text-white/70' : 'text-app-muted'].join(' ')}>▾</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate">Select account</span>
                <span className={['shrink-0 pl-1', isDark ? 'text-white/70' : 'text-app-muted'].join(' ')}>▾</span>
              </span>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <IconButton
              className={
                isDark
                  ? 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
                  : 'border-app-border bg-app-surface text-app-text hover:border-app-accent/25 hover:bg-app-surface2'
              }
              onClick={async () => {
                if (!selected?.pub) return;
                await navigator.clipboard.writeText(selected.pub);
              }}
              title="Copy address"
            >
              <Copy className="h-5 w-5" />
            </IconButton>
            <OpenInTabButton
              className={
                isDark
                  ? 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
                  : 'border-app-border bg-app-surface text-app-text hover:border-app-accent/25 hover:bg-app-surface2'
              }
            />
            <IconButton
              className={
                isDark
                  ? 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
                  : 'border-app-border bg-app-surface text-app-text hover:border-app-accent/25 hover:bg-app-surface2'
              }
              onClick={() => theme.toggle()}
              title="Theme"
            >
              {theme.mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </IconButton>
            <IconButton
              className={
                isDark
                  ? 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
                  : 'border-app-border bg-app-surface text-app-text hover:border-app-accent/25 hover:bg-app-surface2'
              }
              onClick={() => navigate('settings')}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </IconButton>
            <IconButton
              className={
                isDark
                  ? 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15'
                  : 'border-app-border bg-app-surface text-app-text hover:border-app-accent/25 hover:bg-app-surface2'
              }
              onClick={() => wallet.lock()}
              title="Lock"
            >
              <Lock className="h-5 w-5" />
            </IconButton>
          </div>
        </div>

        <div
          className={[
            'mt-3 rounded-2xl p-4',
            isDark
              ? 'bg-white/6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : 'bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'
          ].join(' ')}
        >
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-5xl font-semibold tracking-tight">{balance === null ? '—' : formatNativeUnits(balance)}</span>
            <span className={['text-base font-semibold', isDark ? 'text-white/70' : 'text-app-muted'].join(' ')}>MDR</span>
          </div>
          <p className={['mt-1 text-sm', isDark ? 'text-white/65' : 'text-app-muted'].join(' ')}>
            {balance === null ? 'No assets' : 'Available balance'}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50',
                isDark ? 'bg-white/10 text-white/90 hover:bg-white/15' : 'border border-app-border bg-app-surface2 text-app-text hover:border-app-accent/25'
              ].join(' ')}
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await Promise.all([wallet.refreshSelectedAccountThrottled(), new Promise((r) => setTimeout(r, 600))]);
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw className={['h-3.5 w-3.5', refreshing || autoSpin ? 'animate-spin' : ''].join(' ')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <span className={['text-xs', isDark ? 'text-white/70' : 'text-app-muted'].join(' ')}>
              Nonce:{' '}
              <span className={['font-mono', isDark ? 'text-white/90' : 'text-app-text'].join(' ')}>
                {nonce === null ? '—' : nonce}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-3 h-[2px] w-full rounded-full bg-brand-accent/70" />
      </div>

      {/* Tiles like Rabby grid */}
      <div className="bg-app-surface px-4 pb-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="grid grid-cols-2">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 border-b border-r border-app-border px-4 py-6 text-app-text transition hover:bg-app-surface2"
              onClick={() => navigate('send')}
            >
              <Send className="h-6 w-6 text-brand-accent" />
              <span className="text-sm font-semibold">Send</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 border-b border-app-border px-4 py-6 text-app-text transition hover:bg-app-surface2"
              onClick={() => navigate('transactions')}
            >
              <History className="h-6 w-6 text-brand-accent" />
              <span className="text-sm font-semibold">Transactions</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 border-r border-app-border px-4 py-6 text-app-text transition hover:bg-app-surface2"
              onClick={async () => {
                setReceiveOpen(true);
                setQrDataUrl(null);
                if (!selected?.pub) return;
                try {
                  const QR = await import('qrcode');
                  const url = await QR.toDataURL(selected.pub, { width: 240, margin: 1 });
                  setQrDataUrl(url);
                } catch {
                  setQrDataUrl(null);
                }
              }}
            >
              <QrCode className="h-6 w-6 text-brand-accent" />
              <span className="text-sm font-semibold">Receive</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-app-text transition hover:bg-app-surface2"
              onClick={() => navigate('settings')}
            >
              <Settings className="h-6 w-6 text-brand-accent" />
              <span className="text-sm font-semibold">Settings</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <SecondaryButton
            onClick={async () => {
              try {
                await wallet.createAccount();
                toast.success('New account created', { title: 'Done' });
              } catch (e: any) {
                toast.error(e?.message ?? 'Failed to create account', { title: 'Error' });
              }
            }}
          >
            Create account
          </SecondaryButton>
        </div>

      </div>

      <Drawer open={acctOpen} onClose={() => setAcctOpen(false)} title="Select account">
        <div className="space-y-2">
          {(wallet.data?.accounts ?? []).map((a) => {
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
                  setAcctOpen(false);
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

      <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive" widthClassName="max-w-sm">
        <p className="text-sm font-semibold text-app-text">Scan address QR</p>
        <div className="mt-4 flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR" className="h-[240px] w-[240px] rounded-2xl bg-white p-3" />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center rounded-2xl border border-app-border bg-app-surface2 text-sm text-app-muted">
              Generating…
            </div>
          )}
        </div>
        <p className="mt-4 truncate font-mono text-xs text-app-muted" title={selected?.pub ?? ''}>
          {selected?.pub ?? '—'}
        </p>
      </Dialog>
    </Screen>
  );
}
