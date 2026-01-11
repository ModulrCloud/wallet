// Injected into the page context to provide window.modulr API
(function () {
  if (window.modulr) return; // Already injected

  const pendingRequests = new Map();
  let requestId = 0;

  function generateId() {
    return `modulr_${Date.now()}_${++requestId}`;
  }

  function sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      pendingRequests.set(id, { resolve, reject });

      window.postMessage(
        {
          type: 'MODULR_REQUEST',
          id,
          method,
          params
        },
        '*'
      );

      // Timeout after 5 minutes
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 5 * 60 * 1000);
    });
  }

  // Listen for responses from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== 'MODULR_RESPONSE') return;

    const { id, result, error } = event.data;
    const pending = pendingRequests.get(id);
    if (!pending) return;

    pendingRequests.delete(id);
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  });

  // Expose the Modulr API
  window.modulr = {
    // Check if wallet is installed
    isInstalled: true,

    // Request connection to wallet
    connect: async () => {
      return sendRequest('connect', { origin: window.location.origin });
    },

    // Get connected accounts (returns array of public keys)
    getAccounts: async () => {
      return sendRequest('getAccounts', { origin: window.location.origin });
    },

    // Check if site is connected
    isConnected: async () => {
      return sendRequest('isConnected', { origin: window.location.origin });
    },

    // Disconnect from wallet
    disconnect: async () => {
      return sendRequest('disconnect', { origin: window.location.origin });
    },

    // Request transaction signing and sending
    // tx: { to, amount, fee, memo? }
    sendTransaction: async (tx) => {
      return sendRequest('sendTransaction', {
        origin: window.location.origin,
        tx
      });
    },

    // Subscribe to account changes
    onAccountChanged: (callback) => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'MODULR_ACCOUNT_CHANGED') {
          callback(event.data.accounts);
        }
      });
    },

    // Subscribe to connection state changes
    onConnectionChanged: (callback) => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'MODULR_CONNECTION_CHANGED') {
          callback(event.data.connected);
        }
      });
    }
  };

  // Announce that Modulr is available
  window.dispatchEvent(new Event('modulr#initialized'));
  console.log('[Modulr] Wallet API initialized');
})();

