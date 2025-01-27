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
  

  
export interface HighlightState {
    sentenceNumber: number | null;
    linkedNumbers: number[];
  }
  
export interface DBReaderProps {
    bookUrl: string;
    bookTitle: string;
    imageUrl: string;
  }
  