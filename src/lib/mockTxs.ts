import bs58 from 'bs58';
import type { WalletTxRecord } from '../state/wallet';

function seedFromString(s: string): number {
  let x = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  return x >>> 0;
}

function xorshift32(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function randU8(rand: () => number, len: number): Uint8Array {
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.floor(rand() * 256) & 0xff;
  return out;
}

function toHex(u8: Uint8Array) {
  let hex = '';
  for (let i = 0; i < u8.length; i++) hex += u8[i].toString(16).padStart(2, '0');
  return hex;
}

export function generateMockTxs(params: { fromPub: string; nodeUrl: string }): WalletTxRecord[] {
  const rand = xorshift32(seedFromString(params.fromPub));
  const now = Date.now();

  const out: WalletTxRecord[] = [];
  for (let i = 0; i < 18; i++) {
    const toPub = bs58.encode(randU8(rand, 32));
    const id = toHex(randU8(rand, 32));
    const fee = i % 3 === 0 ? 1000 : i % 3 === 1 ? 2500 : 5000;
    const amount = Math.floor((rand() * 9 + 1) * 1_000_000);
    const nonce = 100 + i;
    const status: WalletTxRecord['status'] = i % 7 === 0 ? 'failed' : i % 4 === 0 ? 'created' : 'submitted';

    out.push({
      id,
      time: now - i * 12 * 60 * 1000,
      status,
      nodeUrl: params.nodeUrl,
      from: params.fromPub,
      to: toPub,
      amount,
      fee,
      nonce,
      error: status === 'failed' ? 'Insufficient funds' : undefined
    });
  }
  return out;
}



