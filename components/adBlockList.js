import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt';
const CACHE_KEY = '@adblock_easylist';
const CACHE_TIMESTAMP_KEY = '@adblock_easylist_ts';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const FALLBACK_AD_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'adnxs.com', 'adsystem.com', 'adservice.com', 'adsrvr.org',
  'amazon-adsystem.com', 'criteo.com', 'criteo.net',
  'facebook.com/tr', 'facebook.net', 'fbcdn.com/tr',
  'taboola.com', 'outbrain.com', 'mgid.com',
  'adskeeper.com', 'propellerads.com', 'popads.net',
  'adsterra.com', 'exoclick.com', 'juicyads.com',
  'trafficjunky.net', 'advertising.com', 'atdmt.com',
  'quantserve.com', 'scorecardresearch.com', 'comscore.com',
  'moatads.com', 'admob.com', 'mopub.com',
  'applovin.com', 'chartbeat.com', 'hotjar.com',
  'segment.io', 'mixpanel.com', 'amplitude.com',
  'branch.io', 'adjust.com', 'appsflyer.com',
  'sentry.io', 'bugsnag.com', 'adsafeprotected.com',
];

const FALLBACK_CSS_SELECTORS = [
  'ins.adsbygoogle',
  '.adsbygoogle',
  '.ad-container',
  '.ad-banner',
  '.ad-wrapper',
  '.ad-zone',
  '.ad-slot',
  '.advertisement',
  '.advertising',
  '.sponsored-content',
  '[id*="div-gpt-ad"]',
  '[data-ad-slot]',
  '[data-ad-client]',
];

let currentBlockList = {
  domains: new Set(FALLBACK_AD_DOMAINS),
  cssSelectors: FALLBACK_CSS_SELECTORS,
};

const parseEasyList = (text) => {
  const lines = text.split('\n');
  const domains = new Set(FALLBACK_AD_DOMAINS);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;

    if (trimmed.startsWith('||')) {
      const domainPart = trimmed.substring(2).replace(/^https?:\/\//, '').split('^')[0].split('/')[0].split('?')[0];
      if (domainPart && domainPart.includes('.') && !domainPart.includes('*')) {
        domains.add(domainPart.toLowerCase());
      }
    } else if (trimmed.includes('://') && !trimmed.startsWith('@')) {
      try {
        const parsed = new URL(trimmed.split('$')[0]);
        if (parsed.hostname && parsed.hostname.includes('.')) {
          domains.add(parsed.hostname.toLowerCase());
        }
      } catch (e) {}
    }
  }

  return {
    domains: domains,
    cssSelectors: FALLBACK_CSS_SELECTORS,
  };
};

export const fetchAdBlockList = async () => {
  try {
    const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_TTL) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.domains)) {
          parsed.domains = new Set(parsed.domains);
        }
        currentBlockList = parsed;
        const cachedUpdate = await AsyncStorage.getItem('@adblock_last_update');
        if (!cachedUpdate) {
          await AsyncStorage.setItem('@adblock_last_update', JSON.stringify({ date: new Date(parseInt(cachedTimestamp)).toISOString(), domains: parsed.domains.size, status: 'success' }));
        }
        return parsed;
      }
    }

    const response = await fetch(EASYLIST_URL);
    if (!response.ok) throw new Error('Failed to fetch EasyList');
    const text = await response.text();
    const blockList = parseEasyList(text);

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(blockList));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, String(now));
    await AsyncStorage.setItem('@adblock_last_update', JSON.stringify({ date: new Date().toISOString(), domains: blockList.domains.size, status: 'success' }));

    currentBlockList = blockList;

    if (Platform.OS === 'android' && NativeModules.BackgroundAudioModule) {
      try {
        NativeModules.BackgroundAudioModule.showNotification(
          'AdBlock Updated',
          `${blockList.domains.size} domains loaded from EasyList`
        );
      } catch (e) {}
    }

    return blockList;
  } catch (error) {
    console.error('Failed to fetch ad block list, using fallback:', error);
    await AsyncStorage.setItem('@adblock_last_update', JSON.stringify({ date: new Date().toISOString(), domains: currentBlockList.domains.size, status: 'failed', error: error.message || 'Unknown error' }));
    return currentBlockList;
  }
};

export const checkAndScheduleAdBlockUpdate = async () => {
  const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
  const now = Date.now();
  if (!cachedTimestamp || (now - parseInt(cachedTimestamp)) >= CACHE_TTL) {
    await fetchAdBlockList();
  }
};

export const getAdBlockList = () => currentBlockList;

export const isAdDomain = (url) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Whitelist Cloudflare challenge/turnstile domains
    if (hostname.includes('challenges.cloudflare.com') || hostname.includes('cloudflare.com') || hostname.includes('cf-turnstile')) {
      return false;
    }
    const domains = currentBlockList.domains;
    for (const domain of domains) {
      // Match domain or subdomain, not arbitrary URL substring
      if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const getAdBlockJS = () => {
  const selectors = currentBlockList.cssSelectors;
  if (!selectors || selectors.length === 0) return '';
  return `
(function() {
  var loc = location.hostname + location.pathname;
  if (loc.includes('challenges.cloudflare.com') || loc.includes('/cdn-cgi/') || loc.includes('challenge-platform') || loc.includes('turnstile')) return;
  var selectors = ${JSON.stringify(selectors)};
  var css = selectors.join(', ') + ' { display: none !important; }';
  var style = document.createElement('style');
  style.textContent = css;
  if (document.head) document.head.appendChild(style);
  else document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(style); });
})();
`;
};
