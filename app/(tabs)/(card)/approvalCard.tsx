import { Card, database } from '@/components/db/database';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import ApprovalCard from './approvalCardProps';
import { router, useLocalSearchParams } from 'expo-router';
import wordGenerator from '@/components/db/nextWordToLearn';
import { CardEvents } from './cardEvents';


// In your screen component:
export default function ApprovalScreen() {
  const { source } = useLocalSearchParams<{ source: string}>();
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    // Load your card data here
    console.log("loading screeeeeen");
    const loadCard = async () => {
        // Get card from database or props
        const cards = await database.getCardToLearnBySource(source) ?? [];
        const cardsToLearn = wordGenerator(cards);
        setCards(cardsToLearn);
        setCurrentCardIndex(0); // Reset the index when cards are reloaded
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
            return newCards;
          });
        });
    
        return () => unsubscribe();
      }, []);

  const handleCardUpdate = async (updatedCard: Card) => {
    // Update the current card in the cards array
    console.log("The update is called")
    setCards(prevCards => {
      const newCards = [...prevCards];
      newCards[currentCardIndex] = updatedCard;
      return newCards;
    });
    
    // Move to next card
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
    />
  );
}