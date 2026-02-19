import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { sessionGet, sessionRemove, sessionSet, storageGet, storageRemove, storageSet } from '../lib/chromeStorage';
import {
  deriveVaultKeyRawB64,
  openVaultJson,
  openVaultJsonWithKeyB64,
  sealVaultJson,
  sealVaultJsonWithKeyB64,
  type VaultEnvelopeV1
} from '../lib/vault';
import { generateNewDefaultAccount, generateAccountFromMnemonic, type GeneratedAccount } from '../lib/crypto/ed25519';
import { fetchAccount } from '../lib/nodeApi';
import { generateMockTxs } from '../lib/mockTxs';
import { AUTO_NODE_URL } from '../lib/rpc';

const STORAGE_VAULT_KEY = 'modulr.vault.v1';
const SESSION_UNLOCK_KEY = 'modulr.session.unlock.v1';
const DEFAULT_UNLOCK_TTL_MS = 15 * 60 * 1000;
const ACCOUNT_AUTO_REFRESH_MS = 10 * 1000;
const MANUAL_REFRESH_THROTTLE_MS = 1500;

export type WalletTxRecord = {
  id: string;
  time: number;
  status: 'created' | 'submitted' | 'failed';
  nodeUrl: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  nonce: number;
  sig?: string;
  error?: string;
};

export type WalletDataV1 = {
  v: 1;
  createdAt: number;
  selectedAccountId: string | null;
  accounts: Array<GeneratedAccount>;
  txs: WalletTxRecord[];
  settings: {
    nodeUrl: string;
  };
};

type WalletStatus = 'loading' | 'needs_onboarding' | 'locked' | 'unlocked';

type WalletContextValue = {
  status: WalletStatus;
  data: WalletDataV1 | null;
  txs: WalletTxRecord[];
  lock: () => void;
  reset: () => Promise<void>;
  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  save: (next: WalletDataV1) => Promise<void>;
  createAccount: () => Promise<void>;
  importAccountFromSeedPhrase: (params: { name?: string; mnemonic: string; mnemonicPassword?: string }) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  refreshSelectedAccount: () => Promise<void>;
  refreshSelectedAccountThrottled: () => Promise<void>;
  lastAutoRefreshAt: number;
  selectedAccount: GeneratedAccount | null;
  selectedAccountState: { balance: number; nonce: number } | null;
  setNodeUrl: (url: string) => Promise<void>;
  addTx: (tx: WalletTxRecord) => Promise<void>;
  updateTx: (id: string, patch: Partial<WalletTxRecord>) => Promise<void>;
};

const WalletCtx = createContext<WalletContextValue | null>(null);

