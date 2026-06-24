import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { getCachedSource, markScreenshotFailed, markFaviconFailed, markScreenshotSuccess, prefetchUrl, removeCachedScreenshot } from './screenshotCache';
import LoadingBar from './LoadingBar';

const FALLBACK_IMAGE = require('../assets/fallback_icon.png');

const RETRY_DELAYS = [3000, 6000, 10000];

const ImageLayer = ({ url, opacity, style, resizeMode, onLoaded }) => {
  const [tick, setTick] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const loadedRef = useRef(false);
  const retryTimer = useRef(null);

  useEffect(() => {
    loadedRef.current = false;
    setImgLoaded(false);
    setRetryCount(0);
    setTick(t => t + 1);
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [url]);

  const cached = url ? getCachedSource(url) : null;
  const source = cached ? cached.source : null;

  // No URL → immediately signal loaded so slideshow can advance
  useEffect(() => {
    if (!url && onLoaded) {
      setImgLoaded(true);
      onLoaded();
    }
  }, [url]);

  const handleLoad = (e) => {
    loadedRef.current = true;
    setImgLoaded(true);
    if (cached?.type === 'screenshot') {
      const w = e?.nativeEvent?.source?.width;
      const h = e?.nativeEvent?.source?.height;
      markScreenshotSuccess(url, cached.screenshotUrl, w, h);
    }
    if (onLoaded) onLoaded();
  };

  const handleError = () => {
    if (loadedRef.current) return;
    if (retryCount < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[retryCount];
      retryTimer.current = setTimeout(() => {
        setRetryCount(r => r + 1);
        setTick(t => t + 1);
      }, delay);
      return;
    }
    if (cached?.type === 'screenshot') {
      markScreenshotFailed(url);
      removeCachedScreenshot(url);
    } else if (cached?.type === 'favicon') {
      markFaviconFailed(url);
    }
    setTick(t => t + 1);
    setImgLoaded(true);
    if (onLoaded) onLoaded();
  };

  const isFallback = cached?.type === 'fallback';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden', backgroundColor: isFallback ? '#f7bf1e' : '#0d0d0d' }]}>
      {url && source && (
        <Animated.View style={[styles.imageWrapper, isFallback && styles.centeredImage]}>
          <Animated.Image
            key={tick}
            source={source}
            style={[isFallback ? styles.fallbackImage : StyleSheet.absoluteFill]}
            resizeMode={isFallback ? 'contain' : (resizeMode || 'cover')}
            fadeDuration={0}
            cache="force-cache"
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const SlideshowImage = ({ items, style, intervalMs = 5500, crossfadeMs = 1400, startDelay = 0, resizeMode = 'cover', onIndexChange, fadeDelay = 0 }) => {
  const aOpacity = useRef(new Animated.Value(1)).current;
  const bOpacity = useRef(new Animated.Value(0)).current;
  const containerFade = useRef(new Animated.Value(0)).current;
  const showingA = useRef(true);
  const bLoaded = useRef(false);
  const aLoaded = useRef(true);
  const indexRef = useRef(0);

  const [aUrl, setAUrl] = useState(items[0]?.url);
  const [bUrl, setBUrl] = useState(items[1 % (items.length || 1)]?.url);
  const [anyLoading, setAnyLoading] = useState(true);

  // Update URLs when items change after mount (e.g. data loads asynchronously)
  useEffect(() => {
    if (items && items.length > 0) {
      setAUrl(items[0]?.url);
      setBUrl(items[1 % items.length]?.url);
      setAnyLoading(true);
      aLoaded.current = false;
      bLoaded.current = false;
      indexRef.current = 0;
      showingA.current = true;
      aOpacity.setValue(1);
      bOpacity.setValue(0);
      containerFade.setValue(0);
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 400,
        delay: fadeDelay,
        useNativeDriver: true,
      }).start();
    }
  }, [items]);

  const advance = useCallback(() => {
    const nextIdx = (indexRef.current + 1) % items.length;
    const nextNextIdx = (nextIdx + 1) % items.length;

    if (showingA.current) {
      if (!bLoaded.current) return;
      Animated.parallel([
        Animated.timing(aOpacity, { toValue: 0, duration: crossfadeMs, useNativeDriver: true }),
        Animated.timing(bOpacity, { toValue: 1, duration: crossfadeMs, useNativeDriver: true }),
      ]).start(() => {
        showingA.current = false;
        indexRef.current = nextIdx;
        if (onIndexChange) onIndexChange(nextIdx);
        aLoaded.current = false;
        bLoaded.current = false;
        setAUrl(items[nextNextIdx]?.url);
        aOpacity.setValue(0);
        bOpacity.setValue(1);
        const prefetchIdx = (nextNextIdx + 1) % items.length;
        if (items[prefetchIdx]?.url) prefetchUrl(items[prefetchIdx].url);
      });
    } else {
      if (!aLoaded.current) return;
      Animated.parallel([
        Animated.timing(bOpacity, { toValue: 0, duration: crossfadeMs, useNativeDriver: true }),
        Animated.timing(aOpacity, { toValue: 1, duration: crossfadeMs, useNativeDriver: true }),
      ]).start(() => {
        showingA.current = true;
        indexRef.current = nextIdx;
        if (onIndexChange) onIndexChange(nextIdx);
        aLoaded.current = false;
        bLoaded.current = false;
        setBUrl(items[nextNextIdx]?.url);
        aOpacity.setValue(1);
        bOpacity.setValue(0);
        const prefetchIdx = (nextNextIdx + 1) % items.length;
        if (items[prefetchIdx]?.url) prefetchUrl(items[prefetchIdx].url);
      });
    }
  }, [items, crossfadeMs, aOpacity, bOpacity]);

  useEffect(() => {
    if (!items || items.length < 2) return;

    for (let i = 0; i < Math.min(4, items.length); i++) {
      if (items[i]?.url) prefetchUrl(items[i].url);
    }

    let intervalId;
    const timeout = setTimeout(() => {
      intervalId = setInterval(advance, intervalMs + crossfadeMs);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [items, intervalMs, crossfadeMs, startDelay, advance]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#0d0d0d', opacity: containerFade }, style]}>
      <ImageLayer
        url={aUrl}
        opacity={aOpacity}
        resizeMode={resizeMode}
        onLoaded={() => { aLoaded.current = true; setAnyLoading(false); }}
      />
      <ImageLayer
        url={bUrl}
        opacity={bOpacity}
        resizeMode={resizeMode}
        onLoaded={() => { bLoaded.current = true; }}
      />
      <LoadingBar visible={anyLoading} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  imageWrapper: {
    ...StyleSheet.absoluteFill,
  },
  centeredImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackImage: {
    width: '70%',
    height: '70%',
  },
});

export default SlideshowImage;
