import { useMemo, useState } from 'react';
import { useWallet, type WalletTxRecord } from '../state/wallet';
import { Screen } from '../ui/components';
import { PageHeader } from '../ui/header';

function shorten(value: string, left = 10, right = 8) {
  if (!value) return '—';
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

const PAGE_SIZES = [10, 25, 50] as const;

export function Transactions({ back, onTxClick }: { back: () => void; onTxClick?: (tx: WalletTxRecord) => void }) {
  const wallet = useWallet();
  const txs = wallet.txs ?? [];

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const totalPages = Math.max(1, Math.ceil(txs.length / pageSize));
  const txPage = useMemo(() => txs.slice(page * pageSize, (page + 1) * pageSize), [txs, page, pageSize]);

  return (
    <Screen>
      <PageHeader eyebrow="Wallet" title="Transactions" onBack={back} right={null} />

      <div className="mt-4 rounded-2xl border border-app-border bg-app-surface p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">History</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-muted">Total: {txs.length}</span>
            <div className="inline-flex overflow-hidden rounded-xl border border-app-border bg-app-surface">
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={[
                    'px-3 py-2 text-xs font-semibold transition',
                    s === pageSize ? 'bg-app-accent/15 text-app-text' : 'text-app-muted hover:bg-app-surface2'
                  ].join(' ')}
                  onClick={() => {
                    setPageSize(s);
                    setPage(0);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {txPage.length === 0 ? (
          <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-app-border bg-app-surface2 px-4 py-10 text-sm text-app-muted">
            No transactions yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {txPage.map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full rounded-xl border border-app-border bg-app-surface2 px-3 py-3 text-left transition hover:border-app-accent/25"
                onClick={() => onTxClick?.(t)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-xs text-brand-accent" title={t.id}>
                    {shorten(t.id, 12, 10)}
                  </p>
                  <span className="text-xs text-app-muted">{new Date(t.time).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-app-muted">
                  {shorten(t.from)} → {shorten(t.to)} · amt {t.amount} · fee {t.fee}
                </p>
                {t.error ? <p className="mt-1 text-xs text-app-danger">{t.error}</p> : null}
              </button>
            ))}
          </div>
        )}

        {txs.length > pageSize ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-app-border bg-app-surface2 px-4 py-2 text-xs font-semibold text-app-text transition hover:border-app-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
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
      </div>
    </Screen>
  );
}

