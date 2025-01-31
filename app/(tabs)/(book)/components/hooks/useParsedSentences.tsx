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
      const numberToIndicesMap = new Map<number, number[]>(); // key is number (33), value is array of indices
    
      textParts.forEach((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          words.push({
            word: part,
            sentenceNumber,
            wordIndex: index,
            linkedNumber: -1,
            groupIndices: [],
            wordLinkedNumber: [],
            linkedWordIndices: [],
            wordLinkedWordIndices: [],
            isSpace: true,
            isTranslation
          });
          return;
        }
    
        // Parse number and word
        const numberMatch = part.match(/\/(\d+)\//);
        const linkedNumber = numberMatch ? parseInt(numberMatch[1]) : -1;
        const cleanWord = part.replace(/\/\d+\//g, '').trim();
    
        // Track word indices by their number
        if (linkedNumber !== -1) {
          if (!numberToIndicesMap.has(linkedNumber)) {
            numberToIndicesMap.set(linkedNumber, []);
          }
          numberToIndicesMap.get(linkedNumber)!.push(index);
        }
    
        words.push({
          word: cleanWord,
          sentenceNumber,
          wordIndex: index,
          linkedNumber,
          groupIndices: [],
          wordLinkedNumber: [],
          linkedWordIndices: [],
          wordLinkedWordIndices: [],
          isSpace: false,
          isTranslation
        });
      });
    
      // Second pass: fill in group indices and words
      words.forEach((word, wordIndex) => {
        if (!word.isSpace && word.linkedNumber !== -1) {
          // Get all indices for this number
          const groupIndices = numberToIndicesMap.get(word.linkedNumber) || [];
          // Filter out own index
          word.groupIndices = groupIndices.filter(idx => idx !== wordIndex);
          // Get words for these indices
          word.wordLinkedNumber = word.groupIndices.map(idx => words[idx].word);
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

    // Establish bidirectional links between words
    original.forEach((origWord, origIndex) => {
      if (origWord.linkedNumber !== -1) {
        translation.forEach((transWord, transIndex) => {
          if (origWord.linkedNumber === transWord.linkedNumber) {
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