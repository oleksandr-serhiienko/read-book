// MeaningToWordExercise.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';

const MeaningToWordExercise: React.FC<LearningExerciseProps> = ({
  card,
  onSuccess,
  onFailure,
  otherCards
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]); // Add this line

  // Add this useEffect
  useEffect(() => {
    // Get 3 random words from other cards
    const otherOptions = otherCards
      .filter(c => c.id !== card.id)
      .map(c => c.word)
      .slice(0, 3);

    // Combine with correct answer and shuffle
    const shuffledOptions = [card.word, ...otherOptions]
      .sort(() => Math.random() - 0.5);
      
    setOptions(shuffledOptions);
  }, [card.id]); // Only regenerate when card changes

  const handleOptionPress = (option: string) => {
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === card.word) {
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
        <Text style={learningStyles.word}>{card.translations[0]}</Text>
        <View style={learningStyles.optionsContainer}>
          {options.map((option, index) => {    // Changed this line from generateOptions() to options
            const isSelected = selectedOption === option;
            const isCorrect = showResult && option === card.word;
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

export default MeaningToWordExercise;