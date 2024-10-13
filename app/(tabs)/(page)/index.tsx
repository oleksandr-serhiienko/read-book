import * as React from 'react';
import { SafeAreaView } from 'react-native';
import { Reader, useReader } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { ReaderProvider } from '@epubjs-react-native/core';
import { useState } from 'react';
import Reverso, { ResponseTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';


export default function HomeScreen() {
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<string | ResponseTranslation>('');
  let reverso = new Reverso();   

  const handleSelected = async (selection: string) => {
    console.log('Selected text:', selection);
    try {
      const translationsNew = await reverso.getContextFromWebPage(selection);
      if (translationsNew.Translations.length === 0)
        {
          let translation = await reverso.getTranslationFromAPI(selection);
          const translationObj = JSON.parse(translation);
          const translatedText = String(translationObj["translation"]);
          setPanelContent(translatedText);
        }
        else
        {          
           setPanelContent(translationsNew);
        }
      
      setIsPanelVisible(true);      
  
    } catch (error) {
      console.error('Error fetching translation:', error);
      setIsPanelVisible(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ReaderProvider>
        <Reader
          src="https://s3.amazonaws.com/moby-dick/OPS/package.opf"
          fileSystem={useFileSystem}
          enableSelection={true}
          onSelected={handleSelected}
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