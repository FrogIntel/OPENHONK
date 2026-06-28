import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const FunkyLoader = ({ color = '#ffcc33', size = 64 }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color + '33',
            borderTopColor: color,
            borderWidth: size * 0.08,
            transform: [{ rotate: rotation }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    backgroundColor: 'transparent',
  },
});

export default FunkyLoader;
