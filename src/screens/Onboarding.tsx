import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { OpenInTabButton, PasswordInput, PrimaryButton, Screen } from '../ui/components';
import { useWallet } from '../state/wallet';

export function Onboarding() {
  const wallet = useWallet();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => password.length >= 6 && password === password2, [password, password2]);
  const mismatch = useMemo(() => password.length > 0 && password2.length > 0 && password !== password2, [password, password2]);
  const helperText = useMemo(() => {
    if (mismatch) return 'Passwords do not match';
    if (err) return err;
    return '';
  }, [err, mismatch]);

  return (
    <Screen>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setErr(null);
          setLoading(true);
          try {
            await wallet.createVault(password);
          } catch (e: any) {
            setErr(e?.message ?? 'Failed to create vault');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="flex items-center justify-end">
          <OpenInTabButton />
        </div>

        <div className="mt-3 flex flex-col items-center text-center">
          <img
            src="/brand/modulr.svg"
            alt="Modulr"
            className="h-20 w-20 rounded-3xl border border-app-border bg-app-surface p-3 shadow-[0_18px_38px_rgba(0,0,0,0.35)]"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-app-text">Create Wallet</h1>
          <p className="mt-2 text-sm text-app-muted">Choose a password to protect your encrypted storage</p>
        </div>

        <div className="mt-6 space-y-3">
          <PasswordInput
            name="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (err) setErr(null);
            }}
            autoFocus
          />
          <PasswordInput
            name="password2"
            placeholder="Repeat password"
            value={password2}
            onChange={(v) => {
              setPassword2(v);
              if (err) setErr(null);
            }}
            error={mismatch}
          />
          {/* Fixed-height slot so the button never "jumps" when error appears/disappears */}
          <div className="relative h-5">
            <AnimatePresence>
              {helperText ? (
                <motion.p
                  key="helper"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute inset-0 text-sm leading-5 text-app-danger"
                >
                  {helperText}
                </motion.p>
              ) : (
                <motion.p key="empty" aria-hidden className="absolute inset-0 text-sm leading-5 text-transparent">
                  .
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-5">
          <PrimaryButton type="submit" loading={loading} disabled={!canSubmit || loading} className="py-4 text-base">
            Create wallet
          </PrimaryButton>
        </div>

        <p className="mt-5 text-center text-xs text-app-muted">
          Keep your password and recovery phrase in a safe place. We don’t have access to them and can’t help with recovery.
        </p>
      </form>
    </Screen>
  );
}


