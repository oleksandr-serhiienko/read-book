// SimpleReader.tsx with database lifecycle fixes
import React, { useEffect, useState, useRef } from 'react';
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
import { SentenceTranslation } from '@/components/reverso/reverso';
import { Book, database } from "@/components/db/database";
import { useLanguage } from '@/app/languageSelector';
import FileManager from './FileManager';

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
  const { sourceLanguage, targetLanguage } = useLanguage();
  const dbRef = useRef<BookDatabase | null>(null);
  
  // Database initialization function
  const initializeDb = async () => {
    console.log("Initializing database for book:", bookTitle);
    
    // Clean up existing database if needed
    if (dbRef.current) {
      try {
        console.log("Closing previous database connection");
        await dbRef.current.close();
        dbRef.current = null;
      } catch (err) {
        console.error("Error closing previous database:", err);
        // Continue with new database creation regardless
      }
    }
    
    // Create fresh database instance
    const bookDatabase = new BookDatabase(bookTitle);
    let dbInitialized = false;
    
    try {
      dbInitialized = await bookDatabase.initialize();
      
      if (!dbInitialized) {
        console.log("Database not initialized, downloading...");
        await bookDatabase.downloadDatabase(bookUrl);
        dbInitialized = await bookDatabase.initialize();
        
        if (!dbInitialized) {
          throw new Error("Failed to initialize database after download");
        }
      }
      
      // Update book record in main database
      const bookExist = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase());
      let localImage = await FileManager.checkImage(imageUrl);    
      if (bookExist === null) {
        const book: Book = {
          bookUrl: bookUrl,
          name: bookTitle,
          sourceLanguage: sourceLanguage.toLowerCase(),
          updateDate: new Date(),
          lastreadDate: new Date(),
          imageUrl: localImage,
          progress: 0
        };
        await database.insertBook(book);
      } else {
        await database.updateBook(bookTitle, sourceLanguage.toLowerCase(), "");
      }
      
      console.log("Database initialized successfully");
      dbRef.current = bookDatabase;
      setDb(bookDatabase);
      
      // Verify database connection works by checking total chapters
      const chapters = await bookDatabase.getTotalChapters();
      console.log("Successfully verified database, found chapters:", chapters);
      
      return true;
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  };

  // Initialize database on mount or book change
  useEffect(() => {
    console.log("Book changed, reinitializing database...");
    initializeDb().catch(console.error);
    loadFontSize();
    FontSizeEvents.reset();
    
    const unsubscribe = FontSizeEvents.subscribe((newSize) => {
      setCurrentFontSize(newSize);
    });
    
    // Clean up on unmount or book change
    return () => {
      unsubscribe();
      
      // Close database connection when component unmounts
      const cleanup = async () => {
        if (dbRef.current) {
          console.log("Component unmounting, closing database");
          try {
            await dbRef.current.close();
            dbRef.current = null;
          } catch (err) {
            console.error("Error closing database on unmount:", err);
          }
        }
      };
      
      cleanup();
    };
  }, [bookTitle, bookUrl]);

  // Load chapter once database is ready
  useEffect(() => {
    if (db) {
      loadChapter(1);
    }
  }, [db]);

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
    FontSizeEvents.reset();
    
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

  const handleSelectSentence = (selectedSentence: number | null) => {
    if (selectedSentence) {
      // Find the sentence object from its number
      const sentenceObj = chapterSentences.find(
        s => s.sentence_number === selectedSentence
      );
      
      if (sentenceObj) {
        const st: SentenceTranslation = {
          Original: sentenceObj.original_parsed_text ?? "",
          Translation: sentenceObj.translation_parsed_text ?? "",
          id: selectedSentence,
          bookTitle: bookTitle
        }
        
        // Set this as the content for translation
        setPanelContent(st);      
      }
    }
  };

  // Added retry logic for database errors
  const retryDatabaseOperation = async () => {
    try {
      console.log("Attempting to reinitialize database after error");
      await initializeDb();
      if (db) {
        loadChapter(currentChapter);
      }
    } catch (retryError) {
      console.error("Failed to recover database:", retryError);
    }
  };

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
        <Text style={styles.retryText} onPress={retryDatabaseOperation}>
          Tap to retry
        </Text>
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
        onAnnotateSentence={() => handleSelectSentence(selectedSentence)}
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
  },
  retryText: {
    color: 'blue',
    padding: 8,
    textAlign: 'center',
    textDecorationLine: 'underline',
  }
});

export default SimpleReader;