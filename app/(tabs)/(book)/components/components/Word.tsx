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
  fontSize: number;
  database: BookDatabase; // Add database instance as a prop
  isTranslation: boolean;
  onPress: (word: string, sentence: DBSentence, wordIndex: number) => Promise<ParsedWord>;
  onLongPress?: () => void;
}

interface Word {
  word: string;
  wordIndex: number;
}

interface UpdatedWord {
  word: string;
  wordIndex: number;
  isTranslation: boolean;
  linkeNumber: number[];
  wordLinkedNumber: string[];
  linkedWordMirror: number[];
  wordLinkedWordMirror: string[];
}

interface Translation {
  word: string;
  pos: string;
}

interface TranslationContext {
  original: string;
  translation: string;
}

interface DbTranslation {
  translations: string[];
  contexts?: {
    original_text?: string;
    translated_text?: string;
  }[];
}

interface TranslationResponse {
  Original: string;
  Translations: Translation[];
  Contexts: TranslationContext[];
  Book: string;
  TextView: string;
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
  fontSize,
  database,
  isTranslation,
  onPress,
  onLongPress
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupTranslation, setPopupTranslation] = useState('');
  
  if (word.isSpace) {
    return <Text style={{ width: fontSize * 0.25 }}>{' '}</Text>;  
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'baseline',  // Important for text alignment
      alignSelf: 'flex-start',  // Don't stretch the container
    },
    word: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
      includeFontPadding: false,  // Android specific
      textAlignVertical: 'center',
      ...(isTranslation && {
        color: '#666',
        fontStyle: 'italic',
      })
    }
  });

  function cleanWord(word: string ) {
    if (!word || typeof word !== 'string') {
      return '';
    }
    
    // Trim non-letters from start and end
    // \p{L} matches any kind of letter from any language
    return word
      .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      .trim();
  }
  
    


  const handleWordPress = async (): Promise<void> => {
    const cleanedWord = cleanWord(word.word);
    // Get updated word data
    const updatedWord = await onPress(word.word, sentence, word.wordIndex);
    if (!updatedWord) return;

    // Check if word is part of a group (has linked words)
    if (updatedWord.linkeNumber.length > 0) {
      await handleWordGroup(updatedWord, cleanedWord);
    } else {
      await handleSingleWord(updatedWord);
    }
  };

  /**
   * Handle a word that's part of a linked group
   */
  const handleWordGroup = async (updatedWord: UpdatedWord, cleanedWord: string): Promise<void> => {
    // Show popup for individual word if available
    await showIndividualWordPopup(cleanedWord);
    
    // Get all words in the group and their translations
    const allGroupWords = extractGroupWords(updatedWord);
    const sortedTranslations = extractSortedTranslations(updatedWord);
    
    // Determine current phrase and translation phrase
    const currentPhrase = allGroupWords.join(' ');
    const translationPhrase = sortedTranslations.join(' ');
    
    if (updatedWord.isTranslation) {
      // We're looking at a translation, get original text details
      await handleTranslatedWordGroup(currentPhrase, translationPhrase, allGroupWords, sortedTranslations, updatedWord);
    } else {
      // We're looking at original text, get translation details
      await handleOriginalWordGroup(currentPhrase, translationPhrase, updatedWord);
    }
  };

  /**
   * Handle a translated word group
   */
  const handleTranslatedWordGroup = async (
    currentPhrase: string, 
    translationPhrase: string, 
    allGroupWords: string[], 
    sortedTranslations: string[], 
    updatedWord: UpdatedWord
  ): Promise<void> => {
    // Prepare translations array with the base translation
    let translations: Translation[] = [{
      word: currentPhrase,
      pos: ""
    }];
    // Get additional translations for multi-word groups that translate to single words
    let convertedContexts: TranslationContext[] = [];
    if (allGroupWords.length > 1 && sortedTranslations.length === 1) {
      const result = await fetchAdditionalTranslations(translationPhrase);
      if (result) {
        // Use a Set to remove duplicates
        const mergedTranslations = [...translations, ...result.translations];
        const uniqueTranslations = Array.from(
            new Map(mergedTranslations.map(t => [t.word, t])).values()
        );
    
        translations = uniqueTranslations;
        convertedContexts = result.contexts;
      }
    }
    
    // Prepare and emit the translation response
    const responseTranslation = createTranslationResponse(
      translationPhrase,
      translations,
      convertedContexts
    );
    
    SlidePanelEvents.emit(responseTranslation, true);
  };

  /**
   * Handle an original word group
   */
  const handleOriginalWordGroup = async (
    currentPhrase: string, 
    translationPhrase: string, 
    updatedWord: UpdatedWord
  ): Promise<void> => {
    // For original text, we just use the translation
    const translations: Translation[] = [{
      word: translationPhrase,
      pos: ""
    }];
    
    // Prepare and emit the translation response
    const responseTranslation = createTranslationResponse(
      currentPhrase,
      translations,
      []
    );
    
    SlidePanelEvents.emit(responseTranslation, true);
  };

  /**
   * Handle a single word (not part of a group)
   */
  const handleSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    if (updatedWord.isTranslation) {
      await handleTranslatedSingleWord(updatedWord);
    } else {
      await handleOriginalSingleWord(updatedWord);
    }
  };

  /**
   * Handle a translated single word
   */
  const handleTranslatedSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    // For translated words, we show the original
    const cleanedWord = cleanWord(updatedWord.wordLinkedWordMirror.join(' '));
    
    // Get database translation (might contain additional info)
    const dbTranslation = await database.getWordTranslation(cleanedWord.toLowerCase());
    const result = await fetchAdditionalTranslations(cleanedWord);
    const translation = [{ word: cleanWord(updatedWord.word), pos: "" }];
    let translations: Translation[] = [...translation];
    let convertedContexts = convertContexts(dbTranslation);
      if (result) {
        // Use a Set to remove duplicates
        const mergedTranslations = [...translations, ...result.translations];
        const uniqueTranslations = Array.from(
            new Map(mergedTranslations.map(t => [t.word, t])).values()
        );
    
        translations = uniqueTranslations;

      }
    
    // Create response with the original word as the translation
    const responseTranslation = createTranslationResponse(
      cleanedWord,
      translations,
      convertedContexts
    );
    
    SlidePanelEvents.emit(responseTranslation, true);
  };

  /**
   * Handle an original single word
   */
  const handleOriginalSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    const cleanedWord = cleanWord(updatedWord.word);
    
    // Get translation from database
    const dbTranslation = await database.getWordTranslation(cleanedWord.toLowerCase());
    
    // Get coupled translation
    const coupledTranslation = extractCoupledTranslation(updatedWord);
    
    // Combine translations from different sources
    const translations = combineTranslations(dbTranslation, coupledTranslation);
    
    // Convert contexts to required format
    const convertedContexts = convertContexts(dbTranslation);
    
    // Prepare and emit the translation response
    const responseTranslation = createTranslationResponse(
      cleanedWord,
      translations.length > 0 ? translations : [{ word: "none", pos: "" }],
      convertedContexts
    );
    
    SlidePanelEvents.emit(responseTranslation, true);
  };

  /**
   * Show popup for individual word if translation exists
   */
  const showIndividualWordPopup = async (cleanedWord: string): Promise<void> => {
    const individualTranslation = await database.getWordTranslation(cleanedWord.toLowerCase());
    if (individualTranslation) {
      setPopupTranslation(individualTranslation.translations[0]);
      setShowPopup(true);
    }
  };

  /**
   * Extract all words in a group, sorted by index
   */
  const extractGroupWords = (updatedWord: UpdatedWord): string[] => {
    return [
      { index: updatedWord.wordIndex, word: cleanWord(updatedWord.word) },
      ...updatedWord.wordLinkedNumber.map((word, i) => ({
        index: updatedWord.linkeNumber[i],
        word: cleanWord(word)
      }))
    ]
    .sort((a, b) => a.index - b.index)
    .map(item => item.word);
  };

  /**
   * Extract translations sorted by their indices
   */
  const extractSortedTranslations = (updatedWord: UpdatedWord): string[] => {
    return updatedWord.linkedWordMirror
      .map((index, i) => ({
        index,
        word: cleanWord(updatedWord.wordLinkedWordMirror[i])
      }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.word);
  };

  /**
   * Fetch additional translations for a phrase
   */
  const fetchAdditionalTranslations = async (translationPhrase: string): Promise<{ 
    translations: Translation[], 
    contexts: TranslationContext[] 
  } | null> => {
    const dbTranslation = await database.getWordTranslation(translationPhrase.toLowerCase());
    if (!dbTranslation) return null;
  
    const translations = dbTranslation.translations.map(translation => ({
      word: translation,
      pos: ""
    }));
    
    const contexts = dbTranslation?.contexts?.map(context => ({
      original: context.original_text || "",
      translation: context.translated_text || ""
    })) || [];
    
    return { translations, contexts };
  };

  /**
   * Extract coupled translation from updatedWord
   */
  const extractCoupledTranslation = (updatedWord: UpdatedWord): string => {
    return updatedWord.linkedWordMirror
      .map((index, i) => ({
        index,
        word: cleanWord(updatedWord.wordLinkedWordMirror[i])
      }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.word)
      .join(' ');
  };

  /**
   * Combine translations from different sources
   */
  const combineTranslations = (
    dbTranslation: DbTranslation | null, 
    coupledTranslation: string
  ): Translation[] => {
    const translations: Translation[] = [];
    // Add coupled translation first if it exists and isn't in DB
    if (coupledTranslation) {
      translations.push({
        word: coupledTranslation,
        pos: ""
      });
    }
    
    // Add DB translations if they exist
    if (dbTranslation) {
      dbTranslation.translations.forEach(translation => {
        if(translation !== coupledTranslation){
          translations.push({
            word: translation,
            pos: ""
          });
        }        
      });
    }
    
    return translations;
  };

  /**
   * Convert contexts to required format
   */
  const convertContexts = (dbTranslation: DbTranslation | null): TranslationContext[] => {    
    return dbTranslation?.contexts?.map(context => ({
      original: context.original_text || "",
      translation: context.translated_text || ""
    })) || [];
  };

  /**
   * Create a standardized translation response object
   */
  const createTranslationResponse = (
    original: string, 
    translations: Translation[], 
    contexts: TranslationContext[]
  ): TranslationResponse => {
    return {
      Original: original,
      Translations: translations,
      Contexts: contexts,
      Book: database.getDbName(),
      TextView: ""
    };
  };

return (
  <View style={dynamicStyles.container}>
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