import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar, Image, Animated, Easing, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCachedSource, initStoreScreenshots, isStoreScreenshotsEnabled, setStoreScreenshots } from '../components/screenshotCache';
import { appData } from '../data/urls';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheScreenshots, setCacheScreenshots] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    { icon: '🙏', title: 'OPENHONK', subtitle: 'Fan Made App', desc: 'Brought to you by Anon\nMaintained by Anodev' },
    { icon: '🏠', title: 'Home', desc: 'Your gallery of curated sites. Tap any tile to open it in a built-in browser.' },
    { icon: '👈👉', title: 'Swipe Between Tabs', desc: 'Swipe left or right anywhere on the screen to switch between Home, Breb, Sauce, Frens, and Showtime tabs — no need to tap the bottom bar!', swipeDemo: true },
    { icon: '🔍', title: 'Universal Search', desc: 'Tap the search icon on any screen to search across the entire app instantly.' },
    { icon: '🎨', title: 'Themes', desc: 'Tap the theme button to cycle through color themes. Watch the gleam transition!' },
    { icon: '🔒', title: 'Privacy & Security', desc: 'WebView runs in incognito mode — sessions clear when you close.\nHTTP sites show a red badge and block logins.\nHTTPS sites show a green badge.' },
    { icon: '🎬', title: 'Background Playback', desc: 'Videos and audio keep playing when you switch apps or turn off the screen.' },
    { icon: '🛡️', title: 'AdBlock Built-in', desc: 'Ads are automatically blocked across all websites. The block list updates daily.' },
  ];

  useEffect(() => {
    initStoreScreenshots().then(() => {
      setCacheScreenshots(isStoreScreenshotsEnabled());
      setCacheReady(true);
    });
    if (Platform.OS === 'web') {
      navigation.replace('MainTabs');
    } else {
      checkWelcomeShown();
    }
  }, []);

  useEffect(() => {
    if (currentStep === 2 && steps[2].swipeDemo) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(swipeAnim, { toValue: -1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(swipeAnim, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      swipeAnim.stopAnimation();
      swipeAnim.setValue(0);
    }
  }, [currentStep]);

  const goToStep = (step) => {
    if (step < 0 || step >= steps.length) return;
    slideAnim.setValue(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  };

  const checkWelcomeShown = async () => {
    try {
      const value = await AsyncStorage.getItem('welcomeShown');
      if (value === 'true') {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Error checking welcome status:', error);
    }
  };

  const handleContinue = async () => {
    try {
      if (dontShowAgain) {
        await AsyncStorage.setItem('welcomeShown', 'true');
      }
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Error in handleContinue:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleContinue();
    }
  };

  const handleSkip = () => {
    handleContinue();
  };

  const preloadUrls = useMemo(() => {
    const urls = [appData.homepage];

    const collectFromCategory = (cat, max) => {
      if (!cat) return;
      if (Array.isArray(cat.urls)) {
        cat.urls.slice(0, max).forEach(item => {
          if (item.url) urls.push(item.url);
        });
      } else if (typeof cat === 'object') {
        Object.keys(cat).forEach(key => {
          const sub = cat[key];
          if (sub && Array.isArray(sub.urls)) {
            sub.urls.slice(0, 2).forEach(item => {
              if (item.url) urls.push(item.url);
            });
          }
        });
      }
    };

    collectFromCategory(appData.breb, 4);
    collectFromCategory(appData.sauce, 4);
    if (appData.frens?.urls) appData.frens.urls.slice(0, 6).forEach(item => { if (item.url) urls.push(item.url); });
    if (appData.showtime?.urls) appData.showtime.urls.slice(0, 6).forEach(item => { if (item.url) urls.push(item.url); });

    return urls.slice(0, 20);
  }, []);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar hidden={true} translucent={true} />
      <View style={styles.hiddenPreloader} pointerEvents="none">
        {cacheReady && preloadUrls.map((url, i) => {
          const cached = getCachedSource(url);
          return <Image key={i} source={cached.source} style={{ width: 1, height: 1 }} resizeMode="cover" cache="force-cache" />;
        })}
      </View>
      <LinearGradient
        colors={['#1e1e1e', '#1a1a1a', '#2a2a2a']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.glassAccent} />

      {/* Skip button */}
      <TouchableOpacity style={[styles.skipButton, { top: insets.top + 15 }]} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress dots */}
      <View style={[styles.progressContainer, { top: insets.top + 15 }]}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressDot, i === currentStep && styles.progressDotActive]} />
        ))}
      </View>

      <View style={[styles.contentArea, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View
          style={[
            styles.stepContainer,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
                }),
              }],
              opacity: slideAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0, 1, 0],
              }),
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{step.icon}</Text>
          </View>

          {/* Swipe demo animation */}
          {step.swipeDemo && (
            <View style={styles.swipeDemoContainer}>
              <Animated.View
                style={[
                  styles.swipeHand,
                  {
                    transform: [{
                      translateX: swipeAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-60, 0, 60],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.swipeHandIcon}>👆</Text>
              </Animated.View>
              <View style={styles.swipeArrowRow}>
                <Animated.Text style={[styles.swipeArrow, {
                  opacity: swipeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0.3, 0] }),
                }]}>←</Animated.Text>
                <Animated.Text style={[styles.swipeArrow, {
                  opacity: swipeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0.3, 1] }),
                }]}>→</Animated.Text>
              </View>
            </View>
          )}

          {/* Title */}
          <Text style={styles.stepTitle}>{step.title}</Text>
          {step.subtitle && <Text style={styles.stepSubtitle}>{step.subtitle}</Text>}

          {/* Description */}
          <Text style={styles.stepDesc}>{step.desc}</Text>

          {/* VPN recommendation on first step */}
          {currentStep === 0 && (
            <Text style={styles.vpnNote}>🔐 Recommended: Use a Zero Log VPN with DNS Block</Text>
          )}

          {/* Modding note on first step */}
          {currentStep === 0 && (
            <Text style={styles.modNote}>✅ Feel free to mod the app via App Cloner / Lucky Patcher</Text>
          )}

          {/* First run note on first step */}
          {currentStep === 0 && (
            <Text style={styles.firstRunNote}>🕔 Menus may take longer to load on first run. If issues, close & restart app.</Text>
          )}
        </Animated.View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {/* Checkboxes on last step */}
        {isLastStep && (
          <View style={styles.checkboxRow}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setDontShowAgain(!dontShowAgain)}
              >
                <View style={[styles.checkboxInner, dontShowAgain && styles.checkboxChecked]}>
                  {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Don't show again</Text>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => {
                  const next = !cacheScreenshots;
                  setCacheScreenshots(next);
                  setStoreScreenshots(next);
                }}
              >
                <View style={[styles.checkboxInner, cacheScreenshots && styles.checkboxChecked]}>
                  {cacheScreenshots && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Cache screenshots</Text>
            </View>
          </View>
        )}

        <View style={styles.navButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={() => goToStep(currentStep - 1)}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{isLastStep ? 'Get Started' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hiddenPreloader: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#30d4af37',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    transform: [{ scaleX: 1.5 }],
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444444',
    marginRight: 5,
  },
  progressDotActive: {
    backgroundColor: '#ffcc33',
    width: 20,
    borderRadius: 4,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 204, 51, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 204, 51, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconEmoji: {
    fontSize: 48,
  },
  swipeDemoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    height: 80,
    justifyContent: 'center',
  },
  swipeHand: {
    marginBottom: 5,
  },
  swipeHandIcon: {
    fontSize: 36,
  },
  swipeArrowRow: {
    flexDirection: 'row',
    gap: 80,
  },
  swipeArrow: {
    fontSize: 24,
    color: '#ffcc33',
  },
  stepTitle: {
    fontSize: 32,
    color: '#ffcc33',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'gunmetal',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#ffcc33',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
  },
  stepDesc: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  vpnNote: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  modNote: {
    fontSize: 14,
    color: '#30d4af',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  firstRunNote: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    paddingHorizontal: 30,
    paddingTop: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#ffcc33',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ffcc33',
  },
  checkmark: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555555',
  },
  backButtonText: {
    color: '#aaaaaa',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#ffcc33',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 160,
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
