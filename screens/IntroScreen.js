import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { appData } from '../data/urls';

const IntroScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    let navigated = false;
    const navigateToWelcome = () => {
      if (navigated) return;
      navigated = true;
      navigation.replace('Welcome');
    };

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    const getScreenshotUrl = (url) => {
      if (!url) return null;
      return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    };

    const criticalUrls = [
      getScreenshotUrl(appData.homepage),
    ];

    timerRef.current = setTimeout(navigateToWelcome, 3000);

    Promise.all(criticalUrls.filter(url => url).map(url => Image.prefetch(url).catch(() => {})))
      .then(() => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(navigateToWelcome, 1500);
        }
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigation, fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} translucent={true} />
      <Animated.Image
        source={require('../assets/wallpaper2.png')}
        style={[styles.wallpaper, { opacity: fadeAnim }]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7bf1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wallpaper: {
    width: '100%',
    height: '100%',
  },
});

export default IntroScreen;
