import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const FUNNY_MESSAGES = [
  'The frog jumped into the wrong pond. Try again.',
  'Pepe tripped over a red pill. Give it another go.',
  'The matrix glitched. Neo is on it.',
  'A wild error appeared! OPENHONK used Restart.',
  'The deep state broke this page. Try again to fight back.',
  'Frog Intel lost signal. Reconnecting...',
  'You found a secret bug! Unfortunately it\'s not a feature.',
  'The pond dried up. Tap to refill.',
  'Adrenochrome levels too low to render. Try again.',
  'The white hat hackers are fixing this. Stand by.',
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const funnyMsg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
      return (
        <View style={styles.container}>
          <View style={styles.frogCircle}>
            <Text style={styles.emoji}>🐸</Text>
          </View>
          <Text style={styles.title}>WELL THAT RIBBITED</Text>
          <Text style={styles.message}>{funnyMsg}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>🐸 Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 30,
  },
  frogCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 204, 51, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 204, 51, 0.3)',
  },
  emoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffcc33',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 2,
  },
  message: {
    fontSize: 15,
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#ffcc33',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
