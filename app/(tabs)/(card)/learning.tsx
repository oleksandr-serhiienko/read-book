// learning.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, database } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';
import { LearningType, getLearningComponent } from './components/learning/LearningFactory';
import { learningStyles } from './components/shared/styles';

type ExerciseSession = {
  type: LearningType;
  cards: Card[];
  currentIndex: number;
};

export default function LearningScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const { sourceLanguage, targetLanguage } = useLanguage();

  const CARDS_PER_SESSION = 5; // Number of cards to show per exercise type

  useEffect(() => {
    const loadCards = async () => {
      await database.initialize();
      const cards = await database.getAllCards(
        sourceLanguage.toLowerCase(),
        targetLanguage.toLowerCase()
      );
      const learningCards = cards.filter(card => 
        card.info?.status === 'learning'
      );
      
      // Shuffle the cards initially
      const shuffledCards = [...learningCards].sort(() => Math.random() - 0.5);
      setAllCards(shuffledCards);
      
      // Initialize first session
      if (shuffledCards.length > 0) {
        setCurrentSession({
          type: 'wordToMeaning',
          cards: shuffledCards.slice(0, CARDS_PER_SESSION),
          currentIndex: 0
        });
      }
    };

    loadCards();
  }, [sourceLanguage, targetLanguage]);

  const handleSuccess = async () => {
    if (!currentSession) return;
    
    const currentCard = currentSession.cards[currentSession.currentIndex];
    if (currentCard.info?.learningProgress) {
      currentCard.info.learningProgress[currentSession.type]++;
      await database.updateCard(currentCard);
    }

    moveToNext();
  };

  const handleFailure = () => {
    moveToNext();
  };

  const moveToNext = () => {
    if (!currentSession) return;
  
    const nextIndex = currentSession.currentIndex + 1;
    
    // If we've completed all cards in current session
    if (nextIndex >= currentSession.cards.length) {
      const exerciseTypes: LearningType[] = [
        'wordToMeaning',
        'meaningToWord',
        'context',
        'contextLetters'  // Added new exercise type
      ];
      const currentTypeIndex = exerciseTypes.indexOf(currentSession.type);
      
      // If we've completed all exercise types
      if (currentTypeIndex >= exerciseTypes.length - 1) {
        // Start over with new set of cards
        const remainingCards = allCards.slice(CARDS_PER_SESSION);
        if (remainingCards.length > 0) {
          setAllCards(remainingCards);
          setCurrentSession({
            type: 'wordToMeaning',
            cards: remainingCards.slice(0, CARDS_PER_SESSION),
            currentIndex: 0
          });
        } else {
          setCurrentSession(null); // All done!
        }
      } else {
        // Move to next exercise type with same cards but shuffled
        const shuffledCards = [...currentSession.cards].sort(() => Math.random() - 0.5);
        setCurrentSession({
          type: exerciseTypes[currentTypeIndex + 1],
          cards: shuffledCards,
          currentIndex: 0
        });
      }
    } else {
      // Move to next card in current session
      setCurrentSession({
        ...currentSession,
        currentIndex: nextIndex
      });
    }
  };

  const getOtherCards = (currentCard: Card) => {
    return allCards.filter(c => c.id !== currentCard.id);
  };

  if (!currentSession || allCards.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No words to learn right now</Text>
      </View>
    );
  }

  const CurrentExercise = getLearningComponent(currentSession.type);
  const currentCard = currentSession.cards[currentSession.currentIndex];

  const getExerciseTitle = (type: LearningType) => {
    switch (type) {
      case 'wordToMeaning':
        return 'Word to Translation';
      case 'meaningToWord':
        return 'Translation to Word';
      case 'context':
        return 'Context Learning';
      default:
        return 'Learning Words';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{getExerciseTitle(currentSession.type)}</Text>
        <Text style={styles.progressText}>
          {currentSession.currentIndex + 1} of {currentSession.cards.length}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <CurrentExercise
          card={currentCard}
          onSuccess={handleSuccess}
          onFailure={handleFailure}
          otherCards={getOtherCards(currentCard)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  progressText: {
    fontSize: 16,
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});