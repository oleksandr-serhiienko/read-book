// useParsedSentences.ts
import { useState, useCallback } from 'react';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence, ParsedWord } from '../types/types';

export const useParsedSentences = (chapterSentences: DBSentence[]) => {
  const [parsedSentences, setParsedSentences] = useState<Map<number, ParsedSentence>>(new Map());

  const updateParsedSentences = useCallback((sentence: DBSentence, parsed: ParsedSentence) => {
    setParsedSentences(prev => {
      const newMap = new Map(prev);
      newMap.set(sentence.sentence_number, parsed);
      return newMap;
    });
  }, []);

  const parseSentenceText = useCallback((sentenceNumber: number): ParsedSentence => {
    const sentence = chapterSentences.find(s => s.sentence_number === sentenceNumber);
    if (!sentence || !sentence.original_parsed_text || !sentence.translation_parsed_text) {
      return { original: [], translation: [] };
    }

    const parseText = (text: string, sentenceNumber: number, isTranslation: boolean): ParsedWord[] => {
      const textParts = text.split(/(\s+)/);
      const words: ParsedWord[] = [];

      // First pass: create basic word objects and collect numbers
      const numberGroups = new Map<string, string[]>(); // key is sorted numbers, value is words

      textParts.forEach((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          words.push({
            word: part,
            sentenceNumber,
            wordIndex: index,
            linkedNumbers: [],
            wordLinkedNumber: [],
            linkedWordIndices: [],
            wordLinkedWordIndices: [],
            isSpace: true,
            isTranslation
          });
          return;
        }

        // Parse numbers and word
        const numberMatches = part.match(/\/(\d+)\//g);
        const linkedNumbers = numberMatches
          ? numberMatches.map(n => parseInt(n.replace(/\//g, '')))
          : [];
        const cleanWord = part.replace(/\/\d+\//g, '').trim();

        // Create key for number group (sorted numbers joined)
        if (linkedNumbers.length > 0) {
          const numbersKey = [...linkedNumbers].sort().join(',');
          if (!numberGroups.has(numbersKey)) {
            numberGroups.set(numbersKey, []);
          }
          numberGroups.get(numbersKey)!.push(cleanWord);
        }

        words.push({
          word: cleanWord,
          sentenceNumber,
          wordIndex: index,
          linkedNumbers,
          wordLinkedNumber: [], // Will fill in second pass
          linkedWordIndices: [],
          wordLinkedWordIndices: [],
          isSpace: false,
          isTranslation
        });
      });

      // Second pass: fill in wordLinkedNumber arrays
      words.forEach(word => {
        if (!word.isSpace && word.linkedNumbers.length > 0) {
          const numbersKey = [...word.linkedNumbers].sort().join(',');
          const groupWords = numberGroups.get(numbersKey) || [];
          word.wordLinkedNumber = groupWords.filter(w => w !== word.word);
        }
      });

      return words;
    };

    return {
      original: parseText(sentence.original_parsed_text, sentenceNumber, false),
      translation: parseText(sentence.translation_parsed_text, sentenceNumber, true)
    };
  }, [chapterSentences]);

  const parseSentence = useCallback((sentence: DBSentence) => {
    const parsed = parseSentenceText(sentence.sentence_number);
    const { original, translation } = parsed;

    // Debug logging
    console.log("Original sentence parsing:", original.map(w => ({
      word: w.word,
      linkedNumbers: w.linkedNumbers,
      wordLinkedNumber: w.wordLinkedNumber
    })));
    console.log("Translation parsing:", translation.map(w => ({
      word: w.word,
      linkedNumbers: w.linkedNumbers,
      wordLinkedNumber: w.wordLinkedNumber
    })));

    // Establish bidirectional links between words
    original.forEach((origWord, origIndex) => {
      if (origWord.linkedNumbers.length > 0) {
        translation.forEach((transWord, transIndex) => {
          const origNumbers = [...origWord.linkedNumbers].sort().join(',');
          const transNumbers = [...transWord.linkedNumbers].sort().join(',');
          
          if (origNumbers === transNumbers) {
            // Add indices
            origWord.linkedWordIndices.push(transIndex);
            transWord.linkedWordIndices.push(origIndex);
            
            // Add actual words
            origWord.wordLinkedWordIndices.push(transWord.word);
            transWord.wordLinkedWordIndices.push(origWord.word);
          }
        });
      }
    });

    return { original, translation };
  }, [parseSentenceText]);

  return {
    parsedSentences,
    updateParsedSentences,
    parseSentence
  };
};