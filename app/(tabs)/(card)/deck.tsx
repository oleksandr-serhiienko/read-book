import { TouchableOpacity, View, Text, StyleSheet, Dimensions, ImageBackground } from "react-native";
import React, { forwardRef } from 'react';

// Define the structure of a theme
interface Theme {
  background: string;
  accent: string;
  title: string;
  count: string;
  coverImage?: string;
}

// Define the props that DeckCard component accepts
interface DeckCardProps {
  theme: Theme;
  onPress: () => void;
  reviewCount?: number; 
}

// Define the structure of the themes object
interface ThemeCollection {
  [key: string]: Theme;
}

export const deckThemes: ThemeCollection = {
  daily: {
    background: '#4A69BD',
    accent: '#FED330',    
    title: 'Daily Conversation',
    count: '15 phrases'
  },
  business: {
    background: '#45B649',
    accent: '#DCE35B',    
    title: 'Business Talk',
    count: '20 phrases'
  },
  travel: {
    background: '#FF4B2B',
    accent: '#FF416C',    
    title: 'Travel Essential',
    count: '25 phrases'
  }
};

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

export const DeckCard = forwardRef<TouchableOpacity, DeckCardProps>(
    ({ theme, onPress, reviewCount }, ref) => (
      <TouchableOpacity 
        ref={ref}
        style={[styles.card, { backgroundColor: theme.background }]} 
        onPress={onPress}
      >
        {theme.coverImage && (
          <ImageBackground 
            source={{ uri: theme.coverImage }}
            style={[StyleSheet.absoluteFill, styles.coverImage]}
          >
            <View style={styles.overlay} />
          </ImageBackground>
        )}
        
        <View style={[styles.accentCircle, styles.topCircle, { backgroundColor: theme.accent }]} />
        <View style={[styles.accentCircle, styles.bottomCircle, { backgroundColor: theme.accent }]} />
        <View style={[styles.cornerCurve, { backgroundColor: theme.accent }]} />
        
        <View style={styles.content}>
          <Text style={styles.title}>{theme.title}</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.countContainer, { backgroundColor: theme.accent }]}>
              <Text style={styles.countText}>{theme.count}</Text>
            </View>
            {reviewCount !== undefined && (
              <Text style={styles.reviewedText}>
                {reviewCount} reviewed today
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  );
  
  

const styles = StyleSheet.create({
    coverImage: {
        opacity: 0.6,
      },
      overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
      statsContainer: {
        flexDirection: 'column',
        gap: 8,
      },
      reviewedText: {
        color: 'white',
        fontSize: 12,
        opacity: 0.8,
      },
      card: {
        width: cardWidth,
        height: 160,
        borderRadius: 20,
        marginVertical: 8, // Vertical spacing between cards
        marginHorizontal: 'auto', // Center cards
        padding: 16,
        overflow: 'hidden',
        position: 'relative',
        alignSelf: 'center', // Help ensure centering
      },
  accentCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  topCircle: {
    top: 12,
    left: 12,
  },
  bottomCircle: {
    bottom: 12,
    right: 12,
  },
  cornerCurve: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  countContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
  },
  countText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DeckCard;