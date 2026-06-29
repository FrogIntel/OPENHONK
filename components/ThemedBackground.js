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
  if (bgType === 'xmbwave3') return <XMBWave3Background theme={theme} style={style} />;
  if (bgType === 'crackedice') return <CrackedIceBackground theme={theme} style={style} />;

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
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [breatheAnim]);

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

  const camoSquares = useMemo(() => {
    const arr = [];
    const numSquares = 30;
    for (let i = 0; i < numSquares; i++) {
      arr.push({
        key: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: 20 + Math.random() * 60,
        delay: Math.random() * 5000,
        duration: 3000 + Math.random() * 4000,
        opacity: 0.02 + Math.random() * 0.06,
      });
    }
    return arr;
  }, []);

  const camoAnims = useMemo(() => {
    return camoSquares.map(() => new Animated.Value(0));
  }, [camoSquares]);

  useEffect(() => {
    camoAnims.forEach((anim, i) => {
      const sq = camoSquares[i];
      Animated.loop(
        Animated.sequence([
          Animated.delay(sq.delay),
          Animated.timing(anim, { toValue: 1, duration: sq.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: sq.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [camoAnims, camoSquares]);

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
      {/* Random fading camo squares */}
      {camoSquares.map((sq, i) => (
        <Animated.View
          key={sq.key}
          style={{
            position: 'absolute',
            left: sq.x,
            top: sq.y,
            width: sq.size,
            height: sq.size,
            backgroundColor: theme.primaryColor,
            opacity: camoAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0, sq.opacity],
            }),
          }}
        />
      ))}
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

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const hexes = useMemo(() => {
    const arr = [];
    const hexSize = 30;
    const hexW = hexSize * 1.5;
    const hexH = hexSize * Math.sqrt(3);
    const cols = 16;
    const rows = Math.ceil(SCREEN_HEIGHT / hexH) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * hexW;
        const y = r * hexH + (c % 2 === 0 ? 0 : hexH / 2);
        const highlight = Math.random() < 0.12;
        const fadeDelay = Math.random() * 4000;
        const fadeDuration = 2000 + Math.random() * 3000;
        arr.push({ key: `${r}-${c}`, x, y, highlight, fadeDelay, fadeDuration });
      }
    }
    return { hexes: arr, hexW, hexH };
  }, []);

  const fadeAnims = useMemo(() => {
    return hexes.hexes.map(() => new Animated.Value(0));
  }, [hexes]);

  useEffect(() => {
    fadeAnims.forEach((anim, i) => {
      const hex = hexes.hexes[i];
      if (hex.highlight) {
        Animated.loop(
          Animated.sequence([
            Animated.delay(hex.fadeDelay),
            Animated.timing(anim, { toValue: 1, duration: hex.fadeDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: hex.fadeDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ).start();
      }
    });
  }, [fadeAnims, hexes]);

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
              outputRange: [0.03, 0.08],
            }),
          },
        ]}
      >
        {hexes.hexes.map((hex, i) => (
          <Animated.View
            key={hex.key}
            style={{
              position: 'absolute',
              left: hex.x,
              top: hex.y,
              width: hexes.hexW * 0.85,
              height: hexes.hexH * 0.85,
              borderWidth: 1,
              borderColor: hex.highlight ? theme.primaryColor : `${theme.primaryColor}40`,
              borderRadius: 4,
              transform: [{ rotate: '30deg' }],
              backgroundColor: hex.highlight
                ? fadeAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['transparent', `${theme.primaryColor}20`],
                  })
                : 'transparent',
              opacity: hex.highlight
                ? fadeAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  })
                : 0.5,
            }}
          />
        ))}
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

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [sweepAnim]);

  const rings = useMemo(() => [0.15, 0.3, 0.45, 0.6, 0.75, 0.9], []);

  const blips = useMemo(() => {
    return Array.from({ length: 15 }, () => {
      const angle = Math.random() * 360;
      const dist = 0.15 + Math.random() * 0.7;
      const x = 50 + Math.cos(angle * Math.PI / 180) * dist * 50;
      const y = 50 + Math.sin(angle * Math.PI / 180) * dist * 50;
      return {
        x,
        y,
        size: 2 + Math.random() * 4,
        angle: (angle + 360) % 360,
        pingDuration: 800 + Math.random() * 600,
      };
    });
  }, []);

  const blipAnims = useMemo(() => {
    return blips.map(() => new Animated.Value(0));
  }, [blips]);

  const sweepDuration = 4000;

  useEffect(() => {
    blips.forEach((blip, i) => {
      const triggerDelay = (blip.angle / 360) * sweepDuration;
      Animated.loop(
        Animated.sequence([
          Animated.delay(triggerDelay),
          Animated.timing(blipAnims[i], { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(blipAnims[i], { toValue: 0, duration: blip.pingDuration, easing: Easing.out(Easing.exp), useNativeDriver: true }),
          Animated.delay(sweepDuration - triggerDelay - 150 - blip.pingDuration),
        ]),
      ).start();
    });
  }, [blipAnims, blips]);

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
        {/* Blips that light up as sweep passes */}
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
              opacity: blipAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.9],
              }),
              transform: [{
                scale: blipAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 2.5],
                }),
              }],
              shadowColor: theme.primaryColor,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 4,
              shadowOpacity: blipAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8],
              }),
              elevation: 2,
            }}
          />
        ))}
        {/* Rotating sweep line */}
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
        {/* Sweep trail gradient */}
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '45%',
            height: 60,
            overflow: 'hidden',
            transform: [{ translateY: -30 }],
          }}
        >
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: `${theme.primaryColor}08`,
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

