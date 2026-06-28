import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const LoadingBar = ({ visible, color = '#ffcc33' }) => {
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(-1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible || width === 0) return;
    const slide = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    slide.start();
    pulse.start();
    return () => { slide.stop(); pulse.stop(); };
  }, [visible, width, translateX, pulseOpacity]);

  if (!visible) return null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: color,
            opacity: pulseOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            transform: [{
              translateX: translateX.interpolate({
                inputRange: [-1, 1],
                outputRange: [-width * 0.5, width],
              }),
            }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    opacity: 0.3,
  },
  bar: {
    width: '50%',
    height: '100%',
    borderRadius: 2,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default LoadingBar;
