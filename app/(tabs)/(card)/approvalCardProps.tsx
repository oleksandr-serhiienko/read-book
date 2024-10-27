import React, { FC, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Database } from '@/components/db/database';
import { useRouter } from 'expo-router';

interface ApprovalCardProps {
  card: Card;
  onCardUpdate: (card: Card) => void;
}

const WordOnlyCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    <Text style={styles.labelText}>Original</Text>
    <Text style={styles.mainText}>{card.word}</Text>
    <Text style={styles.labelText}>Translation</Text>
    <Text style={styles.mainText}>{'_'.repeat(Math.max(8, card.translations[0].length))}</Text>
  </View>
);

const TranslationOnlyCard: FC<ApprovalCardProps> = ({ card }) => (
  <View style={styles.cardContent}>
    <Text style={styles.labelText}>Original</Text>
    <Text style={styles.mainText}>{'_'.repeat(Math.max(8, card.word.length))}</Text>
    <Text style={styles.labelText}>Translation</Text>
    <Text style={styles.mainText}>{card.translations[0]}</Text>
  </View>
);

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

const ContextWithBlankCard: FC<ApprovalCardProps> = ({ card }) => {
  if (!card.context || !card.context[0]) return null;

  // Remove <em> tags from original sentence
  const originalSentence = card.context[0].sentence.replace(/<\/?em>/g, '');
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {originalSentence.replace(card.word, '_____')}
      </Text>
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {renderHighlightedText(card.context[0].translation)}
        </Text>
      </View>
    </View>
  );
};

type CardComponentType = FC<ApprovalCardProps>;
type CardComponentsType = Record<number, CardComponentType>;

export const ApprovalCard: FC<ApprovalCardProps> = ({ card, onCardUpdate }) => {
  const router = useRouter();
  const [database] = useState(() => new Database());

  const cardComponents: CardComponentsType = {
    0: WordOnlyCard,
    1: TranslationOnlyCard,
    3: ContextWithBlankCard,
  };

  const getRandomComponent = () => {
    // Randomly return either WordOnlyCard or TranslationOnlyCard
    return Math.random() < 0.5 ? WordOnlyCard : TranslationOnlyCard;
  };

  const handleShowAnswer = async () => {
    if (!card?.id) return;

    const contextId = await database.getNextContextForCard(card.id);
    
    router.push({
      pathname: '/cardPanel',
      params: { 
        cardId: card.id,
        returnToApproval: 'true',
        contextId: contextId?.toString() || ''
      }
    });
  };

  const getCardComponent = () => {
    // If card has no context or empty context array
    if (!card.context || card.context.length === 0) {
      return getRandomComponent();
    }

    // Otherwise, use the regular level-based selection
    const level = card.level;
    return cardComponents[level] || ContextWithBlankCard;
  };

  const CardComponent = getCardComponent();

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
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  labelText: {
    fontSize: 18,
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
  headerText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  arrowContainer: {
    marginVertical: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#999',
  },
  blurredText: {
    opacity: 0.1,
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  
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