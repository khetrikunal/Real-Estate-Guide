import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const prefix = 'estate.portal.';

export async function readStorage(key: string) {
  const fullKey = `${prefix}${key}`;
  if (Capacitor.isNativePlatform()) {
    const result = await Preferences.get({ key: fullKey });
    return result.value ?? '';
  }
  return window.localStorage.getItem(fullKey) ?? '';
}

export async function writeStorage(key: string, value: string) {
  const fullKey = `${prefix}${key}`;
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: fullKey, value });
    return;
  }
  window.localStorage.setItem(fullKey, value);
}

export async function removeStorage(key: string) {
  const fullKey = `${prefix}${key}`;
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: fullKey });
    return;
  }
  window.localStorage.removeItem(fullKey);
}
