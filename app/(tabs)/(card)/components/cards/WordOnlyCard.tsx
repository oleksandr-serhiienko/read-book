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
  }
});

// Merge styles safely
const styles = {
  ...cardStyles,
  ...localStyles,
};

const WordOnlyCard: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  return (
    <View style={styles.cardContent}>
      <View>
        <Text style={styles.labelText}>Original</Text>
        <Text style={styles.mainText}>{card.word}</Text>
        <Text style={styles.originalContext}>{card.info?.sentence}</Text>
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