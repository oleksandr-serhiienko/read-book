// hooks/useWordHighlight.ts
import { useState, useCallback } from 'react';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence, ParsedWord } from '../types/types';

interface HighlightState {
  sentenceNumber: number | null;
  linkedNumbers: number[];
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
    linkedNumbers: []
  });
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);

  const handleWordPress = useCallback((word: string, sentence: DBSentence) => {
    if (!parsedSentences.has(sentence.sentence_number)) {
      // Parse and store the sentence if not already parsed
      const parsed = parseSentence(sentence);
      updateParsedSentences(sentence, parsed);
      
      // Find and highlight the clicked word
      const parsedWord = parsed.original.find(w => w.word === word && !w.isSpace);
      if (parsedWord) {
        setHighlightState({
          sentenceNumber: sentence.sentence_number,
          linkedNumbers: parsedWord.linkedNumbers
        });
      }
    } else {
      // Use existing parsed sentence
      const parsedSentence = parsedSentences.get(sentence.sentence_number);
      const parsedWord = parsedSentence?.original.find(w => w.word === word && !w.isSpace);
      if (parsedWord) {
        setHighlightState({
          sentenceNumber: sentence.sentence_number,
          linkedNumbers: parsedWord.linkedNumbers
        });
      }
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
    setHighlightState({ sentenceNumber: null, linkedNumbers: [] });
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