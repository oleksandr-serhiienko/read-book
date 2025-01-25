// components/Word.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ParsedWord } from '../types/types';
import { DBSentence } from '@/components/db/bookDatabase';
import { SlidePanelEvents } from '../events/slidePanelEvents';


interface WordProps {
  word: ParsedWord;
  sentence: DBSentence;
  isHighlighted: boolean;
  onPress: (word: string, sentence: DBSentence) => void;
  onLongPress?: () => void;
}

export const Word: React.FC<WordProps> = ({
  word,
  sentence,
  isHighlighted,
  onPress,
  onLongPress
}) => {
  const handleWordPress = async () => {
    console.log("Word: " + word.word);
    if (word.isSpace) return;
    
    try {
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

      SlidePanelEvents.emit(responseTranslation, true);
      onPress(word.word, sentence);
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
    padding: 2, // Add padding to increase touch area
  },
  space: {
    width: 4,
  },
  highlightedWord: {
    backgroundColor: '#3498db',
    color: '#fff',
  }
});