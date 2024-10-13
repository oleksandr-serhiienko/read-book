import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ResponseTranslation } from '@/components/reverso/reverso';

export default function WordInfo() {
  const { content } = useLocalSearchParams();
  const parsedContent: ResponseTranslation = JSON.parse(content as string);
  const formattedTranslations = parsedContent.Translations.map(t => 
    `${t.word}${t.pos ? ` • ${t.pos}` : ''}`
  );

  return (
    
    <ScrollView style={styles.container}>
      {formattedTranslations.map((translation, index) => (
      <Text key={index} style={styles.content}>{translation}</Text>))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  content: {
    fontSize: 16,
  },
});