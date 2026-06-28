import { NativeModules, Platform } from 'react-native';

const { BackgroundAudioModule } = NativeModules;

export const startBackgroundAudio = () => {
  if (Platform.OS === 'android' && BackgroundAudioModule) {
    BackgroundAudioModule.startBackgroundAudio();
    BackgroundAudioModule.keepWebViewAliveInBackground(true);
  }
};

export const stopBackgroundAudio = () => {
  if (Platform.OS === 'android' && BackgroundAudioModule) {
    BackgroundAudioModule.keepWebViewAliveInBackground(false);
    BackgroundAudioModule.stopBackgroundAudio();
  }
};

export const requestUnrestrictedBattery = () => {
  if (Platform.OS === 'android' && BackgroundAudioModule?.requestUnrestrictedBattery) {
    BackgroundAudioModule.requestUnrestrictedBattery();
  }
};

export const isBatteryUnrestricted = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'android' && BackgroundAudioModule?.isBatteryUnrestricted) {
      BackgroundAudioModule.isBatteryUnrestricted((result) => resolve(result));
    } else {
      resolve(true);
    }
  });
};

export const requestNotificationPermission = () => {
  if (Platform.OS === 'android' && BackgroundAudioModule?.requestNotificationPermission) {
    BackgroundAudioModule.requestNotificationPermission();
  }
};

export const isNotificationPermissionGranted = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'android' && BackgroundAudioModule?.isNotificationPermissionGranted) {
      BackgroundAudioModule.isNotificationPermissionGranted((result) => resolve(result));
    } else {
      resolve(true);
    }
  });
};
