// SimpleReader.tsx
import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useChapterData } from './hooks/useChapterData';
import { ChapterNavigation } from './components/ChapterNavigation';
import { Sentence } from './components/Sentence';
import { useParsedSentences } from './hooks/useParsedSentences';
import { useWordHighlight } from './hooks/useWordHighlight';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence } from './types/types';

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
            onWordPress={(word, sentence) => handleWordPress(word, sentence)}
            onLongPress={() => handleLongPress(sentence)}
            isWordHighlighted={isWordHighlighted}
          />
        ))}
      </ScrollView>
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