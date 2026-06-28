import { appData } from '../data/urls';
import { getFilteredUrls } from './filteredData';

export const searchAllApp = (query) => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];

  // Search sauce categories
  if (appData.sauce) {
    Object.keys(appData.sauce).forEach(subCategory => {
      const categoryData = appData.sauce[subCategory];
      if (categoryData && categoryData.urls) {
        getFilteredUrls(categoryData.urls).forEach(item => {
          if (item && item.title && item.url &&
              (item.title.toLowerCase().includes(q) ||
               item.url.toLowerCase().includes(q))) {
            results.push({ ...item, category: categoryData.title });
          }
        });
      } else if (categoryData && !categoryData.urls) {
        // Nested subcategories (e.g. restructured qAnon, tacoToppings, news)
        Object.keys(categoryData).forEach(subKey => {
          const subData = categoryData[subKey];
          if (subData && subData.urls) {
            getFilteredUrls(subData.urls).forEach(item => {
              if (item && item.title && item.url &&
                  (item.title.toLowerCase().includes(q) ||
                   item.url.toLowerCase().includes(q))) {
                results.push({ ...item, category: subData.title });
              }
            });
          }
        });
      }
    });
  }

  // Search breb categories
  if (appData.breb) {
    Object.keys(appData.breb).forEach(subCategory => {
      const categoryData = appData.breb[subCategory];
      if (categoryData && categoryData.urls) {
        getFilteredUrls(categoryData.urls).forEach(item => {
          if (item && item.title && item.url &&
              (item.title.toLowerCase().includes(q) ||
               item.url.toLowerCase().includes(q))) {
            results.push({ ...item, category: categoryData.title });
          }
        });
      }
    });
  }

  // Search frens
  if (appData.frens && appData.frens.urls) {
    getFilteredUrls(appData.frens.urls).forEach(item => {
      if (item && item.title && item.url &&
          (item.title.toLowerCase().includes(q) ||
           item.url.toLowerCase().includes(q))) {
        results.push({ ...item, category: appData.frens.title });
      }
    });
  }

  // Search showtime categories
  if (appData.showtime) {
    Object.keys(appData.showtime).forEach(subCategory => {
      const categoryData = appData.showtime[subCategory];
      if (categoryData && categoryData.urls) {
        getFilteredUrls(categoryData.urls).forEach(item => {
          if (item && item.title && item.url &&
              (item.title.toLowerCase().includes(q) ||
               item.url.toLowerCase().includes(q))) {
            results.push({ ...item, category: categoryData.title });
          }
        });
      }
    });
  }

  // Search notifications (including cleared ones)
  if (appData.notifications && appData.notifications.urls) {
    appData.notifications.urls.forEach(item => {
      if (item && item.title &&
          (item.title.toLowerCase().includes(q) ||
           (item.message && item.message.toLowerCase().includes(q)))) {
        results.push({
          title: item.title,
          url: item.url || 'file:///android_asset/openhonk_home/changelog.html',
          category: 'NOTIFICATIONS',
        });
      }
    });
  }

  // Search changelog
  const changelogTerms = ['changelog', 'update', 'whats new', "what's new", 'version', 'changes'];
  if (changelogTerms.some(term => term.includes(q) || q.includes(term))) {
    results.push({
      title: 'Changelog & Updates',
      url: 'file:///android_asset/openhonk_home/changelog.html',
      category: 'UPDATES',
    });
  }

  return results;
};
