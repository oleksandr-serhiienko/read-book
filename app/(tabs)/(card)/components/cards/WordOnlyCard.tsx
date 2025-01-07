import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';

const localStyles = StyleSheet.create({
  labelText: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginVertical: 10,
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 5,
  },
  originalContext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  highlightedWord: {
    fontWeight: 'bold',
    color: '#3498db',
  }
});

// Merge styles safely
const styles = {
  ...cardStyles,
  ...localStyles,
};

const WordOnlyCard: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  const getContextToShow = () => {
    if (!card.info?.sentence) {
      if (card.context) {
        return formatSentence(card.context[0].sentence);
      }
      return "";
    }

    const wordCount = card.info.sentence.split(/\s+/).length;
    if (wordCount > 20) {
      if (card.context) {
        return formatSentence(card.context[0].sentence);
      }
      return "";
    }

    return formatSentence(card.info.sentence);
  };

  const formatSentence = (sentence: string) => {
    if (!sentence) return "";
    
    if (sentence.includes('<em>')) {
      return sentence.split(/(<em>.*?<\/em>)/).map((part, index) => {
        if (part.startsWith('<em>') && part.endsWith('</em>')) {
          const word = part.replace(/<\/?em>/g, '');
          return (
            <Text key={index} style={styles.highlightedWord}>
              {word}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      });
    }

    return sentence;
  };

  return (
    <View style={styles.cardContent}>
      <View>
        <Text style={styles.labelText}>Original</Text>
        <Text style={styles.mainText}>{card.word}</Text>
        <Text style={styles.originalContext}>{getContextToShow()}</Text>
      </View>
      
      <View>
        <Text style={styles.labelText}>Translation</Text>
        <Text style={styles.mainText}>
          {'_'.repeat(Math.max(8, card.translations[0].length))}
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

export default WordOnlyCard;