import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const themes = {
  default: {
    name: 'Inferno',
    gradientColors: ['#D60000', '#FF6B22', '#FFD700'],
    gradientLocations: [0, 0.4, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#2A0800',
    surfaceColor: '#4D1500',
    elevatedColor: '#5D1C00',
    headerColor: 'transparent',
    primaryColor: '#FFD700',
    secondaryColor: '#FF8C00',
    tertiaryColor: '#FF6347',
    textColor: '#ffffff',
    textSecondaryColor: '#FFDAB9',
    textTertiaryColor: '#CD853F',
    dividerColor: '#FF4500',
    glassColor: '#60FF4500',
    cardBackground: '#4D1500',
    cardStroke: '#60FFD700',
  },
  noir: {
    name: 'Midnight Neon',
    gradientColors: ['#0A0A2E', '#1A1A4B', '#2A2A7C', '#3D2AAC'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0A0A2E',
    surfaceColor: '#202050',
    elevatedColor: '#303068',
    headerColor: 'transparent',
    primaryColor: '#00FFFF',
    secondaryColor: '#FF00FF',
    tertiaryColor: '#7B68EE',
    textColor: '#ffffff',
    textSecondaryColor: '#C0D0F0',
    textTertiaryColor: '#7A8DB0',
    dividerColor: '#4B0082',
    glassColor: '#6000FFFF',
    cardBackground: '#202050',
    cardStroke: '#6000FFFF',
    backgroundType: 'hexgrid',
  },
  royal: {
    name: 'Royal Purple',
    gradientColors: ['#1E0030', '#3D0055', '#5D0090', '#8B00D0'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#1E0030',
    surfaceColor: '#3D0055',
    elevatedColor: '#5D0090',
    headerColor: 'transparent',
    primaryColor: '#FFD700',
    secondaryColor: '#E0AFFF',
    tertiaryColor: '#C77DFF',
    textColor: '#ffffff',
    textSecondaryColor: '#E8D0FF',
    textTertiaryColor: '#B070E0',
    dividerColor: '#7B2CBF',
    glassColor: '#60C77DFF',
    cardBackground: '#3D0055',
    cardStroke: '#60FFD700',
    backgroundType: 'topo',
  },
  crimson: {
    name: 'Crimson Tide',
    gradientColors: ['#1A0000', '#2A0000', '#4D0020', '#D00000'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#1A0000',
    surfaceColor: '#300010',
    elevatedColor: '#4D0020',
    headerColor: 'transparent',
    primaryColor: '#FFD700',
    secondaryColor: '#FF6B6B',
    tertiaryColor: '#FF1744',
    textColor: '#ffffff',
    textSecondaryColor: '#FFC0C0',
    textTertiaryColor: '#D06060',
    dividerColor: '#FF1744',
    glassColor: '#60FF1744',
    cardBackground: '#300010',
    cardStroke: '#60FFD700',
    backgroundType: 'xmbwave',
  },
  emerald: {
    name: 'Toxic Green',
    gradientColors: ['#006D00', '#00B900', '#00FF7F'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#002500',
    surfaceColor: '#004500',
    elevatedColor: '#005500',
    headerColor: 'transparent',
    primaryColor: '#00FF7F',
    secondaryColor: '#7FFF00',
    tertiaryColor: '#32CD32',
    textColor: '#ffffff',
    textSecondaryColor: '#90EE90',
    textTertiaryColor: '#3CB371',
    dividerColor: '#009900',
    glassColor: '#6000FF7F',
    cardBackground: '#004500',
    cardStroke: '#6000FF7F',
  },
  ocean: {
    name: 'Deep Ocean',
    gradientColors: ['#005588', '#00B9FF', '#49DCCC'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#002030',
    surfaceColor: '#003858',
    elevatedColor: '#004570',
    headerColor: 'transparent',
    primaryColor: '#39CCCC',
    secondaryColor: '#7FDBFF',
    tertiaryColor: '#0074D9',
    textColor: '#ffffff',
    textSecondaryColor: '#B0E0E6',
    textTertiaryColor: '#5F9EA0',
    dividerColor: '#0099FF',
    glassColor: '#6039CCCC',
    cardBackground: '#003858',
    cardStroke: '#6039CCCC',
  },
  sunset: {
    name: 'Sunset',
    gradientColors: ['#0D0A1A', '#2A1020', '#8B3A10', '#FFD23F'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0D0A1A',
    surfaceColor: '#241018',
    elevatedColor: '#3D2010',
    headerColor: 'transparent',
    primaryColor: '#FFD23F',
    secondaryColor: '#FF6B35',
    tertiaryColor: '#F7931E',
    textColor: '#ffffff',
    textSecondaryColor: '#FFE4C0',
    textTertiaryColor: '#D09060',
    dividerColor: '#FF6B35',
    glassColor: '#60FF6B35',
    cardBackground: '#241018',
    cardStroke: '#60FFD23F',
    backgroundType: 'xmbwave',
  },
  oliveDrag: {
    name: 'Olive Drab',
    gradientColors: ['#151510', '#2A2A18', '#3D3D24', '#5D5D32'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#151510',
    surfaceColor: '#303028',
    elevatedColor: '#404030',
    headerColor: 'transparent',
    primaryColor: '#D5C368',
    secondaryColor: '#A89C20',
    tertiaryColor: '#7B7B4A',
    textColor: '#E5E5C8',
    textSecondaryColor: '#D0D0A0',
    textTertiaryColor: '#9A9A60',
    dividerColor: '#5A5A30',
    glassColor: '#60C5B358',
    cardBackground: '#303028',
    cardStroke: '#60C5B358',
    backgroundType: 'camo',
  },
  tacticalBlack: {
    name: 'Tactical Black',
    gradientColors: ['#0A0A0A', '#151515', '#222222', '#333333'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0A0A0A',
    surfaceColor: '#202020',
    elevatedColor: '#303030',
    headerColor: 'transparent',
    primaryColor: '#F0F0F0',
    secondaryColor: '#B8B8B8',
    tertiaryColor: '#888888',
    textColor: '#F5F5F5',
    textSecondaryColor: '#D0D0D0',
    textTertiaryColor: '#A0A0A0',
    dividerColor: '#333333',
    glassColor: '#60B0B0B0',
    cardBackground: '#202020',
    cardStroke: '#60B0B0B0',
    backgroundType: 'carbon',
  },
  desertStorm: {
    name: 'Desert Storm',
    gradientColors: ['#1A1510', '#3D3320', '#7B6D4A', '#C8B982'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#1A1510',
    surfaceColor: '#3D3320',
    elevatedColor: '#554838',
    headerColor: 'transparent',
    primaryColor: '#F5E5B8',
    secondaryColor: '#D2C290',
    tertiaryColor: '#A89A5A',
    textColor: '#F5EFD0',
    textSecondaryColor: '#E5D8B8',
    textTertiaryColor: '#B8A878',
    dividerColor: '#7B6D4A',
    glassColor: '#60E5D5A8',
    cardBackground: '#3D3320',
    cardStroke: '#60E5D5A8',
    backgroundType: 'topo',
  },
  navyFleet: {
    name: 'Navy Fleet',
    gradientColors: ['#0A1018', '#182028', '#253850', '#3A5065'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0A1018',
    surfaceColor: '#182830',
    elevatedColor: '#283848',
    headerColor: 'transparent',
    primaryColor: '#7FC4FF',
    secondaryColor: '#5B9BD5',
    tertiaryColor: '#3E6C9A',
    textColor: '#E8F4FF',
    textSecondaryColor: '#B8D8F8',
    textTertiaryColor: '#7A9EB8',
    dividerColor: '#2A4055',
    glassColor: '#605B9BD5',
    cardBackground: '#182830',
    cardStroke: '#605B9BD5',
    backgroundType: 'radar',
  },
  camoGreen: {
    name: 'Woodland Camo',
    gradientColors: ['#3D4F28', '#5A6F38', '#6A7F44'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#1F2A18',
    surfaceColor: '#2F4025',
    elevatedColor: '#3A4F2E',
    headerColor: 'transparent',
    primaryColor: '#8DC34F',
    secondaryColor: '#6A9A3A',
    tertiaryColor: '#4D7028',
    textColor: '#D8E8C0',
    textSecondaryColor: '#A8C890',
    textTertiaryColor: '#7A9858',
    dividerColor: '#4A5F28',
    glassColor: '#607DB33F',
    cardBackground: '#2F4025',
    cardStroke: '#607DB33F',
    backgroundType: 'camo',
  },
  bloodRed: {
    name: 'Blood Red',
    gradientColors: ['#0A0000', '#1D0000', '#300000', '#4D0000'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0A0000',
    surfaceColor: '#1A0000',
    elevatedColor: '#300000',
    headerColor: 'transparent',
    primaryColor: '#FF3333',
    secondaryColor: '#CC0000',
    tertiaryColor: '#990000',
    textColor: '#FFE8E8',
    textSecondaryColor: '#E0A0A0',
    textTertiaryColor: '#A06060',
    dividerColor: '#550000',
    glassColor: '#60CC0000',
    cardBackground: '#1A0000',
    cardStroke: '#60CC0000',
    backgroundType: 'xmbwave3',
  },
  arcticOps: {
    name: 'Arctic Ops',
    gradientColors: ['#3A4A5A', '#4A6070', '#5A7590'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#1D252C',
    surfaceColor: '#2F3D48',
    elevatedColor: '#3A4A58',
    headerColor: 'transparent',
    primaryColor: '#B0D4F8',
    secondaryColor: '#7A9AC0',
    tertiaryColor: '#547090',
    textColor: '#E8F0F8',
    textSecondaryColor: '#B0C8D8',
    textTertiaryColor: '#8098A8',
    dividerColor: '#3A5060',
    glassColor: '#60A0C4E8',
    cardBackground: '#2F3D48',
    cardStroke: '#60A0C4E8',
    backgroundType: 'crackedice',
  },
  matrix: {
    name: 'Matrix Code',
    gradientColors: ['#001500', '#004A00', '#001500'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#001300',
    surfaceColor: '#003820',
    elevatedColor: '#004828',
    headerColor: 'transparent',
    primaryColor: '#00FF41',
    secondaryColor: '#00BF22',
    tertiaryColor: '#007F15',
    textColor: '#00FF41',
    textSecondaryColor: '#00CC33',
    textTertiaryColor: '#006619',
    dividerColor: '#00BF22',
    glassColor: '#6000FF41',
    cardBackground: '#003820',
    cardStroke: '#6000FF41',
    backgroundType: 'matrix',
  },
  cyber: {
    name: 'Cyberpunk',
    gradientColors: ['#0A0015', '#1A0020', '#2A0043', '#440076'],
    gradientLocations: [0, 0.33, 0.66, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#0A0015',
    surfaceColor: '#180025',
    elevatedColor: '#2E003E',
    headerColor: 'transparent',
    primaryColor: '#FF00FF',
    secondaryColor: '#00FFFF',
    tertiaryColor: '#FF006E',
    textColor: '#FFFFFF',
    textSecondaryColor: '#E8C8FF',
    textTertiaryColor: '#B070E0',
    dividerColor: '#FF00FF',
    glassColor: '#60FF00FF',
    cardBackground: '#180025',
    cardStroke: '#60FF00FF',
    backgroundType: 'matrix',
  },
  redMatrix: {
    name: 'Red Matrix',
    gradientColors: ['#150000', '#4A0000', '#150000'],
    gradientLocations: [0, 0.5, 1],
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
    backgroundColor: '#130000',
    surfaceColor: '#381818',
    elevatedColor: '#482020',
    headerColor: 'transparent',
    primaryColor: '#FF3333',
    secondaryColor: '#BF2424',
    tertiaryColor: '#7F1515',
    textColor: '#FF3333',
    textSecondaryColor: '#CC2828',
    textTertiaryColor: '#661515',
    dividerColor: '#BF2424',
    glassColor: '#60FF3333',
    cardBackground: '#381818',
    cardStroke: '#60FF3333',
    backgroundType: 'matrix',
  },
};

const ThemeContext = createContext();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ThemeTransitionOverlay = ({ themeKey, theme }) => {
  const gleamAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const prevTheme = useRef(themeKey);

  useEffect(() => {
    if (prevTheme.current !== themeKey) {
      prevTheme.current = themeKey;
      setVisible(true);
      gleamAnim.setValue(0);
      Animated.timing(gleamAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [themeKey]);

  if (!visible) return null;

  return (
    <View style={transitionStyles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          transitionStyles.gleamContainer,
          {
            opacity: gleamAnim.interpolate({
              inputRange: [0, 0.3, 0.7, 1],
              outputRange: [0, 0.8, 0.8, 0],
            }),
            transform: [
              {
                translateY: gleamAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SCREEN_HEIGHT, SCREEN_HEIGHT],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', `${theme.primaryColor}66`, '#FFFFFF99', `${theme.primaryColor}66`, 'transparent']}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={transitionStyles.gleamGradient}
        />
      </Animated.View>
    </View>
  );
};

const transitionStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    overflow: 'hidden',
  },
  gleamContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
  },
  gleamGradient: {
    flex: 1,
  },
});

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState('camoGreen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme && themes[savedTheme]) {
          setThemeKey(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (key) => {
    if (themes[key]) {
      setThemeKey(key);
      try {
        await AsyncStorage.setItem('appTheme', key);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeKey], themeKey, setTheme, themes, loading }}>
      {children}
      <ThemeTransitionOverlay themeKey={themeKey} theme={themes[themeKey]} />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
