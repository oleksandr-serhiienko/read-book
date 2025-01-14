import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import SlidePanel from '../slidePanel'; 
import { ResponseTranslation } from '@/components/reverso/reverso';

interface DBSentence {
  sentence_number: number;
  original_text: string;
  translation: string | null;
}

interface ParsedWord {
  word: string;
  number: number | null;
  isPunctuation: boolean;
}

interface DBReaderProps {
  bookUrl: string;
}

interface SelectedWordInfo {
  sentenceNumber: number;
  wordIndex: number;
  number: number | null;
}

interface WordTranslation {
    german_word: string;
    english_translation: string;
}
  

const DBReader: React.FC<DBReaderProps> = ({ bookUrl }) => {
    const [sentences, setSentences] = useState<DBSentence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleTranslations, setVisibleTranslations] = useState<number[]>([]);
    const [selectedWord, setSelectedWord] = useState<SelectedWordInfo | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [currentWordTranslation, setCurrentWordTranslation] = useState<WordTranslation | null>(null);
    const [panelContent, setPanelContent] = useState<ResponseTranslation | null>(null);

  const parseText = (text: string): ParsedWord[] => {
    // Split into parts but preserve punctuation
    const regex = /([,.!?])|(\s+)|([^,.!?\s]+\/\d+\/)|([^,.!?\s]+)/g;
    const matches = text.match(regex) || [];
    
    return matches.map(part => {
      // Check if it's a punctuation mark
      if (/^[,.!?]$/.test(part)) {
        return {
          word: part,
          number: null,
          isPunctuation: true
        };
      }
      // Check if it's just whitespace
      if (/^\s+$/.test(part)) {
        return {
          word: part,
          number: null,
          isPunctuation: true
        };
      }
      // Check if it's a numbered word
      const match = part.match(/(.+?)\/(\d+)\//);
      if (match) {
        return {
          word: match[1],
          number: parseInt(match[2], 10),
          isPunctuation: false
        };
      }
      // Regular word
      return {
        word: part,
        number: null,
        isPunctuation: false
      };
    });
  };

  useEffect(() => {
    loadContent();
  }, [bookUrl]);

  const loadContent = async () => {
    console.log('[DBReader] Loading content');
    try {
      setIsLoading(true);
      const dbUrl = bookUrl.replace('/books/', '/db/');
      const response = await fetch(dbUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      const data = await response.json();
      setSentences(data);
    } catch (error) {
      console.error('Error loading database content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWordTranslation = async (word: string) => {
    try {
      // Get the filename from the bookUrl
      const urlParts = bookUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const language = urlParts[urlParts.length - 2];
      
      // Construct the translation URL using the same database file
      const translationUrl = `${bookUrl.split('/books/')[0]}/translations/${language}/${fileName}/${word}`;
      console.log('[DBReader] Fetching translation from:', translationUrl);
      
      const response = await fetch(translationUrl);
      if (!response.ok) {
        if (response.status === 404) {
          console.log('[DBReader] No translation found for:', word);
          return null;
        }
        throw new Error('Failed to fetch translation');
      }
      const data = await response.json();
      console.log('[DBReader] Translation received:', data);
      return data;
    } catch (error) {
      console.error('Error fetching word translation:', error);
      return null;
    }
  };

  const handleWordPress = async (
    sentenceNumber: number, 
    wordIndex: number, 
    number: number | null,
    word: string
  ) => {
    console.log('[DBReader] Word pressed:', { sentenceNumber, wordIndex, number, word });
    setSelectedWord({ sentenceNumber, wordIndex, number });

    const cleanWord = word.toLowerCase().trim();
    if (cleanWord) {
      const translation = await loadWordTranslation(cleanWord);
      if (translation) {
        // Create a ResponseTranslation object
        const responseTranslation: ResponseTranslation = {
          Original: cleanWord,
          Translations: [{
            word: translation.english_translation,
            pos: ''  
          }],
          Contexts: [],
          Book: '',
          TextView: ''
        };
        
        setPanelContent(responseTranslation);
        setIsPanelVisible(true);
      } else {
        setPanelContent(null);
        setIsPanelVisible(false);
      }
    }
  };

  const handlePanelClose = () => {
    setIsPanelVisible(false);
    setPanelContent(null);
  };

  const handleSentenceLongPress = (sentenceNumber: number) => {
    console.log('[DBReader] Sentence long pressed:', sentenceNumber);
    setVisibleTranslations(prev => {
      if (prev.includes(sentenceNumber)) {
        return prev.filter(num => num !== sentenceNumber);
      }
      return [...prev, sentenceNumber];
    });
  };

  const renderWords = (sentence: DBSentence, isTranslation: boolean = false) => {
    const parsedWords = parseText(isTranslation ? sentence.translation! : sentence.original_text);
    const isTranslationVisible = visibleTranslations.includes(sentence.sentence_number);

    return (
      <View style={styles.sentenceContainer}>
        {parsedWords.map((parsed, index) => {
          const isSelectedWord = !isTranslation && 
                               selectedWord?.sentenceNumber === sentence.sentence_number && 
                               selectedWord?.wordIndex === index;
          
          const shouldHighlight = parsed.number !== null && 
                                selectedWord?.number === parsed.number &&
                                selectedWord?.sentenceNumber === sentence.sentence_number;

          if (parsed.isPunctuation) {
            return (
              <Text key={index} style={isTranslation ? styles.translationWord : styles.word}>
                {parsed.word}
              </Text>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => !isTranslation && handleWordPress(
                sentence.sentence_number, 
                index, 
                parsed.number,
                parsed.word
              )}
              onLongPress={() => handleSentenceLongPress(sentence.sentence_number)}
              delayLongPress={500}
              activeOpacity={0.7}
              style={styles.wordContainer}
            >
              <Text style={[
                isTranslation ? styles.translationWord : styles.word,
                isSelectedWord && styles.selectedWord,
                shouldHighlight && (isTranslation ? styles.highlightedTranslationNumber : styles.highlightedNumber)
              ]}>
                {parsed.word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.textFlow}>
          {sentences.map((sentence) => (
            <React.Fragment key={sentence.sentence_number}>
              {sentence.original_text === '···' ? (
                <View style={styles.paragraphBreak} />
              ) : (
                <View style={styles.sentenceWrapper}>
                  {renderWords(sentence)}
                  {visibleTranslations.includes(sentence.sentence_number) && sentence.translation && (
                    renderWords(sentence, true)
                  )}
                </View>
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      <SlidePanel
        isVisible={isPanelVisible}
        onClose={handlePanelClose}
        content={panelContent}
        onAnnotateSentence={()=>{}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 16,
  },
  textFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentenceWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 4,
  },
  sentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wordContainer: {
    flexDirection: 'row',
  },
  word: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  selectedWord: {
    backgroundColor: '#e6f3ff',
    color: '#2196f3',
    borderRadius: 4,
  },
  translationWord: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  highlightedNumber: {
    backgroundColor: '#e6f3ff',
    color: '#2196f3',
    borderRadius: 4,
  },
  highlightedTranslationNumber: {
    backgroundColor: '#e6f3ff',
    color: '#2196f3',
    borderRadius: 4,
  },
  paragraphBreak: {
    width: '100%',
    height: 24,
  },
});

export default DBReader;