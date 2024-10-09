import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, LayoutChangeEvent } from 'react-native';
import { Link } from 'expo-router';

interface SlidePanelProps {
  isVisible: boolean;
  content: string;
  onClose: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isVisible,
  content,
  onClose
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [panelHeight, setPanelHeight] = useState(60);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [panelHeight, 0],
  });

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContentWidth(width);
  }, []);

  const onPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setPanelHeight(height);
  }, []);

  const truncateText = (text: string) => {
    const maxWidth = contentWidth - 40; // Subtracting padding and close button width
    const maxChars = Math.floor(maxWidth / 8); // Approximate characters that fit
    return text.length > maxChars ? text.slice(0, maxChars - 3) + '...' : text;
  };

  return (
    <Animated.View
      style={[
        styles.panel,
        { transform: [{ translateY }] },
        !isVisible && styles.hidden
      ]}
      onLayout={onPanelLayout}
    >
      <Link
        href={{
          pathname: "/(tabs)/wordInfo",
          params: { content: content }
        }}
        asChild
      >
        <TouchableOpacity style={styles.contentContainer}>
          <Text
            style={styles.content}
            numberOfLines={1}
            ellipsizeMode="tail"
            onLayout={onContentLayout}
          >
            {content}
          </Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  hidden: {
    display: 'none',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#888',
  },
});

export default SlidePanel;