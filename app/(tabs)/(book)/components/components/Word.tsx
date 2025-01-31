// Word.tsx
import React, { memo, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ParsedWord } from '../types/types';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { SlidePanelEvents } from '../events/slidePanelEvents';
import WordPopup from './WordPopup';

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
  const [showPopup, setShowPopup] = useState(false);
  const [popupTranslation, setPopupTranslation] = useState('');
  
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
    console.log("me: " + updatedWord.wordIndex);
    console.log("linked number: " + updatedWord.groupIndices);
    console.log("linked word: " + updatedWord.wordLinkedNumber);

    console.log("linked indices: " + updatedWord.linkedWordIndices);
    console.log("linked indices word: " + updatedWord.wordLinkedWordIndices);
    if (updatedWord.groupIndices.length > 0) {        
        let individualTranslation = await bookDatabase.getWordTranslation(cleanedWord);
        if (individualTranslation) {
          console.log("HEEEEEY: " + individualTranslation.english_translation);
          setPopupTranslation(individualTranslation.english_translation);
          setShowPopup(true);
        }

        const allGroupWords = [
          { index: updatedWord.wordIndex, word: updatedWord.word },
          ...updatedWord.wordLinkedNumber.map((word, i) => ({
              index: updatedWord.groupIndices[i],
              word: word
          }))
      ].sort((a, b) => a.index - b.index)
       .map(item => item.word);
  
      // Get translations sorted by index
      const sortedTranslations = updatedWord.linkedWordIndices
          .map((index, i) => ({
              index,
              word: updatedWord.wordLinkedWordIndices[i]
          }))
          .sort((a, b) => a.index - b.index)
          .map(item => item.word);
  
      const currentPhrase = allGroupWords.join(' ');
      const translationPhrase = sortedTranslations.join(' ');
        
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
      
      // Combine all coupled translations into one word in order
      const coupledTranslation = updatedWord.linkedWordIndices
          .map((index, i) => ({
              index,
              word: updatedWord.wordLinkedWordIndices[i].replace(/[.,!?;:]+$/, '')
          }))
          .sort((a, b) => a.index - b.index)
          .map(item => item.word)
          .join(' '); // Join all words with space
  
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
    <View>
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
      <WordPopup 
        translation={popupTranslation}
        visible={showPopup}
        onHide={() => setShowPopup(false)}
      />
    </View>
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