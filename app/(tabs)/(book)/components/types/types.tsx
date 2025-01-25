import { DBSentence } from "@/components/db/bookDatabase";

export interface ParsedWord {
    word: string;
    sentenceNumber: number;
    wordIndex: number;
    linkedNumbers: number[];
    linkedWordIndices: number[];
    isSpace?: boolean;
  }
  
  export interface ParsedSentence {
    original: ParsedWord[];
    translation: ParsedWord[];
  }
  
  export interface SentenceProps {
    sentence: DBSentence;
    parsedSentence?: ParsedSentence;
    isSelected: boolean;
    onWordPress: (word: string, sentence: DBSentence, index: number) => void;
    onLongPress: () => void;
    isWordHighlighted: (word: ParsedWord) => boolean;
  }
  
export interface HighlightState {
    sentenceNumber: number | null;
    linkedNumbers: number[];
  }
  
export interface DBReaderProps {
    bookUrl: string;
    bookTitle: string;
    imageUrl: string;
  }
  