import React, { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { getWordHints } from '../../../../../components/db/nextWordToLearn';

const renderHighlightedText = (text: string) => {
  const parts = text.split(/(<em>.*?<\/em>)/);
  return parts.map((part, index) => {
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(4, -5)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

const localStyles = StyleSheet.create({
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  // New styles for hints
  hintsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    padding: 10,
  },
  hintLetter: {
    fontSize: 18,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    minWidth: 36,
    textAlign: 'center',
  },
  showHintsButton: {
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  showHintsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

const styles = {
  ...cardStyles,
  ...localStyles,
};

const ContextWithBlankTranslation: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  const [showHints, setShowHints] = useState(false);
  useEffect(() => {
    setShowHints(false);
  }, [card.word]); // Reset when word changes

  if (!card.context || !card.context[0]) return null;

  const translationSentence = card.context[0].translation.replace(/<\/?em>/g, '');
  const wordToReplace = translationSentence.match(/<em>(.*?)<\/em>/)?.[1] ?? card.translations[0];
  const hints = getWordHints(wordToReplace);
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {renderHighlightedText(card.context[0].sentence)}
      </Text>
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {translationSentence.replace(wordToReplace, '_'.repeat(wordToReplace.length))}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.showHintsButton}
        onPress={() => setShowHints(!showHints)}
      >
        <Text style={styles.showHintsText}>
          {showHints ? 'Hide Hints' : 'Show Hints (?)'} 
        </Text>
      </TouchableOpacity>

      {showHints && (
        <View style={styles.hintsContainer}>
          {hints.map((letter: string, index: number) => (
            <Text key={index} style={styles.hintLetter}>
              {letter}
            </Text>
          ))}
        </View>
      )}

      {!isFlipping && onShowAnswer && (
        <TouchableOpacity 
          style={styles.showAnswerButton}
          onPress={onShowAnswer}
        >
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ContextWithBlankTranslation;