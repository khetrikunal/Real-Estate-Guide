import { Capacitor } from '@capacitor/core';

const REMOTE_API_BASE_URL = 'https://realestate-guide.in/api';
const REMOTE_WS_URL = 'wss://realestate-guide.in/ws';

function browserHost() {
  return typeof window === 'undefined' ? '' : window.location.hostname;
}

function browserProtocol() {
  return typeof window === 'undefined' ? 'http:' : window.location.protocol;
}

function sameOriginApiBaseUrl() {
  if (Capacitor.isNativePlatform()) return REMOTE_API_BASE_URL;
  return '/api';
}

function sameOriginWsUrl() {
  if (Capacitor.isNativePlatform()) return REMOTE_WS_URL;
  const protocol = browserProtocol() === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window === 'undefined' ? browserHost() : window.location.host;
  return `${protocol}//${host}/ws`;
}

function isLocalPlaintext(url: string) {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'ws:') &&
      ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function assertEncryptedProductionUrl(url: string, label: string) {
  if (!import.meta.env.PROD) return;
  if (!Capacitor.isNativePlatform() && label === 'VITE_WS_URL' && url === sameOriginWsUrl()) return;
  if (url.startsWith('/') || /^https:\/\//i.test(url) || /^wss:\/\//i.test(url) || isLocalPlaintext(url)) return;
  throw new Error(`${label} must use https/wss in production builds.`);
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? sameOriginApiBaseUrl();
const wsUrl = import.meta.env.VITE_WS_URL?.replace(/\/$/, '') ?? sameOriginWsUrl();

assertEncryptedProductionUrl(apiBaseUrl, 'VITE_API_BASE_URL');
assertEncryptedProductionUrl(wsUrl, 'VITE_WS_URL');

export const env = {
  apiBaseUrl,
  wsUrl,
  enableDevFallbacks: import.meta.env.VITE_ENABLE_DEV_FALLBACKS === 'true',
};

export function joinUrl(base: string, path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
