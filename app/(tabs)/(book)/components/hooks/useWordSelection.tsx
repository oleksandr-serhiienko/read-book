// hooks/useWordSelection.ts
import { useState, useCallback } from 'react';
import { NativeSyntheticEvent, TextLayoutEventData, GestureResponderEvent } from 'react-native';
import { BookDatabase } from '@/components/db/bookDatabase';

interface UseWordSelectionProps {
  bookDatabaseRef: React.RefObject<BookDatabase | null>;
  bookTitle: string;
  setPanelContent: (content: any) => void;
  setIsPanelVisible: (visible: boolean) => void;
}

interface WordPosition {
    word: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export const useWordSelection = (bookDatabaseRef: React.RefObject<BookDatabase | null>) => {
    const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);
  
    const handleTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const lines = event.nativeEvent.lines;
      const newPositions: WordPosition[] = [];
  
      lines.forEach(line => {
        const words = line.text.split(' ');
        let currentX = line.x;
        const averageCharWidth = line.width / line.text.length;
  
        words.forEach(word => {
          const wordWidth = averageCharWidth * word.length;
          
          newPositions.push({
            word: word.replace(/[.,!?]$/, ''),
            x: currentX,
            y: line.y,
            width: wordWidth,
            height: line.height
          });
  
          currentX += wordWidth + averageCharWidth;
        });
      });
  
      setWordPositions(newPositions);
    }, []);
  
    const handlePress = useCallback(async (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
  
      const tappedWord = wordPositions.find(pos => 
        locationX >= pos.x && 
        locationX <= (pos.x + pos.width) &&
        locationY >= pos.y && 
        locationY <= (pos.y + pos.height)
      );
  
      if (tappedWord && bookDatabaseRef.current) {
        try {
          const translation = await bookDatabaseRef.current.getWordTranslation(tappedWord.word);
          return { word: tappedWord.word, translation };
        } catch (error) {
          console.error('Error getting translation:', error);
          return null;
        }
      }
      return null;
    }, [wordPositions, bookDatabaseRef]);
  
    return {
      handleTextLayout,
      handlePress
    };
  };
