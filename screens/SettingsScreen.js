import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Image, ScrollView, ActivityIndicator, Alert, Modal, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ThemedBackground from '../components/ThemedBackground';
import SideMenu from '../components/SideMenu';
import { appData } from '../data/urls';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { getCookieDomains, clearCookieDomain, clearAllCookies } from '../components/cookieManager';
import { isStoreScreenshotsEnabled, setStoreScreenshots, getCacheStats, clearScreenshotCache, initStoreScreenshots } from '../components/screenshotCache';
import { refreshRemovedUrls } from '../utils/filteredData';

const REMOVED_URLS_KEY = '@removed_urls';

// Module-level scan state so liveness checker continues in the background
// while the user navigates away from the settings screen.
const scanState = {
  isScanning: false,
  abort: false,
  abortController: null,
  totalUrls: 0,
  checkedCount: 0,
  deadUrls: [],
  checkedUrls: [],
  progress: 0,
  startTime: null,
};

const scanListeners = [];

const notifyScanListeners = () => {
  scanListeners.forEach(cb => cb());
};

const subscribeScan = (cb) => {
  scanListeners.push(cb);
  return () => {
    const idx = scanListeners.indexOf(cb);
    if (idx >= 0) scanListeners.splice(idx, 1);
  };
};


const collectAllUrls = () => {
  const urls = [];
  if (appData.sauce) {
    Object.entries(appData.sauce).forEach(([catKey, cat]) => {
      if (cat.urls) {
        cat.urls.forEach((item) => {
          urls.push({ title: item.title, url: item.url, section: cat.title });
        });
      }
    });
  }
  if (appData.breb) {
    Object.entries(appData.breb).forEach(([catKey, cat]) => {
      if (cat.urls) {
        cat.urls.forEach((item) => {
          urls.push({ title: item.title, url: item.url, section: cat.title });
        });
      }
    });
  }
  if (appData.frens && appData.frens.urls) {
    appData.frens.urls.forEach((item) => {
      urls.push({ title: item.title, url: item.url, section: 'Frens' });
    });
  }
  if (appData.showtime) {
    Object.keys(appData.showtime).forEach(subCat => {
      if (appData.showtime[subCat]?.urls) {
        appData.showtime[subCat].urls.forEach((item) => {
          urls.push({ title: item.title, url: item.url, section: appData.showtime[subCat].title });
        });
      }
    });
  }
  return urls;
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
};

const BROWSER_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Single fetch attempt. Resolves: 'alive' | 'dead' | 'error'
// 'error' means transient/connection issue (retry-able), distinct from a real HTTP failure.
const livenessAttempt = async (url, method, timeoutMs, abortSignal) => {
  let timeoutId;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    const response = await Promise.race([
      fetch(url, {
        method: method,
        redirect: 'follow',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: abortSignal,
      }),
      timeoutPromise,
    ]);
    clearTimeout(timeoutId);
    const status = response.status;
    if (status > 0 && status < 600) return 'alive';
    return 'error';
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    if (e && e.name === 'AbortError') return 'aborted';
    return 'error';
  }
};

