import { isAutoNodeUrl, pickDefaultRpcOrder } from './rpc';

export type AccountState = {
  balance: number;
  nonce: number;
};

export type TransactionReceipt = {
  block: string;
  position: number;
  success: boolean;
};

export type TxWithReceipt = {
  tx: {
    v: number;
    from: string;
    to: string;
    amount: number;
    fee: number;
    sig: string;
    nonce: number;
    payload: Record<string, unknown>;
  };
  receipt: TransactionReceipt;
};

export type FetchTxResult =
  | { found: true; data: TxWithReceipt }
  | { found: false; error?: string };

function normalizeBase(nodeUrl: string) {
  return nodeUrl.replace(/\/+$/, '');
}

async function withNodeFailover<T>(nodeUrl: string, fn: (base: string) => Promise<T>): Promise<T> {
  if (!isAutoNodeUrl(nodeUrl)) {
    return fn(normalizeBase(nodeUrl));
  }

  const [first, second] = pickDefaultRpcOrder();
  try {
    return await fn(normalizeBase(first));
  } catch (e1) {
    // Failover to the second RPC
    return await fn(normalizeBase(second));
  }
}

export async function fetchAccount(nodeUrl: string, accountId: string): Promise<AccountState> {
  return withNodeFailover(nodeUrl, async (base) => {
    const res = await fetch(`${base}/account/${encodeURIComponent(accountId)}`);
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as AccountState;
  });
}

export async function submitTransaction(nodeUrl: string, tx: unknown): Promise<any> {
  return withNodeFailover(nodeUrl, async (base) => {
    const res = await fetch(`${base}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  });
}

/**
 * Fetch transaction by hash from the node.
 * Returns the tx + receipt if found, or { found: false } if not yet included in a block.
 */
export async function fetchTransaction(nodeUrl: string, txHash: string): Promise<FetchTxResult> {
  const attempt = async (base: string): Promise<FetchTxResult> => {
    const res = await fetch(`${base}/transaction/${encodeURIComponent(txHash)}`);
    if (res.status === 404) return { found: false };
    if (!res.ok) return { found: false, error: await res.text() };
    return { found: true, data: (await res.json()) as TxWithReceipt };
  };

  if (!isAutoNodeUrl(nodeUrl)) {
    try {
      return await attempt(normalizeBase(nodeUrl));
    } catch (err: any) {
      return { found: false, error: err?.message ?? 'Network error' };
    }
  }

  const [first, second] = pickDefaultRpcOrder();
  try {
    const r1 = await attempt(normalizeBase(first));
    if (r1.found) return r1;
    // If not found on primary, check the other RPC too.
    const r2 = await attempt(normalizeBase(second));
    if (r2.found) return r2;
    return r1.error || r2.error ? { found: false, error: r1.error ?? r2.error } : { found: false };
  } catch (err1: any) {
    try {
      return await attempt(normalizeBase(second));
    } catch (err2: any) {
      return { found: false, error: err2?.message ?? err1?.message ?? 'Network error' };
    }
  }
}




