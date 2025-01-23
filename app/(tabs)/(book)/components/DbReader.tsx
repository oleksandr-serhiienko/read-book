import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import SlidePanel from '../slidePanel';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { database } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';

interface ParsedWord {
  word: string;
  number: number | null;
  isPunctuation: boolean;
}

interface Chapter {
  chapterNumber: number;
  sentences: DBSentence[];
}

interface DBReaderProps {
  bookUrl: string;
  bookTitle: string;
  imageUrl: string;
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

const CHAPTER_MARKER = '[CHAPTER MARKER]';
const SWIPE_THRESHOLD = 100;

const DBReader: React.FC<DBReaderProps> = ({  bookUrl, bookTitle, imageUrl  }) => {
  const [sentences, setSentences] = useState<DBSentence[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const [fontSize, setFontSize] = useState(16);
  const [showControls, setShowControls] = useState(false);
  const [visibleTranslations, setVisibleTranslations] = useState<number[]>([]);
  const [selectedWord, setSelectedWord] = useState<SelectedWordInfo | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [currentWordTranslation, setCurrentWordTranslation] = useState<WordTranslation | null>(null);
  const [panelContent, setPanelContent] = useState<ResponseTranslation | null>(null);
  const bookDatabaseRef = useRef<BookDatabase | null>(null);

  useEffect(() => {
    loadContent();
    return () => {
      // Cleanup database connection when component unmounts
      if (bookDatabaseRef.current) {
        bookDatabaseRef.current.close();
      }
    };
  }, [bookUrl, bookTitle]);

  useEffect(() => {
    processChapters();
  }, [sentences]);

  const parseText = (text: string): ParsedWord[] => {
    const regex = /([,.!?])|(\s+)|([^,.!?\s]+\/\d+\/)|([^,.!?\s]+)/g;
    const matches = text.match(regex) || [];
    
    return matches.map(part => {
      if (/^[,.!?]$/.test(part)) {
        return { word: part, number: null, isPunctuation: true };
      }
      if (/^\s+$/.test(part)) {
        return { word: part, number: null, isPunctuation: true };
      }
      const match = part.match(/(.+?)\/(\d+)\//);
      if (match) {
        return {
          word: match[1],
          number: parseInt(match[2], 10),
          isPunctuation: false
        };
      }
      return { word: part, number: null, isPunctuation: false };
    });
  };

  const processChapters = () => {
    const newChapters: Chapter[] = [];
    let currentChapterSentences: DBSentence[] = [];
    let chapterCount = 0;

    sentences.forEach((sentence) => {
      if (sentence.original_text.includes(CHAPTER_MARKER)) {
        if (currentChapterSentences.length > 0) {
          newChapters.push({
            chapterNumber: chapterCount,
            sentences: currentChapterSentences,
          });
          currentChapterSentences = [];
        }
        chapterCount++;
        const cleanText = sentence.original_text.replace(CHAPTER_MARKER, '').trim();
        currentChapterSentences.push({
          ...sentence,
          original_text: cleanText,
        });
      } else {
        currentChapterSentences.push(sentence);
      }
    });

    if (currentChapterSentences.length > 0) {
      newChapters.push({
        chapterNumber: chapterCount,
        sentences: currentChapterSentences,
      });
    }

    setChapters(newChapters);
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      
      // Initialize database
      const bookDatabase = new BookDatabase(bookTitle);
      const dbInitialized = await bookDatabase.initialize();
      
      // If database doesn't exist or is corrupted, download it
      if (!dbInitialized) {
        console.log("Database needs to be downloaded");
        await bookDatabase.downloadDatabase(bookUrl);
        // Try to initialize again after download
        const initAfterDownload = await bookDatabase.initialize();
        
        if (!initAfterDownload) {
          throw new Error("Failed to initialize database after download");
        }
      }
      console.log("Test here")
      let existingBook = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase(),);
      console.log("Here: " + existingBook);
      if (!existingBook){
        console.log("Did I ?" + existingBook);
        const book = {
          name: bookTitle,
          sourceLanguage: sourceLanguage.toLowerCase(),
          updateDate: new Date(),
          lastreadDate: new Date(),
          bookUrl: bookUrl,
          imageUrl: imageUrl,
          progress: 0
        };
        await database.insertBook(book);
        let books = await database.getAllBooks(sourceLanguage.toLowerCase());
        console.log(books.map(b=> b.name));
      }
      
      
      // Get sentences from local database
      const data = await bookDatabase.getChapterSentences(1);
      setSentences(data);
      
      // Store database reference
      bookDatabaseRef.current = bookDatabase;
    } catch (error) {
      console.error('Error loading database content:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  const loadWordTranslation = async (word: string) => {
    try {
      if (!bookDatabaseRef.current) {
        throw new Error('Database not initialized');
      }
      
      return await bookDatabaseRef.current.getWordTranslation(word);
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
    setSelectedWord({ sentenceNumber, wordIndex, number });

    const cleanWord = word.toLowerCase().trim();
    if (cleanWord) {
      const translation = await loadWordTranslation(cleanWord);
      if (translation) {
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

  const handleSentenceLongPress = (sentenceNumber: number) => {
    setVisibleTranslations(prev => {
      if (prev.includes(sentenceNumber)) {
        return prev.filter(num => num !== sentenceNumber);
      }
      return [...prev, sentenceNumber];
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (_, gestureState) => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const dx = Math.abs(gestureState.dx);
      const dy = Math.abs(gestureState.dy);
      return dx > dy && dx > 10;
    },
    onPanResponderRelease: async (_, gestureState) => {
      if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
        setIsChapterLoading(true);
        if (gestureState.dx > 0 && currentChapter > 0) {
          setCurrentChapter(prev => prev - 1);
        } else if (gestureState.dx < 0 && currentChapter < chapters.length - 1) {
          setCurrentChapter(prev => prev + 1);
        }
        // Add a small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsChapterLoading(false);
      }
    },
  });

  const increaseFontSize = () => {
    setFontSize(prevSize => Math.min(prevSize + 2, 32));
  };

  const decreaseFontSize = () => {
    setFontSize(prevSize => Math.max(prevSize - 2, 12));
  };

  const handlePanelClose = () => {
    setIsPanelVisible(false);
    setPanelContent(null);
  };

  const renderWords = (sentence: DBSentence, isTranslation: boolean = false) => {
    const parsedWords = parseText(isTranslation ? sentence.translation_parsed_text! : sentence.original_text);

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
              <Text 
                key={index} 
                style={[
                  isTranslation ? styles.translationWord : styles.word,
                  { fontSize }
                ]}
              >
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
                { fontSize },
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

  const currentChapterContent = chapters[currentChapter]?.sentences || [];

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowControls(!showControls)}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>
      
      {showControls && (
        <View style={styles.settingsContainer}>
          <View style={styles.fontControlsContainer}>
            <TouchableOpacity
              onPress={decreaseFontSize}
              style={styles.fontButton}
            >
              <Text style={styles.fontButtonText}>A-</Text>
            </TouchableOpacity>
            <Text style={styles.fontSizeText}>{fontSize}</Text>
            <TouchableOpacity
              onPress={increaseFontSize}
              style={styles.fontButton}
            >
              <Text style={styles.fontButtonText}>A+</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.chapterIndicator}>
            <Text style={styles.chapterText}>
              Chapter {currentChapter + 1} of {chapters.length}
            </Text>
          </View>
        </View>
      )}

      <View
        style={styles.contentContainer}
        {...panResponder.panHandlers}
      >
        {isChapterLoading && (
          <View style={styles.chapterLoadingOverlay}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.textFlow}>
            {currentChapterContent.map((sentence) => (
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
      </View>

      <SlidePanel
        isVisible={isPanelVisible}
        onClose={handlePanelClose}
        content={panelContent}
        onAnnotateSentence={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
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
    color: '#333',
    lineHeight: 24,
  },
  selectedWord: {
    backgroundColor: '#e6f3ff',
    color: '#333',
    borderRadius: 4,
  },
  translationWord: {
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  highlightedNumber: {
    backgroundColor: '#e6f3ff',
    color: '#333',
    borderRadius: 4,
  },
  highlightedTranslationNumber: {
    backgroundColor: '#e6f3ff',
    color: '#666',
    borderRadius: 4,
  },
  paragraphBreak: {
    width: '100%',
    height: 24,
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    borderRadius: 20,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  settingsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  fontControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fontButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  fontButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chapterLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sentenceText: {
    lineHeight: 24,
    color: '#333',
  },
  paragraphBreakContent: {
    flex: 1,
  },
  fontSizeText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  chapterIndicator: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  chapterText: {
    fontSize: 14,
    color: '#666',
  },
});

export default DBReader;