import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ParsedWord } from '../types/types';
import { DBSentence } from '@/components/db/bookDatabase';

interface WordProps {
  word: ParsedWord;
  sentence: DBSentence;
  isHighlighted: boolean;
  onPress: (word: string, sentence: DBSentence) => void;
  onLongPress?: () => void;
}

export const Word: React.FC<WordProps> = ({
  word,
  sentence,
  isHighlighted,
  onPress,
  onLongPress
}) => (
  <Text
    onPress={() => !word.isSpace && onPress(word.word, sentence)}
    onLongPress={onLongPress}
    style={[
      styles.word,
      word.isSpace && styles.space,
      isHighlighted && styles.highlightedWord
    ]}
  >
    {word.word}
  </Text>
);
const styles = StyleSheet.create({
    word: {
      fontSize: 16,
      lineHeight: 24,
    },
    space: {
      width: 4,
    },
    highlightedWord: {
      backgroundColor: '#3498db',
      color: '#fff',
    }
  });