import { describe, expect, it } from 'vitest';

import { generateAccountFromMnemonic, signDetachedBase64 } from '../src/lib/crypto/ed25519';

// This imports the project's reference SDK implementation (Node-friendly).
// It should generate the same pubkey/signature as our wallet code for the same inputs.
import sdkCrypto from '../../js-sdk/crypto_primitives/ed25519.js';

describe('crypto compatibility with js-sdk', () => {
  it('derives the same ed25519 pubkey for the same mnemonic+password+BIP44 path', async () => {
    const mnemonic =
      'audit lunch phrase siren salmon left drive venture egg clutch immense surround nose response involve attack slim basic pig sister collect green bounce team';
    const mnemonicPassword = 'Hello';
    const bip44Path: [number, number, number, number] = [44, 7337, 0, 0];

    const sdkKeypairJson = await sdkCrypto.generateDefaultEd25519Keypair(mnemonic, mnemonicPassword, bip44Path);
    const sdkKeypair = JSON.parse(sdkKeypairJson) as { pub: string; prv: string };

    const walletKeypair = await generateAccountFromMnemonic({
      name: 'compat',
      mnemonic,
      mnemonicPassword,
      bip44Path
    });

    expect(walletKeypair.pub).toBe(sdkKeypair.pub);
  });

  it('produces the same ed25519 signature for the same message', async () => {
    const mnemonic =
      'audit lunch phrase siren salmon left drive venture egg clutch immense surround nose response involve attack slim basic pig sister collect green bounce team';
    const mnemonicPassword = 'Hello';
    const bip44Path: [number, number, number, number] = [44, 7337, 0, 0];
    const message = 'mydata';

    const sdkKeypairJson = await sdkCrypto.generateDefaultEd25519Keypair(mnemonic, mnemonicPassword, bip44Path);
    const sdkKeypair = JSON.parse(sdkKeypairJson) as { pub: string; prv: string };

    const walletKeypair = await generateAccountFromMnemonic({
      name: 'compat',
      mnemonic,
      mnemonicPassword,
      bip44Path
    });

    const sigWallet = signDetachedBase64(message, walletKeypair.seedB64);
    const sigSdk = sdkCrypto.signEd25519(message, sdkKeypair.prv);

    expect(sigWallet).toBe(sigSdk);

    const ok = await sdkCrypto.verifyEd25519(message, sigWallet, sdkKeypair.pub);
    expect(ok).toBe(true);
  });
});




