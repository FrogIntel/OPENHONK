import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { getCachedSource, markScreenshotFailed, markFaviconFailed, markScreenshotSuccess, removeCachedScreenshot } from './screenshotCache';
import LoadingBar from './LoadingBar';

const FALLBACK_IMAGE = require('../assets/fallback_icon.png');

const RETRY_DELAYS = [3000, 6000, 10000];

const ScreenshotImage = ({ url, style, resizeMode = 'cover', crossfade = false, fadeDelay = 0 }) => {
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

  const cached = getCachedSource(url);
  const source = cached.source;

  const handleLoad = (e) => {
    loadedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
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
      duration: 400,
      delay: fadeDelay,
      useNativeDriver: true,
    }).start();
    setLoaded(true);
  };

  const isFallback = cached.type === 'fallback';

  return (
    <Animated.View style={[style, { overflow: 'hidden', backgroundColor: isFallback ? '#f7bf1e' : '#0d0d0d' }]}>
      <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }, isFallback && styles.centeredImage]}>
        <Animated.Image
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
      <LoadingBar visible={!loaded} />
    </Animated.View>
  );
};

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

  const cached = getCachedSource(url);
  const source = cached.source;

  const handleLoad = (e) => {
    loadedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
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
      duration: 400,
      delay: fadeDelay,
      useNativeDriver: true,
    }).start();
    setLoaded(true);
  };

  const isFallback = cached.type === 'fallback';

  return (
    <Animated.View style={[style, { overflow: 'hidden', backgroundColor: isFallback ? '#f7bf1e' : '#0d0d0d' }]}>
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
      <LoadingBar visible={!loaded} />
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
