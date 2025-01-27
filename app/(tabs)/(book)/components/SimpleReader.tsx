// SimpleReader.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useChapterData } from './hooks/useChapterData';
import { ChapterNavigation } from './components/ChapterNavigation';
import { Sentence } from './components/Sentence';
import { useParsedSentences } from './hooks/useParsedSentences';
import { useWordHighlight } from './hooks/useWordHighlight';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence } from './types/types';
import { PanelContent, SlidePanelEvents } from './events/slidePanelEvents';
import SlidePanel from '../slidePanel';

interface DBReaderProps {
  bookUrl: string;
  bookTitle: string;
  imageUrl: string;
}

const SimpleReader: React.FC<DBReaderProps> = ({ bookUrl, bookTitle, imageUrl }) => {
  const {
    currentChapter,
    chapterSentences,
    isLoading,
    error,
    totalChapters,
    loadChapter,
    nextChapter,
    previousChapter
  } = useChapterData({ bookTitle, bookUrl });

  const { parsedSentences, updateParsedSentences, parseSentence } = useParsedSentences(chapterSentences);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<PanelContent>(null);

// Update the useEffect in SimpleReader
useEffect(() => {
  console.log('[SimpleReader] Setting up panel event subscription');
  
  // Reset the events system on mount
  SlidePanelEvents.reset();
  
  const unsubscribe = SlidePanelEvents.subscribe((content, isVisible) => {
    console.log('[SimpleReader] Received panel event:', { contentExists: !!content, isVisible });
    requestAnimationFrame(() => {
      setPanelContent(content);
      setIsPanelVisible(isVisible);
    });
  });

  // Verify subscription
  if (!SlidePanelEvents.hasListeners()) {
    console.error('[SimpleReader] Failed to subscribe to panel events');
  }

  return () => {
    console.log('[SimpleReader] Cleaning up panel event subscription');
    unsubscribe();
  };
}, []);

  const parsedSentencesState = {
    parsedSentences,
    updateParsedSentences
  };

  const { 
    selectedSentence, 
    handleWordPress, 
    handleLongPress, 
    isWordHighlighted 
  } = useWordHighlight(parseSentence, parsedSentencesState);

  useEffect(() => {
    loadChapter(0);
  }, [bookUrl]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChapterNavigation
        currentChapter={currentChapter}
        totalChapters={totalChapters}
        onNext={nextChapter}
        onPrevious={previousChapter}
      />
      <ScrollView style={styles.content}>
        {chapterSentences.map((sentence) => (
          <Sentence
            key={sentence.sentence_number}
            sentence={sentence}
            parsedSentence={parsedSentences.get(sentence.sentence_number)}
            isSelected={selectedSentence === sentence.sentence_number}
            bookTitle={bookTitle}
            onWordPress={(word, sentence, index) => handleWordPress(word, sentence, index)}
            onLongPress={() => handleLongPress(sentence)}
            isWordHighlighted={isWordHighlighted}
          />
        ))}
      </ScrollView>
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={() => SlidePanelEvents.emit(null, false)}
        onAnnotateSentence={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    color: 'red',
    padding: 16,
    textAlign: 'center',
  }
});

export default SimpleReader;