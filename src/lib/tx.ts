import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { stableJsonStringify } from './codec';
import { signDetachedBase64 } from './crypto/ed25519';

export type TransferTxDraft = {
  v: 1;
  type: 'transfer';
  from: string;
  to: string;
  amount: number;
  fee: number;
  nonce: number;
  payload?: Record<string, string> | null;
};

function asString(value: unknown) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

export function txPreimage(tx: Omit<TransferTxDraft, 'payload'> & { payload?: Record<string, string> | null }) {
  const payloadJson = stableJsonStringify(tx.payload ?? {});
  return [
    asString(tx.v ?? 0),
    asString(tx.from ?? ''),
    asString(tx.to ?? ''),
    asString(tx.amount ?? 0),
    asString(tx.fee ?? 0),
    asString(tx.nonce ?? 0),
    payloadJson
  ].join(':');
}

export function localTxId(preimage: string): string {
  // Modulr uses BLAKE3 for hashes (32 bytes => 64 hex chars)
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(preimage);
  const hash = blake3(inputBytes);
  return bytesToHex(hash);
}

export function buildAndSignTransferTx(params: {
  from: string;
  seedB64: string;
  to: string;
  amount: number;
  fee: number;
  nonce: number;
  payload?: Record<string, string> | null;
}) {
  const draft: TransferTxDraft = {
    v: 1,
    type: 'transfer',
    from: params.from,
    to: params.to,
    amount: params.amount,
    fee: params.fee,
    nonce: params.nonce,
    payload: params.payload ?? {}
  };

  const preimage = txPreimage(draft);
  // Modulr-core expects signature over tx hash (BLAKE3(preimage) hex), not over the preimage itself.
  const id = localTxId(preimage);
  const sig = signDetachedBase64(id, params.seedB64);
  const tx = { ...draft, sig };

  return { tx, preimage, sig, id };
}




