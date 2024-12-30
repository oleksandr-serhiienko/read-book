const localStyles = StyleSheet.create({
  originalContext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  }
});

const styles = {
  ...learningStyles,
  ...localStyles,
};

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';

const WordToMeaningExercise: React.FC<LearningExerciseProps> = ({
  card,
  onSuccess,
  onFailure,
  otherCards
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const otherOptions = otherCards
      .filter(c => c.id !== card.id)
      .map(c => c.translations[0])
      .slice(0, 3);

    const shuffledOptions = [card.translations[0], ...otherOptions]
      .sort(() => Math.random() - 0.5);
      
    setOptions(shuffledOptions);
  }, [card.id]);

  const handleOptionPress = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === card.translations[0]) {
        onSuccess();
      } else {
        onFailure();
      }
      setSelectedOption(null);
      setShowResult(false);
    }, 1000);
  };

  return (
    <ExerciseContainer>
        <Text style={styles.word}>{card.word}</Text>
        <Text style={styles.originalContext}>{card.info?.sentence}</Text>

        <View style={styles.optionsContainer}>
          {options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect = showResult && option === card.translations[0];
            const isWrong = showResult && isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  isCorrect && styles.correctOption,
                  isWrong && styles.wrongOption,
                ]}
                onPress={() => handleOptionPress(option)}
                disabled={showResult}
              >
                <Text style={styles.optionText}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
    </ExerciseContainer>
  );
};

export default WordToMeaningExercise;