// ========== XMB WAVE (PlayStation style - seamless flowing) ==========
const XMBWaveBackground = ({ theme, style }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const flowAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const flowDurations = [9000, 13000, 17000, 21000];

  useEffect(() => {
    // Glow + vertical bob: seamless 0→1→0
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Each wave flows horizontally by exactly its period for seamless wrap
    flowAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: flowDurations[i],
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    });
  }, [glowAnim, flowAnims]);

  const waves = useMemo(() => {
    const arr = [];
    const numWaves = 4;
    for (let i = 0; i < numWaves; i++) {
      const depth = i / numWaves;
      const frequency = 0.008 + i * 0.003;
      const period = (2 * Math.PI) / frequency;
      arr.push({
        key: i,
        amplitude: 30 + depth * 50,
        frequency,
        period,
        phase: i * 1.3,
        yOffset: 0.15 + depth * 0.7,
        opacity: 0.1 + depth * 0.25,
        parallax: 0.3 + depth * 0.7,
      });
    }
    return arr;
  }, []);

  const particles = useMemo(() => {
    const arr = [];
    const numParticles = 10;
    for (let i = 0; i < numParticles; i++) {
      arr.push({
        key: i,
        startX: Math.random() * SCREEN_WIDTH,
        size: 1 + Math.random() * 3,
        speed: 0.3 + Math.random() * 0.5,
        waveIdx: Math.floor(Math.random() * 4),
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);

  const STEP = 14;
  const PARTICLE_TRAVEL = SCREEN_WIDTH + 40;

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      {/* Central radial glow */}
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: glowAnim.interpolate({
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
            width: SCREEN_WIDTH * 1.2,
            height: SCREEN_WIDTH * 1.2,
            borderRadius: SCREEN_WIDTH * 0.6,
            backgroundColor: theme.primaryColor,
            transform: [{ translateX: -SCREEN_WIDTH * 0.6 }, { translateY: -SCREEN_WIDTH * 0.6 }],
          }}
        />
      </Animated.View>
      {/* Wave layers - each flows horizontally by exactly one period (seamless) */}
      {waves.map(wave => (
        <Animated.View
          key={wave.key}
          style={[
            styles.absolute,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [wave.opacity * 0.5, wave.opacity, wave.opacity * 0.5],
              }),
              transform: [
                {
                  translateY: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10 * wave.parallax, 10 * wave.parallax],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.absolute,
              {
                transform: [
                  {
                    translateX: flowAnims[wave.key].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -wave.period],
                    }),
                  },
                ],
              },
            ]}
          >
            {Array.from({ length: Math.ceil((wave.period + SCREEN_WIDTH) / STEP) + 2 }, (_, x) => {
              const px = x * STEP;
              const py = SCREEN_HEIGHT * wave.yOffset
                + Math.sin(px * wave.frequency + wave.phase) * wave.amplitude;
              return (
                <View
                  key={x}
                  style={{
                    position: 'absolute',
                    left: px,
                    top: py,
                    width: STEP * 0.5,
                    height: STEP * 0.5,
                    borderRadius: STEP * 0.25,
                    backgroundColor: theme.primaryColor,
                    opacity: 0.5 + wave.parallax * 0.3,
                  }}
                />
              );
            })}
          </Animated.View>
        </Animated.View>
      ))}
      {/* Flowing particles with edge fading for seamless wrap */}
      {particles.map(p => {
        const wave = waves[p.waveIdx];
        return (
          <Animated.View
            key={p.key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: flowAnims[0].interpolate({
                inputRange: [0, 0.08, 0.88, 1],
                outputRange: [0, p.opacity, p.opacity, 0],
              }),
              transform: [
                {
                  translateX: flowAnims[p.waveIdx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [p.startX, p.startX + PARTICLE_TRAVEL],
                  }),
                },
                {
                  translateY: glowAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin(p.startX * wave.frequency + wave.phase) * wave.amplitude,
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin((p.startX + PARTICLE_TRAVEL * 0.5) * wave.frequency + wave.phase) * wave.amplitude,
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin((p.startX + PARTICLE_TRAVEL) * wave.frequency + wave.phase) * wave.amplitude,
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
    </View>
  );
};

// ========== XMB WAVE 3 (PS3 style - seamless flowing waves + orbs) ==========
const XMBWave3Background = ({ theme, style }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const flowAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const flowDurations = [11000, 15000, 19000, 23000];

  // 3 speed-tier animations for seamless orb wrapping
  const tierAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const tierDurations = [10000, 16000, 22000];

  useEffect(() => {
    // Glow + vertical bob: seamless 0→1→0
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Each wave flows horizontally by exactly its period for seamless wrap
    flowAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: flowDurations[i],
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    });

    // Each tier: 0→1 linear loop, orbs travel exactly SCREEN_WIDTH+60
    tierAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: tierDurations[i],
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    });
  }, [glowAnim, flowAnims, tierAnims]);

  const waves = useMemo(() => {
    const arr = [];
    const numWaves = 4;
    for (let i = 0; i < numWaves; i++) {
      const depth = i / numWaves;
      const frequency = 0.006 + i * 0.003;
      const period = (2 * Math.PI) / frequency;
      arr.push({
        key: i,
        amplitude: 35 + depth * 45,
        frequency,
        period,
        phase: i * 1.1,
        yOffset: 0.15 + depth * 0.7,
        opacity: 0.15 + depth * 0.25,
        parallax: 0.3 + depth * 0.7,
      });
    }
    return arr;
  }, []);

  const orbs = useMemo(() => {
    const arr = [];
    const numOrbs = 20;
    for (let i = 0; i < numOrbs; i++) {
      const waveIdx = Math.floor(Math.random() * 4);
      const roll = Math.random();
      let styleType = 'solid';
      if (roll < 0.3) styleType = 'stroked';
      else if (roll < 0.5) styleType = 'faint';
      arr.push({
        key: i,
        startX: Math.random() * (SCREEN_WIDTH + 60) - 30,
        tier: Math.floor(Math.random() * 3),
        waveIdx,
        size: 1 + Math.random() * 5,
        opacity: 0.1 + Math.random() * 0.85,
        styleType,
        verticalDrift: (Math.random() - 0.5) * 60,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  const STEP = 12;
  const TRAVEL = SCREEN_WIDTH + 60;

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={theme.gradientColors}
        locations={theme.gradientLocations}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={styles.absolute}
      />
      {/* Central glow */}
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: glowAnim.interpolate({
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
            width: SCREEN_WIDTH * 1.5,
            height: SCREEN_WIDTH * 1.5,
            borderRadius: SCREEN_WIDTH * 0.75,
            backgroundColor: theme.primaryColor,
            transform: [{ translateX: -SCREEN_WIDTH * 0.75 }, { translateY: -SCREEN_WIDTH * 0.75 }],
          }}
        />
      </Animated.View>
      {/* 4 overlapping wave lines - each flows horizontally by exactly one period (seamless) */}
      {waves.map(wave => (
        <Animated.View
          key={wave.key}
          style={[
            styles.absolute,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [wave.opacity * 0.4, wave.opacity, wave.opacity * 0.4],
              }),
              transform: [
                {
                  translateY: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12 * wave.parallax, 12 * wave.parallax],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.absolute,
              {
                transform: [
                  {
                    translateX: flowAnims[wave.key].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -wave.period],
                    }),
                  },
                ],
              },
            ]}
          >
            {Array.from({ length: Math.ceil((wave.period + SCREEN_WIDTH) / STEP) + 2 }, (_, x) => {
              const px = x * STEP;
              const py = SCREEN_HEIGHT * wave.yOffset
                + Math.sin(px * wave.frequency + wave.phase) * wave.amplitude;
              return (
                <View
                  key={x}
                  style={{
                    position: 'absolute',
                    left: px,
                    top: py,
                    width: STEP,
                    height: 1,
                    backgroundColor: theme.primaryColor,
                    opacity: 0.6 + wave.parallax * 0.3,
                  }}
                />
              );
            })}
          </Animated.View>
        </Animated.View>
      ))}
      {/* Orbs - each tier travels exactly TRAVEL pixels for seamless wrap */}
      {orbs.map(orb => {
        const wave = waves[orb.waveIdx];
        const tierAnim = tierAnims[orb.tier];
        return (
          <Animated.View
            key={orb.key}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: tierAnim.interpolate({
                inputRange: [0, 0.1, 0.85, 1],
                outputRange: [0, orb.opacity, orb.opacity, 0],
              }),
              transform: [
                {
                  translateX: tierAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [orb.startX, orb.startX + TRAVEL],
                  }),
                },
                {
                  translateY: glowAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin(orb.startX * wave.frequency + wave.phase) * wave.amplitude
                        + orb.verticalDrift * Math.sin(orb.pulseOffset),
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin((orb.startX + TRAVEL * 0.5) * wave.frequency + wave.phase) * wave.amplitude
                        + orb.verticalDrift * Math.sin(Math.PI + orb.pulseOffset),
                      SCREEN_HEIGHT * wave.yOffset
                        + Math.sin((orb.startX + TRAVEL) * wave.frequency + wave.phase) * wave.amplitude
                        + orb.verticalDrift * Math.sin(Math.PI * 2 + orb.pulseOffset),
                    ],
                  }),
                },
              ],
            }}
          >
            <View
              style={
                orb.styleType === 'stroked'
                  ? {
                      width: orb.size,
                      height: orb.size,
                      borderRadius: orb.size,
                      borderWidth: 1,
                      borderColor: theme.primaryColor,
                      backgroundColor: 'transparent',
                    }
                  : orb.styleType === 'faint'
                  ? {
                      width: orb.size,
                      height: orb.size,
                      borderRadius: orb.size,
                      backgroundColor: `${theme.primaryColor}60`,
                    }
                  : {
                      width: orb.size,
                      height: orb.size,
                      borderRadius: orb.size,
                      backgroundColor: theme.primaryColor,
                    }
              }
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

