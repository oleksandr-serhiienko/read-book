// useWordHighlight.ts
import { useState, useCallback } from 'react';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence, ParsedWord } from '../types/types';

interface HighlightState {
  sentenceNumber: number | null;
  linkedNumbers: number[];
  wordIndex: number | null; 
}

interface ParsedSentencesState {
  parsedSentences: Map<number, ParsedSentence>;
  updateParsedSentences: (sentence: DBSentence, parsed: ParsedSentence) => void;
}

export const useWordHighlight = (
  parseSentence: (sentence: DBSentence) => ParsedSentence,
  parsedSentencesState: ParsedSentencesState
) => {
  const { parsedSentences, updateParsedSentences } = parsedSentencesState;

  const [highlightState, setHighlightState] = useState<HighlightState>({
    sentenceNumber: null,
    linkedNumbers: [],
    wordIndex: null  
  });
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);

  const handleWordPress = useCallback((word: string, sentence: DBSentence, wordIndex: number) => {
    console.log(`Processing word: ${word} at index: ${wordIndex}`);
    
    let parsed;
    if (!parsedSentences.has(sentence.sentence_number)) {
      parsed = parseSentence(sentence);
      updateParsedSentences(sentence, parsed);
    } else {
      parsed = parsedSentences.get(sentence.sentence_number)!;
    }
    
    // Find the exact word by matching both content and index
    const parsedWord = parsed.original.find(w => 
      w.word === word && 
      !w.isSpace && 
      w.wordIndex === wordIndex  // Strict index matching
    );
    
    if (parsedWord) {
      console.log(`Found parsed word at index ${parsedWord.wordIndex}`);
      setHighlightState({
        sentenceNumber: sentence.sentence_number,
        linkedNumbers: parsedWord.linkedNumbers,
        wordIndex: wordIndex  // Store the wordIndex in state
      });
    }
  }, [parseSentence, parsedSentences, updateParsedSentences]);

  const handleLongPress = useCallback((sentence: DBSentence) => {
    const sentenceNumber = sentence.sentence_number;
    
    // Parse sentence if not already parsed
    if (!parsedSentences.has(sentenceNumber)) {
      const parsed = parseSentence(sentence);
      updateParsedSentences(sentence, parsed);
    }

    // Toggle sentence selection
    setSelectedSentence(current => current === sentenceNumber ? null : sentenceNumber);
    setHighlightState({ sentenceNumber: null, linkedNumbers: [], wordIndex: null });
  }, [parseSentence, parsedSentences, updateParsedSentences]);

  const isWordHighlighted = useCallback((word: ParsedWord) => {
    return highlightState.sentenceNumber === word.sentenceNumber &&
           word.linkedNumbers.some(n => highlightState.linkedNumbers.includes(n));
  }, [highlightState]);

  return {
    highlightState,
    selectedSentence,
    handleWordPress,
    handleLongPress,
    isWordHighlighted
  };
};