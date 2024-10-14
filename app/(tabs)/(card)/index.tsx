import { Card, Database } from '../../../components/db/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import wordGenerator from '../../../components/db/nextWordToLearn';
import { Link } from 'expo-router';

interface CardDeckScreenProps {}

interface CardDecks {
  [key: string]: Card[];
}

export default function CardDeckScreen(props: CardDeckScreenProps) {
  const navigation = useNavigation();
  const [database] = useState(() => new Database());
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<CardDecks>({});

  useEffect(() => {
    const initialize = async () => {
      await database.initialize();
      await getAllCards();
    };
    initialize();
  }, []);

  const getAllCards = async () => {
    const cards = await database.getAllCards();
    setAllCards(cards);
    groupCardsBySource(cards);
  };

  const groupCardsBySource = (cards: Card[]) => {
    const grouped = cards.reduce<CardDecks>((acc, card) => {
      if (!acc[card.source]) {
        acc[card.source] = [];
      }
      acc[card.source].push(card);
      return acc;
    }, {});
    setDecks(grouped);
  };

  const navigateToCardScreen = (source: string | null, cards: Card[]) => {
    navigation.navigate('CardsScreen' as never);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link 
        href={{
          pathname: '/cardPanel',
          params: { source: 'All Cards', cards: JSON.stringify(allCards) }
        }}
        asChild
      >
        <TouchableOpacity style={styles.deck}>
          <Text style={styles.deckHeader}>All Cards</Text>
          <Text style={styles.cardCount}>{allCards.length}/{wordGenerator(allCards).length} cards</Text>
        </TouchableOpacity>
      </Link>

      {Object.entries(decks).map(([source, cards]) => (
        <Link 
          key={source}
          href={{
            pathname: '/cardPanel',
            params: { source, cards: JSON.stringify(cards) }
          }}
          asChild
        >
          <TouchableOpacity style={styles.deck}>
            <Text style={styles.deckHeader}>{source}</Text>
            <Text style={styles.cardCount}>{cards.length}/{wordGenerator(cards).length} cards</Text>
          </TouchableOpacity>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deck: {
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deckHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardCount: {
    fontSize: 18,
  },
  card: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardText: {
    fontSize: 18,
  },
});