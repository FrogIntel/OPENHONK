import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Platform, StatusBar, Image, Share, Dimensions, TextInput, Modal, ScrollView, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import SideMenu from '../components/SideMenu';
import ScreenshotImage from '../components/ScreenshotImage';
import { appData } from '../data/urls';
import { getFilteredUrls } from '../utils/filteredData';
import { searchAllApp } from '../utils/globalSearch';
import WebsiteCarousel from '../components/WebsiteCarousel';
import SearchGridModal from '../components/SearchGridModal';
import NotificationIcon from '../components/NotificationIcon';
import { isNewContent, markNewContentSeen, useNewContentSync } from '../utils/newContent';
import { prefetchUrl } from '../components/screenshotCache';

const tilePadding = 10;

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

const CategoryScreen = ({ route, navigation }) => {
  useNewContentSync();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numColumns = isLandscape ? 3 : 2;
  const tileWidth = (width - tilePadding * (numColumns + 1)) / numColumns;
  const { categoryKey, categoryTitle, data } = route.params;
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 100 });
  const onViewableItemsChanged = useRef(({ viewableItems, changed }) => {
    // Prefetch screenshots for items currently visible
    viewableItems.forEach(item => {
      if (item.item?.url) prefetchUrl(item.item.url, true);
    });
    // Prefetch next batch ahead of scroll - items right after the last visible one
    if (viewableItems.length > 0) {
      const maxIndex = Math.max(...viewableItems.map(v => v.index || 0));
      const filteredUrls = getFilteredUrls(category.urls) || [];
      const lookahead = 10;
      for (let i = maxIndex + 1; i <= Math.min(maxIndex + lookahead, filteredUrls.length - 1); i++) {
        if (filteredUrls[i]?.url) prefetchUrl(filteredUrls[i].url, false);
      }
    }
  });

  const openMenu = () => setMenuVisible(true);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setSearchResults(searchAllApp(query));
  };

  const openCategory = (catKey, catTitle, dataType) => {
    let catData;
    if (dataType === 'sauce' || dataType === 'tacoToppings') {
      catData = appData.sauce;
    } else if (dataType === 'breb' || dataType === 'misc') {
      catData = appData.breb;
    } else if (dataType === 'frens') {
      catData = appData.frens;
    } else if (dataType === 'showtime') {
      catData = appData.showtime;
    } else if (dataType === 'notifications') {
      catData = appData.notifications;
    }
    navigation.navigate('Category', { categoryKey: catKey, categoryTitle: catTitle, data: catData });
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
        message: `Hey check out this app if you can. It deserves your attention! Banned from Google Play Store!\n\nIt's a Truther app for Android, Tablets and Chromebooks.\n\nGreat Red Pills!\n\nDownload Now:\n➡ https://github.com/FrogIntel/OPENHONK/releases\n\n🐸 OPENHONK by Frog Intel\n👉 https://t.me/s/openhonk\n👉 https://github.com/FrogIntel`,
        url: 'https://github.com/FrogIntel/OPENHONK/releases',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Handle different data structures (nested vs direct)
  let category;
  if (data && data[categoryKey]) {
    category = data[categoryKey];
  } else if (data && data.urls) {
    // Direct object with urls property (frens, showtime)
    category = data;
  } else {
    category = { urls: [] };
  }

  const isNotifications = categoryTitle === 'NOTIFICATIONS';
  const [notifUrls, setNotifUrls] = useState(category.urls || []);

  useEffect(() => {
    if (isNotifications) {
      Promise.all([
        AsyncStorage.getItem('@adblock_last_update'),
        AsyncStorage.getItem('@dismissed_notifications'),
        AsyncStorage.getItem('@reel_bookmarks_updated'),
        AsyncStorage.getItem('@notifications_viewed'),
      ]).then(([stored, dismissedRaw, bookmarksUpdatedRaw, viewedRaw]) => {
        let dismissed = [];
        try { dismissed = JSON.parse(dismissedRaw) || []; } catch (e) {}
        let viewed = {};
        try { viewed = JSON.parse(viewedRaw) || {}; } catch (e) {}
        let adblockEntry = null;
        if (stored) {
          try {
            const info = JSON.parse(stored);
            const isSuccess = info.status !== 'failed';
            adblockEntry = {
              id: 'adblock',
              title: isSuccess ? 'AdBlock Updated' : 'AdBlock Update Failed',
              url: 'https://easylist.to/easylist/easylist.txt',
              message: isSuccess ? `${info.domains} domains loaded from EasyList` : `Update failed: ${info.error || 'Network error'}. Using cached list.`,
              date: info.date,
            };
          } catch (e) {}
        } else {
          adblockEntry = {
            id: 'adblock',
            title: 'AdBlock Pending',
            url: 'https://easylist.to/easylist/easylist.txt',
            message: 'AdBlock list will update on first browser open',
            date: new Date().toISOString(),
          };
        }
        let bookmarkEntry = null;
        if (bookmarksUpdatedRaw) {
          try {
            const bmInfo = JSON.parse(bookmarksUpdatedRaw);
            bookmarkEntry = {
              id: 'bookmarks',
              title: 'Bookmarks Updated',
              url: 'file:///android_asset/reel_browser/index.html',
              message: 'Default REEL bookmarks have been updated. Open REEL to reload.',
              date: bmInfo.date,
            };
          } catch (e) {}
        }
        const allNotifs = [adblockEntry, bookmarkEntry, ...(category.urls || [])]
          .filter(n => n && !dismissed.includes(n.id))
          .map(n => ({
            ...n,
            isNew: !viewed[n.id] || (n.date && new Date(viewed[n.id]) < new Date(n.date)),
          }));
        setNotifUrls(allNotifs);

        const markViewedTimer = setTimeout(async () => {
          const now = new Date().toISOString();
          const updatedViewed = { ...viewed };
          for (const n of allNotifs) {
            if (n.id) updatedViewed[n.id] = n.date || now;
          }
          try {
            await AsyncStorage.setItem('@notifications_viewed', JSON.stringify(updatedViewed));
          } catch (e) {}
        }, 3000);
        return () => clearTimeout(markViewedTimer);
      });
    } else {
      setNotifUrls(category.urls || []);
    }
  }, [isNotifications, categoryKey]);

  const clearAllNotifications = async () => {
    const allIds = notifUrls.map(n => n.id).filter(Boolean);
    await AsyncStorage.setItem('@dismissed_notifications', JSON.stringify(allIds));
    setNotifUrls([]);
  };

  // Get featured websites for carousel (first few URLs)
  const featuredWebsites = category.urls ? getFilteredUrls(category.urls.filter(url => url.url && url.url.trim() !== '')).slice(0, 10) : [];

  // Prefetch first batch of screenshots on screen open
  useEffect(() => {
    const filteredUrls = getFilteredUrls(category.urls) || [];
    const initialBatch = 20;
    for (let i = 0; i < Math.min(initialBatch, filteredUrls.length); i++) {
      if (filteredUrls[i]?.url) prefetchUrl(filteredUrls[i].url, i < 6);
    }
  }, [categoryKey]);

  const openUrl = (url, title) => {
    if (url) {
      navigation.navigate('WebView', { url, title });
    }
  };

  const getScreenshotUrl = (url) => {
    if (!url) return null;
    return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <ThemedBackground theme={theme} />
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar hidden={true} translucent={true} />

      {isNotifications ? (
        <FlatList
          style={styles.content}
          contentContainerStyle={{ paddingTop: 60, paddingBottom: insets.bottom + 20, paddingHorizontal: 15 }}
          data={getFilteredUrls(notifUrls) || []}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            notifUrls.length > 0 ? (
              <TouchableOpacity style={[styles.clearAllBtn, { borderColor: theme.primaryColor + '66' }]} onPress={clearAllNotifications}>
                <Text style={[styles.clearAllText, { color: theme.primaryColor }]}>Clear All</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.notifEmpty}>
              <Text style={[styles.notifEmptyText, { color: theme.textTertiaryColor }]}>No notifications</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAdblock = item.id === 'adblock';
            const isNewContent = item.url && item.url.startsWith('openhonk://');
            const handleNotifPress = () => {
              if (isNewContent) {
                navigation.navigate('NewContent');
              } else {
                openUrl(item.url, item.title);
              }
            };
            const ItemTag = isAdblock ? View : TouchableOpacity;
            return (
            <ItemTag
              style={[styles.notifItem, { borderColor: theme.primaryColor + '33' }]}
              {...(isAdblock ? {} : { onPress: handleNotifPress })}
            >
              <View style={[styles.notifIcon, { backgroundColor: theme.primaryColor + '22' }]}>
                <Text style={[styles.notifIconText, { color: theme.primaryColor }]}>{isAdblock ? '🛡️' : isNewContent ? '🎬' : '🔔'}</Text>
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, { color: theme.textColor }]} numberOfLines={2}>{item.title}</Text>
                  {item.isNew && <View style={styles.notifNewBadge}><Text style={styles.notifNewBadgeText}>NEW</Text></View>}
                </View>
                {item.message ? (
                  <Text style={[styles.notifMessage, { color: theme.textSecondaryColor }]} numberOfLines={3}>{item.message}</Text>
                ) : null}
                <Text style={[styles.notifDate, { color: theme.textTertiaryColor }]}>
                  {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>
              {!isAdblock && <Text style={[styles.notifChevron, { color: theme.primaryColor }]}>›</Text>}
            </ItemTag>
            );
          }}
        />
      ) : (
      <FlatList
        key={`grid-${numColumns}`}
        style={styles.content}
        contentContainerStyle={{ paddingTop: 60, paddingBottom: insets.bottom + 20, paddingHorizontal: tilePadding, alignItems: 'center' }}
        data={(() => {
          const urls = getFilteredUrls(category.urls) || [];
          if (categoryKey === 'putainfo') {
            return urls.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
          }
          return urls;
        })()}
        numColumns={numColumns}
        keyExtractor={(item, index) => index.toString()}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.gridItem, { width: tileWidth, marginLeft: tilePadding }]}
            onPress={() => { markNewContentSeen(item.url); openUrl(item.url, item.title); }}
          >
            <View style={[styles.gridThumbnail, { width: tileWidth, height: tileWidth * 0.75 }]}>
              <ScreenshotImage
                url={item.url}
                style={styles.gridImage}
              />
              <View style={styles.gridOverlay}>
                <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
              </View>
              {isNewContent(item.url) && (
                <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      )}

      {/* Floating header overlay - list scrolls underneath */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={openMenu}>
          <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 36, height: 36 }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>{categoryTitle}</Text>
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
      primaryColor={theme.primaryColor}
    />
    </View>
    </>
  );
};

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
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 10,
    marginRight: 'auto',
    letterSpacing: 1,
    textAlign: 'left',
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 15,
  },
  content: {
    flex: 1,
  },
  gridItem: {
    marginBottom: tilePadding * 2,
  },
  gridThumbnail: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 3,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffcc33',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff3333',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    marginBottom: 10,
    padding: 15,
    borderWidth: 1,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifIconText: {
    fontSize: 22,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    flexShrink: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notifNewBadge: {
    backgroundColor: '#ff3333',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  notifNewBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notifMessage: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 19,
  },
  notifDate: {
    fontSize: 12,
  },
  notifChevron: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },
  clearAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 15,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifEmpty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  notifEmptyText: {
    fontSize: 16,
  },
});

export default CategoryScreen;
