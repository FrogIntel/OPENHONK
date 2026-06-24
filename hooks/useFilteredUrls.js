import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMOVED_URLS_KEY = '@removed_urls';

const useFilteredUrls = () => {
  const [removedUrls, setRemovedUrls] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(REMOVED_URLS_KEY);
        if (stored) {
          setRemovedUrls(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading removed URLs:', e);
      }
    };
    load();
  }, []);

  const isRemoved = (url) => removedUrls.includes(url);

  const filterUrls = (urls) => {
    if (!urls) return [];
    return urls.filter(item => !removedUrls.includes(item.url));
  };

  return { removedUrls, isRemoved, filterUrls };
};

export default useFilteredUrls;
