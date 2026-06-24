import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, TextInput, Modal, ActivityIndicator, Dimensions, Animated, Image, PanResponder, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import { AnimatedScreenshotImage } from '../components/ScreenshotImage';
import { appData } from '../data/urls';
import { getFilteredUrls } from '../utils/filteredData';
import { searchAllApp } from '../utils/globalSearch';
import SideMenu from '../components/SideMenu';
import SearchGridModal from '../components/SearchGridModal';
import NotificationIcon from '../components/NotificationIcon';

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'menu': '☰',
    'notifications': '🔔',
    'search': '🔍',
    'share-outline': '📤',
    'close': '✕',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const SauceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const carouselHeight = isLandscape ? 130 : 200;
  const [searchVisible, setSearchVisible] = useState(false);
  const [currentWebsiteIndex, setCurrentWebsiteIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const sauceData = appData.sauce;
  const scrollViewRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Tab swipe navigation
  const screenPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        return isHorizontal;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          navigation.navigate('FrensTab');
        } else if (gestureState.dx > 40) {
          navigation.navigate('BrebTab');
        }
      },
    })
  ).current;

  // Get random websites from all sauce categories for carousel
  const getRandomWebsites = () => {
    const allWebsites = [];
    Object.keys(sauceData).forEach(subCategory => {
      const categoryData = sauceData[subCategory];
      if (categoryData && categoryData.urls) {
        getFilteredUrls(categoryData.urls).forEach(item => {
          if (item && item.url && item.url.trim() !== '') {
            allWebsites.push({ ...item, category: categoryData.title });
          }
        });
      }
    });
    // Shuffle and take 5
    return allWebsites.sort(() => Math.random() - 0.5).slice(0, 5);
  };

  const carouselWebsites = getRandomWebsites();
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    let isMounted = true;
    // Ken Burns effect - continuous zoom
    const animate = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted) animate();
      });
    };
    animate();

    // Auto-rotate carousel
    const interval = setInterval(() => {
      setCurrentWebsiteIndex((prev) => (prev + 1) % carouselWebsites.length);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      scaleAnim.stopAnimation();
    };
  }, [carouselWebsites.length, scaleAnim]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: currentWebsiteIndex * screenWidth,
        animated: true,
      });
    }
  }, [currentWebsiteIndex, screenWidth]);

  const handleShare = async () => {
    try {
      await Share.open({
        title: 'Hey Frens! Check This!',
        message: `Hey check out this app if you can. It deserves your attention! Banned from Google Play Store!

It's a Truther app for Android, Tablets and Chromebooks.

Great Red Pills!

Download Now:
➡ https://github.com/FrogIntel/OPENHONK/releases

🐸 OPENHONK by Frog Intel
👉 https://t.me/s/frogintel
👉 https://github.com/FrogIntel`,
        url: 'https://github.com/FrogIntel/OPENHONK/releases',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setSearchResults(searchAllApp(query));
  };

  const openUrl = (url, title) => {
    if (url) {
      navigation.navigate('WebView', { url, title });
    }
  };

  const openCategory = (categoryKey, categoryTitle) => {
    navigation.navigate('Category', { categoryKey, categoryTitle, data: sauceData });
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }} {...screenPanResponder.panHandlers}>
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar hidden={true} translucent={true} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 36, height: 36 }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>SAUCE</Text>
        <View style={styles.headerRight}>
          <NotificationIcon onPress={() => navigation.navigate('Category', { categoryKey: 'notifications', categoryTitle: 'NOTIFICATIONS', data: appData.notifications })} primaryColor={theme.primaryColor} />
          <TouchableOpacity onPress={() => setSearchVisible(true)}>
            <Image source={require('../assets/app3679992_search.png')} style={{ width: 36, height: 36 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Image source={require('../assets/app3679992_share.png')} style={{ width: 36, height: 36 }} />
          </TouchableOpacity>
        </View>
      </View>

      <SearchGridModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onOpenUrl={openUrl}
        primaryColor={theme.primaryColor}
      />

      <View style={[styles.carouselContainer, { height: carouselHeight }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.carouselScroll, { height: carouselHeight }]}
        >
          {carouselWebsites.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.carouselItem, { width, height: carouselHeight }]}
              onPress={() => openUrl(item.url, item.title)}
            >
              <AnimatedScreenshotImage
                url={item.url}
                style={[
                  styles.carouselImage,
                  { width, height: carouselHeight },
                  { transform: [{ scale: scaleAnim }] }
                ]}
              />
              <View style={styles.carouselOverlay}>
                <Text style={styles.carouselTitle}>{item.title}</Text>
                <Text style={styles.carouselCategory}>{item.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {Object.entries(sauceData).map(([key, category]) => {
          const filteredCount = getFilteredUrls(category.urls).length;
          return (
          <TouchableOpacity
            key={key}
            style={styles.categoryItem}
            onPress={() => openCategory(key, category.title)}
          >
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{filteredCount} items</Text>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
    marginRight: 'auto',
    textAlign: 'left',
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 15,
  },
  searchModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#ffcc33',
  },
  searchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
  },
  searchResults: {
    flex: 1,
    padding: 15,
  },
  searchResultItem: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffcc33',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 5,
  },
  searchResultCategory: {
    fontSize: 14,
    color: '#ffcc33',
  },
  carouselContainer: {
    height: 200,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#ffcc33',
  },
  carouselScroll: {
    height: 200,
  },
  carouselItem: {
    width: Dimensions.get('window').width,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  carouselImage: {
    position: 'absolute',
    width: Dimensions.get('window').width,
    height: 200,
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    alignItems: 'flex-end',
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 4,
    textAlign: 'right',
  },
  carouselCategory: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  categoryItem: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffcc33',
    elevation: 3,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 5,
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 204, 51, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Gunmetal',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffcc33',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default SauceScreen;
