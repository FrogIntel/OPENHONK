import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, StatusBar, BackHandler, Modal, Linking, Alert, Clipboard, ToastAndroid, Animated } from 'react-native';
import { startBackgroundAudio, stopBackgroundAudio } from '../utils/backgroundAudio';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import FunkyLoader from '../components/FunkyLoader';
import { isAdDomain, getAdBlockJS, fetchAdBlockList } from '../components/adBlockList';
import { trackCookieDomain, getCookieDomains } from '../components/cookieManager';
import { NativeModules } from 'react-native';

const { CookiePersistModule, OrientationModule } = NativeModules;
const RUMBLE_COOKIE_KEY = '@rumble_cookies';

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'arrow-back': '←',
    'menu': '☰',
    'refresh': '↻',
    'copy': '⧉',
    'incognito': '🕶',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const WebViewScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const webViewRef = useRef(null);
  const { url, title } = route.params;
  const [canGoBack, setCanGoBack] = useState(false);
  const [reelIntroVisible, setReelIntroVisible] = useState(title === 'REEL' || url?.includes('reel_browser'));
  const [adBlockJS, setAdBlockJS] = useState(getAdBlockJS());
  const [currentUrl, setCurrentUrl] = useState(url);
  const [reelHtml, setReelHtml] = useState(null);
  const [reelLoading, setReelLoading] = useState(true);
  const [defaultBookmarks, setDefaultBookmarks] = useState(null);
  const [isInsecure, setIsInsecure] = useState(false);
  const [isLocalContent, setIsLocalContent] = useState(url?.startsWith('file://') || false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [keepCookies, setKeepCookies] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const scrollPositions = useRef({});
  const isGoingBack = useRef(false);
  const keepCookiesRef = useRef(false);
  const saveAllCookiesTimer = useRef(null);
  const isReelBrowser = title === 'REEL' || url?.includes('reel_browser');
  const initialUrl = url;

  useEffect(() => {
    if (isReelBrowser) {
      RNFS.readFileAssets('reel_browser/default_bookmarks.json', 'base64')
        .then(data => {
          setDefaultBookmarks(data);
          const bookmarkHash = data.length + '_' + data.substring(0, 32);
          AsyncStorage.getItem('@reel_bookmarks_version').then(storedVersion => {
            if (storedVersion && storedVersion !== bookmarkHash) {
              AsyncStorage.setItem('@reel_bookmarks_updated', JSON.stringify({ date: new Date().toISOString(), version: bookmarkHash }));
              AsyncStorage.setItem('@reel_bookmarks_version', bookmarkHash);
            } else if (!storedVersion) {
              AsyncStorage.setItem('@reel_bookmarks_version', bookmarkHash);
            }
          });
        })
        .catch(e => {});
    }
  }, [isReelBrowser]);

  useEffect(() => {
    if (isReelBrowser) {
      AsyncStorage.getItem('@reel_bookmarks_updated').then(updatedData => {
        if (updatedData) {
          const updateInfo = JSON.parse(updatedData);
          AsyncStorage.getItem('@reel_bookmarks_update_prompted').then(prompted => {
            if (prompted === updateInfo.version) return;
            AsyncStorage.setItem('@reel_bookmarks_update_prompted', updateInfo.version);
            Alert.alert(
              'Bookmarks Updated',
              'The default bookmarks have been updated. Would you like to reload them?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes',
                  onPress: () => {
                    if (defaultBookmarks && webViewRef.current) {
                      try {
                        webViewRef.current.injectJavaScript(
                          "(function(){" +
                          "try{" +
                          "var raw=atob('" + defaultBookmarks + "');" +
                          "localStorage.setItem('bookmarks',raw);" +
                          "window.ReactNativeWebView.postMessage(JSON.stringify({type:'bookmarks_set'}));" +
                          "}catch(e){console.error('Failed to set bookmarks:',e);}" +
                          "})();"
                        );
                      } catch (e) {
                        console.error('[REEL] Failed to inject updated bookmarks:', e);
                      }
                    }
                  },
                },
              ]
            );
          });
        }
      });
    }
  }, [isReelBrowser, defaultBookmarks]);

  useEffect(() => {
    fetchAdBlockList().then(() => {
      setAdBlockJS(getAdBlockJS());
    });
    AsyncStorage.getItem('@keep_cookies').then(val => {
      const enabled = val === 'true';
      setKeepCookies(enabled);
      keepCookiesRef.current = enabled;
      setSettingsLoaded(true);
    });
    if (isReelBrowser) {
      setCurrentUrl('file:///android_asset/reel_browser/index.html');
      setReelLoading(false);
    } else {
      setReelLoading(false);
    }
    startBackgroundAudio();
    return () => {
      // Save rumble cookies before unmount
      if (currentUrl && currentUrl.includes('rumble.com')) {
        saveRumbleCookies(currentUrl);
      }
      // Save all tracked domain cookies before unmount (when keepCookies is ON)
      saveAllCookies();
      // Clear all cookies on unmount when keepCookies is OFF
      if (!keepCookiesRef.current && Platform.OS === 'android' && CookiePersistModule) {
        CookiePersistModule.clearAll();
      }
      // Clear debounce timer
      if (saveAllCookiesTimer.current) clearTimeout(saveAllCookiesTimer.current);
      if (OrientationModule) OrientationModule.unlock();
      stopBackgroundAudio();
    };
  }, []);

  useEffect(() => {
    if (gameMode && OrientationModule) {
      OrientationModule.lockLandscape();
    } else if (OrientationModule) {
      OrientationModule.unlock();
    }
  }, [gameMode]);

  // Auto-enable game mode for itch.io
  useEffect(() => {
    if (currentUrl?.includes('itch.io')) {
      setGameMode(true);
    } else {
      setGameMode(false);
    }
  }, [currentUrl]);

  // Restore all saved cookies before WebView mounts (when keepCookies is ON)
  useEffect(() => {
    if (!isReelBrowser && keepCookies && Platform.OS === 'android' && CookiePersistModule && settingsLoaded) {
      restoreAllCookies();
    }
  }, [settingsLoaded]);

  // Restore rumble cookies before WebView mounts
  useEffect(() => {
    if (!isReelBrowser && initialUrl && initialUrl.includes('rumble.com') && Platform.OS === 'android' && CookiePersistModule) {
      const savedCookies = AsyncStorage.getItem(RUMBLE_COOKIE_KEY).then(cookies => {
        if (cookies && cookies.length > 0) {
          CookiePersistModule.setCookies(initialUrl, cookies);
        }
      });
    }
  }, []);

  // Save rumble cookies when leaving a rumble page
  const saveRumbleCookies = async (pageUrl) => {
    if (!pageUrl || !pageUrl.includes('rumble.com')) return;
    if (Platform.OS === 'android' && CookiePersistModule) {
      try {
        const cookies = await CookiePersistModule.getCookies(pageUrl);
        if (cookies && cookies.length > 0) {
          await AsyncStorage.setItem(RUMBLE_COOKIE_KEY, cookies);
        }
      } catch (e) {}
    }
  };

  // Save cookies for all tracked domains (when keepCookies is ON)
  const saveAllCookies = async () => {
    if (!keepCookiesRef.current || Platform.OS !== 'android' || !CookiePersistModule) return;
    try {
      const domains = await getCookieDomains();
      for (const domain of domains) {
        const url = 'https://' + domain;
        const cookies = await CookiePersistModule.getCookies(url);
        if (cookies && cookies.length > 0) {
          await AsyncStorage.setItem('@cookies_' + domain, cookies);
        }
      }
      CookiePersistModule.flush();
    } catch (e) {}
  };

  // Save cookies for a specific URL's domain (when keepCookies is ON)
  const saveCookiesForUrl = async (pageUrl) => {
    if (!keepCookiesRef.current || Platform.OS !== 'android' || !CookiePersistModule) return;
    try {
      const domain = new URL(pageUrl).hostname;
      const cookies = await CookiePersistModule.getCookies(pageUrl);
      if (cookies && cookies.length > 0) {
        await AsyncStorage.setItem('@cookies_' + domain, cookies);
      }
    } catch (e) {}
  };

  // Restore cookies for all tracked domains (when keepCookies is ON)
  const restoreAllCookies = async () => {
    if (!keepCookiesRef.current || Platform.OS !== 'android' || !CookiePersistModule) return;
    try {
      const domains = await getCookieDomains();
      for (const domain of domains) {
        const url = 'https://' + domain;
        const savedCookies = await AsyncStorage.getItem('@cookies_' + domain);
        if (savedCookies && savedCookies.length > 0) {
          await CookiePersistModule.setCookies(url, savedCookies);
        }
      }
    } catch (e) {}
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleCopyUrl = () => {
    if (currentUrl) {
      Clipboard.setString(currentUrl);
      if (Platform.OS === 'android') {
        ToastAndroid.show('URL copied to clipboard', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'URL copied to clipboard');
      }
    }
  };

  const handleHardwareBack = () => {
    if (canGoBack && webViewRef.current) {
      isGoingBack.current = true;
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        isGoingBack.current = true;
        webViewRef.current.goBack();
        return true;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {!gameMode && <ThemedBackground theme={theme} />}
      <StatusBar hidden={true} translucent={true} />
      <Modal
        visible={reelIntroVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReelIntroVisible(false)}
      >
        <TouchableOpacity style={styles.introOverlay} onPress={() => setReelIntroVisible(false)} activeOpacity={1}>
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>REEL</Text>
            <Text style={styles.introText}>
              Swipe RIGHT or LEFT to navigate through bookmarks and videos.
            </Text>
            <Text style={styles.introSubtext}>
              Tap anywhere to start browsing.
            </Text>
            <View style={styles.introSecurityBox}>
              <Text style={styles.introSecurityTitle}>⚠️ SECURITY NOTICE</Text>
              <Text style={styles.introSecurityText}>
                Security on the REEL is lapse. It is recommended NOT to login to any websites using the REEL currently.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {(!isReelBrowser || (reelHtml || !reelLoading)) && (
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        originWhitelist={['*']}
        webviewDebuggingEnabled={__DEV__}
        style={[styles.webview, { marginTop: (isReelBrowser || gameMode) ? 0 : 50, marginBottom: (isReelBrowser || gameMode) ? 0 : Math.max(insets.bottom, 0) }]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={!currentUrl?.includes('itch.io')}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        allowsFullscreenVideo={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures={!currentUrl?.includes('itch.io')}
        setSupportMultipleWindows={isReelBrowser && !currentUrl?.includes('itch.io')}
        geolocationEnabled={false}
        saveFormDataDisabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
        allowsFileAccess={true}
        allowsFileAccessFromFileURLs={true}
        allowsUniversalAccessFromFileURLs={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        databaseStorageEnabled={true}
        scrollEnabled={true}
        pagingEnabled={false}
        minFontSize={8}
        renderToHardwareTextureAndroid={true}
        overScrollMode="never"
        textZoom={100}
        onLoadProgress={(event) => {
          setLoadProgress(event.nativeEvent.progress);
          if (event.nativeEvent.progress >= 1) {
            if (isGoingBack.current && currentUrl && scrollPositions.current[currentUrl] !== undefined) {
              const scrollY = scrollPositions.current[currentUrl];
              setTimeout(() => {
                webViewRef.current?.injectJavaScript(`
                  try { window.scrollTo(0, ${scrollY}); } catch(e) {}
                  true;
                `);
              }, 100);
              isGoingBack.current = false;
            }
            // Save cookies after rumble page finishes loading
            if (event.nativeEvent.url && event.nativeEvent.url.includes('rumble.com')) {
              saveRumbleCookies(event.nativeEvent.url);
            }
            // Save cookies for current domain when keepCookies is ON
            if (keepCookiesRef.current && event.nativeEvent.url) {
              trackCookieDomain(event.nativeEvent.url);
              saveCookiesForUrl(event.nativeEvent.url);
              // Debounced full save of all tracked domains
              if (saveAllCookiesTimer.current) clearTimeout(saveAllCookiesTimer.current);
              saveAllCookiesTimer.current = setTimeout(() => saveAllCookies(), 2000);
            }
            setTimeout(() => setLoadProgress(0), 300);
          }
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          if (navState.url) {
            trackCookieDomain(navState.url);
            // Save cookies when leaving a rumble page
            if (currentUrl && currentUrl.includes('rumble.com') && !navState.url.includes('rumble.com')) {
              saveRumbleCookies(currentUrl);
            }
            setCurrentUrl(navState.url);
            setIsInsecure(navState.url.startsWith('http://'));
            setIsLocalContent(navState.url.startsWith('file://'));
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          // Special case: thelightpaper.co.uk PDFs open internally via Google Docs viewer
          const lowerUrl = request.url.toLowerCase();
          if (lowerUrl.includes('thelightpaper.co.uk') && (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?'))) {
            if (webViewRef.current) {
              const viewerUrl = 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(request.url);
              webViewRef.current.injectJavaScript(`window.location.href = ${JSON.stringify(viewerUrl)};`);
              setCurrentUrl(viewerUrl);
            }
            return false;
          }
          // Block known ad redirect domains that cause DNS resolution errors
          if (request.url.includes('decafeligiblyhad.com') || request.url.includes('cpcstar.com') || request.url.includes('mbdippex.com') || request.url.includes('tapecontent.net') || request.url.includes('tapepops.com') || request.url.includes('abysscdn.com') || request.url.includes('sssrr.org') || request.url.includes('morphify.net') || request.url.includes('acertb.com')) {
            return false;
          }
          // Allow Cloudflare challenges
          if (request.url.includes('challenges.cloudflare.com') || request.url.includes('cloudflare.com/cdn-cgi/')) {
            return true;
          }
          // Handle non-HTTP schemes externally
          if (request.url.startsWith('tel:') || request.url.startsWith('mailto:') || request.url.startsWith('sms:') || request.url.startsWith('intent:') || request.url.startsWith('whatsapp:') || request.url.startsWith('tg:') || request.url.startsWith('telegram:')) {
            Linking.openURL(request.url).catch(() => {});
            return false;
          }
          // Allow local file:// URLs (bundled assets like openhonk_home, reel_browser)
          if (request.url.startsWith('file://')) {
            return true;
          }
          // Allow about:blank for inline HTML source
          if (request.url.startsWith('about:blank')) {
            return true;
          }
          // Allow HTTP and HTTPS navigations (including redirects)
          if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
            if (isAdDomain(request.url)) {
              return false;
            }
            return true;
          }
          // Open any other scheme externally instead of blocking
          if (!request.url.startsWith('http://') && !request.url.startsWith('https://') && !request.url.startsWith('file://') && !request.url.startsWith('about:blank') && !request.url.startsWith('blob:') && !request.url.startsWith('data:')) {
            if (!request.url.startsWith('intent:') && !request.url.startsWith('whatsapp:') && !request.url.startsWith('tg:') && !request.url.startsWith('telegram:') && !request.url.startsWith('tel:') && !request.url.startsWith('mailto:') && !request.url.startsWith('sms:')) {
              Linking.openURL(request.url).catch(() => {});
            }
            return false;
          }
          // Block unknown schemes
          return false;
        }}
        onOpenWindow={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const targetUrl = nativeEvent.targetUrl;
          if (targetUrl) {
            if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
              if (isAdDomain(targetUrl)) {
                return;
              }
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)};`);
                setCurrentUrl(targetUrl);
              }
            } else {
              Linking.openURL(targetUrl).catch(() => {});
            }
          }
        }}
        injectedJavaScriptBeforeContentLoaded={isReelBrowser ? `
          (function() {
            var origError = window.onerror;
            window.onerror = function(msg, url, line, col, err) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error', msg:msg, url:url, line:line})); } catch(e) {}
              if (origError) return origError.apply(this, arguments);
              return false;
            };
            window.addEventListener('unhandledrejection', function(e) {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'rejection', reason: e.reason && e.reason.message ? e.reason.message : String(e.reason)})); } catch(ex) {}
            });
            window.addEventListener('load', function() {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'load', href: window.location.href, rootChildren: document.getElementById('root') ? document.getElementById('root').children.length : -1})); } catch(e) {}
            });
            // Check if bookmarks are empty and notify RN
            setTimeout(function() {
              try {
                var bm = localStorage.getItem('bookmarks');
                if (!bm || bm === '[]' || bm === 'null') {
                  window.ReactNativeWebView.postMessage(JSON.stringify({type:'no_bookmarks'}));
                }
              } catch(e) {}
            }, 1500);
            setTimeout(function() {
              try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'check', rootChildren: document.getElementById('root') ? document.getElementById('root').children.length : -1, bodyHTML: document.body.innerHTML.substring(0, 200)})); } catch(e) {}
            }, 3000);
            // Block decafeligiblyhad.com inside REEL/TV iframes and popups
            var blockedDomains = ['decafeligiblyhad.com'];
            function isBlockedUrl(url) {
              if (!url) return false;
              var u = url.toLowerCase();
              for (var i = 0; i < blockedDomains.length; i++) {
                if (u.indexOf(blockedDomains[i]) !== -1) return true;
              }
              return false;
            }
            function blockFrames() {
              var frames = document.querySelectorAll('iframe');
              frames.forEach(function(f) {
                if (isBlockedUrl(f.src)) { f.remove(); }
              });
            }
            function startFrameBlocker() {
              blockFrames();
              var frameObserver = new MutationObserver(function(mutations) {
                blockFrames();
              });
              frameObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
              window.addEventListener('load', blockFrames);
              setInterval(blockFrames, 500);
            }
            if (document.body) {
              startFrameBlocker();
            } else {
              window.addEventListener('load', startFrameBlocker);
            }
            var origOpen = window.open;
            window.open = function(url) {
              if (isBlockedUrl(url)) return null;
              return origOpen ? origOpen.apply(this, arguments) : null;
            };
          })();
        ` : (adBlockJS + `
          (function() {
            var blockedDomains = ['decafeligiblyhad.com', 'cpcstar.com', 'mbdippex.com', 'tapecontent.net', 'tapepops.com', 'abysscdn.com', 'sssrr.org', 'morphify.net', 'acertb.com'];
            function isBlockedUrl(url) {
              if (!url) return false;
              var u = url.toLowerCase();
              for (var i = 0; i < blockedDomains.length; i++) {
                if (u.indexOf(blockedDomains[i]) !== -1) return true;
              }
              return false;
            }
            function blockFrames() {
              var frames = document.querySelectorAll('iframe, embed, object');
              frames.forEach(function(f) {
                if (isBlockedUrl(f.src) || isBlockedUrl(f.data)) { f.remove(); }
              });
            }
            function poisonElement(el) {
              if (!el || !el.setAttribute) return;
              var origSetAttribute = el.setAttribute.bind(el);
              var origGetAttribute = el.getAttribute.bind(el);
              el.setAttribute = function(name, value) {
                if ((name === 'src' || name === 'data') && isBlockedUrl(value)) return;
                return origSetAttribute(name, value);
              };
              try {
                Object.defineProperty(el, 'src', {
                  set: function(value) { if (isBlockedUrl(value)) return; origSetAttribute('src', value); },
                  get: function() { return origGetAttribute('src'); }
                });
              } catch(e) {}
            }
            function startFrameBlocker() {
              blockFrames();
              var frameObserver = new MutationObserver(function() { blockFrames(); });
              if (document.body) {
                frameObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data'] });
                setInterval(blockFrames, 300);
              } else {
                window.addEventListener('load', startFrameBlocker);
              }
            }
            startFrameBlocker();
            var origCreate = document.createElement;
            document.createElement = function(tag) {
              var el = origCreate.apply(this, arguments);
              if (tag && (tag.toLowerCase() === 'iframe' || tag.toLowerCase() === 'embed' || tag.toLowerCase() === 'object')) {
                poisonElement(el);
              }
              return el;
            };
            var origCreateNS = document.createElementNS;
            document.createElementNS = function(ns, tag) {
              var el = origCreateNS.apply(this, arguments);
              if (tag && (tag.toLowerCase() === 'iframe' || tag.toLowerCase() === 'embed' || tag.toLowerCase() === 'object')) {
                poisonElement(el);
              }
              return el;
            };
            var origOpen = window.open;
            window.open = function(url) {
              if (isBlockedUrl(url)) return null;
              return origOpen ? origOpen.apply(this, arguments) : null;
            };
            if (window.location.hostname.indexOf('itch.io') === -1) {
              var scrollTimer = null;
              window.addEventListener('scroll', function() {
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() {
                  try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'scroll', url: window.location.href, y: window.scrollY})); } catch(e) {}
                }, 300);
              }, {passive: true});
            }
            // Minimal CSS for itch.io game pages
            if (window.location.hostname.indexOf('itch.io') !== -1) {
              var style = document.createElement('style');
              style.textContent = 'html,body{margin:0!important;padding:0!important;background:#1a2e1a!important;overflow:hidden!important}.header,.footer,.game_info,.formatted_description,.user_formatted,.column,.view_game_footer,.game_devlog,.game_comments,.footer_nav,.columns,.social_buttons,.community{display:none!important}*{-webkit-tap-highlight-color:transparent!important}';
              document.head.appendChild(style);
            }
          })();
        `)}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'scroll' && msg.url) {
              scrollPositions.current[msg.url] = msg.y;
              return;
            }
          } catch(e) {}
          if (isReelBrowser) {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'bookmarks_set') {
                navigation.goBack();
                setTimeout(() => {
                  navigation.navigate('WebView', { url: 'file:///android_asset/reel_browser/index.html', title: 'REEL' });
                }, 300);
                return;
              }
              if (msg.type === 'no_bookmarks' && defaultBookmarks) {
                AsyncStorage.getItem('@reel_bookmarks_prompted').then(prompted => {
                  if (prompted === 'true') return;
                  AsyncStorage.setItem('@reel_bookmarks_prompted', 'true');
                  Alert.alert(
                    'Load Default Bookmarks?',
                    'No bookmarks found in the REEL. Would you like to load the default set of bookmarks?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Yes',
                        onPress: () => {
                          try {
                            webViewRef.current?.injectJavaScript(
                              "(function(){" +
                              "try{" +
                              "var raw=atob('" + defaultBookmarks + "');" +
                              "localStorage.setItem('bookmarks',raw);" +
                              "window.ReactNativeWebView.postMessage(JSON.stringify({type:'bookmarks_set'}));" +
                              "}catch(e){console.error('Failed to set bookmarks:',e);}" +
                              "})();"
                            );
                          } catch (e) {
                            console.error('[REEL] Failed to inject bookmarks:', e);
                          }
                        },
                      },
                    ]
                  );
                });
              }
            } catch (e) {}
          }
        }}
        injectedJavaScript={!isReelBrowser ? `
          (function() {
            function isLightPaperPdf(url) {
              var u = url.toLowerCase();
              return u.indexOf('thelightpaper.co.uk') !== -1 && u.indexOf('.pdf') !== -1;
            }
            function isBlockedAd(url) {
              return url && url.toLowerCase().indexOf('decafeligiblyhad.com') !== -1;
            }
            function openPdfInViewer(url) {
              window.location.href = 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(url);
            }
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href) {
                if (isBlockedAd(a.href)) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
                if (isLightPaperPdf(a.href)) {
                  e.preventDefault();
                  e.stopPropagation();
                  openPdfInViewer(a.href);
                  return false;
                }
              }
            }, true);
            var origOpen = window.open;
            window.open = function(url, target, features) {
              if (!url) return origOpen ? origOpen.apply(this, arguments) : null;
              if (isBlockedAd(url)) return null;
              if (isLightPaperPdf(url)) {
                openPdfInViewer(url);
                return null;
              }
              return origOpen ? origOpen.apply(this, arguments) : null;
            };
            if (window.location.protocol === 'http:') {
              function blockInsecureLogins() {
                document.querySelectorAll('form').forEach(function(form) {
                  if (form._ohkBlocked) return;
                  var hasPassword = form.querySelector('input[type="password"]');
                  if (hasPassword) {
                    form._ohkBlocked = true;
                    form.addEventListener('submit', function(e) {
                      e.preventDefault();
                      e.stopPropagation();
                      alert('SECURITY: This website uses HTTP (not HTTPS). Logins are blocked on insecure connections. Your credentials could be intercepted.');
                      return false;
                    }, true);
                    var submitBtns = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
                    submitBtns.forEach(function(btn) {
                      btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        alert('SECURITY: This website uses HTTP (not HTTPS). Logins are blocked on insecure connections. Your credentials could be intercepted.');
                        return false;
                      }, true);
                    });
                  }
                });
              }
              blockInsecureLogins();
              var observer = new MutationObserver(function() { blockInsecureLogins(); });
              observer.observe(document.body, { childList: true, subtree: true });
            }
          })();
        ` : undefined}
      />
      )}

      {/* Floating header overlay - WebView loads from top of screen */}
      {!gameMode && (
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color={theme.primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>{title}</Text>
        {!isReelBrowser && !isLocalContent && (
          <View style={[styles.protocolBadge, { backgroundColor: isInsecure ? 'rgba(204,0,0,0.8)' : 'rgba(0,153,51,0.8)' }]}>
            <Text style={styles.protocolText}>{isInsecure ? 'HTTP' : 'HTTPS'}</Text>
          </View>
        )}
        {!isReelBrowser && isLocalContent && (
          <View style={[styles.protocolBadge, { backgroundColor: 'rgba(255,204,51,0.8)' }]}>
            <Text style={styles.protocolText}>LOCAL</Text>
          </View>
        )}
        {!isReelBrowser && !isLocalContent && (
          <TouchableOpacity onPress={handleCopyUrl} style={styles.copyButton}>
            <Icon name="copy" size={24} color={theme.primaryColor} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleRefresh}>
          <Icon name="refresh" size={28} color={theme.primaryColor} />
        </TouchableOpacity>
        {!isReelBrowser && !isLocalContent && (
          <TouchableOpacity onPress={() => {
            const newVal = !keepCookies;
            setKeepCookies(newVal);
            keepCookiesRef.current = newVal;
            AsyncStorage.setItem('@keep_cookies', newVal ? 'true' : 'false');
            if (Platform.OS === 'android') {
              ToastAndroid.show(newVal ? 'Cookies will be kept' : 'Incognito: cookies cleared on exit', ToastAndroid.SHORT);
            }
          }} style={{ marginLeft: 10 }}>
            <Icon name="incognito" size={24} color={keepCookies ? theme.textSecondaryColor : theme.primaryColor} />
          </TouchableOpacity>
        )}
      </View>
      )}
      {loadProgress > 0 && loadProgress < 1 && !currentUrl.includes('cloudflare.com') && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <FunkyLoader color={theme.primaryColor} size={64} />
        </View>
      )}
      {loadProgress > 0 && loadProgress < 1 && (
        <View style={styles.progressBarContainer} pointerEvents="none">
          <View style={[styles.progressBar, { width: `${loadProgress * 100}%`, backgroundColor: theme.primaryColor }]} />
          <View style={[styles.progressBarGlow, { width: `${loadProgress * 100}%`, shadowColor: theme.primaryColor }]} />
        </View>
      )}
    </View>
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
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
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
  protocolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  protocolText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  copyButton: {
    paddingHorizontal: 6,
    marginRight: 6,
  },
  webview: {
    flex: 1,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    zIndex: 11,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
  },
  progressBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    opacity: 0.6,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 5,
  },
  introOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  introContent: {
    backgroundColor: '#1a1a1a',
    padding: 30,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffcc33',
    alignItems: 'center',
    width: '100%',
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 20,
    letterSpacing: 3,
    fontFamily: 'Gunmetal',
  },
  introText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  introSubtext: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
  },
  introSecurityBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 100, 50, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 50, 0.5)',
  },
  introSecurityTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ff6b35',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  introSecurityText: {
    fontSize: 13,
    color: '#ffcc99',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WebViewScreen;
