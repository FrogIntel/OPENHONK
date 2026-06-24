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
