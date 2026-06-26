import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newContent } from '../data/urls';

const NEW_CONTENT_SEEN_KEY = '@new_content_seen_v105';

let seenUrls = [];
let initialized = false;
const listeners = new Set();

const loadSeenUrls = async () => {
  try {
    const stored = await AsyncStorage.getItem(NEW_CONTENT_SEEN_KEY);
    seenUrls = stored ? JSON.parse(stored) : [];
    initialized = true;
    listeners.forEach(fn => fn());
  } catch (e) {
    initialized = true;
    listeners.forEach(fn => fn());
  }
};

loadSeenUrls();

export const useNewContentSync = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    if (initialized) fn();
    return () => { listeners.delete(fn); };
  }, []);
};

export const isNewContent = (url) => {
  if (!initialized) return false;
  return newContent.some(item => item.url === url) && !seenUrls.includes(url);
};

export const markNewContentSeen = (url) => {
  if (!seenUrls.includes(url)) {
    seenUrls.push(url);
    AsyncStorage.setItem(NEW_CONTENT_SEEN_KEY, JSON.stringify(seenUrls));
    listeners.forEach(fn => fn());
  }
};

export const markAllNewContentSeen = async () => {
  seenUrls = newContent.map(item => item.url);
  await AsyncStorage.setItem(NEW_CONTENT_SEEN_KEY, JSON.stringify(seenUrls));
  listeners.forEach(fn => fn());
};

export const getNewContentCount = () => {
  if (!initialized) return 0;
  return newContent.filter(item => !seenUrls.includes(item.url)).length;
};

export const refreshNewContent = () => {
  loadSeenUrls();
};
