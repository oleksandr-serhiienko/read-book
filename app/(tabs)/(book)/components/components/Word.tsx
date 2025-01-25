// Word.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ParsedWord } from '../types/types';
import { DBSentence } from '@/components/db/bookDatabase';
import { SlidePanelEvents } from '../events/slidePanelEvents';

interface WordProps {
  word: ParsedWord;
  sentence: DBSentence;
  isHighlighted: boolean;
  onPress: (word: string, sentence: DBSentence, wordIndex: number) => void;
  onLongPress?: () => void;
}

export const Word: React.FC<WordProps> = ({
  word,
  sentence,
  isHighlighted,
  onPress,
  onLongPress,
}) => {
  const handleWordPress = async () => {
    console.log("Word: " + word.word);
    if (word.isSpace) return;
    
    try {
      // Call onPress to ensure sentence is parsed
      await onPress(word.word, sentence, word.wordIndex);
      
      // Always emit panel event after onPress
      const responseTranslation = {
        Original: word.word,
        Translations: [{
          word: "translation", // Replace with actual translation logic
          pos: ""
        }],
        Contexts: [],
        Book: "",
        TextView: ""
      };

      console.log("Emitting panel event for word:", word.word);
      SlidePanelEvents.emit(responseTranslation, true);
    } catch (error) {
      console.error('Error handling word press:', error);
    }
  };

  return (
    <Text
      onPress={handleWordPress}
      onLongPress={onLongPress}
      style={[
        styles.word,
        word.isSpace && styles.space,
        isHighlighted && styles.highlightedWord
      ]}
    >
      {word.word}
    </Text>
  );
};

const styles = StyleSheet.create({
  word: {
    fontSize: 16,
    lineHeight: 24,
    padding: 2,
  },
  space: {
    width: 4,
  },
  highlightedWord: {
    backgroundColor: '#3498db',
    color: '#fff',
  }
});