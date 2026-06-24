import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, Animated, Easing, Text, Platform, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const WALLPAPER_IMAGE = require('../assets/wallpaper2.png');
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const ThemedBackground = ({ theme, style }) => {
  if (theme.wallpaper) {
    return (
      <Image
        source={WALLPAPER_IMAGE}
        style={[styles.absolute, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
    );
  }

  const bgType = theme.backgroundType;

  if (bgType === 'carbon') return <CarbonBackground theme={theme} style={style} />;
  if (bgType === 'camo') return <CamoBackground theme={theme} style={style} />;
  if (bgType === 'matrix') return <MatrixBackground theme={theme} style={style} />;
  if (bgType === 'hexgrid') return <HexGridBackground theme={theme} style={style} />;
  if (bgType === 'scanlines') return <ScanlinesBackground theme={theme} style={style} />;
  if (bgType === 'topo') return <TopoBackground theme={theme} style={style} />;
  if (bgType === 'radar') return <RadarBackground theme={theme} style={style} />;
  if (bgType === 'xmbwave') return <XMBWaveBackground theme={theme} style={style} />;

  return <CrossFadeBackground theme={theme} style={style} />;
};

// ========== CROSSFADE GRADIENT (default for all plain themes) ==========
const CrossFadeBackground = ({ theme, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => finished && animate());
    };
    animate();
  }, [fadeAnim]);

  const shiftColors1 = useMemo(() => {
    return [
      theme.gradientColors[0],
      theme.gradientColors[1] || theme.gradientColors[0],
      theme.gradientColors[2] || theme.gradientColors[0],
    ];
  }, [theme]);

  const shiftColors2 = useMemo(() => {
    const c = theme.gradientColors;
    return [c[2] || c[0], c[0], c[1] || c[0]];
  }, [theme]);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={shiftColors1}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      <Animated.View style={[styles.absolute, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={shiftColors2}
          locations={theme.gradientLocations}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.7, y: 0.8 }}
          style={styles.absolute}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.04, 0],
            }),
            transform: [
              {
                translateX: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SCREEN_WIDTH * 0.3, SCREEN_WIDTH * 0.3],
                }),
              },
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SCREEN_HEIGHT * 0.1, SCREEN_HEIGHT * 0.1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.2,
          left: SCREEN_WIDTH * 0.3,
          width: SCREEN_WIDTH * 0.5,
          height: SCREEN_WIDTH * 0.5,
          borderRadius: SCREEN_WIDTH * 0.25,
          backgroundColor: theme.primaryColor,
        }} />
      </Animated.View>
    </View>
  );
};

// ========== CARBON FIBER ==========
const CarbonBackground = ({ theme, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmerAnim, breatheAnim]);

  const cells = useMemo(() => {
    const arr = [];
    const cols = 12;
    const rows = 18;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isOdd = (r + c) % 2 === 0;
        arr.push({ r, c, isOdd, key: `${r}-${c}` });
      }
    }
    return { arr, cols, rows };
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <Animated.View style={[styles.absolute, { opacity: breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }]}>
        <LinearGradient
          colors={theme.gradientColors}
          locations={theme.gradientLocations}
          start={theme.gradientStart}
          end={theme.gradientEnd}
          style={styles.absolute}
        />
      </Animated.View>
      <View style={styles.carbonGrid}>
        {cells.arr.map(cell => (
          <View
            key={cell.key}
            style={[
              styles.carbonCell,
              {
                backgroundColor: cell.isOdd
                  ? `${theme.primaryColor}06`
                  : `${theme.surfaceColor}30`,
                borderTopColor: cell.isOdd ? `${theme.primaryColor}08` : 'transparent',
                borderTopWidth: 0.5,
                borderLeftColor: cell.isOdd ? `${theme.primaryColor}04` : 'transparent',
                borderLeftWidth: 0.5,
              },
            ]}
          />
        ))}
      </View>
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.06, 0],
            }),
            transform: [
              {
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-400, 400],
                }),
              },
            ],
          },
        ]}
      >
        <View style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 200,
          width: 100,
          backgroundColor: theme.primaryColor,
          transform: [{ skewX: '-20deg' }],
        }} />
      </Animated.View>
    </View>
  );
};

