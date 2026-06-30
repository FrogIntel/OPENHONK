import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Image, FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import ScreenshotImage from '../components/ScreenshotImage';
import { newContent } from '../data/urls';
import { markAllNewContentSeen, markNewContentSeen, refreshNewContent } from '../utils/newContent';
import SideMenu from '../components/SideMenu';
import NotificationIcon from '../components/NotificationIcon';
import { appData } from '../data/urls';

const NewContentScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isLandscape = width > 360;
  const numColumns = isLandscape ? 3 : 2;
  const tilePadding = 10;
  const tileWidth = (width - tilePadding * (numColumns + 1)) / numColumns;
  const [menuVisible, setMenuVisible] = useState(false);

  const openUrl = (url, title) => {
    markNewContentSeen(url);
    navigation.navigate('WebView', { url, title });
  };

  const handleMarkAll = async () => {
    await markAllNewContentSeen();
    refreshNewContent();
  };

  const getFaviconUrl = (url) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ThemedBackground theme={theme} />
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar hidden={true} translucent={true} />

        <FlatList
          key={`new-content-grid-${numColumns}`}
          style={styles.content}
          contentContainerStyle={{ paddingTop: 60, paddingBottom: insets.bottom + 20, paddingHorizontal: tilePadding, alignItems: 'center' }}
          data={newContent.filter(item => item.version === 'v1.0.14')}
          numColumns={numColumns}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <Text style={[styles.headerText, { color: theme.primaryColor }]}>New Content Added</Text>
              <Text style={[styles.subHeaderText, { color: theme.textSecondaryColor }]}>{newContent.filter(item => item.version === 'v1.0.14').length} new entries added in v1.0.14</Text>
              <TouchableOpacity style={[styles.markAllBtn, { borderColor: theme.primaryColor + '66' }]} onPress={handleMarkAll}>
                <Text style={[styles.markAllText, { color: theme.primaryColor }]}>Mark All as Seen</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridItem, { width: tileWidth, marginLeft: tilePadding }]}
              onPress={() => openUrl(item.url, item.title)}
            >
              <View style={[styles.gridThumbnail, { width: tileWidth, height: tileWidth * 0.75 }]}>
                <ScreenshotImage
                  url={item.url}
                  style={styles.gridImage}
                />
                <View style={styles.gridOverlay}>
                  <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 36, height: 36 }} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>NEW CONTENT</Text>
          <View style={styles.headerRight}>
            <NotificationIcon onPress={() => navigation.navigate('Category', { categoryKey: 'notifications', categoryTitle: 'NOTIFICATIONS', data: appData.notifications })} primaryColor={theme.primaryColor} />
          </View>
        </View>
      </SafeAreaView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
    marginRight: 'auto',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerSection: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 14,
    marginBottom: 15,
  },
  markAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridItem: {
    marginBottom: 20,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});

export default NewContentScreen;
