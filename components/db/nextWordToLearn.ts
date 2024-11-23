import { Card } from "../db/database";

// Define type for intervals
type IntervalMap = {
  [key: number]: number;
};

// Review intervals in days for each level
const INTERVALS: IntervalMap = {
  0: 0,    // Same day review for new/failed cards
  1: 1,    // Next day
  2: 3,    // 3 days later
  3: 7,    // 1 week
  4: 14,   // 2 weeks
  5: 30,   // 1 month
  6: 90,   // 3 months
  7: 180   // 6 months
};

const MAX_LEVEL = 7;
const FAILURE_SETBACK = 2;

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Get randomly shuffled letters from a word as hints
export function getWordHints(word: string): string[] {
  return shuffleArray(word.toLowerCase().split(''));
}

// Get the card type for a given level
export function getCardTypeForLevel(level: number): number {
  if (level <= 5) {
    return level;
  }
  // For higher levels, randomly choose between types 2, 3, and 5
  return [2, 3, 5][Math.floor(Math.random() * 3)];
}

// Calculate next review date based on level
function getNextReviewDate(lastReviewDate: Date, level: number): Date {
  const nextDate = new Date(lastReviewDate);
  const interval = INTERVALS[Math.min(level, MAX_LEVEL)] || INTERVALS[MAX_LEVEL];
  nextDate.setDate(nextDate.getDate() + interval);
  return nextDate;
}

// Get next level based on current level and success
export function getNextLevel(currentLevel: number, success: boolean): number {
  if (!success) {
    return Math.max(0, currentLevel - FAILURE_SETBACK);
  }
  return Math.min(MAX_LEVEL, currentLevel + 1);
}

// Main function to get cards that need review
export default function wordGenerator(cards: Card[]): Card[] {
  if (!cards || !Array.isArray(cards)) {
    console.warn('Invalid cards array provided to wordGenerator');
    return [];
  }

  const now = new Date();
  
  return cards.filter(card => {
    // If card has never been reviewed, include it
    if (!card.lastRepeat) {
      return true;
    }

    try {
      const lastReviewDate = new Date(card.lastRepeat);
      const nextReviewDate = getNextReviewDate(lastReviewDate, card.level ?? 0);

      // For debugging
      console.log(`Card: ${card.word}, Last review: ${lastReviewDate.toISOString()}, Next review: ${nextReviewDate.toISOString()}, Now: ${now.toISOString()}`);

      // Return true if now is past or equal to the next review date
      return now >= nextReviewDate;
    } catch (error) {
      console.error(`Error processing card ${card.word}:`, error);
      return false;
    }
  });
}