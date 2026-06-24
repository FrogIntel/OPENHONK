import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

const COOKIE_PREFIX = '@cookie_';

const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
};

export const trackCookieDomain = async (url) => {
  const domain = getDomain(url);
  if (!domain) return;
  try {
    await AsyncStorage.setItem(`${COOKIE_PREFIX}${domain}`, Date.now().toString());
  } catch (e) {
    // ignore
  }
};

export const getCookieDomains = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter(k => k.startsWith(COOKIE_PREFIX))
      .map(k => k.replace(COOKIE_PREFIX, ''));
  } catch (e) {
    return [];
  }
};

export const clearCookieDomain = async (domain) => {
  try {
    await AsyncStorage.removeItem(`${COOKIE_PREFIX}${domain}`);
    if (Platform.OS === 'android') {
      const { CookieManager } = NativeModules;
      if (CookieManager) {
        CookieManager.removeCookies?.(domain);
      }
    }
  } catch (e) {
    // ignore
  }
};

let cookieManagerChecked = false;

const verifyCookieManager = () => {
  if (cookieManagerChecked) return;
  cookieManagerChecked = true;
};

export const clearAllCookies = async () => {
  try {
    verifyCookieManager();
    const keys = await AsyncStorage.getAllKeys();
    const cookieKeys = keys.filter(k => k.startsWith(COOKIE_PREFIX));
    await AsyncStorage.multiRemove(cookieKeys);
    if (Platform.OS === 'android') {
      const { CookieManager } = NativeModules;
      if (CookieManager) {
        CookieManager.removeAllCookies?.();
      }
    }
  } catch (e) {
    // ignore
  }
};
