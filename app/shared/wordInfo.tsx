import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { Database, Card, HistoryEntry } from '@/components/db/database';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { Transform } from '@/components/transform';
import { useLanguage } from '@/app/languageSelector';
import * as Speech from 'expo-speech';
import { ChevronDown, ChevronUp, Clock, Check, Volume2, Volume1, Pencil, ArrowRight, BarChart2 } from 'lucide-react-native';
import languages from '@/components/reverso/languages/entities/languages';
import voices from '@/components/reverso/languages/voicesTranslate';
import { BookDatabase } from '@/components/db/bookDatabase';
import { router } from 'expo-router';
import TranslationContext from '@/components/reverso/languages/entities/translationContext';
import HistoryItem from './historyItem';

interface WordInfoContentProps {
  content: string;
  initialIsAdded: boolean;
}
interface WordInfo {
  word: string;
  translation: string;
}

export function WordInfoContent({ content, initialIsAdded }: WordInfoContentProps) {
  const parsedContent: ResponseTranslation = JSON.parse(content);
  const [isAdded, setIsAdded] = useState(initialIsAdded);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [individualWords, setIndividualWords] = useState<WordInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;
  const database = new Database();   
  const [db, setDb] = useState<BookDatabase | null>(null);
  
  // State for card history
  const [cardHistory, setCardHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyExists, setHistoryExists] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);

  const formattedTranslations = parsedContent.Translations.slice(0, 5).map(t =>
    `${t.word}${t.pos ? ` • ${t.pos}` : ''}`
  );
  const context = parsedContent.Contexts.slice(0, 5);

  useEffect(() => {
    if (initialIsAdded) {
      loadExistingComment();
      checkForHistory();
    } else {
      checkWordExists();
    }
  }, []);

  useEffect(() => {
    const setupAndLoadData = async () => {
      try {
        // First validate that parsedContent exists and has necessary properties
        if (!parsedContent || !parsedContent.Book) {
          console.log("Invalid content format");
          return;
        }
        
        // Initialize the database
        console.log("init");
        const bookDatabase = new BookDatabase(parsedContent.Book);
        const dbInitialized = await bookDatabase.initialize();
        if (!dbInitialized) { 
          throw new Error("Failed to initialize database");  
        }
        setDb(bookDatabase);
    
        // Only after database is initialized, load the translations
        const originalText = parsedContent?.Original;
        if (!originalText || typeof originalText !== 'string') {
          setIndividualWords([]);
          return;
        }
        
        // Check if this is a phrase (contains spaces)
        if (originalText.includes(' ')) {
          const words = originalText.split(' ')
            .filter(word => word.trim().length > 0);
          
          const wordsWithTranslations = await Promise.all(
            words.map(async (word) => {
              const translation = await bookDatabase.getWordTranslation(word.trim().toLowerCase());
              return {
                word: word.trim(),
                translation: translation?.translations[0] || '',
              };
            })
          );
          
          setIndividualWords(wordsWithTranslations);
        } else {
          // Single word - no need for individual word buttons
          console.log("Single word detected - no word buttons needed");
          setIndividualWords([]);
        }
      } catch (error) {
        setIndividualWords([]);
      }
    };
  
    setupAndLoadData();
  }, [content]);

  // Check if the word exists in the database
  const checkWordExists = async () => {
    try {
      const wordExists = !(await database.WordDoesNotExist(parsedContent.Original));
      setHistoryExists(wordExists);
      if (wordExists) {
        const card = await database.getCardByWord(parsedContent.Original);
        if (card) {
          setCurrentCard(card);
        }
      }
    } catch (error) {
      console.error('Error checking if word exists:', error);
    }
  };

  // Check for history and load it
  const checkForHistory = async () => {
    try {
      const card = await database.getCardByWord(parsedContent.Original);
      if (card) {
        setCurrentCard(card);
        setHistoryExists(true);
      }
    } catch (error) {
      console.error('Error checking for history:', error);
    }
  };

  // Load history for the current word
  const loadHistory = async () => {
    if (!currentCard || !currentCard.id) return;
    
    setIsLoadingHistory(true);
    
    try {
      const history = await database.getCardHistory(currentCard.id);
      setCardHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistoryView = async () => {
    if (showHistory) {
      setShowHistory(false);
    } else {
      if (cardHistory.length === 0) {
        await loadHistory();
      } else {
        setShowHistory(true);
      }
    }
  };

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
        await database.updateCardComment(card);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWordPress = async (word: string) => {
    try {
      const wordTranslation = await db?.getWordTranslation(word.toLowerCase());
      
      if (wordTranslation) {
        // Map the contexts from the database result to TranslationContext objects
        const contexts: TranslationContext[] = wordTranslation.contexts.map(context => ({
          original: context.original_text,
          translation: context.translated_text
        }));
        
        // Create the word content object with the translations and contexts
        const wordContent = {
          Original: word,
          Translations: wordTranslation.translations.map(translation => ({
            word: translation,
            pos: ""
          })),
          // Properly format contexts with both original and translation properties
          Contexts: contexts.map(context => ({
            original: context.original,
            translation: context.translation
          })),
          Book: db?.getDbName(),
          TextView: ""
        };
  
        router.push({
          pathname: "/wordInfo",
          params: {
            content: JSON.stringify(wordContent),
            added: "false"
          }
        });
      }
    } catch (error) {
      console.error('Error fetching word translation:', error);
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
      database.insertCard(Transform.fromWordToCard(parsedContent, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]), parsedContent.TextView);
      setIsAdded(true);
      setHistoryExists(true);
      
      // After adding to dictionary, check for history again
      await checkForHistory();
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

  const renderHistoryButton = () => {
    if (!historyExists) return null;

    return (
      <TouchableOpacity
        style={styles.historyButton}
        onPress={toggleHistoryView}
        disabled={isLoadingHistory}
      >
        {isLoadingHistory ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <BarChart2 size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.historyButtonText}>
              {showHistory ? 'Hide History' : 'Show History'}
            </Text>
            {showHistory ? 
              <ChevronUp size={20} color="#fff" /> : 
              <ChevronDown size={20} color="#fff" />
            }
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistoryList = () => {
    if (!showHistory) return null;

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historySectionTitle}>Learning History</Text>
        {cardHistory.length === 0 ? (
          <Text style={styles.noHistoryText}>No learning history available</Text>
        ) : (
          cardHistory.map((entry, index) => (
            <HistoryItem 
              key={index} 
              entry={entry} 
              index={index} 
              card={currentCard} // Pass the card to access context information
            />
          ))
        )}
      </View>
    );
  };

  const renderWordButtons = () => {
    if (!parsedContent.Original || !parsedContent.Original.includes(' ')) {
      return null;
    }

    return (
      <View style={styles.wordButtonsContainer}>
        {individualWords.map((wordInfo, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.wordButton}
            onPress={() => handleWordPress(wordInfo.word)}
          >
            <View style={styles.wordContent}>
              <Text style={styles.wordButtonText}>{wordInfo.word}</Text>
              <Text style={styles.translationText}> • {wordInfo.translation}</Text>
            </View>
            <ArrowRight size={20} color="#666" />
          </TouchableOpacity>
        ))}
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
      {renderWordButtons()}

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
      {renderHistoryButton()}
      {renderHistoryList()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Existing styles
  wordButtonsContainer: {
    marginVertical: 16,
  },
  wordButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
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

  // New styles for history feature
  historyButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  historyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noHistoryText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  }
});