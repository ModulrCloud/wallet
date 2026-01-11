import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { WalletProvider, useWallet, type WalletTxRecord } from './state/wallet';
import { Onboarding } from './screens/Onboarding';
import { Unlock } from './screens/Unlock';
import { Home, type HomeNav } from './screens/Home';
import { Settings } from './screens/Settings';
import { Send, type SendDraft } from './screens/Send';
import { Confirm } from './screens/Confirm';
import { TabDashboard } from './screens/TabDashboard';
import { TxDetails } from './screens/TxDetails';
import { ApproveConnect } from './screens/ApproveConnect';
import { ApproveTx } from './screens/ApproveTx';

type Route = HomeNav | 'confirm' | 'tx_details';

function AppInner() {
  const wallet = useWallet();
  const [nav, setNav] = useState<Route>('home');
  const [draft, setDraft] = useState<SendDraft | null>(null);
  const [selectedTx, setSelectedTx] = useState<WalletTxRecord | null>(null);
  const isTab = useMemo(() => document.documentElement.dataset.mode === 'tab', []);

  // Check for approval mode
  const approvalParams = useMemo(() => {
    const url = new URL(window.location.href);
    const approval = url.searchParams.get('approval');
    const requestId = url.searchParams.get('requestId');
    if (approval && requestId) {
      return { type: approval, requestId };
    }
    return null;
  }, []);

  const screen = useMemo(() => {
    if (wallet.status === 'loading') return 'loading';
    if (wallet.status === 'needs_onboarding') return 'onboarding';
    if (wallet.status === 'locked') return 'unlock';
    return nav;
  }, [wallet.status, nav]);

  const isAuthLike = isTab && (screen === 'loading' || screen === 'onboarding' || screen === 'unlock');

  // If in approval mode and wallet is unlocked, show approval screen
  if (approvalParams && wallet.status === 'unlocked') {
    const handleDone = () => {
      window.close();
    };

    return (
      <div className="min-h-[520px] min-w-[420px]">
        {approvalParams.type === 'connect' ? (
          <ApproveConnect requestId={approvalParams.requestId} onDone={handleDone} />
        ) : approvalParams.type === 'sendTransaction' ? (
          <ApproveTx requestId={approvalParams.requestId} onDone={handleDone} />
        ) : (
          <div className="flex min-h-[400px] items-center justify-center p-4">
            <p className="text-sm text-gray-400">Unknown approval type</p>
          </div>
        )}
      </div>
    );
  }

  // If in approval mode but wallet needs unlock, show unlock screen
  if (approvalParams && wallet.status === 'locked') {
    return (
      <div className="min-h-[520px] min-w-[420px] p-4">
        <Unlock />
      </div>
    );
  }

  return (
    <div className={isTab ? 'min-h-screen w-full px-10 pb-10 pt-16' : 'min-h-[520px] min-w-[420px] p-4'}>
      <div className={isTab ? (isAuthLike ? 'mx-auto w-full max-w-md' : 'w-full') : ''}>
      <AnimatePresence mode="wait">
        {screen === 'loading' ? (
          <div key="loading" className="glow-card gradient-border rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Loading</p>
            <p className="mt-2 text-sm text-gray-200">Preparing wallet…</p>
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

        {screen === 'send' ? (
          <Send
            key="send"
            back={() => setNav('home')}
            next={(d) => {
              setDraft(d);
              setNav('confirm');
            }}
          />
        ) : null}

        {screen === 'confirm' ? (
          draft ? (
            <Confirm
              key="confirm"
              draft={draft}
              back={() => setNav('send')}
              done={() => {
                setDraft(null);
                setNav('home');
              }}
            />
          ) : (
            <Send
              key="send-fallback"
              back={() => setNav('home')}
              next={(d) => {
                setDraft(d);
                setNav('confirm');
              }}
            />
          )
        ) : null}
      </AnimatePresence>
      </div>
      </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  );
}
