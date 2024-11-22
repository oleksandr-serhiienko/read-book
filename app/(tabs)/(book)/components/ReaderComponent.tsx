import { useLanguage } from "@/app/languageSelector";
import { Annotation, Reader, useReader } from "@/components/epub";
import Reverso from "@/components/reverso/reverso";
import React from "react";
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import FileManager from "./FileManager";
import { Book, database } from "@/components/db/database";
import SupportedLanguages from "@/components/reverso/languages/entities/languages";
import { ReaderComponentProps } from "./types/ReaderComponentProps";
import { WebViewMessageEvent } from "react-native-webview";
import FontControls from "./types/FontControls";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";


const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

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
    const [currentSenteceCfi, setSentenceCurrentCfi] = useState<string>("");
    const [currentSenteceText, setSentenceCurrentText] = useState<string>("");
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
          setSentenceCurrentText(messageData.text);
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
        //Alert.alert('Error', 'Failed to load the book. Please try again.');
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
  
    const  menuItems = [
      {
        key: 'annotate-sentence',
        label: 'Annotate Sentence',
        action: () => {
          console.log(currentSenteceCfi);
          handleSelected(currentSenteceText, currentSenteceCfi);
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
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f0f0f0',
    }
  });

  export default ReaderComponent;