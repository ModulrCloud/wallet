# Modulr Wallet (Browser Extension)

Modulr Wallet is a secure Chrome/Chromium browser extension (Manifest V3) for the Modulr blockchain. Built with React + Vite + TypeScript.

## Features

- 🔐 **Encrypted local vault** — Password-protected storage using AES-GCM
- 👛 **Multiple accounts** — Create and manage multiple wallet addresses
- 📥 **Import/Export** — Import from seed phrase, export accounts as JSON
- 💸 **Send transactions** — Transfer funds with custom fees and memos
- 🖥️ **Full-screen mode** — Dashboard view in a new browser tab
- 🔒 **Session unlock** — Stay unlocked for 15 minutes after login

## Security

- Private keys are encrypted with your password and never leave your device
- Uses industry-standard cryptography: ed25519, BIP39/BIP32, BLAKE3
- No analytics, no tracking, no external data collection
- Open source — audit the code yourself

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome and go to `chrome://extensions`
5. Enable **Developer mode** (toggle in top right)
6. Click **Load unpacked**
7. Select the `dist/` folder

## Configuration

1. Open the wallet popup
2. Go to **Settings**
3. Set your **Node URL** (required for account data and transactions)

## Amounts and fees

- Wallet UI accepts decimal coin values (up to 9 digits after the dot).
- Before submission, values are converted to native integer units.
- Native scale is fixed: `1 coin = 1_000_000_000 units`.
- Example:
  - `2` coins -> `2000000000` units
  - `1.67` coins -> `1670000000` units

## Development

```bash
# Install dependencies
npm install

# Run dev server (for testing in browser)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Cryptography

This wallet uses the same cryptographic primitives as the Modulr blockchain:

- **Key derivation**: BIP39 mnemonic → BIP32 HD path `m/44'/7337'/0'/0'`
- **Signing**: ed25519 (via tweetnacl)
- **Hashing**: BLAKE3 for transaction IDs
- **Encryption**: AES-256-GCM with PBKDF2 key derivation

## Privacy

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for details.

**TL;DR**: All data stays on your device. We don't collect anything.

## License

MIT
