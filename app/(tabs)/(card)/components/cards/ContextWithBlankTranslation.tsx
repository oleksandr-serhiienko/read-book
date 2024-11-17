import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';

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

const ContextWithBlankTranslation: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  if (!card.context || !card.context[0]) return null;

  const translationSentence = card.context[0].translation.replace(/<\/?em>/g, '');
  const wordToReplace = translationSentence.match(/<em>(.*?)<\/em>/)?.[1] ?? card.translations[0];
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {renderHighlightedText(card.context[0].sentence)}
      </Text>
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {translationSentence.replace(wordToReplace, '_____')}
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

export default ContextWithBlankTranslation;