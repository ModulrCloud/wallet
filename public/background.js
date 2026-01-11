// Background service worker for Modulr Wallet
const CONNECTED_SITES_KEY = 'modulr.connectedSites.v1';
const PENDING_REQUESTS_KEY = 'modulr.pendingRequests.v1';

// Get connected sites from storage
async function getConnectedSites() {
  const result = await chrome.storage.local.get(CONNECTED_SITES_KEY);
  return result[CONNECTED_SITES_KEY] || {};
}

// Save connected sites to storage
async function saveConnectedSites(sites) {
  await chrome.storage.local.set({ [CONNECTED_SITES_KEY]: sites });
}

// Get pending requests
async function getPendingRequests() {
  const result = await chrome.storage.session.get(PENDING_REQUESTS_KEY);
  return result[PENDING_REQUESTS_KEY] || {};
}

// Save pending requests
async function savePendingRequests(requests) {
  await chrome.storage.session.set({ [PENDING_REQUESTS_KEY]: requests });
}

// Add a pending request
async function addPendingRequest(id, request) {
  const pending = await getPendingRequests();
  pending[id] = request;
  await savePendingRequests(pending);
}

// Remove and get a pending request
async function popPendingRequest(id) {
  const pending = await getPendingRequests();
  const request = pending[id];
  delete pending[id];
  await savePendingRequests(pending);
  return request;
}

// Open popup for user confirmation
async function openPopupForApproval(type, data) {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  await addPendingRequest(id, { type, data, createdAt: Date.now() });

  // Get popup URL
  const popupUrl = chrome.runtime.getURL(`index.html?mode=popup&approval=${type}&requestId=${id}`);

  // Create popup window
  const popup = await chrome.windows.create({
    url: popupUrl,
    type: 'popup',
    width: 420,
    height: 600,
    focused: true
  });

  return { id, popup };
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'MODULR_REQUEST') return false;

  const { method, params } = message;

  (async () => {
    try {
      let result;

      switch (method) {
        case 'isConnected': {
          const sites = await getConnectedSites();
          result = !!sites[params.origin];
          break;
        }

        case 'getAccounts': {
          const sites = await getConnectedSites();
          const site = sites[params.origin];
          if (!site) {
            result = [];
          } else {
            result = site.accounts || [];
          }
          break;
        }

        case 'connect': {
          const sites = await getConnectedSites();
          if (sites[params.origin]) {
            // Already connected
            result = { connected: true, accounts: sites[params.origin].accounts || [] };
          } else {
            // Need user approval
            const { id } = await openPopupForApproval('connect', {
              origin: params.origin,
              favicon: sender.tab?.favIconUrl,
              title: sender.tab?.title
            });

            // Wait for user response (will be resolved by popup)
            result = await waitForRequestResolution(id);
          }
          break;
        }

        case 'disconnect': {
          const sites = await getConnectedSites();
          delete sites[params.origin];
          await saveConnectedSites(sites);
          result = { disconnected: true };
          break;
        }

        case 'sendTransaction': {
          const sites = await getConnectedSites();
          if (!sites[params.origin]) {
            throw new Error('Site not connected. Call connect() first.');
          }

          // Need user approval for transaction
          const { id } = await openPopupForApproval('sendTransaction', {
            origin: params.origin,
            favicon: sender.tab?.favIconUrl,
            title: sender.tab?.title,
            tx: params.tx
          });

          // Wait for user response
          result = await waitForRequestResolution(id);
          break;
        }

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      sendResponse({ result });
    } catch (err) {
      sendResponse({ error: err.message || 'Unknown error' });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Wait for a pending request to be resolved by the popup
function waitForRequestResolution(requestId) {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      const pending = await getPendingRequests();
      const request = pending[requestId];

      if (!request) {
        // Request was removed (resolved or rejected)
        clearInterval(checkInterval);
        
        // Check for result in session storage
        const resultKey = `modulr.result.${requestId}`;
        const resultData = await chrome.storage.session.get(resultKey);
        const result = resultData[resultKey];
        
        if (result) {
          await chrome.storage.session.remove(resultKey);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.data);
          }
        } else {
          reject(new Error('Request was cancelled'));
        }
      }

      // Timeout after 5 minutes
      if (request && Date.now() - request.createdAt > 5 * 60 * 1000) {
        clearInterval(checkInterval);
        await popPendingRequest(requestId);
        reject(new Error('Request timeout'));
      }
    }, 500);
  });
}

// Handle messages from popup (approval/rejection)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MODULR_APPROVAL_RESULT') {
    (async () => {
      const { requestId, approved, data, error } = message;
      
      // Remove from pending
      await popPendingRequest(requestId);

      // Store result
      const resultKey = `modulr.result.${requestId}`;
      await chrome.storage.session.set({
        [resultKey]: approved ? { data } : { error: error || 'User rejected' }
      });

      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'MODULR_GET_PENDING_REQUEST') {
    (async () => {
      const pending = await getPendingRequests();
      const request = pending[message.requestId];
      sendResponse({ request });
    })();
    return true;
  }

  if (message.type === 'MODULR_SAVE_CONNECTED_SITE') {
    (async () => {
      const sites = await getConnectedSites();
      sites[message.origin] = {
        connectedAt: Date.now(),
        accounts: message.accounts
      };
      await saveConnectedSites(sites);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'MODULR_GET_CONNECTED_SITES') {
    (async () => {
      const sites = await getConnectedSites();
      sendResponse({ sites });
    })();
    return true;
  }

  if (message.type === 'MODULR_DISCONNECT_SITE') {
    (async () => {
      const sites = await getConnectedSites();
      delete sites[message.origin];
      await saveConnectedSites(sites);
      sendResponse({ ok: true });
    })();
    return true;
  }
});

console.log('[Modulr] Background service worker started');

