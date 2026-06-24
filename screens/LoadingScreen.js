import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Image, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LoadingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const letters = ['O', 'P', 'E', 'N', 'H', 'O', 'N', 'K'];
  const letterAnims = useRef(letters.map(() => ({
    translateX: new Animated.Value(500),
    translateY: new Animated.Value(0),
    scale: new Animated.Value(0.5),
    opacity: new Animated.Value(0),
    rotation: new Animated.Value(0),
  }))).current;
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const wallpaperScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate wallpaper zoom
    Animated.loop(
      Animated.timing(wallpaperScale, {
        toValue: 1.1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();

    // Fire letters into screen with staggered timing - bullet through glass effect
    const animations = letterAnims.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * 80), // Staggered timing
        Animated.parallel([
          Animated.spring(anim.translateX, {
            toValue: 0,
            friction: 2, // Very snappy
            tension: 300, // High tension for fast movement
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Show underline after letters
    const underlineAnimation = Animated.sequence([
      Animated.delay(1000),
      Animated.timing(underlineAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // Show subtitle after underline
    const subtitleAnimation = Animated.sequence([
      Animated.delay(1500),
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([...animations, underlineAnimation, subtitleAnimation]).start();

    const timer = setTimeout(() => {
      navigation.replace('Intro');
    }, 3500);
    return () => clearTimeout(timer);
  }, [navigation, letterAnims, underlineAnim, subtitleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} translucent={true} />
      <Animated.Image
        source={require('../assets/wallpaper.png')}
        style={[
          styles.wallpaper,
          {
            transform: [{ scale: wallpaperScale }],
          }
        ]}
        resizeMode="cover"
      />
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            {letters.map((letter, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.letter,
                  {
                    transform: [
                      { translateX: letterAnims[index].translateX },
                      { translateY: letterAnims[index].translateY },
                      { scale: letterAnims[index].scale },
                      { rotate: letterAnims[index].rotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }) },
                    ],
                    opacity: letterAnims[index].opacity,
                  }
                ]}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>
          <Animated.View
            style={[
              styles.militaryUnderline,
              {
                opacity: underlineAnim,
                transform: [{ scaleX: underlineAnim }],
              }
            ]}
          />
          <Animated.Text
            style={[
              styles.subtitle,
              { opacity: subtitleAnim }
            ]}
          >
            CLASSIFIED ACCESS
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  wallpaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffcc33',
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontFamily: 'Military',
    textShadowColor: 'rgba(255, 204, 51, 1)',
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 20,
    marginHorizontal: 3,
    borderWidth: 2,
    borderColor: '#ffcc33',
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  militaryUnderline: {
    width: 280,
    height: 5,
    backgroundColor: '#ffcc33',
    marginBottom: 40,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
    transformOrigin: 'left',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 30,
    letterSpacing: 8,
    textTransform: 'uppercase',
    fontFamily: 'Military',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
});

export default LoadingScreen;
