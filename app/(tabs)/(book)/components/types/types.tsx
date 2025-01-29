export interface ParsedWord {
    word: string;
    sentenceNumber: number;
    wordIndex: number;
    
    linkedNumbers: number[];
    wordLinkedNumber: string[];

    linkedWordIndices: number[];
    wordLinkedWordIndices: string[];

    isSpace?: boolean;
    isTranslation: boolean;
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
  