import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PrimaryButton } from '../ui/components';
import { useWallet, type WalletTxRecord } from '../state/wallet';
import { fetchTransaction, type TransactionReceipt } from '../lib/nodeApi';
import { PageHeader } from '../ui/header';
import { formatNativeUnits } from '../lib/nativeUnits';

const EXPLORER_BASE = 'https://testnet.explorer.modulr.cloud';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

type NodeStatus = 'loading' | 'pending' | 'confirmed' | 'failed' | 'error';

export function TxDetails({ tx, back }: { tx: WalletTxRecord; back: () => void }) {
  const wallet = useWallet();
  const explorerUrl = `${EXPLORER_BASE}/tx/${tx.id}`;
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);
  const [copied, setCopied] = useState<string | null>(null);

  // Real status from node
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>('loading');
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const nodeUrl = wallet.data?.settings.nodeUrl ?? '';

  const fetchStatus = async () => {
    if (!nodeUrl || !tx.id) {
      setNodeStatus('error');
      setStatusError('No node URL configured');
      return;
    }

    setNodeStatus('loading');
    setStatusError(null);

    const result = await fetchTransaction(nodeUrl, tx.id);

    if (result.found) {
      setReceipt(result.data.receipt);
      setNodeStatus(result.data.receipt.success ? 'confirmed' : 'failed');
    } else {
      // Not found = still pending in mempool or never submitted
      setReceipt(null);
      if (result.error && !result.error.includes('Not found')) {
        setNodeStatus('error');
        setStatusError(result.error);
      } else {
        setNodeStatus('pending');
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.id, nodeUrl]);

  const copyValue = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 900);
  };

  // Determine display status
  const statusDisplay = useMemo(() => {
    if (nodeStatus === 'loading') {
      return { label: 'Checking…', className: 'border-app-border bg-app-surface2 text-app-muted' };
    }
    if (nodeStatus === 'confirmed') {
      return { label: 'Confirmed', className: 'border-app-success/30 bg-app-success/10 text-app-success' };
    }
    if (nodeStatus === 'failed') {
      return { label: 'Failed', className: 'border-app-danger/30 bg-app-danger/10 text-app-danger' };
    }
    if (nodeStatus === 'pending') {
      return { label: 'Pending', className: 'border-app-warning/30 bg-app-warning/10 text-app-warning' };
    }
    // error
    return { label: 'Unknown', className: 'border-app-border bg-app-surface2 text-app-muted' };
  }, [nodeStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={isTab ? 'w-full' : 'glow-card gradient-border rounded-2xl p-4'}
    >
      <PageHeader
        eyebrow="Transaction"
        title="Details"
        onBack={() => back()}
        right={
          <PrimaryButton
            fullWidth={false}
            className="px-5 py-3"
            onClick={() => {
              window.open(explorerUrl, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4" />
            See in Explorer
          </PrimaryButton>
        }
      />

      {/* Status row */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <span className={['rounded-full border px-4 py-2 text-sm font-semibold', statusDisplay.className].join(' ')}>
          {nodeStatus === 'loading' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {statusDisplay.label}
            </span>
          ) : (
            statusDisplay.label
          )}
        </span>
        <span className="text-sm text-app-muted">{formatTime(tx.time)}</span>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={nodeStatus === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface2 px-3 py-1.5 text-xs text-app-text transition hover:border-app-accent/35 disabled:opacity-50"
        >
          <RefreshCw className={['h-3.5 w-3.5', nodeStatus === 'loading' ? 'animate-spin' : ''].join(' ')} />
          Refresh
        </button>
      </div>

      {/* Status error */}
      {statusError ? (
        <div className="mt-4 rounded-xl border border-app-danger/20 bg-app-danger/5 px-4 py-3">
          <p className="text-xs text-app-danger">Failed to fetch status: {statusError}</p>
        </div>
      ) : null}

      {/* Receipt info (if confirmed) */}
      {receipt ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface2 px-3 py-2">
            <span className="text-xs text-app-muted">Block</span>
            <span className="font-mono text-xs text-app-text">{receipt.block}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface2 px-3 py-2">
            <span className="text-xs text-app-muted">Position</span>
            <span className="font-mono text-xs text-app-text">{receipt.position}</span>
          </div>
        </div>
      ) : null}

      {/* Main content */}
      <div className="mt-8">
        <div className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-medium tracking-wide text-app-muted">Transaction details</p>

          <div className="mt-4 space-y-3">
            {/* Tx ID */}
            <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-app-muted">Transaction ID</p>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {copied === 'id' ? (
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
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/35 hover:text-brand-accent"
                    onClick={() => copyValue(tx.id, 'id')}
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-brand-accent">{tx.id}</p>
            </div>

            {/* From */}
            <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-app-muted">From</p>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {copied === 'from' ? (
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
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/35 hover:text-brand-accent"
                    onClick={() => copyValue(tx.from, 'from')}
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-app-text">{tx.from}</p>
            </div>

            {/* To */}
            <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-app-muted">To</p>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {copied === 'to' ? (
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
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/35 hover:text-brand-accent"
                    onClick={() => copyValue(tx.to, 'to')}
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-app-text">{tx.to}</p>
            </div>

            {/* Amount / Fee / Nonce row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
                <p className="text-xs font-medium tracking-wide text-app-muted">Amount</p>
                <p className="mt-2 font-mono text-lg font-semibold text-app-text">{formatNativeUnits(tx.amount)}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
                <p className="text-xs font-medium tracking-wide text-app-muted">Fee</p>
                <p className="mt-2 font-mono text-lg font-semibold text-app-text">{formatNativeUnits(tx.fee)}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
                <p className="text-xs font-medium tracking-wide text-app-muted">Nonce</p>
                <p className="mt-2 font-mono text-lg font-semibold text-app-text">{tx.nonce}</p>
              </div>
            </div>

            {/* Signature */}
            {tx.sig ? (
              <div className="rounded-xl border border-app-border bg-app-surface2 px-4 py-4 transition hover:border-app-accent/20">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium tracking-wide text-app-muted">Signature</p>
                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {copied === 'sig' ? (
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
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-muted transition hover:border-app-accent/35 hover:text-brand-accent"
                      onClick={() => copyValue(tx.sig!, 'sig')}
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-app-muted">{tx.sig}</p>
              </div>
            ) : null}

            {/* Local error (from wallet) */}
            {tx.error ? (
              <div className="rounded-xl border border-app-danger/20 bg-app-danger/5 px-4 py-4">
                <p className="text-xs font-medium tracking-wide text-app-danger/80">Local Error</p>
                <p className="mt-2 text-sm text-app-danger">{tx.error}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
