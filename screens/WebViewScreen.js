import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, StatusBar, BackHandler, Modal, Linking, Alert, Clipboard, ToastAndroid } from 'react-native';
import { startBackgroundAudio, stopBackgroundAudio } from '../utils/backgroundAudio';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import { isAdDomain, getAdBlockJS, fetchAdBlockList } from '../components/adBlockList';
import { trackCookieDomain } from '../components/cookieManager';
import { NativeModules } from 'react-native';

const { CookiePersistModule } = NativeModules;
const RUMBLE_COOKIE_KEY = '@rumble_cookies';

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'arrow-back': '←',
    'menu': '☰',
    'refresh': '↻',
    'copy': '⧉',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const WebViewScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const webViewRef = useRef(null);
  const { url, title } = route.params;
  const [canGoBack, setCanGoBack] = useState(false);
  const [reelIntroVisible, setReelIntroVisible] = useState(title === 'REEL' || url?.includes('anitabuidpe') || url?.includes('reel_browser'));
  const [adBlockJS, setAdBlockJS] = useState(getAdBlockJS());
  const [currentUrl, setCurrentUrl] = useState(url);
  const [reelHtml, setReelHtml] = useState(null);
  const [reelLoading, setReelLoading] = useState(true);
  const [defaultBookmarks, setDefaultBookmarks] = useState(null);
  const [isInsecure, setIsInsecure] = useState(false);
  const [isLocalContent, setIsLocalContent] = useState(url?.startsWith('file://') || false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [cookiesReady, setCookiesReady] = useState(true);
  const scrollPositions = useRef({});
  const isGoingBack = useRef(false);
  const isReelBrowser = title === 'REEL' || url?.includes('anitabuidpe') || url?.includes('reel_browser');
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
      stopBackgroundAudio();
    };
  }, []);

  // Restore rumble cookies after incognito clears them on WebView mount
  useEffect(() => {
    if (!isReelBrowser && initialUrl && initialUrl.includes('rumble.com') && Platform.OS === 'android' && CookiePersistModule) {
      // Incognito's removeAllCookies is async — wait for it to complete, then restore and reload
      const timer = setTimeout(async () => {
        const savedCookies = await AsyncStorage.getItem(RUMBLE_COOKIE_KEY);
        if (savedCookies && savedCookies.length > 0) {
          await CookiePersistModule.setCookies(initialUrl, savedCookies);
          // Reload so the page loads with restored cookies
          if (webViewRef.current) {
            webViewRef.current.reload();
          }
        }
      }, 800);
      return () => clearTimeout(timer);
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

  // Restore rumble cookies before loading a rumble page
  const restoreRumbleCookies = async (pageUrl) => {
    if (!pageUrl || !pageUrl.includes('rumble.com')) return;
    if (Platform.OS === 'android' && CookiePersistModule) {
      try {
        const savedCookies = await AsyncStorage.getItem(RUMBLE_COOKIE_KEY);
        if (savedCookies && savedCookies.length > 0) {
          await CookiePersistModule.setCookies(pageUrl, savedCookies);
        }
      } catch (e) {}
    }
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

  const handleBack = () => {
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
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      <ThemedBackground theme={theme} />
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
        style={[styles.webview, { marginTop: isReelBrowser ? 0 : 50, marginBottom: isReelBrowser ? 0 : Math.max(insets.bottom, 0) }]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        cacheEnabled={!isReelBrowser && !isLocalContent}
        cacheMode={(isReelBrowser || isLocalContent) ? 'LOAD_NO_CACHE' : 'LOAD_DEFAULT'}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        incognito={!isReelBrowser && !currentUrl?.includes('openhonk_home')}
        allowsFullscreenVideo={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures={true}
        setSupportMultipleWindows={true}
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
              if (isAdDomain(targetUrl) || targetUrl.includes('decafeligiblyhad.com') || targetUrl.includes('cpcstar.com') || targetUrl.includes('mbdippex.com') || targetUrl.includes('tapecontent.net') || targetUrl.includes('tapepops.com') || targetUrl.includes('abysscdn.com') || targetUrl.includes('sssrr.org') || targetUrl.includes('morphify.net') || targetUrl.includes('acertb.com')) {
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
            window._ohk_a = atob('aHR0cHM6Ly9hbmF0YTJicjk4bC5sYXN0YXBwLmRldg==');
            window._ohk_b = atob('OWI1YzcyOGYtN2ZlMS00Mzk1LWJhNGEtOTAxZmQ0NDY1MmFh');
            try {
              Object.defineProperty(window.location, 'origin', {
                get: function() { return 'https://anitabuidpe.lastapp.dev'; }
              });
            } catch(e) {}
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
          })();
        ` : (adBlockJS + `
          (function() {
            var scrollTimer = null;
            window.addEventListener('scroll', function() {
              if (scrollTimer) clearTimeout(scrollTimer);
              scrollTimer = setTimeout(function() {
                try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'scroll', url: window.location.href, y: window.scrollY})); } catch(e) {}
              }, 300);
            }, {passive: true});
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
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={handleBack}>
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
      </View>
      {loadProgress > 0 && loadProgress < 1 && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${loadProgress * 100}%`, backgroundColor: theme.primaryColor }]} />
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 11,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
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
