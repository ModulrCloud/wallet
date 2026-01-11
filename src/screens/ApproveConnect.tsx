import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../ui/components';
import { useWallet } from '../state/wallet';

type PendingRequest = {
  type: 'connect';
  data: {
    origin: string;
    favicon?: string;
    title?: string;
  };
  createdAt: number;
};

export function ApproveConnect({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const wallet = useWallet();
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const accounts = wallet.data?.accounts ?? [];
  const selectedAccount = wallet.selectedAccount;

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
    if (!selectedAccount) return;
    setSubmitting(true);

    try {
      const chrome = (globalThis as any).chrome;

      // Save connected site
      await chrome.runtime.sendMessage({
        type: 'MODULR_SAVE_CONNECTED_SITE',
        origin: request?.data.origin,
        accounts: [selectedAccount.pub]
      });

      // Send approval
      await chrome.runtime.sendMessage({
        type: 'MODULR_APPROVAL_RESULT',
        requestId,
        approved: true,
        data: { connected: true, accounts: [selectedAccount.pub] }
      });

      // Close window
      window.close();
    } catch {
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
        error: 'User rejected connection'
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
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Connection request</p>
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
              <Shield className="h-8 w-8 text-brand-accent" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-100">Connect to this site?</h2>
            <p className="mt-2 text-sm text-gray-400">
              <span className="font-semibold text-gray-200">{hostname}</span> wants to connect to your Modulr Wallet.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-medium tracking-wide text-gray-400">This site will be able to:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                View your wallet address
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                Request transaction approval
              </li>
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-medium tracking-wide text-gray-400">Account to connect</p>
            <div className="mt-2">
              <p className="text-sm font-semibold text-gray-100">{selectedAccount?.name ?? 'No account'}</p>
              <p className="mt-1 truncate font-mono text-xs text-gray-400">{selectedAccount?.pub ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SecondaryButton onClick={handleReject} disabled={submitting}>
          <X className="h-4 w-4" />
          Reject
        </SecondaryButton>
        <PrimaryButton onClick={handleApprove} disabled={submitting || !selectedAccount} loading={submitting}>
          Connect
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

