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

    const parseText = (text: string, sentenceNumber: number): ParsedWord[] => {
      const textParts = text.split(/(\s+)/);
      return textParts.map((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          return {
            word: part,
            sentenceNumber,
            wordIndex: index,
            linkedNumbers: [],
            linkedWordIndices: [],
            isSpace: true
          };
        }
    
        // More detailed number parsing
        const numberMatches = part.match(/\/(\d+)\//g);
        const linkedNumbers = numberMatches 
          ? numberMatches.map(n => parseInt(n.replace(/\//g, '')))
          : [];
        const cleanWord = part.replace(/\/\d+\//g, '').trim();
    
        console.log(`Parsing word: ${cleanWord}, numbers: ${linkedNumbers.join(',')}`);
    
        return {
          word: cleanWord,
          sentenceNumber,
          wordIndex: index,
          linkedNumbers,
          linkedWordIndices: [],
          isSpace: false
        };
      });
    };

    return {
      original: parseText(sentence.original_parsed_text, sentenceNumber),
      translation: parseText(sentence.translation_parsed_text, sentenceNumber)
    };
  }, [chapterSentences]);

  const parseSentence = useCallback((sentence: DBSentence) => {
    const parsed = parseSentenceText(sentence.sentence_number);
    const { original, translation } = parsed;

    // Debug logging
    console.log("Original sentence parsing:", original.map(w => ({
      word: w.word,
      linkedNumbers: w.linkedNumbers
    })));
    console.log("Translation parsing:", translation.map(w => ({
      word: w.word,
      linkedNumbers: w.linkedNumbers
    })));

    // Establish bidirectional links between words
    original.forEach((origWord, origIndex) => {
      if (origWord.linkedNumbers.length > 0) {
        translation.forEach((transWord, transIndex) => {
          if (origWord.linkedNumbers.some(n => transWord.linkedNumbers.includes(n))) {
            origWord.linkedWordIndices.push(transIndex);
            transWord.linkedWordIndices.push(origIndex);
            console.log(`Linked words: ${origWord.word} <-> ${transWord.word}`);
          }
        });
      }
    });

    return { original, translation };
  }, [parseSentenceText]);

  return {
    parsedSentences,
    updateParsedSentences,  // Now returning updateParsedSentences instead of setParsedSentences
    parseSentence
  };
};