// ========== CAMOUFLAGE ==========
const CamoBackground = ({ theme, style }) => {
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(driftAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
  }, [driftAnim]);

  const blobs = useMemo(() => {
    const arr = [];
    const palette = [
      theme.backgroundColor,
      theme.surfaceColor,
      theme.elevatedColor,
      `${theme.primaryColor}12`,
      `${theme.secondaryColor}08`,
      `${theme.tertiaryColor}10`,
    ];
    for (let i = 0; i < 45; i++) {
      const layer = i < 15 ? 0 : i < 30 ? 1 : 2;
      arr.push({
        key: i,
        x: Math.random() * 105 - 5,
        y: Math.random() * 105 - 5,
        size: 50 + Math.random() * 160,
        color: palette[Math.floor(Math.random() * palette.length)],
        borderRadius: 20 + Math.random() * 50,
        rotate: Math.random() * 360,
        opacity: 0.5 + Math.random() * 0.5,
        layer,
        driftX: (Math.random() - 0.5) * 20,
        driftY: (Math.random() - 0.5) * 15,
      });
    }
    return arr.sort((a, b) => a.layer - b.layer);
  }, [theme]);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      <Animated.View
        style={[
          styles.absolute,
          {
            transform: [
              {
                translateX: driftAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-5, 5, -5],
                }),
              },
              {
                translateY: driftAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-3, 3, -3],
                }),
              },
            ],
          },
        ]}
      >
        {blobs.map(blob => (
          <View
            key={blob.key}
            style={{
              position: 'absolute',
              left: `${blob.x}%`,
              top: `${blob.y}%`,
              width: blob.size,
              height: blob.size * 0.65,
              backgroundColor: blob.color,
              borderRadius: blob.borderRadius,
              opacity: blob.opacity,
              transform: [{ rotate: `${blob.rotate}deg` }],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// ========== MATRIX (lightweight animated streaks) ==========
const MatrixBackground = ({ theme, style }) => {
  const streaks = useMemo(() => {
    const arr = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      arr.push({
        key: i,
        x: (i / count) * 100 + Math.random() * 3,
        duration: 3000 + Math.random() * 4000,
        delay: Math.random() * 5000,
        width: Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : Math.random() < 0.85 ? 3 : 5,
        height: 50 + Math.random() * 150,
        opacity: 0.2 + Math.random() * 0.6,
      });
    }
    return arr;
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={[theme.backgroundColor, theme.surfaceColor, theme.backgroundColor]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.absolute}
      />
      {streaks.map(streak => (
        <FallingStreak key={streak.key} streak={streak} color={theme.primaryColor} />
      ))}
      <View style={[styles.absolute, { backgroundColor: `${theme.primaryColor}03` }]} />
    </View>
  );
};

const FallingStreak = ({ streak, color }) => {
  const anim = useRef(new Animated.Value(-streak.height)).current;
  const animRef = useRef(anim);

  useEffect(() => {
    animRef.current = anim;
    const startY = -streak.height;
    const endY = SCREEN_HEIGHT + streak.height;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: endY,
          duration: streak.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: startY,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1, resetBeforeIteration: true }
    );

    const timer = setTimeout(() => loop.start(), streak.delay);
    return () => { clearTimeout(timer); loop.stop(); };
  }, [anim, streak]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${streak.x}%`,
        width: streak.width,
        height: streak.height,
        backgroundColor: color,
        opacity: streak.opacity,
        transform: [{ translateY: anim }],
        borderRadius: streak.width,
      }}
    >
      <LinearGradient
        colors={['transparent', `${color}80`, color]}
        locations={[0, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1, width: '100%' }}
      />
    </Animated.View>
  );
};

// ========== HEX GRID ==========
const HexGridBackground = ({ theme, style }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [pulseAnim, sweepAnim]);

  const hexes = useMemo(() => {
    const arr = [];
    const hexSize = 35;
    const hexW = hexSize * 1.5;
    const hexH = hexSize * Math.sqrt(3);
    const cols = 14;
    const rows = Math.ceil(SCREEN_HEIGHT / hexH) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * hexW;
        const y = r * hexH + (c % 2 === 0 ? 0 : hexH / 2);
        const highlight = Math.random() < 0.08;
        arr.push({ key: `${r}-${c}`, x, y, highlight });
      }
    }
    return { hexes: arr, hexW, hexH };
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.12],
            }),
          },
        ]}
      >
        {hexes.hexes.map(hex => (
          <View
            key={hex.key}
            style={{
              position: 'absolute',
              left: hex.x,
              top: hex.y,
              width: hexes.hexW * 0.85,
              height: hexes.hexH * 0.85,
              borderWidth: 1,
              borderColor: hex.highlight ? theme.primaryColor : `${theme.primaryColor}50`,
              borderRadius: 4,
              transform: [{ rotate: '30deg' }],
              backgroundColor: hex.highlight ? `${theme.primaryColor}08` : 'transparent',
            }}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: 0.05,
            transform: [
              {
                translateX: sweepAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, SCREEN_WIDTH + 100],
                }),
              },
            ],
          },
        ]}
      >
        <View style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 100,
          width: 80,
          backgroundColor: theme.primaryColor,
        }} />
      </Animated.View>
    </View>
  );
};

// ========== SCANLINES ==========
const ScanlinesBackground = ({ theme, style }) => {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const flickerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(2000 + Math.random() * 3000),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [scanAnim, flickerAnim, glowAnim]);

  const lines = useMemo(() => {
    return Array.from({ length: Math.ceil(SCREEN_HEIGHT / 8) }, (_, i) => ({ key: i, strong: i % 4 === 0 }));
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <Animated.View style={[styles.absolute, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) }]}>
        <LinearGradient
          colors={theme.gradientColors}
          locations={theme.gradientLocations}
          start={theme.gradientStart}
          end={theme.gradientEnd}
          style={styles.absolute}
        />
      </Animated.View>
      <View style={styles.scanlinesContainer}>
        {lines.map(line => (
          <View
            key={line.key}
            style={{
              height: 1,
              backgroundColor: line.strong ? `${theme.primaryColor}12` : `${theme.primaryColor}06`,
              marginBottom: 2,
              width: '100%',
            }}
          />
        ))}
      </View>
      <Animated.View
        style={[
          styles.scanBeam,
          {
            backgroundColor: `${theme.primaryColor}15`,
            transform: [
              {
                translateY: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, SCREEN_HEIGHT + 100],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', `${theme.primaryColor}20`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.absolute}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.absolute,
          {
            backgroundColor: theme.primaryColor,
            opacity: flickerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.03],
            }),
          },
        ]}
      />
    </View>
  );
};

// ========== TOPOGRAPHIC ==========
const TopoBackground = ({ theme, style }) => {
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(driftAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
  }, [driftAnim]);

  const lines = useMemo(() => {
    const arr = [];
    const numLines = 18;
    for (let i = 0; i < numLines; i++) {
      const points = [];
      const baseY = (i / numLines) * 100;
      const segments = 12;
      for (let s = 0; s <= segments; s++) {
        const x = (s / segments) * 100;
        const y = baseY
          + Math.sin(s * 0.6 + i * 0.4) * 6
          + Math.cos(s * 1.1 + i * 0.2) * 4
          + Math.sin(s * 2.3 + i * 0.7) * 2;
        points.push({ x, y });
      }
      const elevation = i % 3 === 0;
      arr.push({ key: i, points, elevation, baseY });
    }
    return arr;
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      <Animated.View
        style={[
          styles.topoContainer,
          {
            transform: [
              {
                translateX: driftAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-10, 10, -10],
                }),
              },
              {
                translateY: driftAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-5, 5, -5],
                }),
              },
            ],
          },
        ]}
      >
        {lines.map(line => (
          <View
            key={line.key}
            style={{
              position: 'absolute',
              top: `${line.baseY}%`,
              left: -20,
              right: -20,
              height: line.elevation ? 2 : 1,
              backgroundColor: line.elevation ? `${theme.primaryColor}20` : `${theme.primaryColor}08`,
              transform: [
                { rotate: `${Math.sin(line.key * 0.4) * 4}deg` },
                { scaleY: 1 + (line.key % 5) * 0.15 },
              ],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// ========== RADAR SWEEP ==========
const RadarBackground = ({ theme, style }) => {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const blipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blipAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(3200),
        Animated.timing(blipAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ).start();
  }, [sweepAnim, blipAnim]);

  const rings = useMemo(() => [0.15, 0.3, 0.45, 0.6, 0.75, 0.9], []);
  const blips = useMemo(() => {
    return Array.from({ length: 12 }, () => ({
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      size: 2 + Math.random() * 5,
    }));
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      <View style={styles.radarContainer}>
        {rings.map((r, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: `${r * 100}%`,
              height: `${r * 100}%`,
              borderRadius: 999,
              borderWidth: i % 2 === 0 ? 1.5 : 0.5,
              borderColor: `${theme.primaryColor}${i % 2 === 0 ? '20' : '10'}`,
              top: '50%',
              left: '50%',
              transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
            }}
          />
        ))}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: 1,
          backgroundColor: `${theme.primaryColor}15`,
        }} />
        <View style={{
          position: 'absolute',
          left: '50%',
          top: '5%',
          bottom: '5%',
          width: 1,
          backgroundColor: `${theme.primaryColor}15`,
        }} />
        {blips.map((blip, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: `${blip.x}%`,
              top: `${blip.y}%`,
              width: blip.size,
              height: blip.size,
              borderRadius: blip.size,
              backgroundColor: theme.primaryColor,
              opacity: blipAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8],
              }),
              transform: [{
                scale: blipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 2],
                }),
              }],
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '45%',
            height: 2,
            overflow: 'hidden',
            transform: [{ translateY: -1 }],
          }}
        >
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: `${theme.primaryColor}30`,
              transform: [
                {
                  rotate: sweepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              transformOrigin: 'left center',
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.primaryColor,
            transform: [{ translateX: -4 }, { translateY: -4 }],
          }}
        />
      </View>
    </View>
  );
};

// ========== XMB WAVE (PlayStation style) ==========
const XMBWaveBackground = ({ theme, style }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [waveAnim, particleAnim]);

  const waves = useMemo(() => {
    const arr = [];
    const numWaves = 6;
    for (let i = 0; i < numWaves; i++) {
      arr.push({
        key: i,
        amplitude: 30 + Math.random() * 50,
        frequency: 0.008 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        yOffset: 0.15 + (i / numWaves) * 0.7,
        opacity: 0.15 + (i / numWaves) * 0.25,
        strokeWidth: 1 + (i % 2),
      });
    }
    return arr;
  }, []);

  const particles = useMemo(() => {
    const arr = [];
    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
      arr.push({
        key: i,
        startX: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: 1 + Math.random() * 3,
        speed: 0.3 + Math.random() * 0.7,
        waveIdx: Math.floor(Math.random() * 6),
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      {/* Wave layers */}
      {waves.map(wave => (
        <Animated.View
          key={wave.key}
          style={[
            styles.absolute,
            {
              opacity: waveAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [wave.opacity * 0.6, wave.opacity, wave.opacity * 0.6],
              }),
              transform: [
                {
                  translateY: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 10],
                  }),
                },
              ],
            },
          ]}
        >
          {Array.from({ length: Math.ceil(SCREEN_WIDTH / 4) + 8 }, (_, x) => {
            const px = x * 4;
            const py = SCREEN_HEIGHT * wave.yOffset
              + Math.sin(px * wave.frequency + wave.phase) * wave.amplitude
              + Math.sin(px * wave.frequency * 2.3 + wave.phase * 1.5) * (wave.amplitude * 0.3);
            return (
              <View
                key={x}
                style={{
                  position: 'absolute',
                  left: px,
                  top: py,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.primaryColor,
                  opacity: 0.6,
                }}
              />
            );
          })}
        </Animated.View>
      ))}
      {/* Flowing particles along waves */}
      {particles.map(p => {
        const wave = waves[p.waveIdx];
        return (
          <Animated.View
            key={p.key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: p.opacity,
              transform: [
                {
                  translateX: particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [p.startX, p.startX + SCREEN_WIDTH * p.speed],
                  }),
                },
                {
                  translateY: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin(p.startX * wave.frequency + wave.phase) * wave.amplitude,
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin((p.startX + SCREEN_WIDTH * p.speed) * wave.frequency + wave.phase + 1) * wave.amplitude,
                    ],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                width: p.size,
                height: p.size,
                borderRadius: p.size,
                backgroundColor: theme.primaryColor,
              }}
            />
          </Animated.View>
        );
      })}
      {/* Central glow */}
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: waveAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.03, 0.08, 0.03],
            }),
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: SCREEN_WIDTH * 0.8,
            height: SCREEN_WIDTH * 0.8,
            borderRadius: SCREEN_WIDTH * 0.4,
            backgroundColor: theme.primaryColor,
            transform: [{ translateX: -SCREEN_WIDTH * 0.4 }, { translateY: -SCREEN_WIDTH * 0.4 }],
          }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  carbonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  carbonCell: {
    width: `${100 / 24}%`,
    height: `${100 / 48}%`,
  },
  matrixContainer: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    paddingHorizontal: 2,
  },
  matrixCol: {
    flex: 1,
    alignItems: 'center',
  },
  matrixChar: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  scanlinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scanBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    overflow: 'hidden',
  },
  topoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  radarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});

export default ThemedBackground;
