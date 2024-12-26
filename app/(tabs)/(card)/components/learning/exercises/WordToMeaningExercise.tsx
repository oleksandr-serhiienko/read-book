// WordToMeaningExercise.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';

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
    
    // Move the success/failure handling inside setTimeout
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
    <View style={learningStyles.container}>
      <View style={learningStyles.cardContent}>
        <Text style={learningStyles.word}>{card.word}</Text>
        <View style={learningStyles.optionsContainer}>
          {options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect = showResult && option === card.translations[0];
            const isWrong = showResult && isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  learningStyles.option,
                  isCorrect && learningStyles.correctOption,
                  isWrong && learningStyles.wrongOption,
                ]}
                onPress={() => handleOptionPress(option)}
                disabled={showResult}
              >
                <Text style={learningStyles.optionText}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default WordToMeaningExercise;