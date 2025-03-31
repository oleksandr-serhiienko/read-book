import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { renderHighlightedText, selectBestContext } from '../shared/helpers';

const localStyles = StyleSheet.create({
  selectableTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  wordButton: {
    padding: 6,
    borderRadius: 6,
    position: 'relative',
    minHeight: 40,
  },
  correctWord: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  wrongWord: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
});

const styles = {
  ...cardStyles,
  ...localStyles,
};

function cleanWord(word: string) {
  if (!word || typeof word !== 'string') {
    return '';
  }
  
  return word
    // Remove trailing punctuation
    .replace(/[.,!?;:]+$/, '')
    // Remove leading punctuation
    .replace(/^[.,!?;:]+/, '')
    .replace(/[.,!?;:]/g, '')
    // Remove quotes (single, double, smart quotes, guillemets)
    .replace(/[«»]/g, '')
    // Remove brackets and parentheses
    .replace(/[\[\]()<>{}]/g, '')
    // Remove angle brackets and HTML-like tags
    .replace(/[<>]/g, '')
    // Remove other special characters as needed
    .replace(/[@#$%^&*_=+|~]/g, '')
    // Optionally trim whitespace
    .trim();
}

const ContextWithSelectableOriginal: FC<CardProps> = ({ card, onShowAnswer, contextId, isFlipping }) => {
  if (!card.context || !card.context[0]) return null;
  
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const selectedContext = card.context.find(c => c.id == contextId) ?? card.context[0];
  
  if (!selectedContext) return null;
  
  const originalSentence = selectedContext.sentence.replace(/<\/?em>/g, '');
  const words = originalSentence.split(/\s+/);
  
  const handleWordPress = (word: string) => {
    const cleanedWord = cleanWord(word);
    setSelectedWord(cleanedWord);
    const isWordCorrect = cleanedWord === card.word;
    setIsCorrect(isWordCorrect);
    
     };
  
  return (
    <View style={styles.cardContent}>
      <View style={styles.selectableTextContainer}>
        {words.map((word, index) => {
          const cleanedWord = cleanWord(word);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordPress(word)}
              style={[
                styles.wordButton,
                selectedWord === cleanedWord && (isCorrect ? styles.correctWord : styles.wrongWord)
              ]}
            >
              <Text style={styles.contextText}>{word}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {renderHighlightedText(selectedContext.translation, styles)}
        </Text>
      </View>
      
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

export default ContextWithSelectableOriginal;