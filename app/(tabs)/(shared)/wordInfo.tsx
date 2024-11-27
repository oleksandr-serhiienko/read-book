import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { Database } from '@/components/db/database';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { Transform } from '@/components/transform';
import { useLanguage } from '@/app/languageSelector';
import * as Speech from 'expo-speech';
import { Volume2, Volume1 } from 'lucide-react-native';
import languages from '@/components/reverso/languages/entities/languages';
import voices from '@/components/reverso/languages/voicesTranslate';

interface WordInfoContentProps {
  content: string;
  initialIsAdded: boolean;
}

export function WordInfoContent({ content, initialIsAdded }: WordInfoContentProps) {
  const parsedContent: ResponseTranslation = JSON.parse(content);
  const [isAdded, setIsAdded] = useState(initialIsAdded);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;

  const formattedTranslations = parsedContent.Translations.slice(0, 5).map(t =>
    `${t.word}${t.pos ? ` • ${t.pos}` : ''}`
  );

  const context = parsedContent.Contexts.slice(0, 5);

  const handleSpeak = async () => {
    setIsSpeaking(true);
    try {
      const options = {
        language: voices[languageKey as keyof typeof voices] || 'en-US',
        pitch: 1.0,
        rate: 0.75
      };    
      await Speech.speak(parsedContent.Original, options);
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

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
      setIsAdded(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.originalWord}>{parsedContent.Original}</Text>
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]} 
          onPress={handleSpeak}
          disabled={isSpeaking}
        >
          {isSpeaking ? (
            <Volume1 size={20} color="#666" strokeWidth={2} />
          ) : (
            <Volume2 size={20} color="#666" strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

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
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  originalWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  speakButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButtonActive: {
    backgroundColor: '#e8e8e8',
  },
  speakButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: '#B0C4DE',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});