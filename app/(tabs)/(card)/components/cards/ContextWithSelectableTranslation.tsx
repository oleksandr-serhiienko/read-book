import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

function cleanWord(word: string ) {
  if (!word || typeof word !== 'string') {
    return '';
  }
  
  // Trim non-letters from start and end
  // \p{L} matches any kind of letter from any language
  return word
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .trim();
}

const ContextWithSelectableTranslation: FC<CardProps> = ({ card, onShowAnswer, contextId, isFlipping }) => {
  if (!card.context || !card.context[0]) return null;

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const selectedContext = card.context.find(c => c.id == contextId) ?? card.context[0];
        if (!selectedContext) return null;
    

  const translationSentence = selectedContext.translation.replace(/<\/?em>/g, '');
  const words = translationSentence.split(/\s+/);

  const handleWordPress = (word: string) => {
    setSelectedWord(cleanWord(word));
    const isWordCorrect = card.translations.includes(cleanWord(word));
    setIsCorrect(isWordCorrect);
    
    if (!isWordCorrect) {
      setTimeout(() => {
        setSelectedWord(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {renderHighlightedText(selectedContext.sentence, styles)}
      </Text>
      
      <View style={styles.translationContainer}>
        <View style={styles.selectableTextContainer}>
          {words.map((word, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordPress(word)}
              style={[
                styles.wordButton,
                selectedWord === word && (isCorrect ? styles.correctWord : styles.wrongWord)
              ]}
            >
              <Text style={styles.contextText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
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

export default ContextWithSelectableTranslation;