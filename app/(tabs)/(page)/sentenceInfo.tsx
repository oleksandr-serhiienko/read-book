import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function SentenceInfo() {
  const { content } = useLocalSearchParams();

  return (
    
    <ScrollView style={styles.container}>
      <Text style={styles.content}>{content}</Text>
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