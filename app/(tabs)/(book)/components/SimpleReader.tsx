// SimpleReader.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChapterData } from './hooks/useChapterData';
import { Sentence } from './components/Sentence';
import { useParsedSentences } from './hooks/useParsedSentences';
import { useWordHighlight } from './hooks/useWordHighlight';
import { PanelContent, SlidePanelEvents } from './events/slidePanelEvents';
import { FontSizeEvents } from './events/fontSizeEvents';
import SlidePanel from '../slidePanel';
import ReaderSettings from './components/ReaderSettings';
import BottomChapterNavigation from './components/BottomChapterNavigation';
import { ParsedWord } from './types/types';
import { BookDatabase } from '@/components/db/bookDatabase';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 16;

interface DBReaderProps {
  bookUrl: string;
  bookTitle: string;
  imageUrl: string;
}

const SimpleReader: React.FC<DBReaderProps> = ({ bookUrl, bookTitle, imageUrl }) => {
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_FONT_SIZE);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<PanelContent>(null);
  const [db, setDb] = useState<BookDatabase | null>(null);

useEffect(() => {
  const initializeDb = async () => {
    const bookDatabase = new BookDatabase(bookTitle);
    const dbInitialized = await bookDatabase.initialize();
    
    if (!dbInitialized) {
      await bookDatabase.downloadDatabase(bookUrl);
      if (!await bookDatabase.initialize()) {
        throw new Error("Failed to initialize database");
      }
    }
    console.log("INIIITIALIZED");
    setDb(bookDatabase);
    
  };

  initializeDb().catch(console.error);
  loadFontSize();
  FontSizeEvents.reset();
  
  const unsubscribe = FontSizeEvents.subscribe((newSize) => {
    setCurrentFontSize(newSize);
  });
  loadChapter(0);
  return () => unsubscribe();
}, [bookTitle, bookUrl]);

  const {
    currentChapter,
    chapterSentences,
    isLoading,
    error,
    totalChapters,
    loadChapter,
    nextChapter,
    previousChapter
  } = useChapterData({ db });

  const { parsedSentences, updateParsedSentences, parseSentence } = useParsedSentences(chapterSentences);

  // Font size management
  useEffect(() => {
    loadFontSize();
    // Reset the events system
    FontSizeEvents.reset();
    
    // Subscribe to font size changes
    const unsubscribe = FontSizeEvents.subscribe((newSize) => {
      console.log('Font size updated:', newSize);
      setCurrentFontSize(newSize);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadFontSize = async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      if (savedFontSize) {
        const newSize = parseInt(savedFontSize);
        setCurrentFontSize(newSize);
        FontSizeEvents.emit(newSize);
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    }
  };

  const increaseFontSize = async () => {
    if (currentFontSize < MAX_FONT_SIZE) {
      const newSize = currentFontSize + 1;
      setCurrentFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
      FontSizeEvents.emit(newSize);
    }
  };

  const decreaseFontSize = async () => {
    if (currentFontSize > MIN_FONT_SIZE) {
      const newSize = currentFontSize - 1;
      setCurrentFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
      FontSizeEvents.emit(newSize);
    }
  };

  // Panel events subscription
  useEffect(() => {
    console.log('[SimpleReader] Setting up panel event subscription');
    SlidePanelEvents.reset();
    
    const unsubscribe = SlidePanelEvents.subscribe((content, isVisible) => {
      console.log('[SimpleReader] Received panel event:', { contentExists: !!content, isVisible });
      requestAnimationFrame(() => {
        setPanelContent(content);
        setIsPanelVisible(isVisible);
      });
    });

    return () => {
      console.log('[SimpleReader] Cleaning up panel event subscription');
      unsubscribe();
    };
  }, []);

  const parsedSentencesState = {
    parsedSentences,
    updateParsedSentences
  };

  const { 
    selectedSentence, 
    handleWordPress, 
    handleLongPress, 
    isWordHighlighted 
  } = useWordHighlight(parseSentence, parsedSentencesState);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }
  if (!db) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReaderSettings
        currentChapter={currentChapter}
        totalChapters={totalChapters}
        onNext={nextChapter}
        onPrevious={previousChapter}
        currentFontSize={currentFontSize}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
      />
      
      <ScrollView style={styles.content}>
        {chapterSentences.map((sentence) => (
          <Sentence
            key={sentence.sentence_number}
            sentence={sentence}
            parsedSentence={parsedSentences.get(sentence.sentence_number)}
            isSelected={selectedSentence === sentence.sentence_number}
            bookTitle={bookTitle}
            fontSize={currentFontSize}
            onWordPress={(word, sentence, index) => handleWordPress(word, sentence, index) as Promise<ParsedWord>}
            onLongPress={() => handleLongPress(sentence)}
            isWordHighlighted={isWordHighlighted}
            database={db}
          />
        ))}
        
        <BottomChapterNavigation
          currentChapter={currentChapter}
          totalChapters={totalChapters}
          onNext={nextChapter}
          onPrevious={previousChapter}
        />
      </ScrollView>

      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={() => SlidePanelEvents.emit(null, false)}
        onAnnotateSentence={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    color: 'red',
    padding: 16,
    textAlign: 'center',
  }
});

export default SimpleReader;