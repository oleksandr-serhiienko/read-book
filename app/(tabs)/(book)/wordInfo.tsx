import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { Database } from '@/components/db/database';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { Transform } from '@/components/transform';
import { useLanguage } from '@/app/languageSelector';

export default function WordInfo() {
  const { content, added } = useLocalSearchParams<{ content: string, added: string }>();
  const parsedContent: ResponseTranslation = JSON.parse(content as string);
  const [isAdded, setIsAdded] = useState(added === 'true');
  const { sourceLanguage, targetLanguage } = useLanguage();

  const formattedTranslations = parsedContent.Translations.slice(0, 5).map(t =>
    `${t.word}${t.pos ? ` • ${t.pos}` : ''}`
  );

  const context = parsedContent.Contexts;

  const renderTextWithBoldEmphasis = (text: string) => {
    const parts = text.split(/(<em>.*?<\/em>)/);
    return parts.map((part, index) => {
      if (part.startsWith('<em>') && part.endsWith('</em>')) {
        return <Text key={index} style={styles.boldText}>{part.slice(4, -5)}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const handleAddToDictionary = () => {
    if (!isAdded) {
      const database = new Database();     
      database.insertCard(Transform.fromWordToCard(parsedContent, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]));
      console.log('Adding to dictionary:', parsedContent.Original);
      setIsAdded(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={[styles.addButton, isAdded && styles.addButtonDisabled]} 
        onPress={handleAddToDictionary}
        disabled={isAdded}
      >
        <Text style={styles.addButtonText}>
          {isAdded ? 'Added to Dictionary' : 'Add to Dictionary'}
        </Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Translations</Text>
        {formattedTranslations.map((translation, index) => (
          <Text key={index} style={styles.translationItem}>{translation}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context</Text>
        {context.map((item, index) => (
          <View key={index} style={styles.contextItem}>
            <Text style={styles.originalText}>
              {renderTextWithBoldEmphasis(item.original)}
            </Text>
            <Text style={styles.translatedText}>
              {renderTextWithBoldEmphasis(item.translation)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  translationItem: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  contextItem: {
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 10,
  },
  originalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  translatedText: {
    fontSize: 14,
    color: '#666',
  },
  boldText: {
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  addButtonDisabled: {
    backgroundColor: '#B0C4DE', // Light Steel Blue for disabled state
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});