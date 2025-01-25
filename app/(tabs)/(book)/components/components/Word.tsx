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
  if (word.isSpace) {
    return <Text style={styles.space}> </Text>;
  }

  const handleWordPress = () => {
    onPress(word.word, sentence, word.wordIndex);
    
    // Emit panel event
    const responseTranslation = {
      Original: word.word,
      Translations: [{
        word: "translation",
        pos: ""
      }],
      Contexts: [],
      Book: "",
      TextView: ""
    };
    
    SlidePanelEvents.emit(responseTranslation, true);
  };

  return (
    <Text
      onPress={handleWordPress}
      onLongPress={onLongPress}
      style={[
        styles.word,
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