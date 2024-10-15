import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, View } from 'react-native';
import { Link } from 'expo-router';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import { Card, Database } from '@/components/db/database';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';

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
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);
  
  useEffect(() => {
    // Reset isAdded when content changes
    setIsAdded(false);
  }, [content]);
  
  let displayContent = '';
  let database = new Database();
  const isResponseTranslation = content && !('Translation' in content);
  
  if (content !== null){
    displayContent = isResponseTranslation ? content.TextView : content.Translation;
  }

  const getLinkHref = () => {
    return content && 'Translation' in content 
    ? "/sentenceInfo" as const 
    : "/wordInfo" as const;
  };

  const handleAddToDictionary = () => {
    if (isResponseTranslation && !isAdded){
       let currentTranslation = content;
       let card: Card = {
        level: 0,
        sourceLanguage: SupportedLanguages.GERMAN,
        targetLanguage: SupportedLanguages.ENGLISH,
        source: "Moby",
        translations: currentTranslation.Translations.map(t => t.word),
        userId: 'test',
        word: currentTranslation.Original,
        context: currentTranslation.Contexts.map(c => ({sentence: c.original, translation: c.translation, isBad: false})),
        lastRepeat: new Date()
        };
        database.insertCard(card);
        console.log('Adding to dictionary:', currentTranslation.Original);
        setIsAdded(true);
    }
  };

  return (
    <Animated.View
      style={[
        styles.panel,        
        !isVisible && styles.hidden
      ]}>
      <Link          
        href={{
          pathname: getLinkHref(),
          params: { content: JSON.stringify(content) }
        }}
        asChild>
        <TouchableOpacity style={styles.contentContainer}>
          <Text
            style={styles.content}
            numberOfLines={1}
            ellipsizeMode="tail">
            {displayContent}
          </Text>
        </TouchableOpacity>
      </Link>
      {isResponseTranslation && (
        <TouchableOpacity 
          onPress={handleAddToDictionary} 
          style={[styles.addButton, isAdded && styles.addButtonDisabled]}
          disabled={isAdded}
        >
          <Text style={styles.addButtonText}>{isAdded ? '✓' : '+'}</Text>
        </TouchableOpacity>
      )}
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
  addButtonDisabled: {
    backgroundColor: '#A5D6A7', // Lighter green for disabled state
  },
});

export default SlidePanel;