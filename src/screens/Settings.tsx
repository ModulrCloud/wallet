import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Download, KeyRound, Trash2 } from 'lucide-react';
import { PasswordInput, PrimaryButton, Screen, SecondaryButton, TextInput } from '../ui/components';
import { useWallet } from '../state/wallet';
import { storageGet } from '../lib/chromeStorage';
import { openVaultJson, type VaultEnvelopeV1 } from '../lib/vault';
import { PageHeader } from '../ui/header';
import { useTheme } from '../ui/theme';
import { AUTO_NODE_URL, DEFAULT_RPC_URLS, isAutoNodeUrl } from '../lib/rpc';

export function Settings({ back }: { back: () => void }) {
  const wallet = useWallet();
  const theme = useTheme();
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);
  const stored = wallet.data?.settings.nodeUrl ?? AUTO_NODE_URL;
  const storedIsAuto = useMemo(() => isAutoNodeUrl(stored) || stored.trim().length === 0, [stored]);
  const [rpcMode, setRpcMode] = useState<'defaults' | 'custom'>(storedIsAuto ? 'defaults' : 'custom');
  const [customNodeUrl, setCustomNodeUrl] = useState(storedIsAuto ? '' : stored);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicPassword, setMnemonicPassword] = useState('');
  const [importName, setImportName] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    if (!exportErr) return;
    const t = window.setTimeout(() => setExportErr(null), 2400);
    return () => window.clearTimeout(t);
  }, [exportErr]);

  useEffect(() => {
    // Sync local settings with persisted data (e.g., after migrations/session-unlock).
    setRpcMode(storedIsAuto ? 'defaults' : 'custom');
    setCustomNodeUrl(storedIsAuto ? '' : stored);
  }, [storedIsAuto, stored]);

  const changed = useMemo(() => {
    if (rpcMode === 'defaults') return !storedIsAuto;
    return customNodeUrl.trim() !== stored.trim();
  }, [rpcMode, customNodeUrl, stored, storedIsAuto]);

  return (
    <Screen
      variant={isTab ? 'plain' : 'framed'}
      className={
        isTab
          ? 'w-full border border-app-border bg-app-surface/70 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.30)] backdrop-blur-md'
          : ''
      }
    >
      <div className="w-full">
        <PageHeader
          eyebrow="Settings"
          title="Node & Storage"
          onBack={() => back()}
          right={null}
        />

        {/* Match "Latest transactions" look: one glass list with row-cards */}
        <div className="mt-4 rounded-2xl border border-app-border bg-app-surface p-3 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="rounded-xl border border-app-border bg-app-surface2 px-3 py-3 transition hover:border-app-accent/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Node URL</p>
                <p className="mt-1 text-xs text-app-muted">Used to get account data and send transactions</p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="grid w-full grid-cols-2 overflow-hidden rounded-xl border border-app-border bg-app-surface sm:w-[360px]">
                  <button
                    type="button"
                    className={[
                      'px-4 py-2.5 text-sm font-semibold transition',
                      'border-r border-app-border',
                      'outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-inset',
                      rpcMode === 'defaults' ? 'bg-app-accent/15 text-app-text' : 'text-app-muted hover:bg-app-surface2'
                    ].join(' ')}
                    onClick={() => setRpcMode('defaults')}
                  >
                    Defaults
                  </button>
                  <button
                    type="button"
                    className={[
                      'px-4 py-2.5 text-sm font-semibold transition',
                      'outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-inset',
                      rpcMode === 'custom' ? 'bg-app-accent/15 text-app-text' : 'text-app-muted hover:bg-app-surface2'
                    ].join(' ')}
                    onClick={() => setRpcMode('custom')}
                  >
                    Custom
                  </button>
                </div>

                {rpcMode === 'custom' ? (
                  <div className="w-full sm:w-[360px]">
                    <TextInput
                      value={customNodeUrl}
                      onChange={(e) => setCustomNodeUrl(e.target.value)}
                      placeholder="Enter node URL"
                      className="h-11 w-full"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <SecondaryButton
                        fullWidth={false}
                        className="h-11 px-5 whitespace-nowrap"
                        disabled={saving || storedIsAuto}
                        onClick={async () => {
                          setErr(null);
                          setSaving(true);
                          try {
                            await wallet.setNodeUrl(AUTO_NODE_URL);
                            await wallet.refreshSelectedAccount();
                            back();
                          } catch (e: any) {
                            setErr(e?.message ?? 'Failed to save');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Use defaults
                      </SecondaryButton>
                      <PrimaryButton
                        fullWidth={false}
                        className="h-11 px-6"
                        loading={saving}
                        disabled={!changed || saving}
                        onClick={async () => {
                          const next = customNodeUrl.trim();
                          if (!next) {
                            setErr('Enter a node URL or use defaults');
                            return;
                          }
                          setErr(null);
                          setSaving(true);
                          try {
                            await wallet.setNodeUrl(next);
                            await wallet.refreshSelectedAccount();
                            back();
                          } catch (e: any) {
                            setErr(e?.message ?? 'Failed to save');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Save
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-end sm:w-[360px]">
                    {!storedIsAuto ? (
                      <PrimaryButton
                        fullWidth={false}
                        className="h-11 px-6"
                        loading={saving}
                        disabled={saving}
                        onClick={async () => {
                          setErr(null);
                          setSaving(true);
                          try {
                            await wallet.setNodeUrl(AUTO_NODE_URL);
                            await wallet.refreshSelectedAccount();
                            back();
                          } catch (e: any) {
                            setErr(e?.message ?? 'Failed to save');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Use defaults
                      </PrimaryButton>
                    ) : (
                      <div className="text-xs font-semibold text-app-muted">Using defaults</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {rpcMode === 'defaults' ? (
              <div className="mt-3 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                <p className="font-semibold text-app-text">Default RPCs (auto)</p>
                <p className="mt-1">Load-balanced 50/50 per request with automatic failover.</p>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-app-text break-all">
                  <div>{DEFAULT_RPC_URLS[0]}</div>
                  <div>{DEFAULT_RPC_URLS[1]}</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
                <p className="font-semibold text-app-text">Custom RPC</p>
                <p className="mt-1">Used exclusively (no fallback to defaults).</p>
              </div>
            )}
            <div className="mt-2 min-h-[20px]">
              {err ? (
                <p className="text-sm text-app-danger">{err}</p>
              ) : (
                <p aria-hidden className="text-sm text-transparent">
                  .
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-app-border bg-app-surface2 px-3 py-3 transition hover:border-app-accent/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Theme</p>
                <p className="mt-1 text-xs text-app-muted">Switch between light and dark</p>
              </div>
              <div className="grid w-full grid-cols-2 overflow-hidden rounded-xl border border-app-border bg-app-surface sm:w-[360px]">
                <button
                  type="button"
                  className={[
                    'px-4 py-2.5 text-sm font-semibold transition',
                    'border-r border-app-border',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-inset',
                    theme.mode === 'light' ? 'bg-app-accent/15 text-app-text' : 'text-app-muted hover:bg-app-surface2'
                  ].join(' ')}
                  onClick={() => theme.setMode('light')}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={[
                    'px-4 py-2.5 text-sm font-semibold transition',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-inset',
                    theme.mode === 'dark' ? 'bg-app-accent/15 text-app-text' : 'text-app-muted hover:bg-app-surface2'
                  ].join(' ')}
                  onClick={() => theme.setMode('dark')}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-app-border bg-app-surface2 px-3 py-3 transition hover:border-app-accent/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Accounts</p>
                <p className="mt-1 text-xs text-app-muted">Import from a seed phrase or export your key data as JSON.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <SecondaryButton
                  fullWidth={false}
                  className="h-11 px-5"
                  onClick={() => {
                    setImportOpen((v) => {
                      const next = !v;
                      if (next) setExportOpen(false);
                      return next;
                    });
                  }}
                >
                  <KeyRound className="h-4 w-4 text-brand-accent" />
                  Import
                </SecondaryButton>
                <SecondaryButton
                  fullWidth={false}
                  className="h-11 px-5"
                  onClick={() => {
                    setExportOpen((v) => {
                      const next = !v;
                      if (next) setImportOpen(false);
                      return next;
                    });
                  }}
                >
                  <Download className="h-4 w-4 text-brand-accent" />
                  Export
                </SecondaryButton>
              </div>
            </div>

            {importOpen ? (
              <div className="mt-3 rounded-xl border border-app-border bg-app-surface2 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Import account</p>
                <p className="mt-1 text-xs text-app-muted">Enter a 12/24 word seed phrase and an optional mnemonic password.</p>
                <div className="mt-3 space-y-2">
                  <TextInput value={importName} onChange={(e) => setImportName(e.target.value)} placeholder="Account name (optional)" />
                  <TextInput
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Seed phrase (12/24 words)"
                  />
                  <PasswordInput value={mnemonicPassword} onChange={setMnemonicPassword} placeholder="Mnemonic password (optional)" />
                  <div className="min-h-[20px]">
                    {importErr ? (
                      <p className="text-sm text-app-danger">{importErr}</p>
                    ) : (
                      <p aria-hidden className="text-sm text-transparent">
                        .
                      </p>
                    )}
                  </div>
                  <PrimaryButton
                    onClick={async () => {
                      setImportErr(null);
                      try {
                        await wallet.importAccountFromSeedPhrase({
                          name: importName.trim() || undefined,
                          mnemonic,
                          mnemonicPassword
                        });
                        setMnemonic('');
                        setMnemonicPassword('');
                        setImportName('');
                        setImportOpen(false);
                      } catch (e: any) {
                        setImportErr(e?.message ?? 'Import failed');
                      }
                    }}
                  >
                    Import account
                  </PrimaryButton>
                </div>
              </div>
            ) : null}

            {exportOpen ? (
              <div className="mt-3 rounded-xl border border-app-border bg-app-surface2 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Export accounts</p>
                <p className="mt-1 text-xs text-app-muted">For security, confirm your wallet password. We do not store passwords.</p>
                <div className="mt-3 space-y-2">
                  <PasswordInput
                    value={exportPassword}
                    onChange={(v) => {
                      setExportPassword(v);
                      if (exportErr) setExportErr(null);
                    }}
                    placeholder="Wallet password"
                    error={!!exportErr}
                  />
                  <div className="min-h-[20px]">
                    <AnimatePresence>
                      {exportErr ? (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="text-sm text-app-danger"
                        >
                          {exportErr}
                        </motion.p>
                      ) : (
                        <motion.p key="empty" aria-hidden className="text-sm text-transparent">
                          .
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <PrimaryButton
                    disabled={!exportPassword}
                    onClick={async () => {
                      setExportErr(null);
                      try {
                        const env = await storageGet<VaultEnvelopeV1>('modulr.vault.v1');
                        if (!env) throw new Error('Vault not found');
                        const json = await openVaultJson(exportPassword, env);
                        const parsed = JSON.parse(json);
                        const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), accounts: parsed.accounts ?? [] }, null, 2)], {
                          type: 'application/json'
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'modulr-wallet-accounts.json';
                        a.click();
                        URL.revokeObjectURL(url);
                        setExportPassword('');
                        setExportOpen(false);
                      } catch (e: any) {
                        setExportErr(e?.message ?? 'Export failed');
                      }
                    }}
                  >
                    Download JSON
                  </PrimaryButton>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 rounded-xl border border-app-danger/25 bg-app-danger/5 px-3 py-3 transition hover:border-app-danger/35">
            <p className="text-[11px] uppercase tracking-[0.18em] text-app-danger">Danger zone</p>
            <p className="mt-1 text-xs text-app-danger/90">
              Reset will delete encrypted storage (accounts + tx history). This cannot be undone.
            </p>
            <div className="mt-3">
              <SecondaryButton
                fullWidth={false}
                className="h-11 px-5 border-app-danger/35 bg-app-danger/10 hover:border-app-danger/45 hover:bg-app-danger/15 text-app-danger"
                onClick={async () => {
                  // eslint-disable-next-line no-alert
                  const ok = confirm('Delete wallet data? This cannot be undone.');
                  if (!ok) return;
                  await wallet.reset();
                }}
              >
                <Trash2 className="h-4 w-4 text-app-danger" />
                Reset wallet
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}


