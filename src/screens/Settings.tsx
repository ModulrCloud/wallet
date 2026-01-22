import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, KeyRound, Trash2 } from 'lucide-react';
import { PasswordInput, PrimaryButton, Screen, SecondaryButton, TextInput } from '../ui/components';
import { useWallet } from '../state/wallet';
import { storageGet } from '../lib/chromeStorage';
import { openVaultJson, type VaultEnvelopeV1 } from '../lib/vault';

export function Settings({ back }: { back: () => void }) {
  const wallet = useWallet();
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);
  const current = wallet.data?.settings.nodeUrl ?? '';
  const [nodeUrl, setNodeUrl] = useState(current);
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

  const changed = useMemo(() => nodeUrl.trim() !== current.trim(), [nodeUrl, current]);

  return (
    <Screen
      variant={isTab ? 'plain' : 'framed'}
      className={
        isTab
          ? 'w-full border border-white/10 bg-black/10 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-md'
          : ''
      }
    >
      <div className="w-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Settings</p>
            <p className="mt-1 text-sm font-semibold text-gray-100">Node & Storage</p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-brand-accent/40 hover:bg-black/40"
            onClick={back}
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Match "Latest transactions" look: one glass list with row-cards */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 transition hover:border-brand-accent/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Node URL</p>
                <p className="mt-1 text-xs text-gray-500">Used to get account data and send transactions</p>
              </div>
              <div className="flex items-center gap-2">
                <TextInput
                  value={nodeUrl}
                  onChange={(e) => setNodeUrl(e.target.value)}
                  placeholder="Enter node URL"
                  className="h-11 w-full sm:w-[360px]"
                />
                <PrimaryButton
                  fullWidth={false}
                  className="h-11 px-6"
                  loading={saving}
                  disabled={!changed || saving}
                  onClick={async () => {
                    setErr(null);
                    setSaving(true);
                    try {
                      await wallet.setNodeUrl(nodeUrl.trim());
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
            <div className="mt-2 min-h-[20px]">
              {err ? (
                <p className="text-sm text-red-200">{err}</p>
              ) : (
                <p aria-hidden className="text-sm text-transparent">
                  .
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-3 transition hover:border-brand-accent/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Accounts</p>
                <p className="mt-1 text-xs text-gray-500">Import from a seed phrase or export your key data as JSON.</p>
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
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Import account</p>
                <p className="mt-1 text-xs text-gray-500">Enter a 12/24 word seed phrase and an optional mnemonic password.</p>
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
                      <p className="text-sm text-red-200">{importErr}</p>
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
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Export accounts</p>
                <p className="mt-1 text-xs text-gray-500">For security, confirm your wallet password. We do not store passwords.</p>
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
                          className="text-sm text-red-200"
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

          <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-3 transition hover:border-red-500/30">
            <p className="text-[11px] uppercase tracking-[0.18em] text-red-200/80">Danger zone</p>
            <p className="mt-1 text-xs text-red-200/80">
              Reset will delete encrypted storage (accounts + tx history). This cannot be undone.
            </p>
            <div className="mt-3">
              <SecondaryButton
                fullWidth={false}
                className="h-11 px-5 border-red-500/30 bg-red-500/10 hover:border-red-500/40 hover:bg-red-500/15"
                onClick={async () => {
                  // eslint-disable-next-line no-alert
                  const ok = confirm('Delete wallet data? This cannot be undone.');
                  if (!ok) return;
                  await wallet.reset();
                }}
              >
                <Trash2 className="h-4 w-4 text-red-200" />
                Reset wallet
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}


