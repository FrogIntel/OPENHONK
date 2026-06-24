import AsyncStorage from '@react-native-async-storage/async-storage';
import { appData } from '../data/urls';

const REMOVED_URLS_KEY = '@removed_urls';

let removedUrls = [];
let initialized = false;
const listeners = new Set();

const loadRemovedUrls = async () => {
  try {
    const stored = await AsyncStorage.getItem(REMOVED_URLS_KEY);
    removedUrls = stored ? JSON.parse(stored) : [];
    initialized = true;
    listeners.forEach(fn => fn());
  } catch (e) {
    console.error('Error loading removed URLs:', e);
    initialized = true;
  }
};

loadRemovedUrls();

export const refreshRemovedUrls = () => {
  loadRemovedUrls();
};

export const isUrlRemoved = (url) => removedUrls.includes(url);

export const getFilteredUrls = (urls) => {
  if (!urls) return [];
  if (!initialized) return urls;
  return urls.filter(item => !removedUrls.includes(item.url));
};

export const getFilteredAppData = () => {
  const filterCategory = (cat) => {
    if (!cat) return cat;
    if (cat.urls) {
      return { ...cat, urls: getFilteredUrls(cat.urls) };
    }
    const filtered = {};
    Object.entries(cat).forEach(([key, subCat]) => {
      if (subCat && subCat.urls) {
        filtered[key] = { ...subCat, urls: getFilteredUrls(subCat.urls) };
      } else {
        filtered[key] = subCat;
      }
    });
    return filtered;
  };

  return {
    ...appData,
    homepage: appData.homepage,
    sauce: filterCategory(appData.sauce),
    breb: filterCategory(appData.breb),
    frens: appData.frens ? { ...appData.frens, urls: getFilteredUrls(appData.frens.urls) } : appData.frens,
    showtime: appData.showtime ? { ...appData.showtime, urls: getFilteredUrls(appData.showtime.urls) } : appData.showtime,
    notifications: appData.notifications,
  };
};
