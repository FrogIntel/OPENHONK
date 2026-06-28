import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, TextInput, Modal, Dimensions, useWindowDimensions, Keyboard, InteractionManager } from 'react-native';
import ScreenshotImage from './ScreenshotImage';
import { searchAllApp } from '../utils/globalSearch';

const tilePadding = 10;

const SearchGridModal = ({ visible, onClose, onOpenUrl, primaryColor = '#ffcc33', navigation }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numColumns = isLandscape ? 3 : 2;
  const tileWidth = (width - tilePadding * (numColumns + 1)) / numColumns;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      const timeout1 = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      const timeout2 = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 400);
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [visible]);

  const handleSearch = (q) => {
    setQuery(q);
    setResults(searchAllApp(q));
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const handleOpen = (item) => {
    handleClose();
    if (item.url && item.url.startsWith('openhonk://')) {
      navigation.navigate('NewContent');
      return;
    }
    onOpenUrl(item.url, item.title);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.gridItem, { width: tileWidth, marginLeft: tilePadding }]}
      onPress={() => handleOpen(item)}
    >
      <View style={[styles.gridThumbnail, { width: tileWidth, height: tileWidth * 0.75 }]}>
        <ScreenshotImage
          url={item.url}
          style={styles.gridImage}
          staggerIndex={index}
        />
        <View style={styles.gridOverlay}>
          <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.gridCategory} numberOfLines={1}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar hidden={true} translucent={true} />
        <View style={styles.searchHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ fontSize: 28, color: primaryColor }}>✕</Text>
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search all..."
            placeholderTextColor="#888888"
            value={query}
            onChangeText={handleSearch}
            showSoftInputOnFocus={true}
          />
        </View>
        <FlatList
          key={`search-grid-${numColumns}`}
          style={styles.results}
          contentContainerStyle={{ padding: tilePadding, alignItems: 'center' }}
          data={results}
          numColumns={numColumns}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            query.length >= 2 ? (
              <Text style={styles.noResults}>No results found</Text>
            ) : (
              <Text style={styles.noResults}>Type to search the entire app</Text>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#ffcc33',
  },
  searchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
  },
  results: {
    flex: 1,
  },
  gridItem: {
    marginBottom: tilePadding * 2,
  },
  gridThumbnail: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 3,
    shadowColor: '#ffcc33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffcc33',
  },
  gridCategory: {
    fontSize: 10,
    color: '#888888',
    marginTop: 2,
  },
  noResults: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default SearchGridModal;
