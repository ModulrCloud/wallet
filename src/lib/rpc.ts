export const AUTO_NODE_URL = 'auto' as const;

export const DEFAULT_RPC_URLS = [
  'http://rpc1.testnet.modulr.cloud:5332',
  'http://rpc2.testnet.modulr.cloud:5332'
] as const;

export function isAutoNodeUrl(nodeUrl: string) {
  return (nodeUrl ?? '').trim().toLowerCase() === AUTO_NODE_URL;
}

export function formatNodeUrlForDisplay(nodeUrl: string) {
  if (isAutoNodeUrl(nodeUrl)) return `Auto (${DEFAULT_RPC_URLS[0].replace(/^https?:\/\//, '')}, ${DEFAULT_RPC_URLS[1].replace(/^https?:\/\//, '')})`;
  return nodeUrl;
}

export function pickDefaultRpcOrder() {
  // 50/50 load split for the primary request, with failover to the other RPC.
  return Math.random() < 0.5 ? [DEFAULT_RPC_URLS[0], DEFAULT_RPC_URLS[1]] : [DEFAULT_RPC_URLS[1], DEFAULT_RPC_URLS[0]];
}

