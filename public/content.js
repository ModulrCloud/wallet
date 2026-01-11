// Content script - bridges page and extension background
(function () {
  // Inject inpage.js into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inpage.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the page (inpage.js)
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== 'MODULR_REQUEST') return;

    const { id, method, params } = event.data;

    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        type: 'MODULR_REQUEST',
        id,
        method,
        params
      });

      // Send response back to page
      window.postMessage(
        {
          type: 'MODULR_RESPONSE',
          id,
          result: response?.result,
          error: response?.error
        },
        '*'
      );
    } catch (err) {
      window.postMessage(
        {
          type: 'MODULR_RESPONSE',
          id,
          error: err?.message || 'Unknown error'
        },
        '*'
      );
    }
  });

  // Listen for events from background (e.g., account changed)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'MODULR_ACCOUNT_CHANGED') {
      window.postMessage(
        {
          type: 'MODULR_ACCOUNT_CHANGED',
          accounts: message.accounts
        },
        '*'
      );
    }
    if (message.type === 'MODULR_CONNECTION_CHANGED') {
      window.postMessage(
        {
          type: 'MODULR_CONNECTION_CHANGED',
          connected: message.connected
        },
        '*'
      );
    }
  });
})();

