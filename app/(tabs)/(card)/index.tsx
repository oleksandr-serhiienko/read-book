import { Card, Database } from '../../../components/db/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import wordGenerator from '../../../components/db/nextWordToLearn';
import { useLanguage } from '@/app/languageSelector';

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
  const { sourceLanguage, targetLanguage} = useLanguage();
  const [database] = useState(() => new Database());
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<CardDecks>({});
  const [stats, setStats] = useState<StatsMap>({
    'All Cards': { total: 0, learning: 0, reviewed: 0 }
  });
  const [bookCovers, setBookCovers] = useState<{[key: string]: string}>({});
  const serverUrl = "http://192.168.1.41:3000";
  
  

  useFocusEffect(
    React.useCallback(() => {
      const initialize = async () => {
        await database.initialize();
        await getAllCards();
      };
      initialize();
    }, [])
  );
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {      
      const response = await fetch(`${serverUrl}/books/${sourceLanguage.toLocaleLowerCase()}`);
      console.log(`${serverUrl}/books/${sourceLanguage.toLocaleLowerCase()}`);
      const data = await response.json();
      const coverMap = data.reduce((acc: {[key: string]: string}, book: any) => {
        if (book.coverImage) {
          //console.log(`${serverUrl}/covers/${(book.coverImage)}`);
          acc[book.title] = `${serverUrl}/covers/${(book.coverImage)}`;
        }
        return acc;
      }, {});
      // Add default cover for all decks without specific covers
      coverMap['default'] = `${serverUrl}/covers/default.webp`; // or whatever extension your default image has
      setBookCovers(coverMap);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

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
    const cards = await database.getAllCards(sourceLanguage.toLocaleLowerCase(), targetLanguage.toLocaleLowerCase());
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

  const renderDeck = (title: string, cards: Card[], index: number) => {
    const deckStats = stats[title] || { total: 0, learning: 0, reviewed: 0 };
    const coverImage = bookCovers[title] || bookCovers['default'];
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
          <View style={[
            styles.cardContent
          ]}>
            {coverImage ? (
              <ImageBackground 
                source={{ uri: coverImage }} 
                style={StyleSheet.absoluteFill}
                imageStyle={styles.backgroundImage}
              >
                <View style={styles.overlay} />
              </ImageBackground>
            ) : null}
                    
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
      {/* Only show All Cards if there are cards to learn */}
      {stats['All Cards'].learning > 0 && renderDeck('All Cards', allCards, 0)}
      {/* Filter and map other decks */}
      {Object.entries(decks)
        .filter(([source, cards]) => {
          const deckStats = stats[source];
          return deckStats && deckStats.learning > 0;
        })
        .map(([source, cards], index) => 
          renderDeck(source, cards, index + 1)
        )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  progressContainer: {
    gap: 8, // Increased gap between bars
    marginTop: 'auto',
    paddingTop: 16,
  },
  progressBar: {
    height: 6, // Slightly taller
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // More subtle background
    borderRadius: 4, // More rounded corners
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(52, 152, 219, 0.8)', // Slightly transparent blue
    borderRadius: 4,
    // Optional: add transition shadow
    shadowColor: "#3498db",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewedProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(46, 204, 113, 0.8)', // Slightly transparent green
    borderRadius: 4,
    // Optional: add transition shadow
    shadowColor: "#2ecc71",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendContainer: {
    marginTop: 8, // Slightly more space
    alignItems: 'flex-end',
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)', // More subtle text
    fontStyle: 'italic',
  },
  backgroundImage: {
    opacity: 0.3, // Increased opacity
    borderRadius: 10,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Reduced overlay opacity
  },
  deck: {
    marginBottom: 24,
    marginHorizontal: 8,
    height: 160,
 },
 cardContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    height: '100%',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    flex: 1, // This will take available space but allow cardCount to have its space
    marginRight: 8,
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
  },

});