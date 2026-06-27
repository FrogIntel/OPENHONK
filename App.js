import React from 'react';
import { Text, View, Platform, StatusBar, ScrollView, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { prefetchUrl, initStoreScreenshots, clearFailedCache, backgroundPrefetchAll, getCacheStats, getUncachedUrls, startRetryTimer } from './components/screenshotCache';
import { fetchAdBlockList, checkAndScheduleAdBlockUpdate } from './components/adBlockList';
import { appData } from './data/urls';
import ThemedBackground from './components/ThemedBackground';
import ErrorBoundary from './components/ErrorBoundary';

import IntroScreen from './screens/IntroScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import GalleryScreen from './screens/GalleryScreen';
import CategoryScreen from './screens/CategoryScreen';
import WebViewScreen from './screens/WebViewScreen';
import BrebScreen from './screens/BrebScreen';
import SauceScreen from './screens/SauceScreen';
import FrensScreen from './screens/FrensScreen';
import ShowtimeScreen from './screens/ShowtimeScreen';
import SettingsScreen from './screens/SettingsScreen';
import NewContentScreen from './screens/NewContentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getRandomWebsitesFromAllCategories = (data, count) => {
  if (!data) return [];
  const allUrls = [];
  Object.entries(data).forEach(([key, category]) => {
    if (category && category.urls) {
      category.urls.forEach(item => {
        if (item.url) allUrls.push(item);
      });
    }
  });
  return allUrls.sort(() => Math.random() - 0.5).slice(0, count);
};

const getAllWebsites = () => {
  const allUrls = [];
  ['breb', 'sauce', 'frens', 'showtime'].forEach(section => {
    if (appData[section]) {
      Object.entries(appData[section]).forEach(([key, category]) => {
        if (category && category.urls) {
          category.urls.forEach(item => {
            if (item.url) allUrls.push(item);
          });
        }
      });
    }
  });
  return allUrls;
};

const prefetchAllTiles = async () => {
  // Wait for cached screenshots to load from AsyncStorage
  await initStoreScreenshots();
  clearFailedCache();

  const stats = getCacheStats();
  const allItems = getAllWebsites();
  const totalUrls = allItems.length;
  const uncachedUrls = getUncachedUrls(allItems.map(item => item.url));

  // Priority 1: Critical home screen tiles only (high priority)
  prefetchUrl(appData.homepage, true);

  const brebItems = getRandomWebsitesFromAllCategories(appData.breb, 3);
  brebItems.forEach(item => prefetchUrl(item.url, true));

  const sauceItems = getRandomWebsitesFromAllCategories(appData.sauce, 3);
  sauceItems.forEach(item => prefetchUrl(item.url, true));

  // Priority 2: Secondary screens (delayed 3s to let home screen load first)
  setTimeout(() => {
    if (appData.frens?.urls) {
      appData.frens.urls.slice(0, 5).forEach(item => prefetchUrl(item.url));
    }
    if (appData.showtime) {
      Object.keys(appData.showtime).forEach(subCat => {
        if (appData.showtime[subCat]?.urls) {
          appData.showtime[subCat].urls.slice(0, 5).forEach(item => prefetchUrl(item.url));
        }
      });
    }
  }, 3000);

  // Priority 3: Background load ALL uncached URLs (delayed 8s)
  setTimeout(() => {
    backgroundPrefetchAll(uncachedUrls);
  }, 8000);
};

prefetchAllTiles();
checkAndScheduleAdBlockUpdate();
startRetryTimer();

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'home': '🏠',
    'newspaper': '📰',
    'book': '📚',
    'users': '👥',
    'play': '▶️',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const TabIcon = ({ name, focused, activeColor, inactiveColor }) => {
  const iconMap = {
    'home': require('./assets/home_icon.png'),
    'breb': require('./assets/breb_icon.png'),
    'sauce': require('./assets/sauce_icon.png'),
    'frens': require('./assets/frens_icon.png'),
    'showtime': require('./assets/showtime_icon.png'),
  };
  return <Image source={iconMap[name]} style={{ width: 24, height: 24, tintColor: focused ? activeColor : inactiveColor }} />;
};

function MainTabs() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      <ThemedBackground theme={theme} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            backgroundColor: `${theme.backgroundColor}CC`,
            borderTopColor: theme.primaryColor,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: theme.primaryColor,
          tabBarInactiveTintColor: theme.textTertiaryColor,
        }}
      >
      <Tab.Screen 
        name="HomeTab" 
        component={GalleryScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} activeColor={theme.primaryColor} inactiveColor={theme.textTertiaryColor} />,
        }}
      />
      <Tab.Screen 
        name="BrebTab" 
        component={BrebScreen}
        options={{
          tabBarLabel: 'Breb',
          tabBarIcon: ({ focused }) => <TabIcon name="breb" focused={focused} activeColor={theme.primaryColor} inactiveColor={theme.textTertiaryColor} />,
        }}
      />
      <Tab.Screen 
        name="SauceTab" 
        component={SauceScreen}
        options={{
          tabBarLabel: 'Sauce',
          tabBarIcon: ({ focused }) => <TabIcon name="sauce" focused={focused} activeColor={theme.primaryColor} inactiveColor={theme.textTertiaryColor} />,
        }}
      />
      <Tab.Screen 
        name="FrensTab" 
        component={FrensScreen}
        options={{
          tabBarLabel: 'Frens',
          tabBarIcon: ({ focused }) => <TabIcon name="frens" focused={focused} activeColor={theme.primaryColor} inactiveColor={theme.textTertiaryColor} />,
        }}
      />
      <Tab.Screen 
        name="ShowtimeTab" 
        component={ShowtimeScreen}
        options={{
          tabBarLabel: 'Showtime',
          tabBarIcon: ({ focused }) => <TabIcon name="showtime" focused={focused} activeColor={theme.primaryColor} inactiveColor={theme.textTertiaryColor} />,
        }}
      />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#ffcc33', marginBottom: 20, textAlign: 'center' }}>OPENHONK</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 15, textAlign: 'center' }}>This app is designed for Android</Text>
        <Text style={{ fontSize: 16, color: '#cccccc', marginBottom: 10, textAlign: 'center' }}>Web version has limited functionality</Text>
        <Text style={{ fontSize: 16, color: '#cccccc', marginBottom: 10, textAlign: 'center' }}>Use Android app for full features</Text>
        <Text style={{ fontSize: 14, color: '#666666', marginTop: 30, textAlign: 'center' }}>Press 'a' in terminal to run on Android</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Intro">
            <Stack.Screen name="Intro" component={IntroScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="WebView" component={WebViewScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="NewContent" component={NewContentScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
