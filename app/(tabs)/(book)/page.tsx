import * as React from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { Reader, useReader, ReaderProvider, Section, Location, Annotation } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import Reverso, { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams } from 'expo-router';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { useLanguage } from '@/app/languageSelector';

// File management utilities
const FileManager = {
  booksDirectory: `${FileSystem.documentDirectory}books/`,

  async init() {
    const dirInfo = await FileSystem.getInfoAsync(this.booksDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.booksDirectory, { intermediates: true });
    }
  },

  getLocalPath(bookUrl: string): string {
    const filename = bookUrl.split('/').pop();
    return `${this.booksDirectory}${filename}`;
  },

  async checkLocalFile(bookUrl: string): Promise<string | null> {
    const localPath = this.getLocalPath(bookUrl);
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists ? localPath : null;
  },

  async downloadBook(bookUrl: string): Promise<string> {
    const localPath = this.getLocalPath(bookUrl);
    
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        bookUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${progress * 100}%`);
        }
      );
  
      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Download failed - no result returned');
      }
      
      return result.uri;
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download the book');
    }
  }
};

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
  const [localBookUrl, setLocalBookUrl] = useState<string>(bookUrl);
  const [isLoading, setIsLoading] = useState(true);
  let reverso = new Reverso();
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    setupBook();
  }, [bookUrl]);

  const setupBook = async () => {
    try {
      setIsLoading(true);
      await FileManager.init();
      
      // Check if book exists locally
      let localPath = await FileManager.checkLocalFile(bookUrl);
      
      if (!localPath) {
        // If not found locally, download it
        localPath = await FileManager.downloadBook(bookUrl);
        console.log("book is downloaded")
      }
      
      setLocalBookUrl(localPath);
     
    } catch (error) {
      console.error('Error setting up book:', error);
      Alert.alert('Error', 'Failed to load the book. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelected = async (selection: string, cfiRange: string) => {
    console.log('Selected text:', selection);
    
    if (currentAnnotation) {
      removeAnnotation(currentAnnotation);
    }

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

  if (isLoading) {
    return null; // Or return a loading spinner
  }

  return (
    <Reader
      src={localBookUrl}
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