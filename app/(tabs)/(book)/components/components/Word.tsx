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
  onPress: (word: string, sentence: DBSentence, wordIndex: number) => Promise<ParsedWord>;
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
    const cleanedWord = word.word.replace(/[.,!?;:]+$/, '');
    console.log("Clicked word:", cleanedWord);
    
    // Get updated word data
    const updatedWord = await onPress(word.word, sentence, word.wordIndex);
    if (!updatedWord) return;
    
    // Initialize database first
    const bookDatabase = new BookDatabase(bookTitle);
    const dbInitialized = await bookDatabase.initialize();
    
    if (!dbInitialized) {
        throw new Error("Database is not initialized");
    }

    // If it's part of a group
    if (updatedWord.linkedNumbers.length > 0) {
        let individualTranslation = await bookDatabase.getWordTranslation(cleanedWord);
        if (individualTranslation) {
            console.log("Popup: " + individualTranslation.english_translation); 
        }

        // Prepare group translation for slide panel
        const currentPhrase = [updatedWord.word, ...updatedWord.wordLinkedNumber].join(' ');
        const translationPhrase = updatedWord.wordLinkedWordIndices.join(' ');
        
        const responseTranslation = {
            Original: updatedWord.isTranslation ? translationPhrase : currentPhrase,
            Translations: [{
                word: updatedWord.isTranslation ? currentPhrase : translationPhrase,
                pos: ""
            }],
            Contexts: [],
            Book: "",
            TextView: ""
        };
        
        SlidePanelEvents.emit(responseTranslation, true);
    } else {
        // Single word case - check both DB and coupled translation
        let dbTranslation = await bookDatabase.getWordTranslation(cleanedWord);
        const coupledTranslation = updatedWord.wordLinkedWordIndices[0]; // Get coupled translation if exists

        const translations = [];
        
        // Add coupled translation first if it exists and isn't in DB
        if (coupledTranslation && (!dbTranslation || dbTranslation.english_translation !== coupledTranslation)) {
            translations.push({
                word: coupledTranslation,
                pos: ""
            });
        }

        // Add DB translation if exists
        if (dbTranslation) {
            translations.push({
                word: dbTranslation.english_translation,
                pos: ""
            });
        }

        const responseTranslation = {
            Original: cleanedWord,
            Translations: translations.length > 0 ? translations : [{ word: "Translation", pos: "" }],
            Contexts: [],
            Book: "",
            TextView: ""
        };
        
        SlidePanelEvents.emit(responseTranslation, true);
    }
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