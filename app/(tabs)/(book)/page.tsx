import * as React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Reader, useReader, ReaderProvider, Section, Location, Annotation } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reverso, { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams } from 'expo-router';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { useLanguage } from '@/app/languageSelector';

interface ReaderComponentProps {
  bookUrl: string;
  bookTitle: string;
  initialLocation: string | undefined;
  onLocationChange: (
    totalLocations: number,
    currentLocation: Location,
    progress: number,
    currentSection: Section | null
  ) => void;
  setPanelContent: React.Dispatch<React.SetStateAction<SentenceTranslation | ResponseTranslation | null>>;
  setIsPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReaderComponent: React.FC<ReaderComponentProps> = ({
  bookUrl,
  bookTitle,
  initialLocation,
  onLocationChange,
  setPanelContent,
  setIsPanelVisible,
}) => {
  const { addAnnotation, removeAnnotation } = useReader();
  const { sourceLanguage, targetLanguage } = useLanguage();
  let reverso = new Reverso();
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

  const handleSelected = async (selection: string, cfiRange: string) => {
    console.log('Selected text:', selection);
    
    // Remove previous highlight if exists
    if (currentAnnotation) {
      removeAnnotation(currentAnnotation);
    }

    // Add new highlight
    const annotation = {
      type: 'highlight',
      cfiRange,
      styles: { color: '#23CE6B' },
      data: {}
    } as Annotation;

    addAnnotation(annotation.type, annotation.cfiRange, annotation.data, annotation.styles);
    setCurrentAnnotation(annotation);

    try {
      const translationsNew = await reverso.getContextFromWebPage(
        selection,
        SupportedLanguages[sourceLanguage],
        SupportedLanguages[targetLanguage]
      );

      if (translationsNew.Translations.length === 0) {
        let translation = await reverso.getTranslationFromAPI(
          selection,
          SupportedLanguages[sourceLanguage],
          SupportedLanguages[targetLanguage]
        );
        setPanelContent(translation);
      } else {
        translationsNew.Book = bookTitle;
        setPanelContent(translationsNew);
      }
      setIsPanelVisible(true);
    } catch (error) {
      console.error('Error fetching translation:', error);
      if (currentAnnotation) {
        removeAnnotation(currentAnnotation);
      }
      setIsPanelVisible(false);
    }
  };

  return (
    <Reader
      src={bookUrl}
      fileSystem={useFileSystem}
      enableSelection={true}
      onSelected={handleSelected}
      flow="scrolled-doc"
      initialLocation={initialLocation}
      onLocationChange={onLocationChange}
    />
  );
};

export default function PageScreen() {
  const { bookUrl, bookTitle } = useLocalSearchParams<{ bookUrl: string, bookTitle: string }>();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);

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
        await AsyncStorage.setItem('readerLocation', currentLocation.start.cfi);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const loadSavedLocation = async () => {
    try {
      const savedLocation = await AsyncStorage.getItem('readerLocation');
      if (savedLocation !== null) {
        setInitialLocation(savedLocation);
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
          bookTitle={bookTitle}
          initialLocation={initialLocation}
          onLocationChange={handleLocationChange}
          setPanelContent={setPanelContent}
          setIsPanelVisible={setIsPanelVisible}
        />
      </ReaderProvider>
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={handlePanelClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
});