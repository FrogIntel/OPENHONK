import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appData } from '../data/urls';

const SCREENSHOT_CACHE_KEY = '@screenshot_cache';
const STORE_SCREENSHOTS_KEY = '@store_screenshots';
const MIN_SCREENSHOT_WIDTH = 200;
const MIN_SCREENSHOT_HEIGHT = 150;

const SCREENSHOT_SERVICES = [
  (url) => `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
  (url) => `https://image.thum.io/get/width/400/crop/800/viewport/1200/${encodeURIComponent(url)}`,
];

const getScreenshotUrl = (url, serviceIndex = 0) => {
  if (!url) return null;
  if (serviceIndex < 0 || serviceIndex >= SCREENSHOT_SERVICES.length) return null;
  return SCREENSHOT_SERVICES[serviceIndex](url);
};

const getAllScreenshotUrls = (url) => {
  if (!url) return [];
  return SCREENSHOT_SERVICES.map(fn => fn(url)).filter(Boolean);
};

const isKnownServiceUrl = (screenshotUrl) => {
  if (!screenshotUrl) return false;
  const knownDomains = ['api.microlink.io', 'image.thum.io'];
  return knownDomains.some(domain => screenshotUrl.includes(domain));
};

const getFaviconUrl = (url) => {
  if (!url) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=256`;
  } catch (e) {
    return null;
  }
};

const FAVICON_ONLY_DOMAINS = ['rumble.com'];

const shouldUseFaviconOnly = (url) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return FAVICON_ONLY_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch (e) {
    return false;
  }
};

const failedScreenshots = new Set();
const failedFavicons = new Set();
const failedTimestamps = new Map();
const prefetchedUrls = new Set();
const cachedScreenshots = new Map();
const queuedUrls = new Set();
let storeScreenshotsEnabled = false;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;

export const isStoreScreenshotsEnabled = () => storeScreenshotsEnabled;

export const setStoreScreenshots = (enabled) => {
  storeScreenshotsEnabled = enabled;
  AsyncStorage.setItem(STORE_SCREENSHOTS_KEY, enabled ? 'true' : 'false').catch(() => {});
  if (!enabled) {
    cachedScreenshots.clear();
    AsyncStorage.removeItem(SCREENSHOT_CACHE_KEY).catch(() => {});
  }
};

const saveCachedScreenshots = () => {
  AsyncStorage.setItem(SCREENSHOT_CACHE_KEY, JSON.stringify([...cachedScreenshots.entries()])).catch(() => {});
};

const getAllValidUrls = () => {
  const valid = new Set();
  const addItem = (item) => { if (item?.url) valid.add(item.url); };
  const addCategory = (cat) => {
    if (!cat) return;
    if (Array.isArray(cat.urls)) {
      cat.urls.forEach(addItem);
    } else if (typeof cat === 'object') {
      Object.values(cat).forEach(sub => sub?.urls?.forEach(addItem));
    }
  };
  addItem({ url: appData.homepage });
  ['breb', 'sauce', 'news', 'conspiracy', 'spotlight', 'frens', 'showtime'].forEach(key => {
    const section = appData[key];
    if (Array.isArray(section?.urls)) {
      section.urls.forEach(addItem);
    } else if (typeof section === 'object') {
      Object.values(section).forEach(addCategory);
    }
  });
  return valid;
};

export const initStoreScreenshots = async () => {
  try {
    const val = await AsyncStorage.getItem(STORE_SCREENSHOTS_KEY);
    storeScreenshotsEnabled = val === 'true';
    // Always load cached screenshot URLs (for prefetch skipping), regardless of setting
    const raw = await AsyncStorage.getItem(SCREENSHOT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validUrls = getAllValidUrls();
        let pruned = 0;
        parsed.forEach(entry => {
          let url, serviceIndex = 0, screenshotUrl;
          if (typeof entry === 'string') {
            url = entry;
            screenshotUrl = getScreenshotUrl(url, 0);
          } else if (Array.isArray(entry)) {
            [url, data] = entry;
            if (typeof data === 'object' && data !== null) {
              serviceIndex = data.serviceIndex ?? 0;
              screenshotUrl = data.screenshotUrl || getScreenshotUrl(url, serviceIndex);
            } else {
              serviceIndex = data ?? 0;
              screenshotUrl = getScreenshotUrl(url, serviceIndex);
            }
          } else if (typeof entry === 'object' && entry !== null) {
            url = entry.url;
            serviceIndex = entry.serviceIndex ?? 0;
            screenshotUrl = entry.screenshotUrl || getScreenshotUrl(url, serviceIndex);
          }
          if (url && validUrls.has(url) && screenshotUrl && isKnownServiceUrl(screenshotUrl) && !shouldUseFaviconOnly(url)) {
            cachedScreenshots.set(url, { serviceIndex, screenshotUrl });
          } else {
            pruned++;
          }
        });
        if (pruned > 0) {
          saveCachedScreenshots();
        }
      }
    }
  } catch (e) {}
};

export const getCacheStats = () => {
  return {
    count: cachedScreenshots.size,
    enabled: storeScreenshotsEnabled,
  };
};

export const isUrlCached = (url) => cachedScreenshots.has(url);

export const getUncachedUrls = (urls) => {
  if (!urls) return [];
  return urls.filter(url => url && !cachedScreenshots.has(url));
};

export const getQueueStatus = () => {
  return {
    cached: cachedScreenshots.size,
    queued: queue.length,
    active: activeCount,
    prefetched: prefetchedUrls.size,
  };
};

export const clearScreenshotCache = () => {
  cachedScreenshots.clear();
  AsyncStorage.removeItem(SCREENSHOT_CACHE_KEY).catch(() => {});
};

const FALLBACK_IMAGE = require('../assets/fallback_icon.png');

export const getCachedSource = (url) => {
  if (!url) return { source: FALLBACK_IMAGE, type: 'fallback' };

  const cached = cachedScreenshots.get(url);
  const faviconUrl = getFaviconUrl(url);

  if (shouldUseFaviconOnly(url)) {
    return { source: faviconUrl ? { uri: faviconUrl } : FALLBACK_IMAGE, type: faviconUrl ? 'favicon' : 'fallback', faviconUrl };
  }

  // Only show screenshot if it has been successfully cached before
  // This prevents the UI from triggering live screenshot fetches on every render
  if (cached?.screenshotUrl && !failedScreenshots.has(url)) {
    return { source: { uri: cached.screenshotUrl }, type: 'screenshot', screenshotUrl: cached.screenshotUrl, faviconUrl, serviceIndex: cached.serviceIndex };
  }

  // Uncached or failed screenshot — show favicon if not failed, otherwise fallback
  if (faviconUrl && !failedFavicons.has(url)) {
    return { source: { uri: faviconUrl }, type: 'favicon', faviconUrl };
  }
  return { source: FALLBACK_IMAGE, type: 'fallback' };
};

export const markScreenshotFailed = (url) => {
  failedScreenshots.add(url);
  failedTimestamps.set(url, Date.now());
};

export const markFaviconFailed = (url) => {
  failedFavicons.add(url);
};

export const markScreenshotSuccess = (url, screenshotUrl, width, height) => {
  if (width && height && (width < MIN_SCREENSHOT_WIDTH || height < MIN_SCREENSHOT_HEIGHT)) return;
  if (!cachedScreenshots.has(url)) {
    let serviceIndex = 0;
    if (screenshotUrl) {
      const urls = getAllScreenshotUrls(url);
      serviceIndex = Math.max(0, urls.indexOf(screenshotUrl));
    }
    cachedScreenshots.set(url, { serviceIndex, screenshotUrl: screenshotUrl || getScreenshotUrl(url, serviceIndex) });
    saveCachedScreenshots();
  }
};

export const clearFailedCache = () => {
  failedScreenshots.clear();
  failedFavicons.clear();
  failedTimestamps.clear();
  prefetchedUrls.clear();
  queuedUrls.clear();
};

const MAX_CONCURRENT = 3;
const REQUEST_DELAY_MS = 1000;
const PREFETCH_TIMEOUT_MS = 30000;
const queue = [];
let activeCount = 0;
let lastRequestTime = 0;
let queueStallTimer = null;

const ensureQueueProgress = () => {
  if (queueStallTimer) clearTimeout(queueStallTimer);
  queueStallTimer = setTimeout(() => {
    queueStallTimer = null;
    // Safety net: if queue has items but nothing is active, kick it
    if (queue.length > 0 && activeCount === 0) {
      activeCount = 0;
      processQueue();
    }
  }, 5000);
};

const prefetchWithTimeout = (url) => {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('timeout'));
      }
    }, PREFETCH_TIMEOUT_MS);
    Image.prefetch(url)
      .then((result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(result);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
};

const validateImage = (url) => {
  return new Promise((resolve, reject) => {
    Image.getSize(url, (width, height) => {
      if (width > 0 && height > 0) resolve({ width, height });
      else reject(new Error('invalid image dimensions'));
    }, (err) => reject(err || new Error('image validation failed')));
  });
};

const prefetchSingleService = (url, serviceIndex) => {
  const screenshotUrl = getScreenshotUrl(url, serviceIndex);
  if (!screenshotUrl) return Promise.reject(new Error('no url'));
  return prefetchWithTimeout(screenshotUrl)
    .then(() => validateImage(screenshotUrl))
    .then(() => ({ serviceIndex, screenshotUrl }));
};

const prefetchScreenshot = (url) => {
  const screenshotUrls = getAllScreenshotUrls(url);
  if (screenshotUrls.length === 0) return Promise.reject(new Error('no services'));

  return new Promise((resolve, reject) => {
    let settled = false;
    let failures = 0;
    screenshotUrls.forEach((screenshotUrl, serviceIndex) => {
      prefetchSingleService(url, serviceIndex)
        .then((result) => {
          if (!settled) {
            settled = true;
            markScreenshotSuccess(url, screenshotUrl);
            resolve(result);
          }
        })
        .catch((err) => {
          failures++;
          if (!settled && failures >= screenshotUrls.length) {
            settled = true;
            markScreenshotFailed(url);
            reject(new Error('all screenshot services failed'));
          }
        });
    });
  });
};

export const removeCachedScreenshot = (url) => {
  if (cachedScreenshots.has(url)) {
    cachedScreenshots.delete(url);
    saveCachedScreenshots();
  }
};

const processQueue = () => {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const now = Date.now();
    const delay = Math.max(0, lastRequestTime + REQUEST_DELAY_MS - now);
    activeCount++;
    lastRequestTime = now + delay;
    setTimeout(() => {
      Promise.resolve(item.fn())
        .then(() => { activeCount--; processQueue(); ensureQueueProgress(); })
        .catch(() => { activeCount--; processQueue(); ensureQueueProgress(); });
    }, delay);
  }
  ensureQueueProgress();
};

const enqueuePrefetch = (fn, priority) => {
  if (priority) {
    queue.unshift({ fn });
  } else {
    queue.push({ fn });
  }
  processQueue();
};

const isEligibleForRetry = (url) => {
  if (!failedScreenshots.has(url)) return true;
  const failedAt = failedTimestamps.get(url);
  if (!failedAt) return true;
  return (Date.now() - failedAt) >= RETRY_INTERVAL_MS;
};

export const prefetchUrl = (url, priority = false) => {
  if (!url) return;

  const canRetry = isEligibleForRetry(url);
  if (!canRetry) return;
  if (prefetchedUrls.has(url) || queuedUrls.has(url)) return;

  const faviconOnly = shouldUseFaviconOnly(url);

  // Skip prefetching if screenshot was already cached successfully on a previous run
  if (cachedScreenshots.has(url)) {
    prefetchedUrls.add(url);
    return;
  }

  // Clear failure state on retry
  if (failedScreenshots.has(url)) {
    failedScreenshots.delete(url);
    failedTimestamps.delete(url);
    prefetchedUrls.delete(url);
  }

  const faviconUrl = getFaviconUrl(url);

  if (priority) {
    prefetchedUrls.add(url);
    if (!faviconOnly) {
      prefetchScreenshot(url).catch(() => {});
    }
    if (faviconUrl) {
      prefetchWithTimeout(faviconUrl).catch(() => {});
    }
    return;
  }

  // Mark as queued to prevent duplicate queue entries
  queuedUrls.add(url);

  if (!faviconOnly) {
    enqueuePrefetch(() => {
      prefetchedUrls.add(url);
      if (!failedScreenshots.has(url)) {
        return prefetchScreenshot(url);
      }
    }, false);
  }

  enqueuePrefetch(() => {
    if (faviconUrl) {
      return prefetchWithTimeout(faviconUrl).catch(() => {});
    }
  }, false);
};

export const prefetchItems = (items, count = 15, priority = false) => {
  if (!items) return;
  const limit = Math.min(count, items.length);
  for (let i = 0; i < limit; i++) {
    if (items[i]?.url) prefetchUrl(items[i].url, priority);
  }
};

export const backgroundPrefetchAll = (urls) => {
  if (!urls || urls.length === 0) return;
  const uncached = getUncachedUrls(urls);
  const alreadyCached = urls.length - uncached.length;
  uncached.forEach(url => {
    if (!prefetchedUrls.has(url) && !queuedUrls.has(url)) {
      prefetchUrl(url, false);
    }
  });
};

export const retryFailedScreenshots = () => {
  const now = Date.now();
  for (const [url, failedAt] of failedTimestamps.entries()) {
    if ((now - failedAt) >= RETRY_INTERVAL_MS && !prefetchedUrls.has(url) && !queuedUrls.has(url)) {
      prefetchUrl(url, false);
    }
  }
};

let retryTimer = null;
export const startRetryTimer = () => {
  if (retryTimer) return;
  retryTimer = setInterval(() => {
    retryFailedScreenshots();
  }, RETRY_INTERVAL_MS);
};
