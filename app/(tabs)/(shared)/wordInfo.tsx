import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { Database } from '@/components/db/database';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { Transform } from '@/components/transform';
import { useLanguage } from '@/app/languageSelector';
import * as Speech from 'expo-speech';
import { Volume2, Volume1, Check, Pencil } from 'lucide-react-native';
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
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;
  const database = new Database();   

  const formattedTranslations = parsedContent.Translations.slice(0, 5).map(t =>
    `${t.word}${t.pos ? ` • ${t.pos}` : ''}`
  );

  const context = parsedContent.Contexts.slice(0, 5);

  useEffect(() => {
    if (initialIsAdded) {
      loadExistingComment();
    }
  }, []);

  const loadExistingComment = async () => {
    try {
      const card = await database.getCardByWord(parsedContent.Original);
      if (card?.comment) {
        setComment(card.comment);
      }
    } catch (error) {
      console.error('Error loading comment:', error);
    }
  };

  const handleAddComment = async () => {
    setIsSaving(true);
    try {
      const card = await database.getCardByWord(parsedContent.Original);
      if (card?.id) {
        card.comment = comment;
        await database.updateCard(card);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleAddToDictionary = async () => {
    let noWord = await database.WordDoesNotExist(parsedContent.Original)
    if (!noWord){
         console.log("Ooops");
         return;
      }
    if (!isAdded) {
        
      database.insertCard(Transform.fromWordToCard(parsedContent, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]));
      setIsAdded(true);
    }
  };

  const renderComment = () => {
    if (!isAdded) return null;

    return (
      <View style={styles.commentContainer}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder="Add a comment..."
            />
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleAddComment}
              disabled={isSaving}
            >
              <Check size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.commentView}>
            <Text style={styles.commentText}>
              {comment || 'No comment'}
            </Text>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setIsEditing(true)}
            >
              <Pencil size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
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

      {!isAdded && (
        <TouchableOpacity       
          style={[styles.addButton, isAdded && styles.addButtonDisabled]} 
          onPress={handleAddToDictionary}        
          disabled={isAdded}
        >
          <Text style={styles.addButtonText}>
            {isAdded ? 'Added to Dictionary' : 'Add to Dictionary'}
          </Text>
        </TouchableOpacity>
      )}
       {renderComment()}

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
  commentContainer: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    minHeight: 40,
  },
  commentView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentText: {
    flex: 1,
    color: '#666',
    fontSize: 14,
  },
  iconButton: {
    padding: 4,
  },
  commentSection: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },  
  commentButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10, 
    alignItems: 'center',
  },
  commentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
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