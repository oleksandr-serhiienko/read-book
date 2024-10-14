import * as React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Reader, useReader, ReaderProvider, Section, Location } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reverso, { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';

export default function PageScreen() {
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<SentenceTranslation | ResponseTranslation | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
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
      const translationsNew = await reverso.getContextFromWebPage(selection);
      if (translationsNew.Translations.length === 0) {
        let translation = await reverso.getTranslationFromAPI(selection);
        setPanelContent(translation);
      } else {
        setPanelContent(translationsNew);
      }
      setIsPanelVisible(true);
    } catch (error) {
      console.error('Error fetching translation:', error);
      setIsPanelVisible(true);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <ReaderProvider>
        <Reader
          src="https://s3.amazonaws.com/moby-dick/OPS/package.opf"
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