import { Text } from 'react-native';
import React from 'react';

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