import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';
import { appData } from '../data/urls';

const Icon = ({ name, size, color }) => {
  const iconMap = {
    'home': '🏠',
    'film': '🎬',
    'newspaper': '📰',
    'book': '📚',
    'play-circle': '▶️',
    'globe': '🌐',
    'book-open': '📖',
    'send': '✈️',
    'shield': '🛡️',
    'flag': '🚩',
    'eye': '👁️',
    'alert': '⚠️',
    'alert-circle': '⚠️',
    'sun': '☀️',
    'user': '👤',
    'heart': '❤️',
    'play': '▶️',
    'github': '💻',
    'mail': '✉️',
  };
  return <Text style={{ fontSize: size, color }}>{iconMap[name] || '•'}</Text>;
};

const CustomDrawerContent = (props) => {
  const { theme } = useTheme();
  const handleNavigation = (item) => {
    props.navigation.closeDrawer();
    
    if (item.id === 'home') {
      props.navigation.navigate('Home');
    } else if (item.url) {
      props.navigation.navigate('WebView', { url: item.url, title: item.title });
    } else if (item.id === 'reel') {
      props.navigation.navigate('Category', { categoryId: 'reel' });
    } else if (item.id === 'breb') {
      props.navigation.navigate('Category', { categoryId: 'newsMedia' });
    } else if (item.id === 'sauce') {
      props.navigation.navigate('Category', { categoryId: 'qRelated' });
    } else if (item.id === 'attentionpatriots') {
      props.navigation.navigate('Category', { categoryId: 'political' });
    } else if (item.id === 'becomingaware') {
      props.navigation.navigate('Category', { categoryId: 'health' });
    } else if (item.id === 'finalfinalwarning') {
      props.navigation.navigate('Category', { categoryId: 'osint' });
    } else if (item.id === 'scareevent') {
      props.navigation.navigate('Category', { categoryId: 'videoStreaming' });
    } else if (item.id === 'unvaxxed') {
      props.navigation.navigate('Category', { categoryId: 'health' });
    } else if (item.id === 'trumpagenda') {
      props.navigation.navigate('Category', { categoryId: 'political' });
    } else if (item.id === 'waronchildren') {
      props.navigation.navigate('Category', { categoryId: 'health' });
    } else if (item.id === 'contact') {
      props.navigation.navigate('WebView', { url: 'https://t.me/openhonk', title: 'Contact Us' });
    }
  };

  const getIconName = (icon) => {
    return icon;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: theme.elevatedColor, borderBottomColor: theme.dividerColor }]}>
        <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>OPENHONK</Text>
      </View>
      
      <DrawerContentScrollView {...props}>
        {appData.sidebarItems.map((item) => (
          <DrawerItem
            key={item.id}
            label={item.title}
            icon={({ color, size }) => (
              <Icon name={getIconName(item.icon)} size={size} color={color} />
            )}
            onPress={() => handleNavigation(item)}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />
        ))}
      </DrawerContentScrollView>
      
      <View style={[styles.footer, { backgroundColor: theme.elevatedColor, borderTopColor: theme.dividerColor }]}>
        <Text style={[styles.footerText, { color: theme.textTertiaryColor }]}>Open Source Version</Text>
        <Text style={[styles.footerText, { color: theme.textTertiaryColor }]}>No Ads • No Tracking</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  drawerLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  drawerItem: {
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default CustomDrawerContent;
