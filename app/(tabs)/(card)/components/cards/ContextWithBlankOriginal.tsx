import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { renderHighlightedText } from '../shared/helpers';

const localStyles = RNStyleSheet.create({
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
});

const styles = {
  ...cardStyles,
  ...localStyles,
};

const ContextWithBlankOriginal: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  if (!card.context || !card.context[0]) return null;

  const originalSentence = card.context[0].sentence.replace(/<\/?em>/g, '');
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {originalSentence.replace(card.word, '_____')}
      </Text>
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {renderHighlightedText(card.context[0].translation, styles)}
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

export default ContextWithBlankOriginal;