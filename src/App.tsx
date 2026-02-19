import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { WalletProvider, useWallet, type WalletTxRecord } from './state/wallet';
import { Onboarding } from './screens/Onboarding';
import { Unlock } from './screens/Unlock';
import { Home, type HomeNav } from './screens/Home';
import { Settings } from './screens/Settings';
import { TabDashboard } from './screens/TabDashboard';
import { TxDetails } from './screens/TxDetails';
import { ToastProvider } from './ui/toast';
import { Transfer } from './screens/Transfer';
import { ThemeProvider } from './ui/theme';
import { Transactions } from './screens/Transactions';

type Route = HomeNav | 'tx_details';

function AppInner() {
  const wallet = useWallet();
  const [nav, setNav] = useState<Route>('home');
  const [selectedTx, setSelectedTx] = useState<WalletTxRecord | null>(null);
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);

  const screen = useMemo(() => {
    if (wallet.status === 'loading') return 'loading';
    if (wallet.status === 'needs_onboarding') return 'onboarding';
    if (wallet.status === 'locked') return 'unlock';
    return nav;
  }, [wallet.status, nav]);

  const isAuthLike = isTab && (screen === 'loading' || screen === 'onboarding' || screen === 'unlock');

  return (
    <div className={isTab ? 'min-h-screen w-full px-10 pb-10 pt-16' : 'min-h-[640px] w-[420px] p-3'}>
      <div className={isTab ? (isAuthLike ? 'mx-auto w-full max-w-md' : 'w-full') : 'w-full'}>
      <AnimatePresence mode="wait">
        {screen === 'loading' ? (
          <div key="loading" className="glow-card gradient-border rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-app-muted">Loading</p>
            <p className="mt-2 text-sm text-app-text">Preparing wallet…</p>
          </div>
        ) : null}

        {screen === 'onboarding' ? <Onboarding key="onboarding" /> : null}
        {screen === 'unlock' ? <Unlock key="unlock" /> : null}

        {screen === 'home' ? (
          isTab ? (
            <TabDashboard
              key="tab-home"
              navigate={(to) => {
                setNav(to);
              }}
              onTxClick={(tx) => {
                setSelectedTx(tx);
                setNav('tx_details');
              }}
            />
          ) : (
            <Home
              key="home"
              navigate={(to) => {
                setNav(to);
              }}
              onTxClick={(tx) => {
                setSelectedTx(tx);
                setNav('tx_details');
              }}
            />
          )
        ) : null}

        {screen === 'tx_details' && selectedTx ? (
          <TxDetails
            key="tx_details"
            tx={selectedTx}
            back={() => {
              setSelectedTx(null);
              setNav('home');
            }}
          />
        ) : null}

        {screen === 'settings' ? (
          <Settings
            key="settings"
            back={() => {
              setNav('home');
            }}
          />
        ) : null}

        {screen === 'transactions' ? (
          <Transactions
            key="transactions"
            back={() => setNav('home')}
            onTxClick={(tx) => {
              setSelectedTx(tx);
              setNav('tx_details');
            }}
          />
        ) : null}

        {screen === 'send' ? (
          <Transfer
            key="send"
            back={() => setNav('home')}
            done={() => {
              setNav('home');
            }}
          />
        ) : null}
      </AnimatePresence>
      </div>
      </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WalletProvider>
          <AppInner />
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
