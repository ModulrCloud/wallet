import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Loader2, Send, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../ui/components';
import { useWallet, type WalletTxRecord } from '../state/wallet';
import { buildAndSignTransferTx } from '../lib/tx';
import { fetchAccount, submitTransaction } from '../lib/nodeApi';

type PendingRequest = {
  type: 'sendTransaction';
  data: {
    origin: string;
    favicon?: string;
    title?: string;
    tx: {
      to: string;
      amount: number;
      fee: number;
      memo?: string;
    };
  };
  createdAt: number;
};

export function ApproveTx({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const wallet = useWallet();
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedAccount = wallet.selectedAccount;
  const nodeUrl = wallet.data?.settings.nodeUrl ?? '';

  useEffect(() => {
    (async () => {
      try {
        const chrome = (globalThis as any).chrome;
        const response = await chrome.runtime.sendMessage({
          type: 'MODULR_GET_PENDING_REQUEST',
          requestId
        });
        setRequest(response?.request ?? null);
      } catch {
        setRequest(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const handleApprove = async () => {
    if (!selectedAccount || !request) return;
    setErr(null);
    setSubmitting(true);

    try {
      const tx = request.data.tx;

      // Fetch nonce
      const state = await fetchAccount(nodeUrl, selectedAccount.pub);
      const nonce = state.nonce + 1;

      // Build and sign transaction
      const payload = tx.memo ? { memo: tx.memo } : {};
      const built = await buildAndSignTransferTx({
        from: selectedAccount.pub,
        seedB64: selectedAccount.seedB64,
        to: tx.to,
        amount: tx.amount,
        fee: tx.fee,
        nonce,
        payload
      });

      // Save to wallet history
      const rec: WalletTxRecord = {
        id: built.id,
        time: Date.now(),
        status: 'created',
        nodeUrl,
        from: selectedAccount.pub,
        to: tx.to,
        amount: tx.amount,
        fee: tx.fee,
        nonce,
        sig: built.sig
      };
      await wallet.addTx(rec);

      // Submit transaction
      await submitTransaction(nodeUrl, built.tx);
      await wallet.updateTx(built.id, { status: 'submitted' });

      // Send approval to background
      const chrome = (globalThis as any).chrome;
      await chrome.runtime.sendMessage({
        type: 'MODULR_APPROVAL_RESULT',
        requestId,
        approved: true,
        data: { txId: built.id, submitted: true }
      });

      // Close window
      window.close();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to submit transaction');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const chrome = (globalThis as any).chrome;
      await chrome.runtime.sendMessage({
        type: 'MODULR_APPROVAL_RESULT',
        requestId,
        approved: false,
        error: 'User rejected transaction'
      });
      window.close();
    } catch {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">Request not found or expired.</p>
        <SecondaryButton onClick={() => window.close()}>Close</SecondaryButton>
      </div>
    );
  }

  const origin = request.data.origin;
  const hostname = useMemo(() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  }, [origin]);

  const tx = request.data.tx;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[520px] flex-col p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
            {request.data.favicon ? (
              <img src={request.data.favicon} alt="" className="h-8 w-8 rounded-lg" />
            ) : (
              <Globe className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Transaction request</p>
            <p className="mt-1 text-sm font-semibold text-gray-100">{hostname}</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
          onClick={handleReject}
          title="Reject"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mt-6 flex-1">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-brand-accent/20 bg-brand-accent/10">
              <Send className="h-8 w-8 text-brand-accent" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-100">Confirm transaction</h2>
            <p className="mt-2 text-sm text-gray-400">
              <span className="font-semibold text-gray-200">{hostname}</span> wants to send a transaction.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {/* From */}
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-gray-400">From</p>
              <p className="mt-1 truncate font-mono text-sm text-gray-100">{selectedAccount?.pub ?? '—'}</p>
            </div>

            {/* To */}
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-gray-400">To</p>
              <p className="mt-1 break-all font-mono text-sm text-gray-100">{tx.to}</p>
            </div>

            {/* Amount / Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-gray-400">Amount</p>
                <p className="mt-1 font-mono text-lg font-semibold text-gray-100">{tx.amount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-gray-400">Fee</p>
                <p className="mt-1 font-mono text-lg font-semibold text-gray-100">{tx.fee}</p>
              </div>
            </div>

            {/* Memo */}
            {tx.memo ? (
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-gray-400">Memo</p>
                <p className="mt-1 text-sm text-gray-200">{tx.memo}</p>
              </div>
            ) : null}
          </div>

          {/* Error */}
          {err ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-200">{err}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SecondaryButton onClick={handleReject} disabled={submitting}>
          <X className="h-4 w-4" />
          Reject
        </SecondaryButton>
        <PrimaryButton onClick={handleApprove} disabled={submitting || !selectedAccount} loading={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 text-brand-accent" />
              Approve
            </>
          )}
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

