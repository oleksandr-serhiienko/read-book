import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, LayoutChangeEvent } from 'react-native';
import { Href, Link } from 'expo-router';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';

interface SlidePanelProps {
  isVisible: boolean;
  content: SentenceTranslation | ResponseTranslation | null;
  onClose: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isVisible,
  content,
  onClose
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [panelHeight, setPanelHeight] = useState(70);
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
  
  let displayContent = '';
  if (content !== null){
    displayContent = 'TextView' in content ? content.TextView : content.Translation;
  }
  
  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContentWidth(width);
  }, []);

  const onPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setPanelHeight(height);
  }, []);

  const getLinkHref = () => {
    return content && 'Translation' in content 
    ? "/sentenceInfo" as const 
    : "/wordInfo" as const;
  };

  const handleAddToDictionary = () => {
    // Implement the logic to add the word or phrase to the dictionary
    console.log('Adding to dictionary:', displayContent);
    // You might want to call an API or update local storage here
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
          pathname: getLinkHref(),
          params: { content: JSON.stringify(content) }
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
            {displayContent}
          </Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity onPress={handleAddToDictionary} style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
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
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hidden: {
    display: 'none',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    marginLeft: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 24,
  },
  addButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 24,
  },
});

export default SlidePanel;