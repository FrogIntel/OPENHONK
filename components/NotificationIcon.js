import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appData } from '../data/urls';

const NotificationIcon = ({ onPress, primaryColor = '#ffcc33', size = 36 }) => {
  const [badgeCount, setBadgeCount] = useState(0);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    const loadBadge = async () => {
      try {
        const [stored, dismissedRaw, viewedRaw, bookmarksUpdatedRaw] = await Promise.all([
          AsyncStorage.getItem('@adblock_last_update'),
          AsyncStorage.getItem('@dismissed_notifications'),
          AsyncStorage.getItem('@notifications_viewed'),
          AsyncStorage.getItem('@reel_bookmarks_updated'),
        ]);

        let dismissed = [];
        try { dismissed = JSON.parse(dismissedRaw) || []; } catch (e) {}

        let viewed = {};
        try { viewed = JSON.parse(viewedRaw) || {}; } catch (e) {}

        let count = 0;

        if (stored && !dismissed.includes('adblock')) {
          try {
            const info = JSON.parse(stored);
            const notifId = info.id || 'adblock';
            if (!dismissed.includes(notifId)) {
              if (!viewed[notifId] || new Date(viewed[notifId]) < new Date(info.date)) {
                count++;
              }
            }
          } catch (e) {
            count++;
          }
        }

        if (bookmarksUpdatedRaw && !dismissed.includes('bookmarks')) {
          try {
            const bmInfo = JSON.parse(bookmarksUpdatedRaw);
            if (!viewed.bookmarks || new Date(viewed.bookmarks) < new Date(bmInfo.date)) {
              count++;
            }
          } catch (e) {
            count++;
          }
        }

        const staticNotifs = (appData.notifications?.urls || []).filter(n => !dismissed.includes(n.id));
        for (const n of staticNotifs) {
          if (!n.id) { count++; continue; }
          if (!viewed[n.id] || (n.date && new Date(viewed[n.id]) < new Date(n.date))) {
            count++;
          }
        }

        setBadgeCount(count);
      } catch (e) {}
    };

    loadBadge();
    const interval = setInterval(loadBadge, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePress = async () => {
    onPressRef.current?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Image source={require('../assets/app3679992_notification.png')} style={{ width: size, height: size }} />
      {badgeCount > 0 && (
        <View style={[styles.badge, { backgroundColor: primaryColor }]}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon;
