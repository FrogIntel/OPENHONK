import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Animated, Platform } from 'react-native';
import { AnimatedScreenshotImage } from './ScreenshotImage';

const { width, height } = Dimensions.get('window');

const WebsiteCarousel = ({ websites, onWebsitePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledWebsites, setShuffledWebsites] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (websites && websites.length > 0) {
      const shuffled = [...websites].sort(() => Math.random() - 0.5);
      setShuffledWebsites(shuffled);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      let intervalId = null;
      const timeout = setTimeout(() => {
        intervalId = setInterval(() => {
          fadeAnim.setValue(0);
          setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffled.length);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }, 5000);
      }, 1000);

      return () => {
        clearTimeout(timeout);
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [websites, fadeAnim]);

  if (!shuffledWebsites || shuffledWebsites.length === 0) {
    return null;
  }

  const currentWebsite = shuffledWebsites[currentIndex];

  return (
    <TouchableOpacity
      style={styles.carouselContainer}
      onPress={() => onWebsitePress && onWebsitePress(currentWebsite)}
      activeOpacity={0.9}
    >
      <AnimatedScreenshotImage
        url={currentWebsite.url}
        style={styles.screenshotImage}
      />
      <View style={styles.overlay} />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.indicatorContainer}>
          {shuffledWebsites.slice(0, 5).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex % 5 && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentWebsite.title}</Text>
          <Text style={styles.url}>{currentWebsite.url}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    width: '100%',
    height: height * 0.35, // Top third of screen
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#ffcc33',
    elevation: 5,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    alignItems: 'flex-end',
    maxWidth: '70%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  url: {
    fontSize: 13,
    color: '#ffcc33',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'right',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#ffcc33',
    width: 28,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default WebsiteCarousel;
