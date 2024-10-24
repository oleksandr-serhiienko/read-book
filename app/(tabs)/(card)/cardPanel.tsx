import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Database, HistoryEntry } from '../../../components/db/database';
import wordGenerator, { getNextFibonacciLike } from '../../../components/db/nextWordToLearn';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Transform } from '@/components/transform';
import { CardEvents } from './cardEvents';

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

export default function CardPanel() {
  const [database] = useState(() => new Database());
  const [card, setCard] = useState<Card>();
  const position = useRef(new Animated.ValueXY()).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const wrongOpacity = useRef(new Animated.Value(0)).current;
  const { cardId, returnToApproval } = useLocalSearchParams<{ 
    cardId: string,
    returnToApproval: string
  }>();
  const router = useRouter();

  const useNumberParam = (param: string | undefined, defaultValue: number = 0): number => {
    if (!param) return defaultValue;
    const parsed = parseInt(param);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  useEffect(() => {
    const initialize = async () => {
      await database.initialize();
      await getCard();
    };
    initialize();
  }, [cardId]);

  const getCard = async () => {
    const newCard = await database.getCardById(useNumberParam(cardId));
    if (newCard !== null) {
      setCard(newCard);
    }
  };

  const onSwipeComplete = async (direction: 'left' | 'right') => {
    if (!card) return;
  
    if (direction === 'right') {
      card.level = getNextFibonacciLike(card.level);
    } else {
      card.level = 0;
    }
    card.lastRepeat = new Date(Date.now());
    
    let history: HistoryEntry = {
      date: new Date(),
      success: direction === 'right',
      cardId: card.id ?? 0,
      contextId: null,
      type: "card"
    };

    await database.updateHistory(history);
    await database.updateCard(card);
    console.log("context before emitting");
    console.log();
    CardEvents.emit(card, history.success);
  
    if (returnToApproval === 'true') {
      router.back();
    }
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
    if (!card) {
      return (
        <View style={styles.container}>
          <Text>No card available</Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.cardContainer, getCardStyle()]} {...panResponder.panHandlers}>
        <View style={styles.cardContent}>
          <View style={styles.indicatorsContainer}>
            <Animated.View style={[styles.indicator, styles.rightIndicator, { opacity: rightOpacity }]}>
              <Text style={styles.indicatorText}>Right</Text>
            </Animated.View>
            <Animated.View style={[styles.indicator, styles.wrongIndicator, { opacity: wrongOpacity }]}>
              <Text style={styles.indicatorText}>Wrong</Text>
            </Animated.View>
          </View>
  
          <Text style={styles.word}>{card.word}</Text>
          <Text style={styles.translation}>{card.translations[0]}</Text>
          
          {card.context && card.context.length > 0 && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextText}>
                {renderHighlightedText(card.context[0].sentence)}
              </Text>
              <Text style={styles.contextText}>
                {renderHighlightedText(card.context[0].translation)}
              </Text>
            </View>
          )}
          <Link 
            href={{
              pathname: "/wordInfo",
              params: { 
                content: JSON.stringify(Transform.fromCardToWord(card)),
                added: 'true'
              }
            }}
            style={styles.moreInfoButton}
            asChild
          >
            <TouchableOpacity>
              <Text style={styles.moreInfoButtonText}>More Info</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
    overflow: 'hidden',
  },
  indicatorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    zIndex: 2,
  },
  indicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    transform: [{ rotate: '15deg' }],
  },
  rightIndicator: {
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
  },
  wrongIndicator: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  indicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  word: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    marginTop: 20,
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
});

function useNumberParam(cardId: string): number {
  throw new Error('Function not implemented.');
}
