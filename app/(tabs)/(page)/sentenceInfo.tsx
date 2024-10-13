import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SentenceTranslation } from '@/components/reverso/reverso';

export default function SentenceInfo() {
  const { content } = useLocalSearchParams();
  const parsedContent: SentenceTranslation = JSON.parse(content as string);

  return (
    
    <ScrollView style={styles.container}>
      <Text style={styles.content}>{parsedContent.Original}</Text>
      <Text style={styles.content}>{parsedContent.Translation}</Text>
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