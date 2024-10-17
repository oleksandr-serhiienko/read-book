import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Database, HistoryEntry } from '../../../components/db/database';
import wordGenerator, { getNextFibonacciLike } from '../../../components/db/nextWordToLearn';
import { Link } from 'expo-router';
import { Transform } from '@/components/transform';
import { useLanguage } from '@/app/languageSelector';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

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

export default function CardScreen() {
  const [database] = useState(() => new Database());
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const wrongOpacity = useRef(new Animated.Value(0)).current;
  const { sourceLanguage, targetLanguage } = useLanguage();

  useEffect(() => {
    const initialize = async () => {
      await database.initialize();
      await getAllCards();
    };
    initialize();
  }, []);

  const getAllCards = async () => {
    const cards = await database.getAllCards();
    setAllCards(wordGenerator(cards));
  };

  const onSwipeComplete = async (direction: 'left' | 'right') => {
    const item = allCards[currentCardIndex];
    if (direction === 'right') {
      item.level = getNextFibonacciLike(item.level);
      item.lastRepeat = new Date(Date.now());
      let history: HistoryEntry = {
        date: new Date(),
        success: true,
        cardId: item.id ?? 0,
        contextId: null,
        type: "card"
      }
      await database.updateHistory(history)
      await database.updateCard(item)
    } else {
      item.level = 0;
      item.lastRepeat = new Date(Date.now());
      let history: HistoryEntry = {
        date: new Date(),
        success: false,
        cardId: item.id ?? 0,
        contextId: null,
        type: "card"
      }
      await database.updateHistory(history)
      await database.updateCard(item)
      setAllCards(prev => [...prev, item]);
    }
    setCurrentCardIndex(prevIndex => prevIndex + 1);
    position.setValue({ x: 0, y: 0 });
    rightOpacity.setValue(0);
    wrongOpacity.setValue(0);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: 0 });
      if (gesture.dx > 0) {
        Animated.timing(rightOpacity, {
          toValue: gesture.dx / SCREEN_WIDTH,
          duration: 0,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.timing(wrongOpacity, {
          toValue: -gesture.dx / SCREEN_WIDTH,
          duration: 0,
          useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        forceSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        forceSwipe('left');
      } else {
        resetPosition();
      }
    },
  });

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.timing(rightOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(wrongOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const renderCard = () => {
    const currentCard = allCards[currentCardIndex];

    if (!currentCard) {
      return (
        <View style={styles.container}>
          <Text>No more cards</Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.cardContainer, getCardStyle()]} {...panResponder.panHandlers}>
        <View style={styles.cardContent}>
          <Text style={styles.word}>{currentCard.word}</Text>
          <Text style={styles.translation}>{currentCard.translations[0]}</Text>
          
          {currentCard.context && currentCard.context.length > 0 && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextText}>
                {renderHighlightedText(currentCard.context[0].sentence)}
              </Text>
              <Text style={styles.contextText}>
                {renderHighlightedText(currentCard.context[0].translation)}
              </Text>
            </View>
          )}
          <Link 
            href={{
              pathname: "/wordInfo",
              params: { 
                content: JSON.stringify(Transform.fromCardToWord(currentCard)),
                added: 'true'
              }
            }}
            style={styles.moreInfoButton}
          >
            <Text style={styles.moreInfoButtonText}>More Info</Text>
          </Link>
        </View>
        <Animated.View style={[styles.overlay, styles.rightOverlay, { opacity: rightOpacity }]}>
          <Text style={[styles.overlayText, styles.rightOverlayText]}>Right</Text>
        </Animated.View>
        <Animated.View style={[styles.overlay, styles.wrongOverlay, { opacity: wrongOpacity }]}>
          <Text style={[styles.overlayText, styles.wrongOverlayText]}>Wrong</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCard()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cardContainer: {
    width: SCREEN_WIDTH * 0.9,
    position: 'relative',
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
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
    marginBottom: 5,
    color: '#333',
  },
  translation: {
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 10,
    color: '#555',
  },
  contextContainer: {
    width: '100%',
    marginTop: 10,
  },
  contextText: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: '#555',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  moreInfoButton: {
    marginTop: 15,
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  moreInfoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  rightOverlay: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  wrongOverlay: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  overlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  rightOverlayText: {
    color: 'green',
  },
  wrongOverlayText: {
    color: 'red',
  },
});