import React, { useState, useRef, useEffect, forwardRef, memo } from 'react';
import { Animated, StyleSheet, Image, View } from 'react-native';
import { getCachedSource, markScreenshotFailed, markFaviconFailed, markScreenshotSuccess, removeCachedScreenshot, onCacheReady } from './screenshotCache';

const FALLBACK_IMAGE = require('../assets/fallback_icon.png');
const RETRY_DELAYS = [1500, 3000];

const ScreenshotImage = memo(({ url, style, resizeMode = 'cover', crossfade = false, fadeDelay = 0, stagger = false, staggerIndex = -1 }) => {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedRef = useRef(false);
  const retryTimer = useRef(null);
  const staggerDelay = useRef(staggerIndex >= 0 ? Math.min(staggerIndex * 30, 600) : (stagger ? Math.random() * 400 : 0)).current;

  useEffect(() => {
    loadedRef.current = false;
    setLoaded(false);
    setRetryCount(0);
    fadeAnim.setValue(0);
    setTick(t => t + 1);
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [url]);

  useEffect(() => {
    return onCacheReady(() => setTick(t => t + 1));
  }, []);

  const cached = getCachedSource(url);
  const source = cached.source;
  const isFallback = cached.type === 'fallback';
  const isFavicon = cached.type === 'favicon';
  const bgColor = isFallback ? '#f7bf1e' : (isFavicon ? '#0d0d0d' : (loaded ? '#0d0d0d' : '#f7bf1e'));

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      delay: staggerDelay,
      useNativeDriver: true,
    }).start();
  };

  const handleLoad = (e) => {
    loadedRef.current = true;
    fadeIn();
    setLoaded(true);
    if (cached.type === 'screenshot') {
      const w = e?.nativeEvent?.source?.width;
      const h = e?.nativeEvent?.source?.height;
      markScreenshotSuccess(url, cached.screenshotUrl, w, h);
    }
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
    if (cached.type === 'screenshot') {
      markScreenshotFailed(url);
      removeCachedScreenshot(url);
    } else if (cached.type === 'favicon') {
      markFaviconFailed(url);
    }
    setTick(t => t + 1);
    fadeIn();
    setLoaded(true);
  };

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: bgColor }]}>
      {/* Fallback icon underneath — hidden once image loads */}
      {!isFallback && !loaded && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7bf1e' }]}>
          <Image source={FALLBACK_IMAGE} style={{ width: '50%', height: '50%' }} resizeMode="contain" fadeDuration={0} />
        </View>
      )}
      {/* Actual image on top, fades in when loaded */}
      <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }, isFallback && styles.centeredImage]}>
        <Image
          key={tick}
          source={source}
          style={[isFallback ? styles.fallbackImage : StyleSheet.absoluteFill]}
          resizeMode={isFallback ? 'contain' : resizeMode}
          fadeDuration={0}
          cache="force-cache"
          onLoad={handleLoad}
          onError={handleError}
        />
      </Animated.View>
    </View>
  );
});

const AnimatedScreenshotImage = forwardRef(({ url, style, resizeMode = 'cover', crossfade = false, fadeDelay = 0 }, ref) => {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedRef = useRef(false);
  const retryTimer = useRef(null);

  useEffect(() => {
    loadedRef.current = false;
    setLoaded(false);
    setRetryCount(0);
    fadeAnim.setValue(0);
    setTick(t => t + 1);
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [url]);

  useEffect(() => {
    return onCacheReady(() => setTick(t => t + 1));
  }, []);

  const cached = getCachedSource(url);
  const source = cached.source;
  const isFallback = cached.type === 'fallback';
  const isFavicon = cached.type === 'favicon';
  const bgColor = '#0d0d0d';

  const handleLoad = (e) => {
    loadedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: fadeDelay,
      useNativeDriver: true,
    }).start();
    setLoaded(true);
    if (cached.type === 'screenshot') {
      const w = e?.nativeEvent?.source?.width;
      const h = e?.nativeEvent?.source?.height;
      markScreenshotSuccess(url, cached.screenshotUrl, w, h);
    }
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
    if (cached.type === 'screenshot') {
      markScreenshotFailed(url);
      removeCachedScreenshot(url);
    } else if (cached.type === 'favicon') {
      markFaviconFailed(url);
    }
    setTick(t => t + 1);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: fadeDelay,
      useNativeDriver: true,
    }).start();
    setLoaded(true);
  };

  return (
    <Animated.View style={[style, { overflow: 'hidden', backgroundColor: bgColor }]}>
      <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }, isFallback && styles.centeredImage]}>
        <Animated.Image
          ref={ref}
          key={tick}
          source={source}
          style={[isFallback ? styles.fallbackImage : StyleSheet.absoluteFill]}
          resizeMode={isFallback ? 'contain' : resizeMode}
          fadeDuration={0}
          cache="force-cache"
          onLoad={handleLoad}
          onError={handleError}
        />
      </Animated.View>
    </Animated.View>
  );
});

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

export { AnimatedScreenshotImage };
export default ScreenshotImage;