const checkUrlLiveness = async (url, abortSignal) => {
  // GET first (universally supported); HEAD as a lighter retry.
  // Only declare dead after multiple confirming attempts, so SSL/transient
  // quirks (sites that still load fine in the WebView) aren't flagged.
  const attempts = [
    () => livenessAttempt(url, 'GET', 12000, abortSignal),
    () => livenessAttempt(url, 'HEAD', 10000, abortSignal),
    () => livenessAttempt(url, 'GET', 15000, abortSignal),
  ];

  let errorCount = 0;
  for (const attempt of attempts) {
    const result = await attempt();
    if (result === 'aborted') return 'aborted';
    if (result === 'alive') return true;
    if (result === 'error') errorCount += 1;
  }
  // All attempts errored without a single HTTP response → treat as dead.
  return errorCount < attempts.length;
};

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, themeKey, setTheme, themes } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalChecked, setTotalChecked] = useState(0);
  const [deadUrls, setDeadUrls] = useState([]);
  const [removedUrls, setRemovedUrls] = useState([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [selectedDeadUrls, setSelectedDeadUrls] = useState(new Set());
  const [selectedRemovedUrls, setSelectedRemovedUrls] = useState(new Set());

  const [cookieModalVisible, setCookieModalVisible] = useState(false);
  const [cookieDomains, setCookieDomains] = useState([]);
  const [selectedCookies, setSelectedCookies] = useState(new Set());
  const [cookieSearch, setCookieSearch] = useState('');
  const [clearingCookies, setClearingCookies] = useState(false);

  const [storeScreenshots, setStoreScreenshotsState] = useState(false);
  const [cacheCount, setCacheCount] = useState(0);

  React.useEffect(() => {
    initStoreScreenshots().then(() => {
      setStoreScreenshotsState(isStoreScreenshotsEnabled());
      setCacheCount(getCacheStats().count);
    });
  }, []);

  const handleToggleStoreScreenshots = (enabled) => {
    setStoreScreenshots(enabled);
    setStoreScreenshotsState(enabled);
    if (!enabled) {
      setCacheCount(0);
    }
  };

  const handleClearScreenshotCache = () => {
    if (cacheCount === 0) return;
    Alert.alert(
      'Clear Screenshot Cache',
      `Remove all ${cacheCount} cached screenshot${cacheCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearScreenshotCache();
            setCacheCount(0);
          },
        },
      ]
    );
  };

  const loadRemovedUrls = async () => {
    try {
      const stored = await AsyncStorage.getItem(REMOVED_URLS_KEY);
      if (stored) {
        setRemovedUrls(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading removed URLs:', e);
    }
  };

  React.useEffect(() => {
    loadRemovedUrls();
  }, []);

  const handleCheckUrls = useCallback(async () => {
    if (scanState.isScanning) return;

    scanState.isScanning = true;
    scanState.abort = false;
    scanState.abortController = new AbortController();
    scanState.deadUrls = [];
    scanState.checkedUrls = [];
    scanState.checkedCount = 0;
    scanState.progress = 0;
    scanState.startTime = Date.now();
    setChecking(true);
    setHasChecked(false);
    setSelectedDeadUrls(new Set());
    setDeadUrls([]);
    setTotalChecked(0);
    setProgress(0);
    notifyScanListeners();

    const allUrls = collectAllUrls().filter(item => !removedUrls.includes(item.url));
    scanState.totalUrls = allUrls.length;
    const batchSize = 5;
    const signal = scanState.abortController.signal;

    for (let i = 0; i < allUrls.length; i += batchSize) {
      if (scanState.abort) break;
      const batch = allUrls.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (item) => {
          const alive = await checkUrlLiveness(item.url, signal);
          return { ...item, alive };
        })
      );
      if (scanState.abort) break;
      results.forEach(r => {
        if (r.alive === 'aborted') return;
        scanState.checkedUrls.push(r);
        if (!r.alive) {
          scanState.deadUrls.push(r);
        }
      });
      scanState.checkedCount = Math.min(i + batchSize, allUrls.length);
      scanState.progress = ((i + batchSize) / allUrls.length) * 100;
      notifyScanListeners();
    }

    scanState.isScanning = false;
    scanState.abortController = null;
    if (!scanState.abort) {
      scanState.progress = 100;
    }
    notifyScanListeners();
  }, [removedUrls]);

  const handleAbortScan = useCallback(() => {
    scanState.abort = true;
    if (scanState.abortController) {
      scanState.abortController.abort();
    }
  }, []);

  const handleClearResults = useCallback(() => {
    scanState.isScanning = false;
    scanState.abort = false;
    if (scanState.abortController) {
      scanState.abortController.abort();
      scanState.abortController = null;
    }
    scanState.deadUrls = [];
    scanState.checkedUrls = [];
    scanState.checkedCount = 0;
    scanState.progress = 0;
    scanState.totalUrls = 0;
    setDeadUrls([]);
    setTotalChecked(0);
    setProgress(0);
    setHasChecked(false);
    setChecking(false);
    setSelectedDeadUrls(new Set());
    notifyScanListeners();
  }, []);

  useEffect(() => {
    // Restore current scan state on mount (in case scan was started while away)
    if (scanState.isScanning) {
      setChecking(true);
      setHasChecked(false);
    } else if (scanState.checkedCount > 0) {
      setHasChecked(true);
      setChecking(false);
    }
    setDeadUrls(scanState.deadUrls);
    setTotalChecked(scanState.checkedCount);
    setProgress(scanState.progress);

    const unsubscribe = subscribeScan(() => {
      setDeadUrls([...scanState.deadUrls]);
      setTotalChecked(scanState.checkedCount);
      setProgress(scanState.progress);
      setChecking(scanState.isScanning);
      if (!scanState.isScanning && scanState.checkedCount > 0) {
        setHasChecked(true);
      }
    });

    return unsubscribe;
  }, []);

  const handleRemoveUrl = async (url) => {
    const newRemoved = [...removedUrls, url];
    setRemovedUrls(newRemoved);
    setDeadUrls(prev => prev.filter(item => item.url !== url));
    setSelectedDeadUrls(prev => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    try {
      await AsyncStorage.setItem(REMOVED_URLS_KEY, JSON.stringify(newRemoved));
      refreshRemovedUrls();
    } catch (e) {
      console.error('Error saving removed URLs:', e);
    }
  };

  const handleClearAllDeadUrls = async () => {
    if (deadUrls.length === 0) return;
    Alert.alert(
      'Clear All Dead URLs',
      `Remove all ${deadUrls.length} dead URL${deadUrls.length !== 1 ? 's' : ''} from the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            const newRemoved = [...removedUrls, ...deadUrls.map(d => d.url)];
            setRemovedUrls(newRemoved);
            setDeadUrls([]);
            setSelectedDeadUrls(new Set());
            try {
              await AsyncStorage.setItem(REMOVED_URLS_KEY, JSON.stringify(newRemoved));
              refreshRemovedUrls();
            } catch (e) {
              console.error('Error saving removed URLs:', e);
            }
          },
        },
      ]
    );
  };

  const handleRestoreUrls = async () => {
    try {
      await AsyncStorage.removeItem(REMOVED_URLS_KEY);
      setRemovedUrls([]);
      setSelectedRemovedUrls(new Set());
      refreshRemovedUrls();
      Alert.alert('Restored', 'All removed URLs have been restored.');
    } catch (e) {
      console.error('Error restoring URLs:', e);
    }
  };

  const toggleRemovedUrlSelection = (url) => {
    setSelectedRemovedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleRestoreSelected = async () => {
    if (selectedRemovedUrls.size === 0) return;
    const toRestore = Array.from(selectedRemovedUrls);
    const newRemoved = removedUrls.filter(u => !selectedRemovedUrls.has(u));
    setRemovedUrls(newRemoved);
    setSelectedRemovedUrls(new Set());
    try {
      if (newRemoved.length === 0) {
        await AsyncStorage.removeItem(REMOVED_URLS_KEY);
      } else {
        await AsyncStorage.setItem(REMOVED_URLS_KEY, JSON.stringify(newRemoved));
      }
    } catch (e) {
      console.error('Error restoring selected URLs:', e);
    }
  };

  const toggleDeadUrlSelection = (url) => {
    setSelectedDeadUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleRemoveSelectedDeadUrls = async () => {
    if (selectedDeadUrls.size === 0) return;
    const toRemove = Array.from(selectedDeadUrls);
    const newRemoved = [...removedUrls, ...toRemove];
    setRemovedUrls(newRemoved);
    setDeadUrls(prev => prev.filter(item => !selectedDeadUrls.has(item.url)));
    setSelectedDeadUrls(new Set());
    try {
      await AsyncStorage.setItem(REMOVED_URLS_KEY, JSON.stringify(newRemoved));
      refreshRemovedUrls();
    } catch (e) {
      console.error('Error saving removed URLs:', e);
    }
  };

  const loadCookieDomains = async () => {
    try {
      const domains = await getCookieDomains();
      setCookieDomains(domains);
      setSelectedCookies(new Set());
    } catch (e) {
      console.error('Error loading cookie domains:', e);
    }
  };

  const handleOpenCookieManager = async () => {
    await loadCookieDomains();
    setCookieModalVisible(true);
  };

  const toggleCookieSelection = (domain) => {
    setSelectedCookies(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleClearSelectedCookies = async () => {
    if (selectedCookies.size === 0) return;
    setClearingCookies(true);
    try {
      for (const domain of selectedCookies) {
        await clearCookieDomain(domain);
      }
      await loadCookieDomains();
    } catch (e) {
      console.error('Error clearing cookies:', e);
    }
    setClearingCookies(false);
  };

  const handleClearAllCookies = async () => {
    if (cookieDomains.length === 0) {
      Alert.alert('No Cookies', 'No cookies found to clear.');
      return;
    }
    Alert.alert(
      'Clear All Cookies',
      `Remove all ${cookieDomains.length} stored cookie${cookieDomains.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearingCookies(true);
            try {
              await clearAllCookies();
              await loadCookieDomains();
            } catch (e) {
              console.error('Error clearing all cookies:', e);
            }
            setClearingCookies(false);
          },
        },
      ]
    );
  };

  const themeKeys = Object.keys(themes);
  const filteredCookieDomains = cookieDomains.filter(d =>
    !cookieSearch || d.toLowerCase().includes(cookieSearch.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      <ThemedBackground theme={theme} />
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar hidden={true} translucent={true} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 36, height: 36 }} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>SETTINGS</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>Theme</Text>
            <Text style={styles.sectionDescription}>Select a theme for the app.</Text>
            <View style={styles.themeGrid}>
              {themeKeys.map((key) => {
                const t = themes[key];
                const isActive = key === themeKey;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeItem,
                      {
                        borderColor: isActive ? theme.primaryColor : '#333',
                        borderWidth: isActive ? 2 : 1,
                        backgroundColor: t.backgroundColor,
                      },
                    ]}
                    onPress={() => setTheme(key)}
                  >
                    <View style={[styles.themeColorRow, { backgroundColor: t.backgroundColor }]}>
                      <View style={[styles.themeColorDot, { backgroundColor: t.primaryColor }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.secondaryColor }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.tertiaryColor }]} />
                    </View>
                    <Text style={[styles.themeName, { color: isActive ? theme.primaryColor : '#ffffff' }]}>
                      {t.name}
                    </Text>
                    {isActive && <Text style={[styles.themeActive, { color: theme.primaryColor }]}>ACTIVE</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cookie Manager Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>Cookie Manager</Text>
            <Text style={styles.sectionDescription}>
              View and clear stored cookies from websites visited in the browser.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.primaryColor }]}
              onPress={handleOpenCookieManager}
            >
              <Text style={[styles.actionButtonText, { color: theme.primaryColor }]}>MANAGE COOKIES</Text>
            </TouchableOpacity>
          </View>

          {/* Screenshot Cache Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>Screenshot Cache</Text>
            <Text style={styles.sectionDescription}>
              Store live screenshots locally for faster app reloading. Blocked or error screenshots are automatically detected and skipped.
            </Text>

            <TouchableOpacity
              style={[styles.toggleRow, { borderColor: theme.primaryColor }]}
              onPress={() => handleToggleStoreScreenshots(!storeScreenshots)}
            >
              <View style={[styles.toggleSwitch, storeScreenshots && { backgroundColor: theme.primaryColor }]}>
                <View style={[styles.toggleKnob, storeScreenshots && styles.toggleKnobActive]} />
              </View>
              <Text style={[styles.toggleLabel, { color: theme.primaryColor }]}>
                {storeScreenshots ? 'ENABLED' : 'DISABLED'}
              </Text>
            </TouchableOpacity>

            <View style={styles.cacheInfoRow}>
              <Text style={styles.cacheInfoText}>
                {cacheCount} screenshot{cacheCount !== 1 ? 's' : ''} cached
              </Text>
              {cacheCount > 0 && (
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: '#ff4444' }]}
                  onPress={handleClearScreenshotCache}
                >
                  <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>CLEAR CACHE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* URL Liveness Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryColor }]}>URL Liveness Checker</Text>
            <Text style={styles.sectionDescription}>
              Check all URLs in the app for liveness. Dead URLs can be removed individually or all at once.
            </Text>

            <View style={styles.livenessButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: theme.primaryColor, flex: 1, marginBottom: 0 }]}
                onPress={checking ? handleAbortScan : handleCheckUrls}
              >
                {checking ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color={theme.primaryColor} />
                    <Text style={[styles.actionButtonText, { color: theme.primaryColor }]}>
                      ABORT SCAN
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.actionButtonText, { color: theme.primaryColor }]}>
                    CHECK ALL URLs
                  </Text>
                )}
              </TouchableOpacity>

              {(checking || hasChecked || deadUrls.length > 0 || totalChecked > 0) && (
                <TouchableOpacity
                  style={[styles.smallButton, { borderColor: '#ff4444', marginLeft: 10 }]}
                  onPress={handleClearResults}
                >
                  <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>CLEAR RESULTS</Text>
                </TouchableOpacity>
              )}
            </View>

            {(checking || totalChecked > 0) && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: theme.primaryColor }]} />
              </View>
            )}

            {(checking || totalChecked > 0) && (
              <Text style={[styles.resultText, { color: '#aaaaaa' }]}>
                Checked {totalChecked}{scanState.totalUrls > 0 ? ` / ${scanState.totalUrls}` : ''}
                {deadUrls.length > 0 ? ` · ${deadUrls.length} dead` : ''}
                {checking ? ' · scanning...' : totalChecked > 0 ? ' · complete' : ''}
              </Text>
            )}

            {hasChecked && !checking && deadUrls.length === 0 && totalChecked > 0 && (
              <Text style={[styles.resultText, { color: '#44ff44' }]}>
                All URLs are alive!
              </Text>
            )}

            {deadUrls.length > 0 && (
              <View style={styles.deadList}>
                <View style={styles.deadListActions}>
                  <Text style={[styles.deadListTitle, { color: theme.primaryColor }]}>Dead URLs:</Text>
                  <View style={styles.deadActionButtons}>
                    {selectedDeadUrls.size > 0 && (
                      <TouchableOpacity
                        style={[styles.smallButton, { borderColor: '#ff4444' }]}
                        onPress={handleRemoveSelectedDeadUrls}
                      >
                        <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>
                          REMOVE SELECTED ({selectedDeadUrls.size})
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.smallButton, { borderColor: '#ff4444' }]}
                      onPress={handleClearAllDeadUrls}
                    >
                      <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>CLEAR ALL DEAD</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {deadUrls.map((item, index) => {
                  const isSelected = selectedDeadUrls.has(item.url);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.deadItem, { borderLeftColor: isSelected ? theme.primaryColor : '#ff4444' }]}
                      onPress={() => toggleDeadUrlSelection(item.url)}
                      onLongPress={() => handleRemoveUrl(item.url)}
                    >
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? theme.primaryColor : '#666',
                            backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                          },
                        ]} />
                      </View>
                      <View style={styles.deadItemContent}>
                        <Text style={styles.deadItemTitle}>{item.title}</Text>
                        <Text style={styles.deadItemUrl} numberOfLines={1}>{item.url}</Text>
                        <Text style={styles.deadItemSection}>{item.section}</Text>
                      </View>
                      <View style={styles.deadItemActions}>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => {
                            setMenuVisible(false);
                            navigation.navigate('WebView', { url: item.url, title: item.title });
                          }}
                        >
                          <Text style={styles.viewButtonText}>VIEW</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveUrl(item.url)}
                        >
                          <Text style={styles.removeButtonText}>REMOVE</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.hintText}>Tap to select. Long press to remove instantly.</Text>
              </View>
            )}

            {removedUrls.length > 0 && (
              <View style={styles.removedSection}>
                <View style={styles.removedActions}>
                  <Text style={[styles.removedTitle, { color: theme.primaryColor }]}>
                    {removedUrls.length} URL{removedUrls.length !== 1 ? 's' : ''} removed
                  </Text>
                  <View style={styles.deadActionButtons}>
                    {selectedRemovedUrls.size > 0 && (
                      <TouchableOpacity
                        style={[styles.smallButton, { borderColor: theme.primaryColor }]}
                        onPress={handleRestoreSelected}
                      >
                        <Text style={[styles.smallButtonText, { color: theme.primaryColor }]}>
                          RESTORE SELECTED ({selectedRemovedUrls.size})
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.smallButton, { borderColor: theme.primaryColor }]}
                      onPress={handleRestoreUrls}
                    >
                      <Text style={[styles.smallButtonText, { color: theme.primaryColor }]}>RESTORE ALL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {removedUrls.map((url, index) => {
                  const isSelected = selectedRemovedUrls.has(url);
                  const item = collectAllUrls().find(u => u.url === url);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.deadItem, { borderLeftColor: isSelected ? theme.primaryColor : '#666' }]}
                      onPress={() => toggleRemovedUrlSelection(url)}
                    >
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? theme.primaryColor : '#666',
                            backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                          },
                        ]} />
                      </View>
                      <View style={styles.deadItemContent}>
                        <Text style={styles.deadItemTitle}>{item ? item.title : url}</Text>
                        <Text style={styles.deadItemUrl} numberOfLines={1}>{url}</Text>
                        {item && <Text style={styles.deadItemSection}>{item.section}</Text>}
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => {
                          setMenuVisible(false);
                          navigation.navigate('WebView', { url, title: item ? item.title : '' });
                        }}
                      >
                        <Text style={styles.viewButtonText}>VIEW</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />

      {/* Cookie Manager Modal */}
      <Modal
        visible={cookieModalVisible}
        animationType="slide"
        onRequestClose={() => setCookieModalVisible(false)}
      >
        <SafeAreaView style={styles.cookieModal} edges={[]}>
          <StatusBar hidden={true} translucent={true} />
          <View style={styles.cookieHeader}>
            <TouchableOpacity onPress={() => setCookieModalVisible(false)}>
              <Text style={[styles.cookieCloseBtn, { color: theme.primaryColor }]}>← BACK</Text>
            </TouchableOpacity>
            <Text style={[styles.cookieModalTitle, { color: theme.primaryColor }]}>COOKIE MANAGER</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.cookieActions}>
            <TouchableOpacity
              style={[styles.smallButton, { borderColor: '#ff4444' }]}
              onPress={handleClearAllCookies}
              disabled={clearingCookies || cookieDomains.length === 0}
            >
              <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>CLEAR ALL</Text>
            </TouchableOpacity>
            {selectedCookies.size > 0 && (
              <TouchableOpacity
                style={[styles.smallButton, { borderColor: '#ff4444' }]}
                onPress={handleClearSelectedCookies}
                disabled={clearingCookies}
              >
                <Text style={[styles.smallButtonText, { color: '#ff4444' }]}>
                  CLEAR SELECTED ({selectedCookies.size})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.cookieSearchInput}
            placeholder="Search cookies..."
            placeholderTextColor="#888888"
            value={cookieSearch}
            onChangeText={setCookieSearch}
          />

          {clearingCookies ? (
            <ActivityIndicator size="large" color={theme.primaryColor} style={{ marginTop: 30 }} />
          ) : filteredCookieDomains.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cookies found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCookieDomains}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedCookies.has(item);
                return (
                  <TouchableOpacity
                    style={[styles.cookieItem, { borderLeftColor: isSelected ? theme.primaryColor : '#333' }]}
                    onPress={() => toggleCookieSelection(item)}
                  >
                    <View style={styles.checkboxContainer}>
                      <View style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? theme.primaryColor : '#666',
                          backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                        },
                      ]} />
                    </View>
                    <Text style={styles.cookieDomain} numberOfLines={1}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    gap: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    marginBottom: 20,
    lineHeight: 20,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeItem: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  themeColorRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  themeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeActive: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actionButton: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  livenessButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#888',
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#0d0d0d',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cacheInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cacheInfoText: {
    fontSize: 14,
    color: '#aaaaaa',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  deadList: {
    marginTop: 10,
  },
  deadListActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  deadListTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  deadActionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
  },
  deadItemContent: {
    flex: 1,
  },
  deadItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  deadItemUrl: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  deadItemSection: {
    fontSize: 11,
    color: '#ffcc33',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ff4444',
  },
  deadItemActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFD700',
  },
  hintText: {
    fontSize: 11,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  removedSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  removedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  removedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  restoreButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cookieModal: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  cookieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cookieCloseBtn: {
    fontSize: 14,
    fontWeight: '700',
  },
  cookieModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cookieActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 15,
    flexWrap: 'wrap',
  },
  cookieSearchInput: {
    marginHorizontal: 15,
    marginBottom: 10,
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 8,
  },
  cookieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 6,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  cookieDomain: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default SettingsScreen;
