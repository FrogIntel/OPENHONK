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

  return results;
};
