import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const LoadingBar = ({ visible, color = '#ffcc33' }) => {
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!visible || width === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, width, translateX]);

  if (!visible) return null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            transform: [{
              translateX: translateX.interpolate({
                inputRange: [-1, 1],
                outputRange: [-width * 0.4, width],
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  bar: {
    width: '40%',
    height: '100%',
    borderRadius: 2,
  },
});

export default LoadingBar;
