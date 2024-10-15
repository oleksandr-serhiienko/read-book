import { Card, Database } from '../../../components/db/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import wordGenerator from '../../../components/db/nextWordToLearn';

interface CardDecks {
  [key: string]: Card[];
}

export default function CardDeckScreen() {
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

  const renderDeck = (title: string, cards: Card[]) => {
    const totalCards = cards.length;
    const learningCards = wordGenerator(cards).length;

    return (
      <Link 
        key={title}
        href={{
          pathname: '/cardPanel',
          params: { source: title, cards: JSON.stringify(cards) }
        }}
        asChild
      >
        <TouchableOpacity style={styles.deck}>
          <View style={styles.deckHeader}>
            <Text style={styles.deckTitle}>{title}</Text>
            <Text style={styles.cardCount}>{learningCards}/{totalCards}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(learningCards / totalCards) * 100}%` }]} />
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Card Decks</Text>
      {renderDeck('All Cards', allCards)}
      {Object.entries(decks).map(([source, cards]) => renderDeck(source, cards))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  deck: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
  },
});