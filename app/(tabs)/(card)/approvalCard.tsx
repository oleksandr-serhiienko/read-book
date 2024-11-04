import { Card, database } from '@/components/db/database';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import ApprovalCard from './approvalCardProps';
import { router, useLocalSearchParams } from 'expo-router';
import wordGenerator from '@/components/db/nextWordToLearn';
import { CardEvents } from './cardEvents';
import { useLanguage } from '@/app/languageSelector';


// In your screen component:
export default function ApprovalScreen() {
  const { source } = useLocalSearchParams<{ source: string}>();
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsToLearn, setCardsToLearn] = useState<number>(0);
  const [cardsLearned, setCardsLearned] = useState<number>(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { sourceLanguage, targetLanguage} = useLanguage();

  useEffect(() => {
    // Load your card data here
    const loadCard = async () => {
        const cards = await database.getCardToLearnBySource(source, sourceLanguage.toLocaleLowerCase(), targetLanguage.toLocaleLowerCase()) ?? [];
        const cardsToLearn = wordGenerator(cards);
        setCards(cardsToLearn);
        setCardsToLearn(cardsToLearn.length);

      };
      loadCard();
    }, [source]);

    useEffect(() => {
        const unsubscribe = CardEvents.subscribe(async (updatedCard, success) => {          
          setCards(prevCards => {
            const newCards = prevCards.filter(card => card.id !== updatedCard.id);
            if (!success) {
              return [...newCards, updatedCard];              
            }
            setCardsLearned(prev => prev + 1); // Use functional update
            return newCards;
          });
        });
    
        return () => unsubscribe();
      }, []);

  const handleCardUpdate = async (updatedCard: Card) => {
    setCards(prevCards => {
      const newCards = [...prevCards];
      newCards[currentCardIndex] = updatedCard;
      return newCards;
    });
    
    setCurrentCardIndex(prev => prev + 1);
  };
  if (cards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No cards to review</Text>
      </View>
    );
  }

  if (currentCardIndex >= cards.length) {
    router.back(); // Go back to deck screen when done
    return null;
  }

  return (
    <ApprovalCard 
      card={cards[currentCardIndex]}
      onCardUpdate={handleCardUpdate}
      cardsToLearn={cardsToLearn}
      cardsLearned={cardsLearned}
    />
  );
}