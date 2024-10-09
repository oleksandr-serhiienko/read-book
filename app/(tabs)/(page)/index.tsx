import * as React from 'react';
import { SafeAreaView } from 'react-native';
import { Reader, useReader } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { ReaderProvider } from '@epubjs-react-native/core';
import { useState } from 'react';
import Reverso, { ResponseTranslation } from '@/components/reverso/reverso';
import SlidePanel from './slidePanel';


export default function HomeScreen() {
  const [translations, setTranslations] = useState<{[key: number]: {text: string, visible: boolean}}>({});
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<string>('');
  const [panelFullContent, setPanelFullContent] = useState<string>('');
  const [currentTranslations, setCurrentTranslations] = useState<ResponseTranslation | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>('');
  let reverso = new Reverso();   

  const handleSelected = async (selection: string) => {
    console.log('Selected text:', selection);
    setSelectedWord(selection);
    try {
      const translationsNew = await reverso.getContextFromWebPage(selection);
      setCurrentTranslations(translationsNew); 
      console.log(translationsNew);
      // Format each translation
      console.log("ddddddddddddddddddddddddddddd");
      console.log(translationsNew.Translations);
      let formattedTranslations = null;
      if (translationsNew.Translations.length === 0)
        {
          console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj");
          let translation = await reverso.getTranslationFromAPI(selection);
          const translationObj = JSON.parse(translation);
          const translatedText = translationObj["translation"];
          //console.log(translatedText);
          formattedTranslations = translatedText
        }
        else
        {
          
          formattedTranslations = translationsNew.Translations
          .map(t => t.word + ", ");
          //.join(', ');

         // formattedTranslations = translationsNew.Translations.map(t => 
           // `${t.word}${t.pos ? ` • ${t.pos}` : ''}`);
           // t.word).join(', ');
        }
      
  
      // Prepare content for the panel
      //const initialContent = formattedTranslations.slice(0, 5).join('\n');
      const fullContent = formattedTranslations.join('\n');
  
      setPanelContent(formattedTranslations);
      //setPanelFullContent(fullContent);
      setIsPanelVisible(true);      
  
    } catch (error) {
      console.error('Error fetching translation:', error);
      setPanelContent(`Error fetching translation for "${selection}"`);
      //setPanelFullContent(`Error fetching translation for "${selection}"`);
      setIsPanelVisible(true);
      setCurrentTranslations(null);  // Reset translations on error
    }
  };

  

  const handleAddToDictionary = () => {
    // Implement your logic to add the word to the dictionary
    console.log(`Adding "${selectedWord}" to dictionary`);
    // You might want to use your database logic here
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
        <SlidePanel 
          isVisible={isPanelVisible}
          content={panelContent}
          onClose={() => setIsPanelVisible(false)}
          //onExpand={handleExpand}
        />
      </ReaderProvider>
    </SafeAreaView>
  );
}