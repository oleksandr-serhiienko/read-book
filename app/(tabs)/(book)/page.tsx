import * as React from 'react';
import { SafeAreaView, StyleSheet, BackHandler } from 'react-native';
import { ReaderProvider, Location } from '@/components/epub';
import { useState, useEffect, useRef } from 'react';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import { database } from '@/components/db/database';
import ReaderComponent from './components/ReaderComponent';
import ProgressBar from './components/ProgressBar';
import SimpleReader from './components/SimpleReader';

export default function PageScreen() {
  const { bookUrl, bookTitle, imageUrl } = useLocalSearchParams<{ 
    bookUrl: string, 
    bookTitle: string, 
    imageUrl: string 
  }>();
  
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
  const { sourceLanguage } = useLanguage();
  const [readingProgress, setReadingProgress] = useState(0);
  const annotateRef = useRef<(() => void) | undefined>(undefined);
  const router = useRouter();
  const isDBBookRef = useRef<boolean>(bookUrl.endsWith('.db'));

  const handleAnnotateSentence = () => {
    annotateRef.current?.();
  };

  // Initialize book data
  useEffect(() => {
    const initializeBook = async () => {
      await loadSavedLocation();
      const book = await database.getBookByName(bookTitle, sourceLanguage);
      if (book?.progress !== undefined) {
        setReadingProgress(book.progress);
      }
    };
    
    initializeBook();
    
    // Add back handler to properly clean up resources
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    
    return () => {
      backHandler.remove();
    };
  }, []);

  // Clean up resources when navigating away
  const handleBackPress = () => {
    // Let the default back navigation happen
    return false;
  };

  const handleLocationChange = async (
    totalLocations: number,
    currentLocation: Location,
    progress: number
  ) => {
    try {
      if (currentLocation && currentLocation.start) {
        await database.updateBook(bookTitle, sourceLanguage.toLowerCase(), currentLocation.start.cfi);
        if (totalLocations !== 0) {
          await database.updateBookProgress(bookTitle, sourceLanguage.toLowerCase(), progress);
          setReadingProgress(progress);
        }
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };
  
  const loadSavedLocation = async () => {
    try {
      const book = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase());
      if (book?.currentLocation !== null) {
        setInitialLocation(book?.currentLocation);
        console.log("Loaded saved location:", book?.currentLocation);
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }
  };

  const handlePanelClose = () => {
    setIsPanelVisible(false);
  };

  // Prevent component from re-rendering with different book type
  const isDBBook = isDBBookRef.current;

  return (
    <SafeAreaView style={styles.container}>
      {isDBBook ? (
        <SimpleReader
          bookUrl={bookUrl}
          bookTitle={bookTitle}
          imageUrl={imageUrl}
        />
      ) : (
        <ReaderProvider key={`reader-${bookTitle}`}>
          <ReaderComponent
            bookUrl={bookUrl}
            imageUrl={imageUrl}
            bookTitle={bookTitle}
            initialLocation={initialLocation}
            onLocationChange={handleLocationChange}
            setPanelContent={setPanelContent}
            setIsPanelVisible={setIsPanelVisible}
            onAnnotateSentenceRef={annotateRef}
          />
        </ReaderProvider>
      )}
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={handlePanelClose}
        onAnnotateSentence={handleAnnotateSentence}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  }
});
