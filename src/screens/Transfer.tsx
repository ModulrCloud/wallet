import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Send as SendIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import bs58 from 'bs58';

import { useWallet, type WalletTxRecord } from '../state/wallet';
import { fetchAccount, submitTransaction, type AccountState } from '../lib/nodeApi';
import { buildAndSignTransferTx } from '../lib/tx';
import { PrimaryButton, Screen, SecondaryButton, TextInput } from '../ui/components';
import { useToast } from '../ui/toast';
import { Drawer } from '../ui/overlays';
import { PageHeader } from '../ui/header';

type Step = 'form' | 'confirm';

function shorten(value: string, left = 8, right = 8) {
  if (!value) return '—';
  if (value.length <= left + right + 1) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function calcAutoFee(memo: string) {
  // Base fee = 1. Surcharge: +1 for every 10 symbols in memo (payload).
  const n = memo.length;
  return 1 + Math.floor(n / 10);
}

export function Transfer({ back, done }: { back: () => void; done: () => void }) {
  const wallet = useWallet();
  const toast = useToast();
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);

  const accounts = wallet.data?.accounts ?? [];
  const selected = wallet.selectedAccount;
  const nodeUrl = wallet.data?.settings.nodeUrl ?? '';

  const [step, setStep] = useState<Step>('form');

  const [fromId, setFromId] = useState<string>(selected?.id ?? '');
  const [acctOpen, setAcctOpen] = useState(false);
  const [acctDrawerOpen, setAcctDrawerOpen] = useState(false);
  const acctRef = useRef<HTMLDivElement | null>(null);

  const [to, setTo] = useState('');
  const [amountRaw, setAmountRaw] = useState('0');
  const [memo, setMemo] = useState('');

  const [feeMode, setFeeMode] = useState<'auto' | 'manual'>('auto');
  const [manualFeeRaw, setManualFeeRaw] = useState('1');

  const fromAccount = useMemo(() => accounts.find((a) => a.id === fromId) ?? null, [accounts, fromId]);
  const amount = useMemo(() => Number(amountRaw), [amountRaw]);
  const autoFee = useMemo(() => calcAutoFee(memo), [memo]);
  const fee = useMemo(() => (feeMode === 'auto' ? autoFee : Number(manualFeeRaw)), [feeMode, autoFee, manualFeeRaw]);

  const toIsValid = useMemo(() => {
    const v = to.trim();
    if (!v) return false;
    try {
      const decoded = bs58.decode(v);
      return decoded.length === 32;
    } catch {
      return false;
    }
  }, [to]);

  const valid = useMemo(() => {
    if (!fromId) return false;
    if (!toIsValid) return false;
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (!Number.isFinite(fee) || fee < 0) return false;
    return true;
  }, [fromId, toIsValid, amount, fee]);

  const [fromState, setFromState] = useState<AccountState | null>(null);
  const [fromStateLoading, setFromStateLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fromAccount || !nodeUrl) {
        setFromState(null);
        return;
      }
      setFromStateLoading(true);
      try {
        const state = await fetchAccount(nodeUrl, fromAccount.pub);
        if (!cancelled) setFromState(state);
      } catch {
        if (!cancelled) setFromState(null);
      } finally {
        if (!cancelled) setFromStateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromAccount?.pub, nodeUrl]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!acctRef.current) return;
      if (e.target instanceof Node && !acctRef.current.contains(e.target)) setAcctOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const summary = useMemo(() => {
    return {
      fromPub: fromAccount?.pub ?? '',
      to: to.trim(),
      amount,
      fee,
      memo
    };
  }, [fromAccount?.pub, to, amount, fee, memo]);

  const feeBase = 1;
  const payloadSurcharge = useMemo(() => Math.floor(memo.length / 10), [memo]);

  const totalCost = useMemo(() => {
    const a = Number.isFinite(summary.amount) ? summary.amount : 0;
    const f = Number.isFinite(summary.fee) ? summary.fee : 0;
    return a + f;
  }, [summary.amount, summary.fee]);

  const hasFunds = useMemo(() => {
    if (!fromState) return true; // unknown -> don't block UX
    return fromState.balance >= totalCost;
  }, [fromState, totalCost]);

  const warnings = useMemo(() => {
    const items: Array<{ kind: 'warning' | 'info'; title: string; body: string }> = [];
    if (!nodeUrl) {
      items.push({
        kind: 'warning',
        title: 'Node not configured',
        body: 'Set a node URL in Settings to fetch account state and submit transactions.'
      });
    }
    if (summary.fromPub && summary.to && summary.fromPub === summary.to) {
      items.push({
        kind: 'warning',
        title: 'Sending to yourself',
        body: 'Recipient address equals the sender address. Double-check if this is intended.'
      });
    }
    if (feeMode === 'auto' && payloadSurcharge > 0) {
      items.push({
        kind: 'info',
        title: 'Memo increases fee',
        body: `Payload fee: +${payloadSurcharge} (memo length ${memo.length}).`
      });
    }
    if (feeMode === 'manual') {
      if (Number.isFinite(fee) && fee < autoFee) {
        items.push({
          kind: 'warning',
          title: 'Manual fee below recommended',
          body: `Recommended auto fee is ${autoFee}. Low fee may cause the transaction to be rejected.`
        });
      } else {
        items.push({
          kind: 'info',
          title: 'Manual fee',
          body: 'You are overriding the automatic fee.'
        });
      }
    }
    if (!hasFunds && fromState) {
      items.push({
        kind: 'warning',
        title: 'Insufficient balance',
        body: `Need at least ${totalCost} for amount + fee. Available: ${fromState.balance}.`
      });
    }
    return items;
  }, [nodeUrl, summary.fromPub, summary.to, feeMode, payloadSurcharge, memo.length, fee, autoFee, hasFunds, fromState, totalCost]);

  const canProceed = valid && !!nodeUrl && hasFunds;

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!fromAccount) return;
    if (!nodeUrl) {
      toast.error('No node URL configured');
      return;
    }
    if (!hasFunds) {
      toast.error('Insufficient balance for amount + fee', { title: 'Not enough funds' });
      return;
    }
    setSubmitting(true);
    try {
      const state = await fetchAccount(nodeUrl, fromAccount.pub);
      setFromState(state);

      if (!Number.isFinite(totalCost)) {
        toast.error('Invalid amount or fee', { title: 'Transfer failed' });
        return;
      }
      if (state.balance < totalCost) {
        toast.error(`Need at least ${totalCost}. Available: ${state.balance}.`, { title: 'Insufficient balance' });
        return;
      }

      const nonce = state.nonce + 1;

      const payload = memo ? { memo } : {};
      const built = await buildAndSignTransferTx({
        from: fromAccount.pub,
        seedB64: fromAccount.seedB64,
        to: summary.to,
        amount: summary.amount,
        fee: summary.fee,
        nonce,
        payload
      });

      const rec: WalletTxRecord = {
        id: built.id,
        time: Date.now(),
        status: 'created',
        nodeUrl,
        from: fromAccount.pub,
        to: summary.to,
        amount: summary.amount,
        fee: summary.fee,
        nonce,
        sig: built.sig
      };
      await wallet.addTx(rec);

      await submitTransaction(nodeUrl, built.tx);
      await wallet.updateTx(built.id, { status: 'submitted' });

      toast.success('Transaction submitted', { title: 'Success' });
      await wallet.refreshSelectedAccount();
      done();
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to submit transaction';
      toast.error(msg, { title: 'Transfer failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const StepPill = ({ idx, label, active }: { idx: number; label: string; active: boolean }) => (
    <div
      className={[
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
        active ? 'border-app-accent/30 bg-app-accent/10 text-app-text' : 'border-app-border bg-app-surface2 text-app-muted'
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
          active ? 'bg-brand-accent text-app-text' : 'bg-app-border text-app-muted'
        ].join(' ')}
      >
        {idx}
      </span>
      {label}
    </div>
  );

  const SummaryCard = () => (
    <div className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Summary</p>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">From</p>
          <p className="mt-1 truncate font-mono text-sm text-app-text" title={summary.fromPub}>
            {summary.fromPub ? shorten(summary.fromPub, 12, 10) : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">To</p>
          <p className="mt-1 truncate font-mono text-sm text-app-text" title={summary.to}>
            {summary.to ? shorten(summary.to, 12, 10) : '—'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Amount</p>
            <p className="mt-1 font-mono text-sm font-semibold text-app-text">{Number.isFinite(summary.amount) ? summary.amount : '—'}</p>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Fee</p>
            <p className="mt-1 font-mono text-sm font-semibold text-app-text">{Number.isFinite(summary.fee) ? summary.fee : '—'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Total</p>
          <p className="mt-1 font-mono text-sm font-semibold text-app-text">{Number.isFinite(totalCost) ? totalCost : '—'}</p>
          <p className="mt-2 text-[11px] text-app-muted">
            {feeMode === 'auto' ? `Fee breakdown: ${feeBase} base + ${payloadSurcharge} payload` : 'Fee mode: manual'}
          </p>
        </div>
        {!hasFunds ? (
          <div className="rounded-2xl border border-app-danger/20 bg-app-danger/5 px-4 py-3">
            <p className="text-sm font-semibold text-app-danger">Insufficient balance</p>
            <p className="mt-1 text-[11px] text-app-danger/80">You need at least {totalCost} for amount + fee.</p>
          </div>
        ) : null}
        {summary.memo ? (
          <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Memo</p>
            <p className="mt-1 text-sm text-app-text">{summary.memo}</p>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Warnings</p>
            <div className="mt-2 space-y-2">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={[
                    'rounded-xl border px-3 py-2',
                    w.kind === 'warning' ? 'border-app-warning/30 bg-app-warning/10' : 'border-app-accent/20 bg-app-accent/5'
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-app-text">{w.title}</p>
                  <p className="mt-0.5 text-[11px] text-app-muted">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <Screen
      variant={isTab ? 'plain' : 'framed'}
      className={[
        'flex min-h-[520px] flex-col',
        isTab ? 'w-full border border-app-border bg-app-surface/70 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.30)] backdrop-blur-md' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PageHeader
        eyebrow="Transfer"
        title="Send funds"
        onBack={() => {
          if (step === 'confirm') setStep('form');
          else back();
        }}
        right={null}
      />
      <div className="mt-3 flex items-center gap-2">
        <StepPill idx={1} label="Details" active={step === 'form'} />
        <StepPill idx={2} label="Confirm" active={step === 'confirm'} />
      </div>

      <div className="mt-5 flex-1">
        <div className={isTab ? 'grid gap-6 lg:grid-cols-[1fr_380px]' : 'space-y-4'}>
          {/* Left */}
          <div className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                      <p className="text-sm font-semibold text-app-text">From</p>
                      <div className="relative mt-2" ref={acctRef}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-left text-sm text-app-text transition hover:border-app-accent/30"
                          onClick={() => {
                            if (isTab) setAcctOpen((v) => !v);
                            else setAcctDrawerOpen(true);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-app-text">
                              {fromAccount ? `${fromAccount.name} · ${fromAccount.pub.slice(0, 8)}…` : 'Select account'}
                            </p>
                            <p className="mt-1 truncate font-mono text-[11px] text-app-muted">{fromAccount?.pub ?? ''}</p>
                          </div>
                          <ChevronDown className={['h-5 w-5 text-app-muted transition', acctOpen ? 'rotate-180' : ''].join(' ')} />
                        </button>

                        <AnimatePresence>
                          {acctOpen && isTab ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.99 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.99 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-app-surface shadow-[0_30px_90px_rgba(0,0,0,0.40)] ring-1 ring-app-border"
                            >
                              <div className="max-h-56 overflow-auto p-1">
                                {accounts.map((a) => {
                                  const active = a.id === fromId;
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      className={[
                                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition',
                                        active ? 'bg-app-accent/10 text-app-text' : 'hover:bg-app-surface2 text-app-text'
                                      ].join(' ')}
                                      onClick={() => {
                                        setAcctOpen(false);
                                        setFromId(a.id);
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
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                      <p className="text-sm font-semibold text-app-text">To</p>
                      <TextInput
                        className={[
                          'mt-2',
                          to.length > 0 && !toIsValid ? 'border-red-500/30 focus:border-red-500/50 focus:ring-red-500/10' : ''
                        ].join(' ')}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="Recipient address (base58)"
                      />
                      {to.length > 0 && !toIsValid ? (
                        <p className="mt-2 text-[11px] text-app-danger/80">Invalid address. Expected a base58 public key (32 bytes).</p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                      <p className="text-sm font-semibold text-app-text">Balance</p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="text-xs text-app-muted">Available for amount + fee</p>
                        <p className="font-mono text-2xl font-semibold tracking-tight text-app-text">
                          {fromStateLoading ? '…' : fromState ? fromState.balance : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                        <p className="text-sm font-semibold text-app-text">Amount</p>
                        <TextInput className="mt-2" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} placeholder="50000000" />
                        <p className="mt-3 text-[11px] text-app-muted">Use smallest unit (integer).</p>
                      </div>
                      <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-app-text">Fee</p>
                          <button
                            type="button"
                            className="rounded-lg border border-app-border bg-app-surface px-2 py-1 text-[11px] font-semibold text-app-text transition hover:border-app-accent/35"
                            onClick={() => setFeeMode((m) => (m === 'auto' ? 'manual' : 'auto'))}
                            title={feeMode === 'auto' ? 'Switch to manual fee' : 'Switch back to auto fee'}
                          >
                            {feeMode === 'auto' ? 'Auto' : 'Manual'}
                          </button>
                        </div>
                        <TextInput
                          className="mt-2"
                          value={feeMode === 'auto' ? String(autoFee) : manualFeeRaw}
                          onChange={(e) => setManualFeeRaw(e.target.value)}
                          placeholder="1"
                          disabled={feeMode === 'auto'}
                        />
                        <p className="mt-3 text-[11px] text-app-muted">Default fee is 1. Auto mode adds +1 per each 10 symbols in memo (payload).</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-5 py-5">
                      <p className="text-sm font-semibold text-app-text">Memo (optional)</p>
                      <TextInput className="mt-2" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Invoice #582" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <p className="text-sm font-semibold text-app-text">Review & confirm</p>
                  <p className="mt-1 text-sm text-app-muted">Make sure the recipient and amount are correct.</p>

                  <div className="mt-4 rounded-2xl border border-app-border bg-app-surface2 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Recipient</p>
                    <p className="mt-1 break-all font-mono text-sm text-app-text">{summary.to}</p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Amount</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-app-text">{summary.amount}</p>
                    </div>
                    <div className="rounded-2xl border border-app-border bg-app-surface2 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Fee</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-app-text">{summary.fee}</p>
                    </div>
                  </div>

                  {summary.memo ? (
                    <div className="mt-3 rounded-2xl border border-app-border bg-app-surface2 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-app-muted">Memo</p>
                      <p className="mt-1 text-sm text-app-text">{summary.memo}</p>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right / Below */}
          <div className={isTab ? '' : ''}>
            <SummaryCard />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <SecondaryButton
                onClick={() => {
                  if (step === 'confirm') setStep('form');
                  else back();
                }}
                disabled={submitting}
              >
                {step === 'confirm' ? 'Edit' : 'Cancel'}
              </SecondaryButton>
              {step === 'form' ? (
                <PrimaryButton
                  className="group"
                  disabled={!canProceed}
                  onClick={() => {
                    if (!valid) {
                      toast.info('Fill in all fields to continue');
                      return;
                    }
                    if (!nodeUrl) {
                      toast.error('No node URL configured', { title: 'Set node URL in Settings' });
                      return;
                    }
                    if (!hasFunds) {
                      toast.error('Insufficient balance for amount + fee', { title: 'Not enough funds' });
                      return;
                    }
                    setStep('confirm');
                  }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  className="group"
                  disabled={submitting || !canProceed}
                  loading={submitting}
                  onClick={submit}
                >
                  <SendIcon className="h-4 w-4" />
                  Confirm & send
                </PrimaryButton>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] text-app-muted">
              Fee auto-calculates from payload size. Signature is generated locally.
            </p>
          </div>
        </div>
      </div>

      <Drawer open={acctDrawerOpen} onClose={() => setAcctDrawerOpen(false)} title="Select account">
        <div className="space-y-2">
          {accounts.map((a) => {
            const active = a.id === fromId;
            return (
              <button
                key={a.id}
                type="button"
                className={[
                  'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
                  active ? 'border-app-accent/25 bg-app-accent/10 text-app-text' : 'border-app-border bg-app-surface2 text-app-text hover:border-app-accent/20'
                ].join(' ')}
                onClick={() => {
                  setFromId(a.id);
                  setAcctDrawerOpen(false);
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
    </Screen>
  );
}

