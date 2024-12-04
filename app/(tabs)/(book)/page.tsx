import * as React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { ReaderProvider, Section, Location} from '@/components/epub';
import { useState, useEffect, useRef } from 'react';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import { database } from '@/components/db/database';
import ReaderComponent from './components/ReaderComponent';
import ProgressBar from './components/ProgressBar';

export default function PageScreen() {
  const { bookUrl, bookTitle, imageUrl } = useLocalSearchParams<{ bookUrl: string, bookTitle: string, imageUrl: string }>();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
  const { sourceLanguage } = useLanguage();
  const [readingProgress, setReadingProgress] = useState(0);
  const annotateRef = useRef<(() => void) | undefined>(undefined);
  const handleAnnotateSentence = () => {
    annotateRef.current?.();
  };

  React.useEffect(() => {
    loadSavedLocation();
  }, []);

  const handleLocationChange = async (
    totalLocations: number,
    currentLocation: Location,
    progress: number,
    currentSection: Section | null
  ) => {
    try {
      if (currentLocation && currentLocation.start) {
        await database.updateBook(bookTitle, sourceLanguage.toLowerCase(), currentLocation.start.cfi);
        if(totalLocations !== 0){
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
        console.log(book)
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }   
  };

  const handlePanelClose = () => {
    setIsPanelVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReaderProvider>
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
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={handlePanelClose}
        onAnnotateSentence={handleAnnotateSentence}
      />
      <ProgressBar progress={readingProgress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  }
});
