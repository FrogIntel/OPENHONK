import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, SafeAreaView, Text, Platform, StatusBar, Image, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appData } from '../data/urls';
import { searchAllApp } from '../utils/globalSearch';
import SearchGridModal from '../components/SearchGridModal';
import NotificationIcon from '../components/NotificationIcon';

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'menu': '☰',
    'notifications': '🔔',
    'search': '🔍',
    'share-outline': '📤',
    'close': '✕',
    'arrow-back': '←',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(appData.homepage);

  useEffect(() => {
    checkWelcomeShown();
  }, []);

  const checkWelcomeShown = async () => {
    try {
      const value = await AsyncStorage.getItem('welcomeShown');
      if (value !== 'true') {
        setWelcomeVisible(true);
      }
    } catch (error) {
      console.error('Error checking welcome status:', error);
    }
  };

  const handleWelcomeContinue = async () => {
    try {
      if (dontShowAgain) {
        await AsyncStorage.setItem('welcomeShown', 'true');
      }
      setWelcomeVisible(false);
    } catch (error) {
      console.error('Error in handleWelcomeContinue:', error);
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

  const openUrl = (url) => {
    navigation.navigate('WebView', { url, title: 'External Link' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={28} color="#ffcc33" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OPENHONK</Text>
        <View style={styles.headerRight}>
          <NotificationIcon onPress={() => navigation.navigate('Category', { categoryKey: 'notifications', categoryTitle: 'NOTIFICATIONS', data: appData.notifications })} primaryColor="#ffcc33" size={28} />
          <TouchableOpacity onPress={() => setSearchVisible(true)}>
            <Icon name="search" size={28} color="#ffcc33" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share-outline" size={28} color="#ffcc33" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.webview}>
        {webViewLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#ffcc33" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        )}
        <WebView
          source={{ uri: appData.homepage }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          onError={() => setWebViewLoading(false)}
        />
      </View>

      <SearchGridModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onOpenUrl={(url, title) => openUrl(url)}
        primaryColor="#ffcc33"
      />

      {/* Welcome Modal */}
      <Modal
        visible={welcomeVisible}
        animationType="fade"
        onRequestClose={() => setWelcomeVisible(false)}
      >
        <SafeAreaView style={styles.welcomeModal} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <Image
            source={require('../assets/wallpaper.png')}
            style={styles.welcomeBackground}
            resizeMode="cover"
          />
          <View style={styles.welcomeOverlay}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>W E L C O M E   t o</Text>
              <Text style={styles.welcomeTitle}>O P E N H O N K 🐸</Text>
              
              <Text style={styles.welcomeText}>
                🙏 Fan Made App
                {'\n'}🕴 Brought To You By Anon 🍿
                {'\n'}🔧 Maintained by Anodev 
                {'\n'}🔐 Recommended to use a Zero Log VPN with DNS Block
              </Text>
              
              <Text style={styles.welcomeDescription}>
                Please follow tutorial on Github or Telegram chan to remove adverts built in by developer platform, makes for a better experience
              </Text>
              
              <Text style={styles.welcomeSection}>✅ Feel free to mod the app via App Cloner / Lucky Patcher etc</Text>
              
              <Text style={styles.welcomeWarning}>
                ⛔ Logging into websites within the app will retain cookies.
                {'\n'}Remember to logout and clear app data if finished
              </Text>
              
              <Text style={styles.welcomeNote}>
                🕔 Menus make take longer to load on first run, any issues loading, close & restart app
              </Text>
              
              <View style={styles.welcomeCheckbox}>
                <TouchableOpacity onPress={() => setDontShowAgain(!dontShowAgain)}>
                  <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                    {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Don't show again</Text>
              </View>
              <TouchableOpacity style={styles.welcomeButton} onPress={handleWelcomeContinue}>
                <Text style={styles.welcomeButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#ffcc33',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffcc33',
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 15,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    padding: 40,
    borderRadius: 15,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffcc33',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#ffffff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchResults: {
    flex: 1,
    padding: 15,
  },
  resultItem: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 5,
  },
  resultCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffcc33',
    marginBottom: 5,
  },
  resultUrl: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noResults: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginTop: 30,
  },
  welcomeModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  welcomeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    borderWidth: 2,
    borderColor: '#ffcc33',
  },
  welcomeTitle: {
    fontSize: 32,
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'gunmetal',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffcc33',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 1,
  },
  welcomeDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#cccccc',
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  welcomeSection: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffcc33',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 1,
  },
  welcomeWarning: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  welcomeNote: {
    fontSize: 14,
    fontWeight: '400',
    color: '#cccccc',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ffcc33',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ffcc33',
  },
  checkmark: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  welcomeButton: {
    backgroundColor: '#ffcc33',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  welcomeButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default HomeScreen;
