import { Text } from 'react-native';
import React from 'react';
import { Card } from '@/components/db/database';

interface TextStyles {
  boldText: {
    fontWeight: 'bold';
    color: string;
    [key: string]: any;
  };
}

export const renderHighlightedText = (text: string, styles: TextStyles) => {
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

export const selectBestContext = (card: Card) => {
  if (!card.context || card.context.length === 0) return null;
  
  const jsonString = JSON.stringify(card);
  console.log(jsonString);

  // If there's no history, just find any non-bad context or default to the first one
  if (!card.history || card.history.length === 0) {
    const nonBadContext = card.context.find(ctx => !ctx.isBad);
    return nonBadContext || card.context[0];
  }
  
  // Create a set of context IDs that were used in history for quick lookup
  const usedContextIds = new Set<number>();
  
  // Assuming context has an implicit index based on its position in the array
  card.history.forEach(entry => {
    if (entry.contextId !== null) {
      usedContextIds.add(entry.contextId);
    }
  });

  // Find a context that's not bad and wasn't used in history
  for (let i = 0; i < card.context.length; i++) {
    const context = card.context[i];
    if (!context.isBad && !usedContextIds.has(context.id ?? 0)) {
      return context;
    }
  }
  
  // If no good unused context found, find any non-bad context
  const nonBadContext = card.context.find(ctx => !ctx.isBad);
  if (nonBadContext) return nonBadContext;
  
  // Last resort: return the first (oldest) context
  return card.context[0];
};