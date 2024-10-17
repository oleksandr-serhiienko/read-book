import * as React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Reader, useReader, ReaderProvider, Section, Location } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reverso, { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';
import { useLocalSearchParams } from 'expo-router';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { useLanguage } from '@/app/languageSelector';

export default function PageScreen() {
  const { content } = useLocalSearchParams();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
  const { sourceLanguage, targetLanguage } = useLanguage();
  let reverso = new Reverso();

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
        // We're saving the CFI of the current location
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

  const handleSelected = async (selection: string) => {
    console.log('Selected text:', selection);
    try {
      const translationsNew = await reverso.getContextFromWebPage(selection, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]);
      if (translationsNew.Translations.length === 0) {
        let translation = await reverso.getTranslationFromAPI(selection, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]);
        setPanelContent(translation);
      } else {
        setPanelContent(translationsNew);
      }
      setIsPanelVisible(true);
    } catch (error) {
      console.error('Error fetching translation:', error);
      setIsPanelVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReaderProvider>
        <Reader
          src={JSON.parse(content as string)}
          fileSystem={useFileSystem}
          enableSelection={true}
          onSelected={handleSelected}
          flow="scrolled-doc"
          initialLocation={initialLocation}
          onLocationChange={handleLocationChange}
        />
      </ReaderProvider>
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={() => setIsPanelVisible(false)}
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