function defaultData(): WalletDataV1 {
  return {
    v: 1,
    createdAt: Date.now(),
    selectedAccountId: null,
    accounts: [],
    txs: [],
    settings: {
      nodeUrl: AUTO_NODE_URL
    }
  };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>('loading');
  const [data, setData] = useState<WalletDataV1 | null>(null);
  const [vault, setVault] = useState<VaultEnvelopeV1 | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [vaultKeyB64, setVaultKeyB64] = useState<string | null>(null);
  const [selectedAccountState, setSelectedAccountState] = useState<{ balance: number; nonce: number } | null>(null);
  const [lastAutoRefreshAt, setLastAutoRefreshAt] = useState(0);
  const mockMode = useMemo(() => {
    try {
      if (!(import.meta as any).env?.DEV) return false;
      const url = new URL(window.location.href);
      return url.searchParams.get('mock') === '1';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const env = await storageGet<VaultEnvelopeV1>(STORAGE_VAULT_KEY);
      if (!env) {
        setStatus('needs_onboarding');
        setVault(null);
        setData(null);
        return;
      }
      setVault(env);
      // Try session-unlock: keep decrypted state for N minutes (like common wallets).
      const cached = await sessionGet<{ until: number; keyB64: string }>(SESSION_UNLOCK_KEY);
      if (cached && typeof cached.until === 'number' && cached.until > Date.now() && typeof cached.keyB64 === 'string') {
        try {
          const json = await openVaultJsonWithKeyB64(cached.keyB64, env);
          const parsed = JSON.parse(json) as WalletDataV1;
          setData(parsed);
          setPassword(null);
          setVaultKeyB64(cached.keyB64);
          setStatus('unlocked');
          setSelectedAccountState(null);
          return;
        } catch {
          await sessionRemove(SESSION_UNLOCK_KEY);
        }
      }
      setStatus('locked');
    })().catch(() => {
      setStatus('needs_onboarding');
    });
  }, []);

  const persist = useCallback(
    async (pwd: string, next: WalletDataV1) => {
      const env = await sealVaultJson(pwd, JSON.stringify(next));
      await storageSet(STORAGE_VAULT_KEY, env);
      setVault(env);
      setData(next);
    },
    []
  );

  const persistWithKey = useCallback(
    async (keyB64: string, next: WalletDataV1) => {
      if (!vault) throw new Error('Vault not found');
      const env = await sealVaultJsonWithKeyB64(vault, keyB64, JSON.stringify(next));
      await storageSet(STORAGE_VAULT_KEY, env);
      setVault(env);
      setData(next);
    },
    [vault]
  );

  const createVault = useCallback(
    async (pwd: string) => {
      const first = defaultData();
      const acct = await generateNewDefaultAccount({ name: 'Account 1' });
      first.accounts = [acct];
      first.selectedAccountId = acct.id;

      await persist(pwd, first);
      setPassword(pwd);
      setVaultKeyB64(null);
      setStatus('unlocked');
      setSelectedAccountState(null);

      // cache unlock key in session for convenience
      const env = await storageGet<VaultEnvelopeV1>(STORAGE_VAULT_KEY);
      if (env) {
        const keyB64 = await deriveVaultKeyRawB64(pwd, env);
        await sessionSet(SESSION_UNLOCK_KEY, { until: Date.now() + DEFAULT_UNLOCK_TTL_MS, keyB64 });
        setVaultKeyB64(keyB64);
      }
    },
    [persist]
  );

  const unlock = useCallback(
    async (pwd: string) => {
      const env = vault ?? (await storageGet<VaultEnvelopeV1>(STORAGE_VAULT_KEY));
      if (!env) throw new Error('Vault not found');
      const json = await openVaultJson(pwd, env);
      const parsed = JSON.parse(json) as WalletDataV1;
      setVault(env);
      setPassword(pwd);
      setVaultKeyB64(null);
      setData(parsed);
      setStatus('unlocked');
      setSelectedAccountState(null);

      const keyB64 = await deriveVaultKeyRawB64(pwd, env);
      await sessionSet(SESSION_UNLOCK_KEY, { until: Date.now() + DEFAULT_UNLOCK_TTL_MS, keyB64 });
      setVaultKeyB64(keyB64);
    },
    [vault]
  );

  const lock = useCallback(() => {
    sessionRemove(SESSION_UNLOCK_KEY).catch(() => {});
    setPassword(null);
    setVaultKeyB64(null);
    setData(null);
    setSelectedAccountState(null);
    setStatus(vault ? 'locked' : 'needs_onboarding');
  }, [vault]);

  const save = useCallback(
    async (next: WalletDataV1) => {
      if (password) {
        await persist(password, next);
        return;
      }
      if (vaultKeyB64) {
        await persistWithKey(vaultKeyB64, next);
        return;
      }
      throw new Error('Wallet is locked');
    },
    [password, vaultKeyB64, persist, persistWithKey]
  );

  const createAccount = useCallback(async () => {
    if (!data) throw new Error('Wallet not unlocked');
    const next = structuredClone(data) as WalletDataV1;
    const acct = await generateNewDefaultAccount({ name: `Account ${next.accounts.length + 1}` });
    next.accounts.push(acct);
    next.selectedAccountId = acct.id;
    await save(next);
  }, [data, save]);

  const importAccountFromSeedPhrase = useCallback(
    async (params: { name?: string; mnemonic: string; mnemonicPassword?: string }) => {
      if (!data) throw new Error('Wallet not unlocked');
      const next = structuredClone(data) as WalletDataV1;
      const acct = await generateAccountFromMnemonic({
        name: params.name ?? `Imported ${next.accounts.length + 1}`,
        mnemonic: params.mnemonic,
        mnemonicPassword: params.mnemonicPassword ?? ''
      });
      next.accounts.push(acct);
      next.selectedAccountId = acct.id;
      await save(next);
    },
    [data, save]
  );

  const selectAccount = useCallback(
    async (accountId: string) => {
      if (!data) throw new Error('Wallet not unlocked');
      const next = { ...data, selectedAccountId: accountId };
      setSelectedAccountState(null); // Clear immediately, useEffect will fetch new data
      await save(next);
    },
    [data, save]
  );

  const selectedAccount = useMemo(() => {
    if (!data?.selectedAccountId) return null;
    return data.accounts.find((a) => a.id === data.selectedAccountId) ?? null;
  }, [data]);

  // Track the current fetch request to prevent race conditions
  const fetchRequestIdRef = React.useRef(0);
  const lastManualRefreshAtRef = React.useRef(0);

  const txs = useMemo(() => {
    const real = data?.txs ?? [];
    const accountPub = selectedAccount?.pub;
    
    // Filter transactions by selected account (from or to)
    const filtered = accountPub 
      ? real.filter((t) => t.from === accountPub || t.to === accountPub)
      : real;
    
    if (!mockMode || !data) return filtered;
    const fromPub = accountPub ?? data.accounts[0]?.pub;
    if (!fromPub) return filtered;
    const mock = generateMockTxs({ fromPub, nodeUrl: data.settings.nodeUrl });
    // Show real txs first (if any), then demo data.
    return [...filtered, ...mock];
  }, [data, mockMode, selectedAccount?.pub]);

  const refreshSelectedAccount = useCallback(async () => {
    if (!data || !selectedAccount) return;
    const nodeUrl = data.settings.nodeUrl;
    const accountPub = selectedAccount.pub;
    const requestId = ++fetchRequestIdRef.current;
    try {
      const state = await fetchAccount(nodeUrl, accountPub);
      // Only update if this is still the latest request
      if (requestId === fetchRequestIdRef.current) {
        setSelectedAccountState(state);
      }
    } catch {
      if (requestId === fetchRequestIdRef.current) {
        setSelectedAccountState(null);
      }
    }
  }, [data, selectedAccount]);

  const refreshSelectedAccountAuto = useCallback(async () => {
    if (!data || !selectedAccount) return;
    const nodeUrl = data.settings.nodeUrl;
    const accountPub = selectedAccount.pub;
    const requestId = ++fetchRequestIdRef.current;
    try {
      const state = await fetchAccount(nodeUrl, accountPub);
      if (requestId === fetchRequestIdRef.current) {
        setSelectedAccountState(state);
      }
    } catch {
      if (requestId === fetchRequestIdRef.current) {
        setSelectedAccountState(null);
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) setLastAutoRefreshAt(Date.now());
    }
  }, [data, selectedAccount]);

  const refreshSelectedAccountThrottled = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRefreshAtRef.current < MANUAL_REFRESH_THROTTLE_MS) return;
    lastManualRefreshAtRef.current = now;
    await refreshSelectedAccount();
  }, [refreshSelectedAccount]);

  // Auto-refresh account state when selected account or node URL changes
  useEffect(() => {
    if (status !== 'unlocked' || !selectedAccount || !data?.settings.nodeUrl) return;
    refreshSelectedAccountAuto().catch(() => {});
  }, [status, selectedAccount?.pub, data?.settings.nodeUrl, refreshSelectedAccountAuto]);

  // Periodic auto-refresh (keep balance/nonce fresh)
  useEffect(() => {
    if (status !== 'unlocked' || !selectedAccount || !data?.settings.nodeUrl) return;
    const id = window.setInterval(() => {
      refreshSelectedAccountAuto().catch(() => {});
    }, ACCOUNT_AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [status, selectedAccount?.pub, data?.settings.nodeUrl, refreshSelectedAccountAuto]);

  const setNodeUrl = useCallback(
    async (url: string) => {
      if (!data) throw new Error('Wallet not unlocked');
      const next = { ...data, settings: { ...data.settings, nodeUrl: url } };
      await save(next);
    },
    [data, save]
  );

  // Migration: older vaults may have empty nodeUrl. Treat that as "auto defaults".
  useEffect(() => {
    if (status !== 'unlocked') return;
    if (!data) return;
    if (data.settings.nodeUrl && data.settings.nodeUrl.trim().length > 0) return;
    setNodeUrl(AUTO_NODE_URL).catch(() => {});
  }, [status, data, setNodeUrl]);

  // Use a ref to always have access to the latest data for tx operations
  const dataRef = React.useRef(data);
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const addTx = useCallback(
    async (tx: WalletTxRecord) => {
      const current = dataRef.current;
      if (!current) throw new Error('Wallet not unlocked');
      const next = structuredClone(current) as WalletDataV1;
      next.txs.unshift(tx);
      await save(next);
    },
    [save]
  );

  const updateTx = useCallback(
    async (id: string, patch: Partial<WalletTxRecord>) => {
      const current = dataRef.current;
      if (!current) throw new Error('Wallet not unlocked');
      const next = structuredClone(current) as WalletDataV1;
      const idx = next.txs.findIndex((t) => t.id === id);
      if (idx >= 0) next.txs[idx] = { ...next.txs[idx], ...patch };
      await save(next);
    },
    [save]
  );

  const reset = useCallback(async () => {
    await storageRemove(STORAGE_VAULT_KEY);
    await sessionRemove(SESSION_UNLOCK_KEY);
    setVault(null);
    setPassword(null);
    setVaultKeyB64(null);
    setData(null);
    setSelectedAccountState(null);
    setStatus('needs_onboarding');
  }, []);

  const value: WalletContextValue = {
    status,
    data,
    txs,
    lock,
    reset,
    createVault,
    unlock,
    save,
    createAccount,
    importAccountFromSeedPhrase,
    selectAccount,
    refreshSelectedAccount,
    refreshSelectedAccountThrottled,
    lastAutoRefreshAt,
    selectedAccount,
    selectedAccountState,
    setNodeUrl,
    addTx,
    updateTx
  };

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}


