// Word.tsx
import React, { memo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { ParsedWord } from '../types/types';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { SlidePanelEvents } from '../events/slidePanelEvents';

interface WordProps {
  word: ParsedWord;
  sentence: DBSentence;
  isHighlighted: boolean;
  bookTitle: string;
  fontSize: number;
  onPress: (word: string, sentence: DBSentence, wordIndex: number) => void;
  onLongPress?: () => void;
}

// Custom comparison function for memo
const arePropsEqual = (prevProps: WordProps, nextProps: WordProps) => {
  const isEqual = (
    prevProps.word.word === nextProps.word.word &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.fontSize === nextProps.fontSize
  );

  return isEqual;
};

const Word: React.FC<WordProps> = memo(({
  word,
  sentence,
  isHighlighted,
  bookTitle,
  fontSize,
  onPress,
  onLongPress
}) => {
  if (word.isSpace) {
    return <Text style={styles.space}> </Text>;
  }

  const dynamicStyles = StyleSheet.create({
    word: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
      padding: 2,
    }
  });

  const handleWordPress = async () => {
    console.log("Clicked word:", word.word);
    onPress(word.word, sentence, word.wordIndex);
    
    let cleanedWord = word.word.replace(/[.,!?;:]+$/, '');
    const bookDatabase = new BookDatabase(bookTitle);
    const dbInitialized = await bookDatabase.initialize();
    
    if (!dbInitialized) {
      throw new Error("Database is not initialized");
    }
    
    let translation = await bookDatabase.getWordTranslation(cleanedWord);
    const responseTranslation = {
      Original: cleanedWord,
      Translations: [{
        word: translation?.english_translation ?? "Translation",
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
        dynamicStyles.word,
        isHighlighted && styles.highlightedWord
      ]}
    >
      {word.word}
    </Text>
  );
}, arePropsEqual);

const styles = StyleSheet.create({
  space: {
    width: 4,
  },
  highlightedWord: {
    backgroundColor: '#3498db',
    color: '#fff',
  }
});

export { Word };