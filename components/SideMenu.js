import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Animated, Modal, PanResponder, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { appData } from '../data/urls';
import { isUrlRemoved } from '../utils/filteredData';

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
  return item && !isUrlRemoved(item.url) ? item.url : null;
};

const findShowtimeUrl = (title) => {
  for (const subCat of Object.keys(appData.showtime)) {
    const item = appData.showtime[subCat].urls.find(u => u.title === title);
    if (item && !isUrlRemoved(item.url)) return item.url;
  }
  return null;
};

const SideMenu = ({ visible, onClose, navigation }) => {
  const { theme, themeKey, setTheme, themes } = useTheme();
  const [menuTranslateX] = React.useState(new Animated.Value(-280));

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          menuTranslateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.timing(menuTranslateX, {
            toValue: -280,
            duration: 300,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.timing(menuTranslateX, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(menuTranslateX, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      menuTranslateX.setValue(-280);
    }
  }, [visible]);

  const openUrl = (url, title) => {
    if (url) {
      onClose();
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
    onClose();
    navigation.navigate('Category', { categoryKey, categoryTitle, data });
  };

  const openShowtimeUrl = (title) => {
    for (const subCat of Object.keys(appData.showtime)) {
      const showtimeItem = appData.showtime[subCat].urls.find(item => item.title === title);
      if (showtimeItem && showtimeItem.url) {
        onClose();
        navigation.navigate('WebView', { url: showtimeItem.url, title: showtimeItem.title });
        return;
      }
    }
  };

  const closeMenu = () => {
    Animated.timing(menuTranslateX, {
      toValue: -280,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={closeMenu}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.menuContent,
            {
              transform: [{ translateX: menuTranslateX }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <Image
            source={require('../assets/3679992_side_menu.png')}
            style={styles.menuHeaderImage}
            resizeMode="stretch"
          />
          <ScrollView style={styles.menuScroll} contentContainerStyle={{ paddingBottom: 100 }}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('MainTabs', { screen: 'HomeTab' }); }}>
              <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('WebView', { url: 'file:///android_asset/reel_browser/index.html', title: 'REEL' }); }}>
              <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>REEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('MainTabs', { screen: 'BrebTab' }); }}>
              <Image source={require('../assets/app3679992_mb_brebit1292284.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>BREB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('MainTabs', { screen: 'SauceTab' }); }}>
              <Image source={require('../assets/app3679992_mb_sauceit1292285.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>SAUCE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('MainTabs', { screen: 'FrensTab' }); }}>
              <Image source={require('../assets/frens_icon.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>FRENS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('MainTabs', { screen: 'ShowtimeTab' }); }}>
              <Image source={require('../assets/showtime_icon.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>SHOWTIME</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Artel.doc'), 'ARTEL.DOC'); }}>
              <FavIcon url={findFrensUrl('Artel.doc')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>ARTEL.DOC</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Bitchute'), 'BITCHUTE'); }}>
              <FavIcon url={findFrensUrl('Bitchute')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>BITCHUTE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Censored TV'), 'CENSORED TV'); }}>
              <FavIcon url={findFrensUrl('Censored TV')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>CENSORED TV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('CHD TV'), 'CHD TV'); }}>
              <FavIcon url={findFrensUrl('CHD TV')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>CHD TV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('ConspyreTV'), 'CONSPYRETV'); }}>
              <FavIcon url={findFrensUrl('ConspyreTV')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>CONSPYRETV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Cozy.tv'), 'COZY.TV'); }}>
              <FavIcon url={findFrensUrl('Cozy.tv')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>COZY.TV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Odysee'), 'ODYSEE'); }}>
              <FavIcon url={findFrensUrl('Odysee')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>ODYSEE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Onevsp'), 'ONEVSP'); }}>
              <Image source={require('../assets/frens_icon.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>ONEVSP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Rumble'), 'RUMBLE'); }}>
              <FavIcon url={findFrensUrl('Rumble')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>RUMBLE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Truthtide TV'), 'TRUTHTIDE TV'); }}>
              <FavIcon url={findFrensUrl('Truthtide TV')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TRUTHTIDE TV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Substack'), 'SUBSTACK'); }}>
              <FavIcon url={findFrensUrl('Substack')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>SUBSTACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Thread Reader App'), 'THREAD READER APP'); }}>
              <FavIcon url={findFrensUrl('Thread Reader App')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>THREAD READER APP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('GETTR'), 'GETTR'); }}>
              <FavIcon url={findFrensUrl('GETTR')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>GETTR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Gab'), 'GAB'); }}>
              <FavIcon url={findFrensUrl('Gab')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>GAB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Minds'), 'MINDS'); }}>
              <FavIcon url={findFrensUrl('Minds')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>MINDS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Telegram'), 'TELEGRAM'); }}>
              <FavIcon url={findFrensUrl('Telegram')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TELEGRAM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('The Fox Hole'), 'THE FOX HOLE'); }}>
              <FavIcon url={findFrensUrl('The Fox Hole')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>THE FOX HOLE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Truth Social'), 'TRUTH SOCIAL'); }}>
              <FavIcon url={findFrensUrl('Truth Social')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TRUTH SOCIAL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('Twitter / X'), 'TWITTER / X'); }}>
              <FavIcon url={findFrensUrl('Twitter / X')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TWITTER / X</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Attention Patriots'); }}>
              <FavIcon url={findShowtimeUrl('Attention Patriots')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>ATTENTION PATRIOTS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Becoming Aware'); }}>
              <FavIcon url={findShowtimeUrl('Becoming Aware')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>BECOMING AWARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Final Final Warning'); }}>
              <FavIcon url={findShowtimeUrl('Final Final Warning')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>FINAL FINAL WARNING</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Great Awakening'); }}>
              <FavIcon url={findShowtimeUrl('Great Awakening')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>GREAT AWAKENING</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Scare Event'); }}>
              <FavIcon url={findShowtimeUrl('Scare Event')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>SCARE EVENT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('To the Unvaxxed'); }}>
              <FavIcon url={findShowtimeUrl('To the Unvaxxed')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TO THE UNVAXXED</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Trumps Agenda 47'); }}>
              <FavIcon url={findShowtimeUrl('Trumps Agenda 47')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TRUMP'S AGENDA 47</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openShowtimeUrl('Press Play'); }}>
              <FavIcon url={findShowtimeUrl('Press Play')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>PRESS PLAY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); openUrl(findFrensUrl('End Of The Internet'), 'END OF THE INTERNET'); }}>
              <FavIcon url={findFrensUrl('End Of The Internet')} size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>END OF THE INTERNET</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('WebView', { url: 'https://github.com/frogintel', title: 'GITHUB' }); }}>
              <FavIcon url="https://github.com/frogintel" size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>GITHUB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('WebView', { url: 'https://t.me/openhonk', title: 'TELEGRAM' }); }}>
              <FavIcon url="https://t.me/openhonk" size={24} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>TELEGRAM</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('WebView', { url: 'file:///android_asset/openhonk_home/changelog.html', title: 'CHANGELOG' }); }}>
              <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>CHANGELOG</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('Settings'); }}>
              <Image source={require('../assets/app3679992_mb_homeit1292283.png')} style={{ width: 24, height: 24 }} />
              <Text style={[styles.menuItemText, { color: theme.primaryColor }]}>SETTINGS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, borderColor: theme.primaryColor, borderWidth: 1, borderRadius: 16, marginTop: 12 }}
              onPress={() => {
                const keys = Object.keys(themes);
                const currentIdx = keys.indexOf(themeKey);
                const nextIdx = (currentIdx + 1) % keys.length;
                setTheme(keys[nextIdx]);
              }}
            >
              <Text style={{ fontSize: 12, color: theme.primaryColor, fontWeight: '600' }}>CHANGE THEME ({theme.name})</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  menuContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    width: 280,
    elevation: 16,
  },
  menuHeaderImage: {
    width: '100%',
    height: 240,
    resizeMode: 'stretch',
  },
  menuScroll: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 5,
    marginHorizontal: 20,
  },
});

export default SideMenu;