// ========== CRACKED ICE (Arctic Ops) ==========
const generateCrackPattern = (seed) => {
  const cracks = [];
  const numMainCracks = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numMainCracks; i++) {
    const startX = Math.random() * SCREEN_WIDTH;
    const startY = Math.random() * SCREEN_HEIGHT;
    const segments = [];
    let cx = startX;
    let cy = startY;
    const numSegs = 4 + Math.floor(Math.random() * 5);
    let angle = Math.random() * Math.PI * 2;
    for (let s = 0; s < numSegs; s++) {
      angle += (Math.random() - 0.5) * 1.2;
      const len = 30 + Math.random() * 80;
      const nx = cx + Math.cos(angle) * len;
      const ny = cy + Math.sin(angle) * len;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;
      // Branch occasionally
      if (Math.random() < 0.3 && s < numSegs - 1) {
        const branchAngle = angle + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8);
        const branchLen = 20 + Math.random() * 50;
        const bx = cx + Math.cos(branchAngle) * branchLen;
        const by = cy + Math.sin(branchAngle) * branchLen;
        segments.push({ x1: cx, y1: cy, x2: bx, y2: by, isBranch: true });
      }
    }
    cracks.push({ key: `${seed}-${i}`, segments });
  }
  return cracks;
};

const CrackLayer = ({ cracks, color, animVal, baseOpacity }) => {
  return (
    <Animated.View
      style={[
        styles.absolute,
        {
          opacity: animVal.interpolate({
            inputRange: [0, 0.4, 0.6, 1],
            outputRange: [0, baseOpacity, baseOpacity, 0],
          }),
        },
      ]}
    >
      {cracks.map(crack =>
        crack.segments.map((seg, si) => {
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <View
              key={`${crack.key}-${si}`}
              style={{
                position: 'absolute',
                left: seg.x1,
                top: seg.y1,
                width: len,
                height: seg.isBranch ? 0.8 : 1.5,
                backgroundColor: color,
                opacity: seg.isBranch ? 0.5 : 0.8,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })
      )}
    </Animated.View>
  );
};

const CrackedIceBackground = ({ theme, style }) => {
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const [patternIdx, setPatternIdx] = useState(0);

  const patterns = useMemo(() => {
    return [
      generateCrackPattern(0),
      generateCrackPattern(1),
      generateCrackPattern(2),
    ];
  }, []);

  useEffect(() => {
    const cycleDuration = 8000;
    // Pattern 1 fades in then out
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim1, { toValue: 1, duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fadeAnim1, { toValue: 0, duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Pattern 2 offset by half cycle
    Animated.loop(
      Animated.sequence([
        Animated.delay(cycleDuration / 2),
        Animated.timing(fadeAnim2, { toValue: 1, duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fadeAnim2, { toValue: 0, duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Cycle pattern index for variety
    const interval = setInterval(() => {
      setPatternIdx(prev => (prev + 1) % 3);
    }, cycleDuration);
    return () => clearInterval(interval);
  }, [fadeAnim1, fadeAnim2, breatheAnim]);

  // Use patternIdx to rotate which patterns show
  const patternA = patterns[patternIdx % 3];
  const patternB = patterns[(patternIdx + 1) % 3];

  return (
    <View style={[styles.absolute, { backgroundColor: theme.backgroundColor }, style]}>
      <Animated.View style={[styles.absolute, { opacity: breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }]}>
        <LinearGradient
          colors={theme.gradientColors}
          locations={theme.gradientLocations}
          start={theme.gradientStart}
          end={theme.gradientEnd}
          style={styles.absolute}
        />
      </Animated.View>
      {/* Subtle ice glow */}
      <Animated.View
        style={[
          styles.absolute,
          {
            opacity: breatheAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.02, 0.05],
            }),
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            width: SCREEN_WIDTH * 0.9,
            height: SCREEN_WIDTH * 0.9,
            borderRadius: SCREEN_WIDTH * 0.45,
            backgroundColor: theme.primaryColor,
            transform: [{ translateX: -SCREEN_WIDTH * 0.45 }, { translateY: -SCREEN_WIDTH * 0.45 }],
          }}
        />
      </Animated.View>
      {/* Cracked ice pattern A - fading in/out */}
      <CrackLayer cracks={patternA} color={theme.primaryColor} animVal={fadeAnim1} baseOpacity={0.6} />
      {/* Cracked ice pattern B - offset fade */}
      <CrackLayer cracks={patternB} color={theme.primaryColor} animVal={fadeAnim2} baseOpacity={0.5} />
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
