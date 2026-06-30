import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, PanResponder, Animated, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { usePiP } from '../context/PiPContext';
import { useTheme } from '../context/ThemeContext';
import { isAdDomain, getAdBlockJS } from '../components/adBlockList';
import { trackCookieDomain } from '../components/cookieManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PIP_WIDTH = 240;
const PIP_HEIGHT = 160;

const PiPWebView = ({ onExpand }) => {
  const { pipUrl, pipTitle, pipVideoState, deactivate } = usePiP();
  const { theme } = useTheme();
  const webViewRef = useRef(null);
  const pan = useRef(new Animated.ValueXY({
    x: screenWidth - PIP_WIDTH - 10,
    y: screenHeight - PIP_HEIGHT - 140,
  })).current;
  const [adBlockJS, setAdBlockJS] = useState(getAdBlockJS());

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        const newX = Math.max(0, Math.min(screenWidth - PIP_WIDTH, gestureState.moveX));
        const newY = Math.max(0, Math.min(screenHeight - PIP_HEIGHT - 80, gestureState.moveY));
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const videoSeekJS = pipVideoState && pipVideoState.time
    ? `(function() {
      var seekTime = ${pipVideoState.time};
      var scrollPos = ${pipVideoState.scroll || 0};
      function trySeek() {
        var v = document.querySelector('video');
        if (v) {
          try { v.currentTime = seekTime; } catch(e) {}
          v.play().catch(function() {});
          if (scrollPos) window.scrollTo(0, scrollPos);
        } else {
          setTimeout(trySeek, 500);
        }
      }
      trySeek();
    })();`
    : '';

  if (!pipUrl) return null;

  const handleExpand = () => {
    if (onExpand) {
      onExpand(pipUrl, pipTitle);
    }
  };

  const handleClose = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript('try { document.querySelectorAll("video, audio").forEach(function(m) { m.pause(); }); } catch(e) {}');
    }
    deactivate();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
    >
      <View style={styles.header} {...panResponder.panHandlers}>
        <Text style={styles.title} numberOfLines={1}>{pipTitle || 'PiP'}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleExpand} style={styles.btn}>
            <Text style={styles.btnText}>⤢</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.btn}>
            <Text style={styles.btnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: pipUrl }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScriptBeforeContentLoaded={adBlockJS}
          injectedJavaScript={`
            (function() {
              function isolateVideo() {
                var v = document.querySelector('video');
                if (!v) {
                  setTimeout(isolateVideo, 300);
                  return;
                }
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.overflow = 'hidden';
                document.body.style.backgroundColor = '#000';
                var allElems = document.body.querySelectorAll('*');
                for (var i = 0; i < allElems.length; i++) {
                  var el = allElems[i];
                  if (el === v || v.contains(el)) continue;
                  if (el.contains(v)) continue;
                  el.style.display = 'none';
                }
                v.style.position = 'fixed';
                v.style.top = '0';
                v.style.left = '0';
                v.style.width = '100%';
                v.style.height = '100%';
                v.style.zIndex = '9999';
                v.style.objectFit = 'contain';
                v.setAttribute('controls', 'controls');
                v.play().catch(function() {});
              }
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(isolateVideo, 500);
              } else {
                document.addEventListener('DOMContentLoaded', function() { setTimeout(isolateVideo, 500); });
              }
              ${videoSeekJS}
            })();
          `}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'cookie_domain' && data.domain) {
                trackCookieDomain(data.domain);
              }
            } catch (e) {}
          }}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: PIP_WIDTH,
    height: PIP_HEIGHT + 28,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 9998,
    elevation: 9998,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  header: {
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  title: {
    color: '#fff',
    fontSize: 11,
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  btn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

export default PiPWebView;
