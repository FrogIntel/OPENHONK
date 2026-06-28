import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Image, Dimensions, Animated, Modal, PanResponder, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ScreenshotImage, { AnimatedScreenshotImage } from '../components/ScreenshotImage';
import SlideshowImage from '../components/SlideshowImage';
import { prefetchItems, prefetchUrl } from '../components/screenshotCache';
import ThemedBackground from '../components/ThemedBackground';
import SideMenu from '../components/SideMenu';
import { appData } from '../data/urls';
import { getFilteredUrls } from '../utils/filteredData';
import { searchAllApp } from '../utils/globalSearch';
import SearchGridModal from '../components/SearchGridModal';
import NotificationIcon from '../components/NotificationIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_HEIGHT = 130;
const HERO_HEIGHT = 340;
const SPOTLIGHT_HEIGHT = 272;
const WIDE_TILE_HEIGHT = 150;
const SMALL_TILE_HEIGHT = 110;

const getFaviconUrl = (url) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return null;
  }
};

const FavIcon = ({ url, size }) => {
  const faviconUrl = getFaviconUrl(url);
  return <Image source={faviconUrl ? { uri: faviconUrl } : require('../assets/favicon.png')} style={{ width: size, height: size }} />;
};

const findFrensUrl = (title) => {
  const item = appData.frens.urls.find(u => u.title === title);
  return item ? item.url : null;
};

const findShowtimeUrl = (title) => {
  for (const subCat of Object.keys(appData.showtime)) {
    const item = appData.showtime[subCat].urls.find(u => u.title === title);
    if (item) return item.url;
  }
  return null;
};

function GalleryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, themeKey, setTheme, themes } = useTheme();
  const [searchVisible, setSearchVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Screen swipe navigation - cycle through main tabs: Home -> Breb -> Sauce -> Frens -> Showtime
  const screenPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        return isHorizontal;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          navigation.navigate('BrebTab');
        } else if (gestureState.dx > 40) {
          navigation.navigate('ShowtimeTab');
        }
      },
    })
  ).current;
  
  // Gallery data
  const [heroItems, setHeroItems] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [conspiracyItems, setConspiracyItems] = useState([]);
  const [spotlightItems, setSpotlightItems] = useState([]);
  const [brebItems, setBrebItems] = useState([]);
  const [sauceItems, setSauceItems] = useState([]);
  const [frensItems, setFrensItems] = useState([]);
  const [showtimeItems, setShowtimeItems] = useState([]);
  
  // Animation refs (hero only - spotlight/breb/sauce use SlideshowImage)
  const heroAnim1 = useRef(new Animated.Value(1)).current;
  const heroAnim2 = useRef(new Animated.Value(0)).current;
  
  // Current slideshow indices
  const [heroIndex, setHeroIndex] = useState(0);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [brebIndex, setBrebIndex] = useState(0);
  const [sauceIndex, setSauceIndex] = useState(0);
  const [frensIndex, setFrensIndex] = useState(0);
  const [showtimeIndex, setShowtimeIndex] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  // Re-render tiles when gaining focus to pick up newly cached screenshots
  useFocusEffect(
    useCallback(() => {
      setRefreshTick(t => t + 1);
    }, [])
  );

  useEffect(() => {
    // Load gallery data first
    loadGalleryData();
  }, []);

  useEffect(() => {
    const cleanupFns = [];
    if (heroItems.length > 0) {
      cleanupFns.push(startHeroSlideshow());
    }
    return () => cleanupFns.forEach(fn => fn && fn());
  }, [heroItems]);

  const loadGalleryData = () => {
    // Hero - OpenHonk homepage pinned at top
    const homepageItem = {
      title: 'OPENHONK',
      url: appData.homepage,
      category: 'Home',
      preview: `https://api.microlink.io/?url=${encodeURIComponent(appData.homepage)}&screenshot=true&meta=false&embed=screenshot.url`
    };
    
    // Get random items from all categories for hero
    const allItems = getAllWebsites;
    const randomItems = [...allItems].sort(() => Math.random() - 0.5).slice(0, 10);
    setHeroItems([homepageItem, ...randomItems]);
    
    // News
    setNewsItems(appData.news && appData.news.urls ? appData.news.urls.slice(0, 20) : []);
    
    // Conspiracy
    setConspiracyItems(appData.conspiracy && appData.conspiracy.urls ? appData.conspiracy.urls.slice(0, 20) : []);
    
    // Spotlight - use all items except reel and openhonk homepage
    const spotlightData = allItems
      .filter(item => !item.url.includes('openhonk_home') && !item.url.includes('reel_browser'))
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);
    setSpotlightItems(spotlightData);
    
    // Breb - random entries from all subcategories
    const brebData = getRandomWebsitesFromAllCategories(appData.breb, 20);
    setBrebItems(brebData);
    
    // Sauce - random entries from all subcategories
    const sauceData = getRandomWebsitesFromAllCategories(appData.sauce, 20);
    setSauceItems(sauceData);
    
    // Frens
    if (appData.frens && appData.frens.urls) {
      setFrensItems(getFilteredUrls(appData.frens.urls).slice(0, 20));
    }
    
    // Showtime
    if (appData.showtime) {
      const allShowtime = [];
      Object.keys(appData.showtime).forEach(subCat => {
        if (appData.showtime[subCat]?.urls) {
          allShowtime.push(...getFilteredUrls(appData.showtime[subCat].urls));
        }
      });
      setShowtimeItems(allShowtime.slice(0, 20));
    }

    // Priority 1: Home screen visible tiles only
    prefetchUrl(appData.homepage, true);
    prefetchItems(brebData.slice(0, 3), 3, true);
    prefetchItems(sauceData.slice(0, 3), 3, true);
    if (appData.frens?.urls) prefetchItems(getFilteredUrls(appData.frens.urls).slice(0, 3), 3, true);
    if (appData.showtime) {
      const allShowtime = [];
      Object.keys(appData.showtime).forEach(subCat => {
        if (appData.showtime[subCat]?.urls) {
          allShowtime.push(...getFilteredUrls(appData.showtime[subCat].urls));
        }
      });
      prefetchItems(allShowtime.slice(0, 3), 3, true);
    }
    prefetchItems(spotlightData.slice(0, 3), 3, true);

    // Priority 2: Background load remaining visible URLs only
    // App.js handles full background load of all URLs
    prefetchItems(allItems, 20, false);
    prefetchItems(brebData, 20, false);
    prefetchItems(sauceData, 20, false);
    if (appData.frens?.urls) prefetchItems(getFilteredUrls(appData.frens.urls), 50, false);
    if (appData.showtime) {
      const allShowtime = [];
      Object.keys(appData.showtime).forEach(subCat => {
        if (appData.showtime[subCat]?.urls) {
          allShowtime.push(...getFilteredUrls(appData.showtime[subCat].urls));
        }
      });
      prefetchItems(allShowtime, 50, false);
    }
  };

  const getAllWebsites = React.useMemo(() => {
    const items = [];
    const previewUrl = (url) => `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    const faviconUrl = (url) => {
      try {
        return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=256`;
      } catch (e) {
        return null;
      }
    };
    
    const addItems = (urls, categoryTitle) => {
      if (!Array.isArray(urls)) return;
      getFilteredUrls(urls).forEach(item => {
        if (item.url && item.url.trim() !== '') {
          items.push({
            title: item.title,
            url: item.url,
            category: categoryTitle || 'General',
            preview: previewUrl(item.url),
            favicon: faviconUrl(item.url),
          });
        }
      });
    };
    
    // Add homepage
    if (appData.homepage) {
      items.push({
        title: 'OPENHONK Homepage',
        url: appData.homepage,
        category: 'Homepage',
        preview: previewUrl(appData.homepage),
        favicon: faviconUrl(appData.homepage),
      });
    }
    
    // Helper to add nested or flat category
    const addCategory = (data) => {
      if (!data) return;
      if (Array.isArray(data.urls)) {
        // Flat category with title and urls
        addItems(data.urls, data.title);
      } else if (typeof data === 'object') {
        // Nested categories
        Object.keys(data).forEach(key => {
          const category = data[key];
          if (category && Array.isArray(category.urls)) {
            addItems(category.urls, category.title);
          }
        });
      }
    };
    
    addCategory(appData.sauce);
    addCategory(appData.breb);
    addCategory(appData.news);
    addCategory(appData.conspiracy);
    addCategory(appData.spotlight);
    addCategory(appData.frens);
    addCategory(appData.showtime);
    
    return items;
  }, []);

  const getWebsitesFromCategory = (categoryKey, limit) => {
    const category = appData.breb[categoryKey];
    if (!category || !category.urls) return [];
    
    return category.urls
      .filter(item => item.url && item.url.trim() !== '')
      .slice(0, limit)
      .map(item => ({
        title: item.title,
        url: item.url,
        category: category.title,
        preview: `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&meta=false&embed=screenshot.url`
      }));
  };

  const getWebsitesFromSubCategory = (subCategoryKey, limit) => {
    const category = appData.sauce[subCategoryKey];
    if (!category || !category.urls) return [];
    
    return category.urls
      .filter(item => item.url && item.url.trim() !== '')
      .slice(0, limit)
      .map(item => ({
        title: item.title,
        url: item.url,
        category: category.title,
        preview: `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&meta=false&embed=screenshot.url`
      }));
  };

  const getRandomWebsitesFromAllCategories = (categoryData, limit) => {
    const items = [];
    Object.keys(categoryData).forEach(key => {
      const category = categoryData[key];
      if (category && category.urls) {
        category.urls.forEach(item => {
          if (item.url && item.url.trim() !== '') {
            items.push({
              title: item.title,
              url: item.url,
              category: category.title,
              preview: `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&meta=false&embed=screenshot.url`
            });
          }
        });
      }
    });
    return items.sort(() => Math.random() - 0.5).slice(0, limit);
  };

  const startHeroSlideshow = () => {
    return () => {};
  };

  const openUrl = (url, title) => {
    if (url) {
      navigation.navigate('WebView', { url, title });
    }
  };

  const openCategory = (categoryKey, categoryTitle, dataType) => {
    let data;
    if (dataType === 'sauce' || dataType === 'tacoToppings') {
      data = appData.sauce;
    } else if (dataType === 'breb' || dataType === 'misc') {
      data = appData.breb;
    } else if (dataType === 'frens') {
      data = appData.frens;
    } else if (dataType === 'showtime') {
      data = appData.showtime;
    } else if (dataType === 'notifications') {
      data = appData.notifications;
    }
    navigation.navigate('Category', { categoryKey, categoryTitle, data });
  };

  const openShowtimeUrl = (title) => {
    for (const subCat of Object.keys(appData.showtime)) {
      const showtimeItem = appData.showtime[subCat].urls.find(item => item.title === title);
      if (showtimeItem && showtimeItem.url) {
        navigation.navigate('WebView', { url: showtimeItem.url, title: showtimeItem.title });
        return;
      }
    }
  };

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
👉 https://t.me/s/openhonk
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

  const headerHeight = 50;

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={[]}>
        <StatusBar hidden={true} translucent={true} />
        <View style={{ flex: 1 }} {...screenPanResponder.panHandlers}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight }}>

      {/* Hero Card - OpenHonk */}
        <TouchableOpacity 
          style={styles.heroCard}
          onPress={() => openUrl(appData.homepage, 'OPENHONK')}
        >
          <Image
            source={require('../assets/openhonk_tile.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Second Row - Breb and Sauce */}
        <View style={styles.stackedTiles}>
          <TouchableOpacity 
            style={styles.tile}
            onPress={() => navigation.navigate('BrebTab')}
          >
            <SlideshowImage
              items={brebItems}
              style={styles.tileImage}
              intervalMs={5500}
              crossfadeMs={1400}
              startDelay={1500}
              fadeDelay={100}
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileLabel}>BREB</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tile}
            onPress={() => navigation.navigate('SauceTab')}
          >
            <SlideshowImage
              items={sauceItems}
              style={styles.tileImage}
              intervalMs={5500}
              crossfadeMs={1400}
              startDelay={2500}
              fadeDelay={200}
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileLabel}>SAUCE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Spotlight Tile */}
        <TouchableOpacity 
          style={styles.spotlightTile}
          onPress={() => {
            const currentItem = spotlightItems[spotlightIndex];
            if (currentItem && currentItem.url) openUrl(currentItem.url, currentItem.title);
          }}
        >
          <SlideshowImage
            items={spotlightItems}
            style={styles.spotlightImage}
            intervalMs={5500}
            crossfadeMs={1400}
            startDelay={500}
            fadeDelay={300}
            onIndexChange={(idx) => setSpotlightIndex(idx)}
          />
          <View style={styles.tileOverlay}>
            <Text style={styles.tileLabel}>SPOTLIGHT</Text>
            <Text style={styles.tileSubtitle}>{spotlightItems[spotlightIndex]?.title || 'Loading...'}</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom Row - REEL, FRENS, SHOWTIME */}
        <View style={styles.stackedTiles}>
          <TouchableOpacity 
            style={styles.tile}
            onPress={() => navigation.navigate('WebView', { url: 'file:///android_asset/reel_browser/index.html', title: 'REEL' })}
          >
            <Image
              source={require('../assets/reel_tile.png')}
              style={styles.tileImage}
              resizeMode="cover"
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileLabel}>REEL</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tile}
            onPress={() => openCategory('frens', 'FRENS', 'frens')}
          >
            <SlideshowImage
              items={frensItems}
              style={styles.tileImage}
              intervalMs={6500}
              crossfadeMs={1400}
              startDelay={3500}
              fadeDelay={500}
              onIndexChange={(idx) => setFrensIndex(idx)}
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileSubtitle}>{frensItems[frensIndex]?.title || 'Loading...'}</Text>
              <Text style={styles.tileLabel}>FRENS</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tile}
            onPress={() => navigation.navigate('ShowtimeTab')}
          >
            <SlideshowImage
              items={showtimeItems}
              style={styles.tileImage}
              intervalMs={7000}
              crossfadeMs={1400}
              startDelay={4500}
              fadeDelay={600}
              onIndexChange={(idx) => setShowtimeIndex(idx)}
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileSubtitle}>{showtimeItems[showtimeIndex]?.title || 'Loading...'}</Text>
              <Text style={styles.tileLabel}>SHOWTIME</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pepecoin Miner Game Tile */}
        <TouchableOpacity
          style={styles.spotlightTile}
          onPress={() => openUrl('https://eilfelsnow.itch.io/pepecoin-miner', 'PEPECOIN MINER')}
        >
          <Image
            source={require('../assets/5IYSHb.png')}
            style={styles.spotlightImage}
            resizeMode="cover"
          />
          <View style={styles.tileOverlay}>
            <Text style={styles.tileLabel}>PEPECOIN MINER</Text>
            <Text style={styles.tileSubtitle}>Tap to play 🐸</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      </View>

      {/* Floating header overlay - tiles scroll underneath */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 36, height: 36 }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>{''}</Text>
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

      </SafeAreaView>
      
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />

      <SearchGridModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onOpenUrl={openUrl}
        navigation={navigation}
        primaryColor={theme.primaryColor}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Gunmetal',
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 15,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    height: HERO_HEIGHT,
    borderRadius: 28,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fbbc11',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#ffffff',
  },
  stackedTiles: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    height: TILE_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'flex-end',
  },
  tileLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  tileSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffcc33',
    marginTop: 4,
  },
  spotlightTile: {
    height: SPOTLIGHT_HEIGHT,
    borderRadius: 22,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  wideTile: {
    height: WIDE_TILE_HEIGHT,
    borderRadius: 22,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  wideTileImage: {
    width: '100%',
    height: '100%',
  },
  smallTiles: {
    flexDirection: 'row',
    gap: 12,
  },
  horizontalScroll: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  themeSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 10,
  },
  themeSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 2,
  },
  themeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  themeButtonActive: {
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  themeButtonTextActive: {
    color: '#000000',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  smallTile: {
    flex: 1,
    height: SMALL_TILE_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  smallTileImage: {
    width: '100%',
    height: '100%',
  },
  smallTileLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchModal: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    padding: 10,
    borderRadius: 8,
  },
  searchResults: {
    flex: 1,
    padding: 15,
  },
  searchResultItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  searchResultCategory: {
    fontSize: 14,
  },
});

export default GalleryScreen;
