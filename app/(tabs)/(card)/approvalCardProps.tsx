import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/db/database';
import { useRouter } from 'expo-router';

interface ApprovalCardProps {
  card: Card;
  onCardUpdate: (card: Card) => void;
}

// Different card type components
const WordOnlyCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    <Text style={styles.word}>{card.word}</Text>
  </View>
);

const TranslationOnlyCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    <Text style={styles.translation}>{card.translations[0]}</Text>
  </View>
);

const ContextWithBlankCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    {card.context && card.context[0] && (
      <Text style={styles.contextText}>
        {card.context[0].sentence.replace(card.word, '_____')}
      </Text>
    )}
  </View>
);

const TranslatedContextCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    {card.context && card.context[0] && (
      <Text style={styles.contextText}>
        {card.context[0].translation}
      </Text>
    )}
  </View>
);

const ContextOnlyCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    {card.context && card.context[0] && (
      <Text style={styles.contextText}>
        {card.context[0].sentence}
      </Text>
    )}
  </View>
);

type CardComponentType = FC<ApprovalCardProps>;
type CardComponentsType = Record<number, CardComponentType>;

export const ApprovalCard: FC<ApprovalCardProps> = ({ card, onCardUpdate }) => {
  const router = useRouter();

  // Map of level to card components
  const cardComponents: CardComponentsType = {
    0: WordOnlyCard,
    1: WordOnlyCard,
    2: TranslationOnlyCard,
    3: ContextWithBlankCard,
    5: TranslatedContextCard,
    8: ContextOnlyCard,
  };

  const handleShowAnswer = () => {
    router.push({
      pathname: '/cardPanel',
      params: { 
        cardId: card.id,
        returnToApproval: 'true',
      }
    });
  };

  const level = card.level % Object.keys(cardComponents).length;
  const CardComponent = cardComponents[level] || cardComponents[1];

  return (
    <View style={styles.container}>
      <CardComponent card={card} onCardUpdate={onCardUpdate} />
      <TouchableOpacity 
        style={styles.showAnswerButton}
        onPress={handleShowAnswer}
      >
        <Text style={styles.buttonText}>Show Answer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  word: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  translation: {
    fontSize: 22,
    color: '#555',
    textAlign: 'center',
  },
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  showAnswerButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ApprovalCard;