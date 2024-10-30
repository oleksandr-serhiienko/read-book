import { Card, Database } from '../../../components/db/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import wordGenerator from '../../../components/db/nextWordToLearn';

interface CardDecks {
  [key: string]: Card[];
}

interface DeckStats {
  total: number;
  learning: number;
  reviewed: number;
}
type StatsMap = {
  [key: string]: DeckStats;
}

export default function CardDeckScreen() {
  const [database] = useState(() => new Database());
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<CardDecks>({});
  const [stats, setStats] = useState<StatsMap>({
    'All Cards': { total: 0, learning: 0, reviewed: 0 }
  });
  

  useFocusEffect(
    React.useCallback(() => {
      const initialize = async () => {
        await database.initialize();
        await getAllCards();
      };
      initialize();
    }, [])
  );

  const calculateStats = (cards: Card[]): DeckStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const cardsToLearn = wordGenerator(cards);
    return {
      total: cards.length,
      learning: cardsToLearn.length,
      reviewed: cards.filter(card => {
        const lastRepeat = new Date(card.lastRepeat);
        return lastRepeat >= today;
      }).length
    };
  };

  const getAllCards = async () => {
    const cards = await database.getAllCards();
    setAllCards(cards);
    
    const allStats = calculateStats(cards);
    const newStats: StatsMap = { 'All Cards': allStats };
    
    const grouped = cards.reduce<CardDecks>((acc, card) => {
      if (!acc[card.source]) {
        acc[card.source] = [];
      }
      acc[card.source].push(card);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([source, deckCards]) => {
      newStats[source] = calculateStats(deckCards);
    });

    setDecks(grouped);
    setStats(newStats);
  };
  const renderDeck = (title: string, cards: Card[]) => {
    const deckStats = stats[title] || { total: 0, learning: 0, reviewed: 0 };

    return (
      <Link 
        key={title}
        href={{
          pathname: '/approvalCard',  
          params: { source: title }
        }}
        asChild
      >
        <TouchableOpacity style={styles.deck}>
          {/* Stack effect layers */}
          <View style={styles.stackLayer3} />
          <View style={styles.stackLayer2} />
          <View style={styles.stackLayer1} />
          
          <View style={styles.cardContent}>
            <View style={styles.deckHeader}>
              <Text style={styles.deckTitle}>{title}</Text>
              <Text style={styles.cardCount}>
                {deckStats.reviewed}/{deckStats.learning}/{deckStats.total}
              </Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(deckStats.learning / Math.max(deckStats.total, 1)) * 100}%` }
                  ]} 
                />
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.reviewedProgressFill, 
                    { width: `${(deckStats.reviewed / Math.max(deckStats.learning, 1)) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.legendContainer}>
              <Text style={styles.legendText}>Reviewed/Learning/Total</Text>
            </View>
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
  deck: {
    position: 'relative',
    backgroundColor: 'transparent',
    marginBottom: 24,
    marginHorizontal: 8,
    height: 160,
  },
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: '100%',
  },
  stackLayer1: {
    position: 'absolute',
    top: 6,
    left: 3,
    right: -3,
    height: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    transform: [{ rotate: '1deg' }],
  },
  stackLayer2: {
    position: 'absolute',
    top: 3,
    left: 1.5,
    right: -1.5,
    height: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    transform: [{ rotate: '0.5deg' }],
  },
  stackLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#e8e8e8',
    borderRadius: 10,
  },
  progressContainer: {
    gap: 4,
    marginTop: 'auto',
    paddingTop: 16,
  },
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
  reviewedProgressFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
  },
  legendContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  legendText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});