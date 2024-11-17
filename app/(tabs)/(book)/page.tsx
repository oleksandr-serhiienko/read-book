import * as React from 'react';
import { SafeAreaView, StyleSheet, Alert, TouchableOpacity, View, Animated, Text } from 'react-native';
import { Reader, useReader, ReaderProvider, Section, Location, Annotation } from '@/components/epub';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reverso, { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams } from 'expo-router';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { useLanguage } from '@/app/languageSelector';
import { Book, database } from '@/components/db/database';
import { MinusCircle, PlusCircle, Type } from 'lucide-react-native';
import FileManager from './fileManager';
import { WebViewMessageEvent } from 'react-native-webview';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

const FontControls = ({ 
  increaseFontSize, 
  decreaseFontSize, 
  currentFontSize 
}: { 
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  currentFontSize: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const toggleControls = () => {
    if (isVisible) {
      // Hide controls
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsVisible(false));
    } else {
      // Show controls
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <View style={styles.fontControlsContainer}>
      {/* Toggle button */}
      <TouchableOpacity 
        onPress={toggleControls} 
        style={styles.toggleButton}
      >
        <Type size={24} color="#666" />
      </TouchableOpacity>

      {/* Controls panel */}
      {isVisible && (
        <Animated.View 
          style={[
            styles.controlsPanel,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity onPress={decreaseFontSize} style={styles.fontButton}>
            <MinusCircle size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.fontSizeDisplay}>
            <Text style={styles.fontSizeText}>{currentFontSize}</Text>
          </View>
          <TouchableOpacity onPress={increaseFontSize} style={styles.fontButton}>
            <PlusCircle size={24} color="#666" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

interface ReaderComponentProps {
  bookUrl: string;
  bookTitle: string;
  imageUrl: string;
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

// Your existing ReaderComponent with the new FontControls
const ReaderComponent: React.FC<ReaderComponentProps> = ({
  bookUrl,
  imageUrl,
  bookTitle,
  initialLocation,
  onLocationChange,
  setPanelContent,
  setIsPanelVisible,
}) => {
  const { addAnnotation, removeAnnotation, changeFontSize } = useReader();
  const { sourceLanguage, targetLanguage } = useLanguage();
  const [localBookUrl, setLocalBookUrl] = useState<string>(bookUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFontSize, setCurrentFontSize] = useState(16); // Default font size
  let reverso = new Reverso();
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [currentSenteceCfi, setSentenceCurrentCfi] = useState<string | null>(null);
  const [currentSentenceAnnotation, setCurrentSentenceAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    setupBook();
    loadFontSize();
  }, [bookUrl]);

  const loadFontSize = async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      if (savedFontSize) {
        const size = parseInt(savedFontSize);
        setCurrentFontSize(size);
        changeFontSize(`${size}px`);
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    }
  };

  const handleSentenceSelection = React.useCallback((text: string, cfiRange: string) => {
    
    // Remove previous annotation if exists
    if (currentSentenceAnnotation) {
      removeAnnotation(currentSentenceAnnotation);
      setCurrentSentenceAnnotation(null);
    }
    
    console.log('Selection handler called with:', { text, cfiRange });
    try {
      // Add the new annotation
      const annotation = {
        type: 'highlight',
        cfiRange,
        styles: { color: '#23CE6B' },
        data: {}
      } as Annotation;
  
      addAnnotation(annotation.type, annotation.cfiRange, annotation.data, annotation.styles);

      setCurrentSentenceAnnotation(annotation);
      console.log('Annotation added successfully');
    } catch (error) {
      console.error('Error adding annotation:', error);
    }
  }, [addAnnotation, removeAnnotation, currentSentenceAnnotation]);

  interface SentenceSelectedMessage {   type: 'onSentenceSelected';   text: string;   cfiRange: string;   section?: number; } 
  // WebView message handler
  const handleWebViewMessage = React.useCallback((event: WebViewMessageEvent) => {
    try {
      const messageData = event as unknown as SentenceSelectedMessage;
      console.log('WebView message received:', messageData);

      if (messageData.type === 'onSentenceSelected') {
        setSentenceCurrentCfi(messageData.cfiRange);
        //handleSentenceSelection(messageData.text, messageData.cfiRange);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  }, [handleSentenceSelection]);


  
  const increaseFontSize = () => {
    if (currentFontSize < MAX_FONT_SIZE) {
      const newSize = currentFontSize + 1;
      setCurrentFontSize(newSize);
      changeFontSize(`${newSize}px`);
      AsyncStorage.setItem('fontSize', newSize.toString());
    }
  };

  const decreaseFontSize = () => {
    if (currentFontSize > MIN_FONT_SIZE) {
      const newSize = currentFontSize - 1;
      setCurrentFontSize(newSize);
      changeFontSize(`${newSize}px`);
      AsyncStorage.setItem('fontSize', newSize.toString());
    }
  };

  const setupBook = async () => {
    try {
      setIsLoading(true);
      await FileManager.init();
      let localPath = await FileManager.checkBook(bookUrl);   
      let localImage = await FileManager.checkImage(imageUrl);    
      const bookExist = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase());
      setLocalBookUrl(localPath);
      if (bookExist === null){
        const book: Book = {
          bookUrl : localPath,
          name : bookTitle,
          sourceLanguage : sourceLanguage.toLowerCase(),
          updateDate : new Date(),
          lastreadDate : new Date(),
          imageUrl: localImage        
        }
        database.insertBook(book);
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
    return null;
  }

  const menuItems = [
    {
      key: 'annotate-sentence',
      label: 'Annotate Sentence',
      action: () => {
        console.log(currentSenteceCfi);
        handleSentenceSelection("", currentSenteceCfi ?? "");
        return true; // Return true to indicate the action was handled
      }
    }
  ];
  return (
    <View style={styles.container}>
      <FontControls 
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
        currentFontSize={currentFontSize}
      />
      
      <Reader
        src={localBookUrl}
        fileSystem={useFileSystem}
        enableSelection={true}
        onSelected={handleSelected}
        flow="scrolled-doc"
        initialLocation={initialLocation}
        onLocationChange={onLocationChange}
        onWebViewMessage={handleWebViewMessage}
        menuItems={menuItems}
      />
    </View>
  );
};

export default function PageScreen() {
  const { bookUrl, bookTitle, imageUrl } = useLocalSearchParams<{ bookUrl: string, bookTitle: string, imageUrl: string }>();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
  const { sourceLanguage } = useLanguage();

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
        await database.updateBook(bookTitle, sourceLanguage.toLowerCase(), currentLocation.start.cfi)
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
          imageUrl = {imageUrl}
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
  fontControlsContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fontButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  fontSizeDisplay: {
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
